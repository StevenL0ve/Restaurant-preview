/* Corktown Wine & Spirits — interactions */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  var progress = document.getElementById("progress");

  /* Nav background + scroll progress bar */
  function onScroll() {
    if (window.scrollY > 40) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  function closeMenu() {
    links.classList.remove("open");
    nav.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    nav.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeMenu); });

  /* Kinetic hero headline + reveal trigger */
  var hero = document.querySelector(".hero");
  if (hero) requestAnimationFrame(function () { hero.classList.add("kin"); });

  /* Rotating word */
  var rotator = document.getElementById("rotator");
  if (rotator && !reduce) {
    var words = ["wine", "bourbon", "agave", "champagne", "mezcal"];
    var i = 0;
    setInterval(function () {
      i = (i + 1) % words.length;
      rotator.style.transition = "opacity .25s ease, transform .25s ease";
      rotator.style.opacity = "0";
      rotator.style.transform = "translateY(-8px)";
      setTimeout(function () {
        rotator.textContent = words[i];
        rotator.style.opacity = "1";
        rotator.style.transform = "translateY(0)";
      }, 260);
    }, 2200);
  }

  /* Scroll reveal */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Animated stat counters */
  function runCounter(el) {
    var txt = el.getAttribute("data-text");
    if (txt) { el.textContent = txt; return; }
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target + suffix; return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll("[data-count],[data-text]");
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* Parallax on the about image */
  var aboutImg = document.getElementById("aboutImg");
  if (aboutImg && !reduce) {
    window.addEventListener("scroll", function () {
      var r = aboutImg.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        var offset = (r.top - window.innerHeight / 2) * -0.05;
        aboutImg.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      }
    }, { passive: true });
  }

  /* Draggable / swipeable gallery */
  var track = document.getElementById("galleryTrack");
  if (track) {
    var down = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener("pointerdown", function (e) {
      down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add("dragging"); track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    function end() { down = false; track.classList.remove("dragging"); }
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
    track.addEventListener("pointerleave", end);
    /* prevent click-drag from triggering link/image jumps */
    track.addEventListener("click", function (e) { if (moved) e.preventDefault(); }, true);
    /* let vertical wheel scroll the strip horizontally */
    track.addEventListener("wheel", function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { track.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
  }

  /* If a background <video> can't load any source, reveal the layer behind it.
     (Fires only on a real failure — remote clips are allowed to buffer.) */
  document.querySelectorAll(".hero__video, .reel__video").forEach(function (v) {
    function fail() { v.style.opacity = "0"; v.style.display = v.classList.contains("hero__video") ? "none" : ""; }
    v.addEventListener("error", fail, true);
    /* <source> error bubbles to the element; also catch when the last source fails */
    var sources = v.querySelectorAll("source");
    if (sources.length) sources[sources.length - 1].addEventListener("error", fail);
  });

  /* Footer year */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
