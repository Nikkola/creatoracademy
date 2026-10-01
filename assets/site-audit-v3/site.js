// Скролл до секций

// SaleBot scrolls its landing container; standalone HTML scrolls the window.
function auditScrollRoot() {
  for (let parent = document.querySelector('.page')?.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return window;
}
function auditScrollPosition(root = auditScrollRoot()) {
  return root === window ? window.scrollY : root.scrollTop;
}
function auditScrollTo(top, behavior = 'smooth', root = auditScrollRoot()) {
  root.scrollTo({ top, behavior });
}

function handleClickLink(event) {
  const block = event.currentTarget.dataset.block;
  const scrollToBlock = document.getElementById(block);
  if (!scrollToBlock) return;
  event.preventDefault();
  if (menu?.contains(event.currentTarget)) setMenu(false, false);
  const root = auditScrollRoot();
  const origin = root === window ? 0 : root.getBoundingClientRect().top + root.clientTop;
  auditScrollTo(auditScrollPosition(root) + scrollToBlock.getBoundingClientRect().top - origin - 100, 'smooth', root);
}

document.querySelectorAll(".menu__item").forEach((elem) => {
  elem.addEventListener("click", handleClickLink);
});
const bookBtn = document.querySelector(".book-btn");
bookBtn?.addEventListener("click", handleClickLink);

// Всплывающее меню

function showFixedBanner() {
  const header = document.querySelector('.header-fixed');
  if (!header) return;
  const desktop = window.matchMedia('(min-width: 768px)').matches;
  header.classList.toggle('shown', desktop);
  header.classList.toggle('hidden', !desktop);
  header.inert = !desktop;
  header.setAttribute('aria-hidden', String(!desktop));
  // The original in-flow header keeps its space; the identical fixed copy
  // provides navigation without duplicate keyboard or screen-reader targets.
  const original = document.querySelector('.page > header:not(.header-fixed)');
  if (original) {
    original.inert = true;
    original.setAttribute('aria-hidden', 'true');
  }
}
showFixedBanner();
window.matchMedia('(min-width: 768px)').addEventListener('change', showFixedBanner);

function throttle(callee, timeout) {
  let timer = null;
  return function perform(...args) {
    if (timer) return;
    timer = setTimeout(() => {
      callee(...args);
      clearTimeout(timer);
      timer = null;
    }, timeout);
  };
}

// Кнопка скрола наверх

 const scrollBtn = document.getElementById('scrollTopBtn');
  function updateScrollButton() {
    scrollBtn?.classList.toggle('visible', auditScrollPosition() > 300);
  }
  document.addEventListener('scroll', updateScrollButton, true);
  window.addEventListener('scroll', updateScrollButton);
  scrollBtn?.querySelector('button')?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    auditScrollTo(0);
  }, true);
  updateScrollButton();

window.addEventListener("scroll", throttle(showFixedBanner, 250), false);

// Скролл клиентов

const site$ = window.creatorAcademyJQuery || window.jQuery;
if (site$) {
  site$.fn.andSelf = function () { return this.addBack.apply(this, arguments); };
}

const scrollContainer = document.getElementById("clients-scroll");
const scrollContainerScnd = document.getElementById("clients-scroll-scnd");
const page = document.querySelector(".page");

try {
  site$(document).ready(function () {
    const owl = site$(".clients__list-mobile-carousel");
    owl.owlCarousel({
      loop: true,
      margin: 0,
      nav: true,
      navText: [
        "<i class='fa fa-caret-left'></i>",
        "<i class='fa fa-caret-right'></i>",
      ],
      touchDrag: true,
      autoplay: 0.5,
      autoplayHoverPause: true,
      responsive: {
        0: {
          items: 2,
        },
      },
    });
  });
} catch (e) {
  console.log(e);
}

// Скролл отзывов

const box = document.getElementById("reviews-container");

let isDown = false;
let startX;
let scrollLeft;

