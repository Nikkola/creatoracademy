// Скролл до секций

function handleClickLink(event) {
  const block = event.currentTarget.dataset.block;
  const scrollToBlock = document.getElementById(block);
  scrollToBlock.style.scrollMargin = "100px";
  seamless.scrollIntoView(scrollToBlock, {
    behavior: "smooth",
    inline: "center",
    block: "start",
  });
}

document.querySelectorAll(".menu__item").forEach((elem) => {
  elem.addEventListener("click", handleClickLink);
});
const bookBtn = document.querySelector(".book-btn");
bookBtn.addEventListener("click", handleClickLink);

// Всплывающее меню

function showFixedBanner() {
  const currentScroll = window.scrollY || document.documentElement.scrollTop;
  if (currentScroll > 700) {
    $(".header-fixed").removeClass("hidden");
    $(".header-fixed").addClass("shown");
  } else {
    $(".header-fixed").removeClass("shown");
    $(".header-fixed").addClass("hidden");
  }
}

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

window.addEventListener("scroll", throttle(showFixedBanner, 250), false);

// Скролл клиентов

$.fn.andSelf = function () {
  return this.addBack.apply(this, arguments);
};

const scrollContainer = document.getElementById("clients-scroll");
const scrollContainerScnd = document.getElementById("clients-scroll-scnd");
const page = document.querySelector(".page");

var owl = $(".owl-carousel");
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
      items: 3,
    },
  },
});

// Скролл отзывов

const box = document.getElementById("reviews-container");

let isDown = false;
let startX;
let scrollLeft;

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

// Скролл "Вы научитесь"

const boxLearn = document.getElementById("learn-container");

let isDownLearn = false;
let startXLearn;
let scrollLeftLearn;

boxLearn.addEventListener("mousedown", (e) => {
  isDownLearn = true;
  startXLearn = e.pageX - boxLearn.offsetLeft;
  scrollLeftLearn = boxLearn.scrollLeft;
  boxLearn.style.cursor = "grabbing";
});

boxLearn.addEventListener("mouseleave", () => {
  isDownLearn = false;
  boxLearn.style.cursor = "grab";
});

boxLearn.addEventListener("mouseup", () => {
  isDownLearn = false;
  boxLearn.style.cursor = "grab";
});

document.addEventListener("mousemove", (e) => {
  if (!isDownLearn) return;
  e.preventDefault();
  const x = e.pageX - boxLearn.offsetLeft;
  const walkXLearn = x - startXLearn;
  boxLearn.scrollLeft = scrollLeftLearn - walkXLearn;
});

// Youtube player

var tag = document.createElement("script");

tag.src = "https://www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    videoId: "cA3xM_3t9N4",
  });
}

function stopVideo() {
  player.stopVideo();
}

function handleYoutubeClick(event) {
  const link = event.currentTarget.dataset.link;
  loadVideo(link);
  const modalOverlay = document.querySelector(".modal-component");
  modalOverlay.setAttribute("style", "display:block;");
}
function loadVideo(videoId) {
  player?.loadVideoByUrl?.(videoId);
  player?.playVideo?.();
}
function handleCloseModal(event) {
  stopVideo();
  const modalOverlay = document.querySelector(".modal-component");
  modalOverlay.setAttribute("style", "display:none;");
}
// document.addEventListener("DOMContentLoaded", () => {
document.querySelectorAll(".play-btn").forEach((elem) => {
  elem.addEventListener("click", handleYoutubeClick);
});
// });

document.querySelectorAll(".modal__close").forEach((elem) => {
  elem.addEventListener("click", handleCloseModal);
});
