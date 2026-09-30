// Скролл до секций

function handleClickLink(event) {
  const block = event.currentTarget.dataset.block;
  const scrollToBlock = document.getElementById(block);
  if (!scrollToBlock) return;
  event.preventDefault();
  if (menu?.contains(event.currentTarget)) setMenu(false, false);
  window.scrollTo({
    top: window.scrollY + scrollToBlock.getBoundingClientRect().top - 100,
    behavior: "smooth",
  });
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
  window.addEventListener('scroll', () => {
    scrollBtn?.classList.toggle('visible', window.scrollY > 300);
  });

window.addEventListener("scroll", throttle(showFixedBanner, 250), false);

// Скролл клиентов

if (window.jQuery) {
  $.fn.andSelf = function () { return this.addBack.apply(this, arguments); };
}

const scrollContainer = document.getElementById("clients-scroll");
const scrollContainerScnd = document.getElementById("clients-scroll-scnd");
const page = document.querySelector(".page");

try {
  $(document).ready(function () {
    const owl = $(".clients__list-mobile-carousel");
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
function lockScroll() {
  if (lockedScroll !== null) return;
  lockedScroll = window.scrollY;
  previousBodyTop = document.body.style.top;
  document.body.style.top = '-' + lockedScroll + 'px';
  document.body.classList.add('audit-scroll-locked');
}
function unlockScroll() {
  if (lockedScroll === null) return;
  const position = lockedScroll;
  lockedScroll = null;
  document.body.classList.remove('audit-scroll-locked');
  document.body.style.top = previousBodyTop;
  window.scrollTo({ top: position, behavior: 'instant' });
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
  $(document).ready(function () {
    var owl = $(".gallery__list");
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
  $(document).ready(function () {
    var owl = $(".reels");
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
  $(document).ready(function () {
    var owl = $(".cases__slider");
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


// FAQ аккордион

try {
  (function () {
    var items = document.querySelectorAll(".faq__item");
    if (!items.length) return;

    var DURATION = 420; // синхронно с transition в faq.css

    function openItem(item) {
      var answer = item.querySelector(".faq__answer");
      item.open = true;
      answer.style.maxHeight = answer.scrollHeight + "px";
      // после анимации снимаем фиксированную высоту,
      // чтобы блок мог тянуться (адаптив, перенос строк)
      window.setTimeout(function () {
        if (item.open) answer.style.maxHeight = "none";
      }, DURATION);
    }

    function closeItem(item) {
      var answer = item.querySelector(".faq__answer");
      // фиксируем текущую высоту, затем уводим в 0
      answer.style.maxHeight = answer.scrollHeight + "px";
      requestAnimationFrame(function () {
        answer.style.maxHeight = "0px";
      });
      window.setTimeout(function () {
        item.open = false;
      }, DURATION);
    }

    items.forEach(function (item) {
      var summary = item.querySelector(".faq__q");

      summary.addEventListener("click", function (e) {
        e.preventDefault(); // берём управление раскрытием на себя

        if (item.open) {
          closeItem(item);
          return;
        }

        // режим аккордеона: закрываем остальные открытые
        items.forEach(function (other) {
          if (other !== item && other.open) closeItem(other);
        });

        openItem(item);
      });
    });

    // первый вопрос открыт по умолчанию
    openItem(items[0]);
  })();
} catch (e) {
  console.log(e);
}
