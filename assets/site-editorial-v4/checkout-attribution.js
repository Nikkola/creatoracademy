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

  function installFrame(frameWindow, metadata) {
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
    // Keep the native legal controls and native payment handler; leave iframe on submission.
    form.target = '_top';
    frameWindow.__caOrderAttribution = true;
    return true;
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
      const cleanup = () => {
        closed = true; root.clearTimeout(fallbackTimer); dialog.close(); dialog.remove();
        if (checkoutFromHash(root.location.hash, root.location.href)) {
          root.history.replaceState(root.history.state, '', root.location.pathname + root.location.search);
        }
      };
      const fallback = () => { if (closed) return; cleanup(); root.location.href = original.href; };
      close.addEventListener('click', cleanup);
      dialog.addEventListener('cancel', event => { event.preventDefault(); cleanup(); });
      iframe.addEventListener('load', () => {
        if (closed) return;
        let installed = false;
        try { installed = installFrame(iframe.contentWindow,
          () => orderVariables(state, clientId, original.searchParams.get('tariff'), Date.now())); } catch (_) {}
        if (!installed) { fallback(); return; }
        root.clearTimeout(fallbackTimer); loading.remove(); iframe.style.visibility = 'visible';
      }, { once: true });
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

  const api = { capture, touch, orderVariables, enrichData, installFrame,
    nativeCheckout, wrappedCheckout, checkoutFromHash, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CAAttribution = api;
})(typeof window === 'undefined' ? globalThis : window);

if (typeof window !== "undefined") window.CAAttribution.install();