if (box) {
  box.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - box.offsetLeft;
    scrollLeft = box.scrollLeft;
    box.style.cursor = "grabbing";
  });

  box.addEventListener("mouseleave", () => {
    isDown = false;
    box.style.cursor = "grab";
  });

  box.addEventListener("mouseup", () => {
    isDown = false;
    box.style.cursor = "grab";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - box.offsetLeft;
    const walkX = x - startX;
    box.scrollLeft = scrollLeft - walkX;
  });
}

// Скролл "Вы научитесь"

document.querySelectorAll('.learn__list').forEach((list) => {
  let start;
  list.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    start = { x: event.pageX, left: list.scrollLeft };
    list.style.cursor = 'grabbing';
  });
  document.addEventListener('mouseup', () => { start = null; list.style.cursor = 'grab'; });
  document.addEventListener('mousemove', event => {
    if (!start) return;
    event.preventDefault();
    list.scrollLeft = start.left - (event.pageX - start.x);
  });
});

// Гамбургер-меню

const menu = document.querySelector(".menu");
const menuItems = document.querySelectorAll(".menuItem");
const hamburger = document.querySelector(".hamburger");
const closeIcon = document.querySelector(".closeIcon");
const menuIcon = document.querySelector(".menuIcon");

let lockedScroll = null;
let previousBodyTop = "";
let lockedScrollRoot = null;
let previousOverflowY = '';
function lockScroll() {
  if (lockedScroll !== null) return;
  lockedScrollRoot = auditScrollRoot();
  lockedScroll = auditScrollPosition(lockedScrollRoot);
  if (lockedScrollRoot !== window) {
    previousOverflowY = lockedScrollRoot.style.overflowY;
    lockedScrollRoot.style.overflowY = 'hidden';
    return;
  }
  previousBodyTop = document.body.style.top;
  document.body.style.top = '-' + lockedScroll + 'px';
  document.body.classList.add('audit-scroll-locked');
}
function unlockScroll() {
  if (lockedScroll === null) return;
  const position = lockedScroll;
  const root = lockedScrollRoot;
  lockedScroll = null;
  lockedScrollRoot = null;
  if (root !== window) {
    root.style.overflowY = previousOverflowY;
    auditScrollTo(position, 'instant', root);
    updateScrollButton();
    return;
  }
  document.body.classList.remove('audit-scroll-locked');
  document.body.style.top = previousBodyTop;
  auditScrollTo(position, 'instant', window);
  updateScrollButton();
}
function setMenu(open, restoreFocus = true) {
  if (!menu || !hamburger) return;
  menu.classList.toggle('showMenu', open);
  menu.inert = !open;
  menu.setAttribute('aria-hidden', String(!open));
  hamburger.setAttribute('aria-expanded', String(open));
  if (closeIcon) closeIcon.style.display = open ? 'block' : 'none';
  if (menuIcon) menuIcon.style.display = open ? 'none' : 'block';
  if (open) {
    lockScroll();
    menu.querySelector('a, button')?.focus({ preventScroll: true });
  } else {
    unlockScroll();
    if (restoreFocus) hamburger.focus({ preventScroll: true });
  }
}
hamburger?.addEventListener('click', () => setMenu(!menu.classList.contains('showMenu')));
menu?.querySelectorAll('a:not([href^="#"])').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (!menu?.classList.contains('showMenu')) return;
  if (event.key === 'Escape') setMenu(false);
  if (event.key === 'Tab') {
    const targets = [hamburger, ...menu.querySelectorAll('a[href], button')];
    const current = targets.indexOf(document.activeElement);
    if (event.shiftKey && current <= 0) { event.preventDefault(); targets.at(-1).focus(); }
    else if (!event.shiftKey && current === targets.length - 1) { event.preventDefault(); hamburger.focus(); }
  }
});
window.matchMedia('(min-width: 768px)').addEventListener('change', event => {
  if (event.matches && menu?.classList.contains('showMenu')) setMenu(false, false);
});

