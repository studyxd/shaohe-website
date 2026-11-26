/* =========================================================================
   勺禾官网 · 交互脚本（WorkBuddy 风格：克制、极简）
   ========================================================================= */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  /* 1. 入场 */
  const reveal = () => {
    const els = $$("[data-reveal]");
    if (reduce.matches || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.1 }
    );
    els.forEach((e) => io.observe(e));
  };

  /* 2. 导航 */
  const nav = () => {
    const el = $(".nav");
    if (!el) return;
    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        el.classList.toggle("stuck", window.scrollY > 8);
        const top = $(".to-top");
        if (top) top.classList.toggle("on", window.scrollY > window.innerHeight * 0.8);
        raf = null;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const top = $(".to-top");
    if (top) top.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" }));

    const burger = $(".nav__burger");
    const drawer = $(".nav__drawer");
    if (burger && drawer) {
      burger.addEventListener("click", () => {
        const open = drawer.classList.toggle("open");
        burger.classList.toggle("open", open);
        document.body.style.overflow = open ? "hidden" : "";
      });
      $$("a", drawer).forEach((a) => a.addEventListener("click", () => {
        drawer.classList.remove("open");
        burger.classList.remove("open");
        document.body.style.overflow = "";
      }));
    }
  };

  /* 3. 数字滚动 */
  const counters = () => {
    const els = $$("[data-count]");
    if (!els.length) return;
    if (reduce.matches) { els.forEach((e) => (e.textContent = e.dataset.count)); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / 1200, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    els.forEach((e) => io.observe(e));
  };

  /* 4. 表单 */
  const forms = () => {
    $$(".form").forEach((form) => {
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const req = $$("input[type=text], input[type=tel]", form);
        let bad = null;
        req.forEach((i) => {
          const empty = !i.value.trim();
          i.style.borderColor = empty ? "#e56" : "";
          if (empty && !bad) bad = i;
        });
        if (bad) { bad.focus(); return; }
        form.classList.add("sent");
        const b = form.querySelector("button[type=submit]");
        if (b) { b.disabled = true; b.style.opacity = "0.5"; }
      });
      $$("input", form).forEach((i) =>
        i.addEventListener("input", () => { if (i.style.borderColor) i.style.borderColor = ""; }));
    });
  };

  /* 5. 锚点平滑 */
  const anchors = () => {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!/^#[A-Za-z][\w-]*$/.test(id)) return;
      const el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault();
      const offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64) + 16;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: reduce.matches ? "auto" : "smooth" });
    });
  };

  const boot = () => { reveal(); nav(); counters(); forms(); anchors(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
