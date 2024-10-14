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
          items: 3,
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

// VK player
try {
  $(document).ready(function () {
    const iframe = document.getElementById("player");

    const player = VK.VideoPlayer(iframe);

    function stopVideo() {
      player?.pause();
    }

    function handleVideoClick(event) {
      const link = `${event.currentTarget.dataset.link}&js_api=1`;
      loadVideo(link);
      const modalOverlay = document.querySelector(".modal-component");
      modalOverlay.setAttribute("style", "display:block;");
    }
    function loadVideo(videoId) {
      iframe.src = videoId;
      player?.play();
    }
    function handleCloseModal(event) {
      stopVideo();
      const modalOverlay = document.querySelector(".modal-component");
      modalOverlay.setAttribute("style", "display:none;");
    }

    document.querySelectorAll(".play-btn").forEach((elem) => {
      elem.addEventListener("click", handleVideoClick);
    });

    document.querySelectorAll(".modal__close").forEach((elem) => {
      elem.addEventListener("click", handleCloseModal);
    });
  });
} catch (e) {
  console.log(e);
}

// Гамбургер-меню

const menu = document.querySelector(".menu");
const menuItems = document.querySelectorAll(".menuItem");
const hamburger = document.querySelector(".hamburger");
const closeIcon = document.querySelector(".closeIcon");
const menuIcon = document.querySelector(".menuIcon");

function toggleMenu() {
  if (menu.classList.contains("showMenu")) {
    menu.classList.remove("showMenu");
    closeIcon.style.display = "none";
    menuIcon.style.display = "block";
  } else {
    menu.classList.add("showMenu");
    closeIcon.style.display = "block";
    menuIcon.style.display = "none";
  }
}

hamburger.addEventListener("click", toggleMenu);

menuItems.forEach(function (menuItem) {
  menuItem.addEventListener("click", toggleMenu);
});

try {
  $(document).ready(function () {
    var owl = $(".gallery__list");
    owl.owlCarousel({
      loop: true,
      margin: 0,
      dots: false,
      touchDrag: true,
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
