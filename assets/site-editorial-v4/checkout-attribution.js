/* Native SaleBot order attribution. No payment API, payment status or payment ledger. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const KEY = 'ca_source_v1';
  const MAX_AGE = 90 * 86400000;
  const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const TARIFFS = new Map([['25374', 9], ['25376', 9], ['25375', 9],
    ['27349', 10], ['27351', 10], ['27350', 10]]);
  const trim = value => String(value || '').trim().slice(0, 200);

  function touch(href, referrer, now) {
    const url = new URL(href);
    const params = Object.fromEntries(UTM.map(k => [k, trim(url.searchParams.get(k))]));
    let referrerHost = '';
    try { referrerHost = new URL(referrer).hostname; } catch (_) {}
    const technical = referrerHost === 'contentcourse.payform.ru' ||
      referrerHost === 'salebot.pro' || referrerHost.endsWith('.salebot.pro');
    const external = referrerHost && referrerHost !== url.hostname && !technical;
    return {
      at: now, path: url.pathname.slice(0, 200),
      source: params.utm_source || (external ? referrerHost : 'unknown'),
      medium: params.utm_medium || (external ? 'referral' : 'unknown'),
      ...params, referrer_host: external ? referrerHost : '',
      explicit: UTM.some(k => params[k]) || !!external
    };
  }

  function capture(previous, href, referrer, now, visitId) {
    const current = touch(href, referrer, now);
    const valid = previous && previous.version === VERSION && previous.first && previous.last &&
      typeof previous.visit_id === 'string' && previous.visit_id.length <= 200 &&
      Number.isFinite(previous.last.at) && now >= previous.last.at &&
      Number.isFinite(previous.first.at) && now >= previous.first.at &&
      now - previous.first.at <= MAX_AGE;
    return {
      version: VERSION, visit_id: valid ? previous.visit_id : visitId,
      first: valid ? previous.first : current,
      last: valid && !current.explicit ? previous.last : current,
      last_visit_at: now
    };
  }

  function orderVariables(state, clientId, tariff, now) {
    if (!state || state.version !== VERSION || !TARIFFS.has(String(tariff))) return {};
    const result = {
      ca_attribution_version: VERSION, ca_visit_id: trim(state.visit_id),
      ca_order_observed_at: new Date(now).toISOString(), ca_cohort: TARIFFS.get(String(tariff)),
      ca_tariff_id: String(tariff),
      ca_first_touch_at: new Date(state.first.at).toISOString(),
      ca_last_touch_at: new Date(state.last.at).toISOString(),
      ca_first_source: trim(state.first.source), ca_last_source: trim(state.last.source),
      ca_first_medium: trim(state.first.medium), ca_last_medium: trim(state.last.medium),
      ca_first_path: state.first.path, ca_last_path: state.last.path
    };
    for (const key of UTM) {
      result['ca_first_' + key] = trim(state.first[key]);
      result['ca_last_' + key] = trim(state.last[key]);
      result[key] = trim(state.last[key]);
    }
    if (/^\d{5,30}$/.test(String(clientId || ''))) {
      result._ym_uid = String(clientId);
      result.ya_client_id = String(clientId);
    }
    return result;
  }

  function enrichData(data, metadata) {
    // jQuery processes data before calling ajaxPrefilter; preserve all native fields.
    const encoded = typeof data === 'string';
    const params = encoded ? new URLSearchParams(data) : null;
    const raw = encoded ? params.get('order[variables]') : data?.order?.variables;
    let variables;
    try { variables = JSON.parse(raw || '{}'); } catch (_) { return data; }
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) return data;
    const enriched = JSON.stringify({ ...variables, ...metadata });
    if (encoded) { params.set('order[variables]', enriched); return params.toString(); }
    return { ...data, order: { ...data.order, variables: enriched } };
  }

  function installFrame(frameWindow, metadata, onSubmit) {
    if (!frameWindow.jQuery || frameWindow.__caOrderAttribution) return false;
    const form = frameWindow.document.querySelector('form.input_custom_data');
    if (!form) return false;
    frameWindow.jQuery.ajaxPrefilter(function (options) {
      const url = new URL(options.url, frameWindow.location.href);
      if (url.origin === frameWindow.location.origin &&
          url.pathname === '/projects/379741/orders' &&
          String(options.type || options.method).toUpperCase() === 'POST') {
        options.data = enrichData(options.data, typeof metadata === 'function' ? metadata() : metadata);
      }
    });
    // Keep both native steps in the dialog; leave it only for a valid Prodamus URL.
    form.target = '_self';
    frameWindow.jQuery(form).on('submit.caCheckout', event => {
      if (!event.isDefaultPrevented() && onSubmit) onSubmit();
    });
    frameWindow.__caOrderAttribution = true;
    return true;
  }

  function prodamusDestination(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password &&
        ['payform.ru', 'contentcourse.payform.ru'].includes(url.hostname) ? url.href : null;
    } catch (_) { return null; }
  }

  function retryableLinkFailure(status, textStatus, message) {
    return [502, 503, 504].includes(Number(status)) || textStatus === 'timeout' ||
      (Number(status) === 0 && textStatus === 'error') ||
      /\b50[234]\b|bad gateway|gateway timeout|service unavailable/i.test(String(message || ''));
  }

  function installPaymentFrame(frameWindow, controls) {
    const jq = frameWindow.jQuery;
    const doc = frameWindow.document;
    const button = doc.querySelector('.payment_information__btn');
    if (!jq || !button) return null;
    if (frameWindow.__caPaymentLinkController) return frameWindow.__caPaymentLinkController;
    const widget = button.closest('.payment_information') || button.parentElement;
    const status = doc.createElement('p');
    status.className = 'ca-payment-link-status';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'font:inherit;color:inherit;line-height:1.45;margin:12px 0';
    button.before(status);
    button.setAttribute('role', 'button');
    if (!button.hasAttribute('tabindex')) button.tabIndex = 0;
    const managed = 'ca-link-' + root.crypto.randomUUID();
    const disabled = new Map();
    const pointer = button.style.pointerEvents;
    let operation = null, disposed = false, timer = null;

    function active() {
      try { return !disposed && controls.isActive(); } catch (_) { return false; }
    }
    function announce(phase, attempt) {
      root.document.dispatchEvent(new root.CustomEvent('ca:payment-link', { detail: { phase, attempt } }));
    }
    function busy(value) {
      widget.setAttribute('aria-busy', String(value));
      button.setAttribute('aria-disabled', String(value));
      button.style.pointerEvents = value ? 'none' : pointer;
      if (value) {
        for (const field of widget.querySelectorAll('input,button,select,textarea')) {
          if (!disabled.has(field)) disabled.set(field, field.disabled);
          field.disabled = true;
        }
      } else {
        for (const [field, previous] of disabled) field.disabled = previous;
        disabled.clear();
      }
    }
    function failed(job) {
      if (!active() || operation !== job) return;
      job.running = false; busy(false);
      status.textContent = 'Не получилось открыть оплату. Попробуй ещё раз — данные сохранены.';
      button.textContent = 'Попробовать ещё раз';
      button.scrollIntoView({ block: 'nearest' });
      announce('failed', job.attempt);
    }
    function result(job, data, xhr, textStatus) {
      if (!active() || operation !== job) return;
      const destination = data && data.error !== true && prodamusDestination(data.payment_link);
      if (destination) {
        job.running = false;
        status.textContent = 'Открываем страницу оплаты…';
        announce('redirecting', job.attempt);
        controls.redirect(destination);
        return;
      }
      const transient = retryableLinkFailure(xhr?.status, textStatus, data?.error_message);
      if (transient && job.attempt < 3 && Date.now() < job.deadline) {
        const delay = job.attempt === 1 ? 1500 : 3500;
        if (Date.now() + delay >= job.deadline) { failed(job); return; }
        status.textContent = 'Готовим страницу оплаты…';
        announce('retrying', job.attempt);
        timer = root.setTimeout(() => {
          timer = null;
          if (!active() || operation !== job) return;
          job.attempt += 1;
          const options = { ...job.options, __caManagedLink: managed,
            timeout: Math.max(1, Math.min(10000, job.deadline - Date.now())) };
          job.xhr = jq.ajax(options);
        }, delay);
      } else failed(job);
    }
    widget.addEventListener('click', event => {
      if (operation?.running) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); if (!operation?.running) button.click();
      }
    });
    jq.ajaxPrefilter((options, originalOptions, xhr) => {
      const url = new URL(options.url, frameWindow.location.href);
      const match = url.pathname.match(/^\/courses\/create_payment_links\/(\d+)$/);
      if (!match || !TARIFFS.has(match[1]) ||
          !['skillhub.salebot.pro', 'creatoracademy.ru'].includes(url.hostname) ||
          url.protocol !== 'https:' || String(options.type || options.method).toUpperCase() !== 'POST') return;
      if (options.__caManagedLink === managed) return;
      if (!active() || operation?.running) { xhr.abort('duplicate'); return; }
      const job = { attempt: 1, deadline: Date.now() + 30000, running: true, xhr };
      operation = job; busy(true);
      status.textContent = 'Готовим страницу оплаты…';
      button.textContent = 'Готовим оплату…';
      button.scrollIntoView({ block: 'nearest' });
      // This is only the native URL generator. Never retry a bank charge or paid callback.
      options.global = false;
      options.timeout = 10000;
      options.success = (data, textStatus, xhr) => result(job, data, xhr, textStatus);
      options.error = (xhr, textStatus) => result(job, null, xhr, textStatus);
      job.options = { ...options };
      announce('preparing', 1);
    });
    function cancel() {
      const job = operation; operation = null;
      if (timer !== null) root.clearTimeout(timer);
      timer = null; busy(false);
      status.textContent = ''; button.textContent = 'Оплатить';
      if (job?.xhr?.readyState !== 4) job?.xhr?.abort('checkout_left');
    }
    frameWindow.addEventListener('pagehide', cancel);
    const controller = { dispose() { disposed = true; cancel(); } };
    frameWindow.__caPaymentLinkController = controller;
    return controller;
  }

  function nativeCheckout(value, base) {
    try {
      const url = new URL(value, base);
      if (url.protocol !== 'https:' || url.username || url.password ||
          !['skillhub.salebot.pro', 'creatoracademy.ru'].includes(url.hostname) ||
          url.pathname !== '/cs/get_form/form_input_custom_data' ||
          !TARIFFS.has(url.searchParams.get('tariff'))) return null;
      return url;
    } catch (_) { return null; }
  }

  function wrappedCheckout(original, site) {
    const wrapper = new URL(site);
    wrapper.hash = new URLSearchParams({ 'ca-checkout': original.href }).toString();
    return wrapper.href;
  }

  function checkoutFromHash(hash, base) {
    return nativeCheckout(new URLSearchParams(hash.replace(/^#/, '')).get('ca-checkout') || '', base);
  }

  function install() {
    if (root.__caCheckoutAttribution || root.location.hostname !== 'creatoracademy.ru') return;
    root.__caCheckoutAttribution = true;
    let previous;
    try { previous = JSON.parse(root.localStorage.getItem(KEY)); } catch (_) {}
    const state = capture(previous, root.location.href, root.document.referrer,
      Date.now(), root.crypto.randomUUID());
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    let clientId = '';
    try { if (typeof root.ym === 'function') root.ym(106221169, 'getClientID', v => { clientId = v; }); } catch (_) {}
    if (!root.HTMLDialogElement) return;

    function openCheckout(original) {
      if (root.document.querySelector('#ca-native-checkout')) return;
      const dialog = root.document.createElement('dialog');
      dialog.id = 'ca-native-checkout';
      dialog.setAttribute('aria-label', 'Оформление участия в курсе');
      dialog.style.cssText = 'padding:0;border:0;border-radius:12px;width:min(760px,96vw);height:92vh;max-width:96vw;max-height:96vh;background:#fff';
      const close = root.document.createElement('button');
      close.type = 'button'; close.textContent = 'Закрыть';
      close.style.cssText = 'position:absolute;right:12px;top:8px;z-index:2;padding:8px 12px;color:#111;background:#fff;border:1px solid #ccc;border-radius:6px;font:14px sans-serif;cursor:pointer';
      const iframe = root.document.createElement('iframe');
      iframe.title = 'Штатная форма оформления курса';
      iframe.style.cssText = 'width:100%;height:100%;border:0;visibility:hidden';
      const loading = root.document.createElement('p');
      loading.textContent = 'Загружаем форму…';
      loading.setAttribute('role', 'status');
      loading.style.cssText = 'padding:56px 24px;color:#111';
      const url = new URL(original.pathname + original.search, root.location.origin);
      let closed = false;
      let fallbackTimer;
      const controllers = [];
      const cleanup = () => {
        closed = true; root.clearTimeout(fallbackTimer);
        for (const controller of controllers) controller.dispose();
        dialog.close(); dialog.remove();
        if (checkoutFromHash(root.location.hash, root.location.href)) {
          root.history.replaceState(root.history.state, '', root.location.pathname + root.location.search);
        }
      };
      const fallback = () => {
        if (closed) return;
        let destination = original.href;
        try {
          const current = new URL(iframe.contentWindow.location.href);
          if (current.origin === root.location.origin && /^\/cs\/[a-f0-9]{32}$/.test(current.pathname)) destination = current.href;
        } catch (_) {}
        cleanup(); root.location.href = destination;
      };
      const loadingFrame = () => {
        if (closed) return;
        iframe.style.visibility = 'hidden';
        loading.textContent = 'Открываем оформление…'; loading.hidden = false;
        root.clearTimeout(fallbackTimer); fallbackTimer = root.setTimeout(fallback, 15000);
      };
      close.addEventListener('click', cleanup);
      dialog.addEventListener('cancel', event => { event.preventDefault(); cleanup(); });
      iframe.addEventListener('load', () => {
        if (closed) return;
        let installed = false;
        try {
          const installedDocument = iframe.contentDocument;
          const controller = installPaymentFrame(iframe.contentWindow, {
            isActive: () => !closed && iframe.contentDocument === installedDocument,
            redirect: destination => { if (!closed && iframe.contentDocument === installedDocument) root.location.href = destination; }
          });
          if (controller) { controllers.push(controller); installed = true; }
          else installed = installFrame(iframe.contentWindow,
            () => orderVariables(state, clientId, original.searchParams.get('tariff'), Date.now()), loadingFrame);
        } catch (_) {}
        if (!installed) { fallback(); return; }
        root.clearTimeout(fallbackTimer); loading.hidden = true; iframe.style.visibility = 'visible';
      });
      iframe.src = url.href;
      dialog.append(close, loading, iframe); root.document.body.append(dialog); dialog.showModal();
      fallbackTimer = root.setTimeout(fallback, 15000);
    }

    // A real same-origin href also works for Cmd/Ctrl-click, context menu and copied links.
    // The original native href remains in data-ca-native-checkout for native click analytics.
    function prepareLinks() {
      for (const link of root.document.querySelectorAll('a[href]')) {
        const original = nativeCheckout(link.href, root.location.href);
        if (!original) continue;
        link.dataset.caNativeCheckout = original.href;
        link.href = wrappedCheckout(original, root.location.href);
      }
    }
    prepareLinks();
    new root.MutationObserver(prepareLinks).observe(root.document.body,
      { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    root.document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const original = nativeCheckout(link.dataset.caNativeCheckout || link.href, root.location.href) ||
        checkoutFromHash(new URL(link.href, root.location.href).hash, root.location.href);
      if (!original) return;
      event.preventDefault(); openCheckout(original);
    });
    const initial = checkoutFromHash(root.location.hash, root.location.href);
    if (initial) openCheckout(initial);
    root.addEventListener('hashchange', () => {
      const original = checkoutFromHash(root.location.hash, root.location.href);
      if (original) openCheckout(original);
    });
  }

  const api = { capture, touch, orderVariables, enrichData, installFrame, installPaymentFrame,
    prodamusDestination, retryableLinkFailure,
    nativeCheckout, wrappedCheckout, checkoutFromHash, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CAAttribution = api;
})(typeof window === 'undefined' ? globalThis : window);

if (typeof window !== "undefined") window.CAAttribution.install();