try {
  site$(document).ready(function () {
    var owl = site$(".gallery__list").filter(function () { return !this.closest(".portfolio-category"); });
    owl.owlCarousel({
      loop: true,
      margin: 0,
      dots: false,
      touchDrag: true,
      lazyLoad: true,
      responsive: {
        0: {
          items: 1,
          margin: 50,
        },
        768: {
          items: 4,
          margin: 5,
        },
        1200: {
          items: 4,
          margin: 10,
        },
        1920: {
          items: 4,
          margin: 20,
        },
      },
    });
  });
} catch (e) {
  console.log(e);
}
try {
  site$(document).ready(function () {
    var owl = site$(".reels").filter(function () { return !this.closest(".portfolio-category"); });
    owl.owlCarousel({
      loop: true,
      lazyLoad: true,
      margin: 0,
      dots: false,
      touchDrag: true,
      responsive: {
        0: {
          items: 1,
          margin: 50,
        },
        768: {
          items: 5,
          margin: 5,
        },
        1200: {
          items: 5,
          margin: 10,
        },
        1920: {
          items: 5,
          margin: 20,
        },
      },
    });
  });
} catch (e) {
  console.log(e);
}

// Кейсы выпускников
try {
  site$(document).ready(function () {
    var owl = site$(".cases__slider");
    owl.owlCarousel({
      loop: true,
      margin: 12,
      dots: false,
      touchDrag: true,
      mouseDrag: true,
      responsive: {
        0: { items: 1 },
        768: { items: 2 },
        1200: { items: 2, stagePadding: 40 },
      },
    });
  });
} catch (e) {
  console.log(e);
}

// Embed providers use their own iframe controls. Unloading the iframe stops both.
(function () {
  const iframe = document.getElementById('player');
  const overlay = document.querySelector('.modal-component');
  const component = document.querySelector('.video-modal-component');
  const loader = document.getElementById('loader');
  const close = overlay?.querySelector('.modal__close');
  if (!iframe || !overlay || !component || !close) return;
  let opener = null;
  let timer = null;
  let active = false;
  const finish = () => {
    if (!active) return;
    clearTimeout(timer);
    loader.style.display = 'none';
    component.style.display = 'block';
    iframe.setAttribute('aria-busy', 'false');
  };
  function closeVideo() {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    iframe.onload = null;
    iframe.onerror = null;
    iframe.src = 'about:blank';
    iframe.setAttribute('aria-busy', 'false');
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    loader.style.display = 'none';
    unlockScroll();
    opener?.focus({ preventScroll: true });
  }
  // Owl creates new loop clones after initialization; delegated clicks include them.
  document.addEventListener('click', event => {
    const button = event.target.closest('.play-btn');
    if (!button) return;
    let url;
    try { url = new URL(button.dataset.link); } catch { return; }
    const vk = /^(?:[\w-]+\.)?(?:vk\.com|vk\.ru|vkvideo\.ru)$/.test(url.hostname);
    const kinescope = url.hostname === 'kinescope.io';
    if (url.protocol !== 'https:' || (!vk && !kinescope)) return;
    if (menu?.classList.contains('showMenu')) setMenu(false, false);
    opener = menu?.contains(button) ? hamburger : button;
    active = true;
    lockScroll();
    component.classList.toggle('reels-modal', button.dataset.type === 'reels');
    overlay.style.display = 'block';
    overlay.setAttribute('aria-hidden', 'false');
    component.style.display = 'block';
    loader.style.display = 'block';
    iframe.setAttribute('aria-busy', 'true');
    if (vk) url.searchParams.set('js_api', '1');
    url.searchParams.set('autoplay', '1');
    iframe.onload = finish;
    iframe.onerror = finish;
    iframe.src = url.href;
    // A cross-origin load event cannot confirm playback; keep controls available
    // even if the provider never finishes loading.
    clearTimeout(timer);
    timer = setTimeout(finish, 15000);
    close.focus({ preventScroll: true });
  });
  close.addEventListener('click', closeVideo);
  overlay.querySelector('.x-modal-overlay')?.addEventListener('click', closeVideo);
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); closeVideo(); }
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === close) { event.preventDefault(); iframe.focus(); }
      else if (!event.shiftKey && document.activeElement === iframe) { event.preventDefault(); close.focus(); }
    }
  });
})();

