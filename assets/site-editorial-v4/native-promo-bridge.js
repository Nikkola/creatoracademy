/* Public coupon calculation on the course's native SaleBot origin. */
(function () {
  'use strict';
  const nonce = new URLSearchParams(location.search).get('ca-promo-bridge');
  if (location.origin !== 'https://skillhub.salebot.pro' || parent === window ||
      !/^[a-f0-9-]{36}$/.test(nonce || '')) return;
  const origin = 'https://creatoracademy.ru', tariffs = new Set(['25374','25376','25375']);
  const active = new Map();
  const reply = data => parent.postMessage({...data, nonce}, origin);
  addEventListener('message', async event => {
    const data = event.data;
    if (event.origin !== origin || event.source !== parent || !data || data.nonce !== nonce ||
        !/^[a-f0-9-]{36}$/.test(data.id || '')) return;
    if (data.type === 'ca:promo:cancel') { active.get(data.id)?.abort(); return; }
    if (data.type !== 'ca:promo:request' || !tariffs.has(data.tariff) ||
        typeof data.code !== 'string' || !data.code.trim() || data.code.length > 100 || active.size >= 4) return;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 7000);
    active.set(data.id, controller);
    try {
      const response = await fetch('/courses/18784/check_promocode', {
        method:'POST', credentials:'omit', redirect:'error', signal:controller.signal,
        headers:{Accept:'application/json', 'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({tariff_id:data.tariff, code:data.code.trim().toUpperCase()})
      });
      if (!response.ok || !/application\/json/i.test(response.headers.get('content-type') || '')) throw new Error('response');
      const result = await response.json();
      if (result.success === false) reply({type:'ca:promo:result', id:data.id,
        response:{success:false, message:'Промокод не действует для этого тарифа.'}});
      else {
        const price = Number(result.discounted_price), id = Number(result.promocode_id);
        if (result.success !== true || !Number.isFinite(price) || price < 0 || price > 10000000 || !Number.isSafeInteger(id) || id <= 0) throw new Error('discount');
        reply({type:'ca:promo:result', id:data.id, response:{success:true, discounted_price:Math.round(price), promocode_id:id}});
      }
    } catch { reply({type:'ca:promo:result', id:data.id, error:'unavailable'}); }
    finally { clearTimeout(timer); active.delete(data.id); }
  });
  reply({type:'ca:promo:ready'});
})();
