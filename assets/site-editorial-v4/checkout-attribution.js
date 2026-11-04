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

  function contactIssue(phone, email) {
    const raw = String(phone || '').trim(), digits = raw.replace(/\D/g, '');
    if (raw && /^[+\d\s().-]+$/.test(raw) &&
        (digits.length < 8 || digits.length > 15 || /^\+?[17]/.test(raw) && digits.length !== 11)) return 'phone';
    const address = String(email || '').trim();
    if (address && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) return 'email';
    return null;
  }

  function permanentLinkIssue(status, message) {
    const text = String(message || '');
    if (/телефон|phone/i.test(text) && /некоррект|невер|invalid|incorrect|required|обязател|долж|wrong/i.test(text)) return 'phone';
    if (/email|e-mail|почт/i.test(text) && /некоррект|невер|invalid|incorrect|required|обязател|долж|wrong/i.test(text)) return 'email';
    if ([401,403].includes(Number(status)) || /proxy.{0,30}expir|signature.{0,30}invalid|ссылк.{0,30}устар/i.test(text)) return 'expired';
    return null;
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
    const markedFields = new Map();
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
    function clearIssues() {
      for (const [field, previous] of markedFields) {
        field.style.borderBottom = previous.border;
        if (previous.aria === null) field.removeAttribute('aria-invalid');
        else field.setAttribute('aria-invalid', previous.aria);
      }
      markedFields.clear(); status.setAttribute('role','status');
    }
    function showIssue(kind) {
      busy(false); status.setAttribute('role','alert');
      status.textContent = kind === 'phone' ? 'Укажи полный номер телефона с кодом страны — нажми на карандаш рядом с номером.' :
        kind === 'email' ? 'Проверь адрес почты — нажми на карандаш рядом с ним и исправь адрес.' :
        'Эта попытка оформления устарела. Начни заново — выбранный тариф сохранится.';
      button.textContent = kind === 'expired' ? 'Начать заново' : 'Оплатить';
      const field = doc.querySelector(kind === 'phone' ? '.payment_phone_data' : kind === 'email' ? '.payment_email_data' : '[data-ca-no-field]');
      if (field) {
        if (!markedFields.has(field)) markedFields.set(field,{border:field.style.borderBottom,aria:field.getAttribute('aria-invalid')});
        field.setAttribute('aria-invalid','true');field.style.borderBottom='2px solid #b3261e';
      }
      button.scrollIntoView({block:'nearest'});
    }
    function failed(job, kind) {
      if (!active() || operation !== job) return;
      job.running = false; job.issue = kind || null; busy(false);
      if (kind) { showIssue(kind); announce('failed', job.attempt); return; }
      status.textContent = 'Не получилось открыть оплату. Попробуй ещё раз — данные сохранены.';
      button.textContent = 'Попробовать ещё раз';
      button.scrollIntoView({ block: 'nearest' });
      announce('failed', job.attempt);
    }
    function result(job, data, xhr, textStatus) {
      if (!active() || operation !== job) return;
      const destination = data && data.error !== true && prodamusDestination(data.payment_link);
      if (destination) {
        // Link generation is complete even if browser navigation is interrupted.
        job.running = false; busy(false); button.textContent = 'Оплатить';
        status.textContent = 'Открываем страницу оплаты…';
        announce('redirecting', job.attempt);
        controls.redirect(destination);
        return;
      }
      const issue = permanentLinkIssue(xhr?.status, data?.error_message);
      if (issue) { failed(job, issue); return; }
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
      else if (operation?.issue === 'expired' && button.contains(event.target)) {
        event.preventDefault(); event.stopImmediatePropagation(); controls.restart();
      }
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
      clearIssues();
      const issue = contactIssue(doc.querySelector('.payment_phone_data > span')?.textContent,
        doc.querySelector('.payment_email_data > span')?.textContent);
      if (issue) { operation = null; showIssue(issue); xhr.abort('invalid_contact'); return; }
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
    frameWindow.addEventListener('pageshow', event => { if (event.persisted) cancel(); });
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

function applyCheckoutLayout(dialog, frame){
 const owner=dialog.ownerDocument,doc=frame.contentDocument;
 dialog.style.maxWidth='calc(100vw - 16px)';
 const close=dialog.querySelector('button');
 close.setAttribute('aria-label','Закрыть');close.title='Закрыть';
 close.style.cssText='position:absolute;right:8px;top:8px;z-index:2;display:grid;place-items:center;width:44px;height:44px;padding:0;color:#30343b;background:transparent;border:0;border-radius:50%;cursor:pointer;box-sizing:border-box;touch-action:manipulation';
 const icon=owner.createElementNS('http://www.w3.org/2000/svg','svg');
 icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('width','20');icon.setAttribute('height','20');icon.setAttribute('aria-hidden','true');icon.setAttribute('focusable','false');
 const strokes=owner.createElementNS('http://www.w3.org/2000/svg','path');
 strokes.setAttribute('d','M6 6l12 12M18 6L6 18');strokes.setAttribute('fill','none');strokes.setAttribute('stroke','currentColor');strokes.setAttribute('stroke-width','1.8');strokes.setAttribute('stroke-linecap','round');
 icon.append(strokes);close.replaceChildren(icon);
 if(!doc?.head)return;
 const style=doc.getElementById('ca-checkout-compact-layout')||doc.createElement('style');style.id='ca-checkout-compact-layout';
 style.textContent=`
 html{scroll-padding-block:12px}
 body{margin:0!important}
 .students-sessions{box-sizing:border-box!important;width:auto!important;max-width:620px!important;margin:16px auto!important;padding:0 16px!important}
 .students-sessions__title{margin-bottom:12px!important;padding-right:44px!important}
 .students-sessions__info{padding:12px!important}
 form.input_custom_data{margin-top:12px!important}
 .students-sessions__input{min-height:44px!important;height:44px!important;padding:12px 14px!important;font-size:16px!important;margin-bottom:8px!important}
 .input_custom_data_custom_email{margin-bottom:8px!important}
 .custom-tel{margin-bottom:8px!important}
 .promocode-field{margin-bottom:8px!important}
 .salebot-checkbox-field{margin-top:4px!important;margin-bottom:4px!important}
 .salebot-checkbox{min-height:44px!important}
 .form-actions p{margin:8px 0!important;font-size:14px!important;line-height:20px!important}
 .students-sessions__button{min-height:48px!important;margin-bottom:8px!important}
 .payment_information{box-sizing:border-box!important;margin:0 auto!important;width:100%!important;max-width:680px!important;padding:16px!important}
 .payment_information__header{padding-right:44px!important;margin-bottom:12px!important}
 .payment_information__container{padding:0!important}
 .payment_information__body{display:block!important;padding:0!important}
 .payment_information__block{margin-top:0!important}
 .payment_information__order,.payment_information__payer{display:flex!important;flex-direction:column;gap:8px!important;box-sizing:border-box!important;width:100%!important;padding:0!important;margin:0 0 16px!important}
 .payment_information__order-header,.payment_information__payer-header{margin:0!important}
 .payment_information__wrapper{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);align-items:start;gap:6px 12px;margin:0!important}
 .payment_information__title{grid-column:1;margin:0!important}
 .payment_information__text{grid-column:2;min-width:0;margin:0!important;overflow-wrap:anywhere;white-space:normal!important}
 .payment-information--edit-wrapper{grid-column:1/-1}
 .payment_information__btn-container{margin-top:12px!important;padding:0!important}
 .payment_information__btn{min-height:48px!important}
 .ca-payment-link-status:empty{display:none}
 html.ca-checkout-desktop{min-height:0!important;height:auto!important}
 .ca-checkout-desktop body{display:flow-root!important;min-height:0!important;height:auto!important;padding:0!important}
 .ca-checkout-desktop .students-sessions{max-height:none!important}
 .ca-checkout-desktop main{margin-top:0!important;margin-bottom:0!important}
 `;
 if(!style.parentNode)doc.head.append(style);
 if(!doc.body||!doc.querySelector('.students-sessions,.payment_information'))return;
 const view=owner.defaultView;
 const fit=()=>{
  if(!dialog.isConnected||frame.contentDocument!==doc)return;
  const desktop=view.matchMedia('(min-width:768px)').matches;
  doc.documentElement.classList.toggle('ca-checkout-desktop',desktop);
  dialog.style.maxHeight=desktop?'calc(100dvh - 32px)':'calc(100dvh - 16px)';
  const height=desktop?Math.min(Math.ceil(doc.body.getBoundingClientRect().height),Math.max(0,(view.visualViewport?.height||view.innerHeight)-32))+'px':'calc(100dvh - 16px)';
  if(dialog.style.height!==height)dialog.style.height=height;
 };
 fit();
 const observer=view.ResizeObserver?new view.ResizeObserver(fit):null;observer?.observe(doc.body);
 view.addEventListener('resize',fit);view.visualViewport?.addEventListener('resize',fit);
 // Start at the form heading instead of drawing the close button's focus ring on open.
 const heading=doc.querySelector('h1,.payment_information__header');
 if(owner.activeElement===close&&heading){heading.tabIndex=-1;heading.style.outline='none';heading.focus({preventScroll:true});}
 return{dispose(){observer?.disconnect();view.removeEventListener('resize',fit);view.visualViewport?.removeEventListener('resize',fit)}};
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
    let currentCheckout = null;

    function openCheckout(original) {
      if (currentCheckout) {
        if (currentCheckout.href === original.href) return;
        currentCheckout.close();
      }
      const dialog = root.document.createElement('dialog');
      dialog.id = 'ca-native-checkout';
      dialog.setAttribute('aria-label', 'Оформление участия в курсе');
      dialog.style.cssText = 'padding:0;border:0;border-radius:12px;width:min(760px,96vw);height:min(160px,calc(100dvh - 32px));max-width:96vw;max-height:calc(100dvh - 16px);background:#fff';
      const close = root.document.createElement('button');
      close.type = 'button'; close.textContent = 'Закрыть';
      close.style.cssText = 'position:absolute;right:12px;top:8px;z-index:2;padding:8px 12px;color:#111;background:#fff;border:1px solid #ccc;border-radius:6px;font:14px sans-serif;cursor:pointer';
      const iframe = root.document.createElement('iframe');
      // A fresh browsing-context name prevents WebKit restoring an old tariff document after Back.
      iframe.name = 'ca-checkout-' + root.crypto.randomUUID();
      iframe.title = 'Штатная форма оформления курса';
      iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;visibility:hidden';
      const loading = root.document.createElement('p');
      loading.textContent = 'Загружаем форму…';
      loading.setAttribute('role', 'status');
      loading.style.cssText = 'position:absolute;left:24px;right:24px;top:50%;transform:translateY(-50%);margin:0;color:#111;text-align:center;font:16px/1.45 sans-serif';
      const url = new URL(original.pathname + original.search, root.location.origin);
      let closed = false;
      let fallbackTimer;
      const controllers = [];
      const cleanup = () => {
        if (closed) return;
        closed = true; root.clearTimeout(fallbackTimer);
        root.removeEventListener('pagehide', leavePage);
        root.removeEventListener('pageshow', restorePage);
        for (const controller of controllers) { try { controller.dispose(); } catch (_) {} }
        dialog.close(); dialog.remove();
        if (currentCheckout?.close === cleanup) currentCheckout = null;
        if (checkoutFromHash(root.location.hash, root.location.href)) {
          try { root.history.replaceState(root.history.state, '', root.location.pathname + root.location.search); } catch (_) {}
        }
      };
      const leavePage = () => cleanup();
      const restorePage = event => { if (event.persisted) cleanup(); };
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
          const frameUrl = new URL(iframe.contentWindow.location.href);
          const restoredTariff = frameUrl.pathname === '/cs/get_form/form_input_custom_data' ? frameUrl.searchParams.get('tariff') :
            /^\/cs\/[a-f0-9]{32}$/.test(frameUrl.pathname) ? frameUrl.searchParams.get('tariff_to_pay') : null;
          if (restoredTariff && restoredTariff !== original.searchParams.get('tariff')) {
            loadingFrame(); iframe.contentWindow.location.replace(url.href); return;
          }
          const installedDocument = iframe.contentDocument;
          const controller = installPaymentFrame(iframe.contentWindow, {
            isActive: () => !closed && iframe.contentDocument === installedDocument,
            redirect: destination => { if (!closed && iframe.contentDocument === installedDocument) root.location.href = destination; },
            restart: () => { if (!closed) { cleanup(); openCheckout(original); } }
          });
          if (controller) { controllers.push(controller); installed = true; }
          else installed = installFrame(iframe.contentWindow,
            () => orderVariables(state, clientId, original.searchParams.get('tariff'), Date.now()), loadingFrame);
        } catch (_) {}
        if (!installed) { fallback(); return; }
        root.clearTimeout(fallbackTimer);
        const readyDocument=iframe.contentDocument;
        const layout=applyCheckoutLayout(dialog, iframe);if(layout)controllers.push(layout);
        root.requestAnimationFrame(()=>root.requestAnimationFrame(()=>{
          if(closed||iframe.contentDocument!==readyDocument)return;
          loading.hidden=true;iframe.style.visibility='visible';
          const heading=readyDocument.querySelector('h1,.payment_information__header');
          if(root.document.activeElement===close&&heading){heading.tabIndex=-1;heading.style.outline='none';heading.focus({preventScroll:true});}
        }));
      });
      iframe.src = url.href;
      dialog.append(close, loading, iframe); root.document.body.append(dialog); applyCheckoutLayout(dialog, iframe); dialog.showModal();
      currentCheckout = { href: original.href, close: cleanup };
      root.addEventListener('pagehide', leavePage);
      root.addEventListener('pageshow', restorePage);
      // A checkout deep link is a one-time entry, not a state to reopen on Back/reload.
      if (checkoutFromHash(root.location.hash, root.location.href)) {
        root.history.replaceState(root.history.state, '', root.location.pathname + root.location.search);
      }
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
    contactIssue, permanentLinkIssue,
    nativeCheckout, wrappedCheckout, checkoutFromHash, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CAAttribution = api;
})(typeof window === 'undefined' ? globalThis : window);

if (typeof window !== "undefined") window.CAAttribution.install();
