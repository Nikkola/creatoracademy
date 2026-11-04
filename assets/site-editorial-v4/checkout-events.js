/* Browser checkout diagnostics only. No payment requests or Purchase events. */
(function (root) {
  'use strict';
  if (!root.document || root.location.hostname !== 'creatoracademy.ru' || root.__caCheckoutEvents) return;
  root.__caCheckoutEvents = true;
  const tariffs = new Map([
    ['25374', { cohort: 9, tariff: 'solo' }], ['25376', { cohort: 9, tariff: 'support' }],
    ['25375', { cohort: 9, tariff: 'mentor' }], ['27349', { cohort: 10, tariff: 'solo' }],
    ['27351', { cohort: 10, tariff: 'support' }], ['27350', { cohort: 10, tariff: 'mentor' }]
  ]);
  const sessions = new WeakMap();
  let active = null;

  function technicalVisit() {
    try {
      if (new URL(root.location.href).searchParams.get('utm_source') === 'codex_owner_test') return true;
      const source = JSON.parse(root.localStorage.getItem('ca_source_v1') || 'null');
      return [source?.first?.source, source?.last?.source].includes('codex_owner_test');
    } catch (_) { return false; }
  }
  function current(session) {
    return active === session && session.dialog.open && session.frame.isConnected &&
      root.document.querySelector('#ca-native-checkout') === session.dialog;
  }
  function report(session, goal, extra) {
    if (!current(session) || technicalVisit() || typeof root.ym !== 'function') return;
    try {
      // Allowlisted metadata only: never send form contents, URLs, order IDs or raw errors.
      root.ym(106221169, 'reachGoal', goal, {
        tariff_id: session.id, ...tariffs.get(session.id), ...extra
      });
    } catch (_) { /* Analytics must not interrupt checkout. */ }
  }
  function formReady(session) {
    if (!current(session) || session.frame.style.visibility === 'hidden') return;
    try {
      const doc = session.frame.contentDocument;
      if (!doc?.querySelector('form.input_custom_data') || session.documents.has(doc)) return;
      session.documents.add(doc);
      report(session, 'ca_checkout_form_open', { stage: 'form' });
    } catch (_) { /* A native cross-origin fallback remains usable. */ }
  }
  function scan() {
    const dialog = root.document.querySelector('#ca-native-checkout');
    const frame = dialog?.querySelector('iframe');
    if (!dialog?.open || !frame) { active = null; return; }
    let session = sessions.get(dialog);
    if (!session) {
      let url;
      try { url = new URL(frame.src, root.location.href); } catch (_) { return; }
      const id = url.searchParams.get('tariff');
      if (url.origin !== root.location.origin ||
          url.pathname !== '/cs/get_form/form_input_custom_data' || !tariffs.has(id)) return;
      session = { dialog, frame, id, documents: new WeakSet(), running: false, reported: new Set() };
      sessions.set(dialog, session);
      frame.addEventListener('load', () => formReady(session));
      new root.MutationObserver(() => formReady(session)).observe(frame,
        { attributes: true, attributeFilter: ['style'] });
    }
    active = session;
    formReady(session);
  }
  function install() {
    root.document.addEventListener('ca:payment-link', event => {
      const session = active;
      if (!session || !current(session)) return;
      const { phase, attempt } = event.detail || {};
      if (!Number.isInteger(attempt) || attempt < 1 || attempt > 3) return;
      if (phase === 'preparing') {
        if (!session.running) { session.running = true; session.reported.clear(); }
        return;
      }
      if (phase === 'retrying') return;
      if (!session.running || !['redirecting', 'failed'].includes(phase) || session.reported.has(phase)) return;
      session.reported.add(phase);
      session.running = false;
      report(session, phase === 'redirecting' ? 'ca_checkout_link_ready' : 'ca_checkout_link_error',
        { stage: 'payment_link', attempts: attempt, recovered: phase === 'redirecting' && attempt > 1 });
    });
    new root.MutationObserver(scan).observe(root.document.body,
      { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    scan();
  }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window === 'undefined' ? globalThis : window);