// Lazy-loading fade
document.addEventListener("DOMContentLoaded", function () {
  const lazyImages = document.querySelectorAll(".lazy");

  const lazyLoad = (image) => {
    const src = image.getAttribute("data-src");
    if (!src) return;
    image.onload = () => image.classList.add("lazy-loaded");
    image.onerror = () => image.classList.add("lazy-loaded");
    image.src = src;
    if (image.complete) image.classList.add("lazy-loaded");
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        lazyLoad(entry.target);
        observer.unobserve(entry.target);
      }
    });
  });

  lazyImages.forEach((image) => {
    observer.observe(image);
  });
});


site$(function () { site$('.how__bottom, .kit__grid').owlCarousel({loop:true,dots:false,nav:false,touchDrag:true,mouseDrag:true,responsive:{0:{items:1,margin:12,stagePadding:20},768:{items:2,margin:16,stagePadding:24},1200:{items:3,margin:20,stagePadding:30}}}); });

document.querySelectorAll('.about').forEach(function(section) {
 const track = section.querySelector('.about__list');
 const slides = Array.from(track.querySelectorAll(':scope > .about__block'));
 const dots = Array.from(section.querySelectorAll('.about-slider-dots button'));
 let drag = null;
 let dragged = false;
 function nearestSlideIndex() {
  const left = track.getBoundingClientRect().left;
  return slides.reduce(function(best, slide, index) {
   return Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(slides[best].getBoundingClientRect().left - left) ? index : best;
  }, 0);
 }
 track.addEventListener('pointerdown', function(event) {
  dragged = false;
  if ((event.pointerType === 'mouse' && event.button !== 0) || event.target.closest('button,a,input,summary')) return;
  if (event.pointerType !== 'mouse' && event.pointerType !== 'touch') return;
  drag = { id:event.pointerId, x:event.clientX, y:event.clientY, scroll:track.scrollLeft, moved:false, touch:event.pointerType === 'touch', startIndex:nearestSlideIndex(), started:event.timeStamp };
  if (!drag.touch) track.setPointerCapture(event.pointerId);
 });
 track.addEventListener('pointermove', function(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const delta = event.clientX - drag.x;
  const vertical = event.clientY - drag.y;
  if (drag.touch && !drag.moved) {
   if (Math.abs(vertical) > 8 && Math.abs(vertical) > Math.abs(delta)) { drag = null; return; }
   if (Math.abs(delta) < 8 || Math.abs(delta) < Math.abs(vertical) * 1.2) return;
   drag.moved = true;
   track.setPointerCapture(event.pointerId);
   track.classList.add('is-dragging');
  } else if (!drag.touch && Math.abs(delta) > 4) {
   drag.moved = true;
   track.classList.add('is-dragging');
  }
  if (drag.moved) {
   event.preventDefault();
   track.scrollLeft = drag.scroll - delta;
  }
 });
 function finishDrag(event, cancelled) {
  if (!drag || drag.id !== event.pointerId) return;
  const completed = drag;
  dragged = completed.moved;
  drag = null;
  track.classList.remove('is-dragging');
  if (completed.touch && completed.moved && !cancelled) {
   const delta = event.clientX - completed.x;
   const elapsed = Math.max(1, event.timeStamp - completed.started);
   const threshold = Math.max(22, track.clientWidth * .14);
   const quickFlick = Math.abs(delta) / elapsed > .22;
   const direction = Math.abs(delta) >= threshold || quickFlick ? (delta < 0 ? 1 : -1) : 0;
   select(completed.startIndex + direction, true);
  }
 }
 track.addEventListener('pointerup', finishDrag);
 track.addEventListener('pointercancel', function(event) { finishDrag(event, true); });
 track.addEventListener('click', function(event) {
  if (!dragged) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  dragged = false;
 }, true);
 function slidePosition(slide) {
  return track.scrollLeft + slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
 }
 function select(index, scroll) {
  const target = Math.max(0, Math.min(index, slides.length - 1));
  dots.forEach(function(dot, i) {
   if (i === target) dot.setAttribute('aria-current', 'true');
   else dot.removeAttribute('aria-current');
  });
  if (scroll) track.scrollTo({left:slidePosition(slides[target]),behavior:'smooth'});
 }
 dots.forEach(function(dot, index) { dot.addEventListener('click', function() { select(index, true); }); });
 let frame = 0;
 track.addEventListener('scroll', function() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(function() {
   const current = slides.reduce(function(best, slide, index) {
    return Math.abs(slide.getBoundingClientRect().left - track.getBoundingClientRect().left) < Math.abs(slides[best].getBoundingClientRect().left - track.getBoundingClientRect().left) ? index : best;
   }, 0);
   select(current, false);
  });
 }, {passive:true});
});

document.querySelectorAll('.portfolio-category').forEach(function(category) {
 category.prepareDisclosure = function() {
  if (!category.open) return;
  category.querySelectorAll('img[data-portfolio-src]').forEach(function(img) {
   img.src = img.dataset.portfolioSrc;
   img.dataset.src = img.dataset.portfolioSrc;
   img.removeAttribute('data-portfolio-src');
  });
  const slider = site$(category).find('.owl-carousel');
  if (!slider.hasClass('owl-loaded')) slider.owlCarousel({
   loop:true,dots:false,touchDrag:true,mouseDrag:true,lazyLoad:true,
   responsive:{0:{items:1,margin:16,stagePadding:20},768:{items:3,margin:16},1200:{items:4,margin:20}}
  });
  else slider.trigger('refresh.owl.carousel');
 };
 category.addEventListener('toggle', function() {
  if (!category.classList.contains('disclosure-moving')) category.prepareDisclosure();
 });
});

(function () {
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 document.querySelectorAll('.portfolio-category, .faq__item').forEach(function (item) {
  const summary = item.querySelector('summary');
  const original = item.querySelector('.gallery__block, .faq__answer');
  const panel = document.createElement('div');
  panel.className = 'disclosure-panel';
  original.before(panel); panel.append(original);
  let desired = item.open, frame = 0, timer = 0;
  function settle() {
   clearTimeout(timer);
   item.open = desired;
   panel.style.height = desired ? 'auto' : '0px';
   panel.style.opacity = desired ? '1' : '0';
   item.classList.remove('disclosure-moving');
   panel.style.transition = '';
  }
  function change(open) {
   cancelAnimationFrame(frame); clearTimeout(timer);
   const height = item.open ? panel.getBoundingClientRect().height : 0;
   desired = open;
   item.classList.add('disclosure-moving');
   // Establish the collapsed frame while native details content becomes visible.
   // Otherwise browsers may treat the target height as its first rendered frame.
   panel.style.transition = 'none';
   panel.style.height = height + 'px';
   panel.style.opacity = height > 0 ? getComputedStyle(panel).opacity : '0';
   item.open = true;
   if (open && item.prepareDisclosure) item.prepareDisclosure();
   void panel.offsetHeight;
   if (reduced.matches) { settle(); return; }
   frame = requestAnimationFrame(function () {
    panel.style.transition = '';
    void panel.offsetHeight;
    frame = requestAnimationFrame(function () {
     panel.style.height = desired ? original.getBoundingClientRect().height + 'px' : '0px';
     panel.style.opacity = desired ? '1' : '0';
     timer = setTimeout(settle, 540);
    });
   });
  }
  summary.addEventListener('click', function (event) {
   event.preventDefault();
   if (item.classList.contains('faq__item') && !desired) {
    document.querySelectorAll('.faq__item').forEach(function (other) {
     if (other !== item && other.closeDisclosure) other.closeDisclosure();
    });
   }
   change(!desired);
  });
  item.closeDisclosure = function () { if (desired) change(false); };
  item.addEventListener('toggle', function () {
   if (!item.classList.contains('disclosure-moving')) {
    desired = item.open;
    panel.style.height = desired ? 'auto' : '0px';
    panel.style.opacity = desired ? '1' : '0';
   }
  });
  panel.addEventListener('transitionend', function (event) {
   if (event.target === panel && event.propertyName === 'height') settle();
  });
  settle();
 });
})();
