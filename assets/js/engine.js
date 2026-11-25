/* =========================================================================
   勺禾 · UI Engine
   动效全部尊重 prefers-reduced-motion
   ========================================================================= */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------------------------------------------------------------
     1. 富文本渲染：字符串 / 分段数组（"~" 前缀 = 原文加粗处 → .em）
     --------------------------------------------------------------- */
  function rich(v) {
    if (v == null) return "";
    if (typeof v === "string") return esc(v);
    return v
      .map((seg) =>
        seg.startsWith("~")
          ? `<em class="em">${esc(seg.slice(1))}</em>`
          : esc(seg)
      )
      .join("");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  const plain = (v) => (Array.isArray(v) ? v.map((s) => s.replace(/^~/, "")).join("") : String(v ?? ""));

  /* ---------------------------------------------------------------
     2. 中文逐字拆分（用于大标题入场）
     --------------------------------------------------------------- */
  function splitChars(el, baseDelay = 0) {
    if (el.dataset.split === "done") return;
    const text = el.textContent;
    el.textContent = "";
    let i = 0;
    for (const ch of text) {
      if (ch === " ") {
        el.insertAdjacentHTML("beforeend", '<span class="split-char" style="--i:' + i + '">&nbsp;</span>');
      } else {
        const span = document.createElement("span");
        span.className = "split-char";
        span.style.setProperty("--i", i);
        span.textContent = ch;
        if (el.classList.contains("grad-text")) {
          span.classList.add("grad-text");
          span.style.setProperty("--gi", i);
        }
        el.appendChild(span);
      }
      i++;
    }
    el.style.setProperty("--char-base", baseDelay + "ms");
    el.dataset.split = "done";
  }

  /* ---------------------------------------------------------------
     3. 进场观察器
     --------------------------------------------------------------- */
  function initReveal() {
    const targets = $$("[data-reveal]");
    if (reduce.matches || !("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
  }

  /* ---------------------------------------------------------------
     4. 导航：吸顶、进度、当前章节
     --------------------------------------------------------------- */
  function initNav() {
    const nav = $(".nav");
    if (!nav) return;
    const progress = $(".nav-progress", nav);
    const links = $$(".nav-link[href^='#']");
    const sections = links
      .map((a) => ({ a, el: document.getElementById(a.getAttribute("href").slice(1)) }))
      .filter((s) => s.el);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav.classList.toggle("is-stuck", y > 40);
        if (progress) {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.setProperty("--p", h > 0 ? Math.min(y / h, 1) : 0);
        }
        const probe = y + window.innerHeight * 0.34;
        let active = null;
        for (const s of sections) {
          if (s.el.offsetTop <= probe) active = s;
        }
        links.forEach((a) => a.classList.toggle("is-active", !!active && a === active.a));

        const top = $(".to-top");
        if (top) top.classList.toggle("is-on", y > window.innerHeight * 0.9);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const top = $(".to-top");
    if (top) top.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" }));

    const burger = $(".nav-burger");
    const menu = $(".nav-mobile");
    if (burger && menu) {
      menu.id = menu.id || "mobile-navigation";
      burger.setAttribute("aria-controls", menu.id);
      burger.setAttribute("aria-expanded", "false");
      function setMenu(open, restoreFocus = false) {
        menu.classList.toggle("is-open", open);
        burger.classList.toggle("is-open", open);
        document.body.classList.toggle("menu-open", open);
        burger.setAttribute("aria-expanded", String(open));
        burger.setAttribute("aria-label", open ? "关闭菜单" : "菜单");
        if (restoreFocus) burger.focus();
      }
      burger.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
      $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false, true)));
      document.addEventListener("keydown", (event) => {
        if (!menu.classList.contains("is-open")) return;
        if (event.key === "Escape") setMenu(false, true);
        if (event.key === "Tab") {
          const items = [burger, ...$$("a[href]", menu)];
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
      window.matchMedia("(min-width: 1021px)").addEventListener("change", (event) => {
        if (event.matches) setMenu(false);
      });
    }
  }

  /* ---------------------------------------------------------------
     5. 卡片光斑跟随
     --------------------------------------------------------------- */
  function initSpotlight() {
    if (!finePointer.matches) return;
    $$(".spotlight").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
  }

  /* ---------------------------------------------------------------
     6. 数字滚动
     --------------------------------------------------------------- */
  function initCounters() {
    const els = $$("[data-count]");
    if (!els.length) return;
    if (reduce.matches) {
      els.forEach((el) => (el.textContent = el.dataset.count));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const el = e.target;
          const target = parseFloat(el.dataset.count);
          const dur = 1400;
          const t0 = performance.now();
          const step = (t) => {
            const p = Math.min((t - t0) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target;
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------
     7. 首屏 3D 视差
     --------------------------------------------------------------- */
  function initParallax() {
    if (!finePointer.matches || reduce.matches) return;
    const layers = $$("[data-parallax]");
    if (!layers.length) return;
    let raf = null;
    let tx = 0, ty = 0;
    window.addEventListener(
      "pointermove",
      (e) => {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          layers.forEach((l) => {
            const d = parseFloat(l.dataset.parallax) || 1;
            l.style.setProperty("--px", (tx * d * 10).toFixed(2) + "px");
            l.style.setProperty("--py", (ty * d * 10).toFixed(2) + "px");
          });
          raf = null;
        });
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------
     8. 分屏滚动（Growing 链路轴）
     --------------------------------------------------------------- */
  function initScrollSpyNav() {
    const rail = $("[data-rail]");
    if (!rail) return;
    const dots = $$("[data-rail-target]", rail);
    const targets = dots.map((d) => ({ d, el: document.getElementById(d.dataset.railTarget) })).filter((x) => x.el);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const t = targets.find((x) => x.el === e.target);
          if (!t) return;
          if (e.isIntersecting) dots.forEach((d) => d.classList.toggle("is-active", d === t.d));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    targets.forEach((t) => io.observe(t.el));
  }

  /* ---------------------------------------------------------------
     9. 平滑锚点（补偿固定导航高度）
     --------------------------------------------------------------- */
  function initAnchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const top = el.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 76) - 16;
      window.scrollTo({ top, behavior: reduce.matches ? "auto" : "smooth" });
      history.replaceState(null, "", id);
    });
  }

  /* ---------------------------------------------------------------
     10. 试点招募表单（前端交互，无后端）
     --------------------------------------------------------------- */
  function initForms() {
    $$(".form, .enroll-form").forEach((form) => {
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const required = $$("input[type=text], input[type=tel]", form);
        let firstBad = null;
        required.forEach((inp) => {
          const empty = !inp.value.trim();
          inp.style.borderColor = empty ? "rgba(255,140,140,.7)" : "";
          if (empty && !firstBad) firstBad = inp;
        });
        if (firstBad) { firstBad.focus(); return; }
        form.classList.add("is-sent");
        const btn = form.querySelector("button[type=submit]");
        if (btn) { btn.disabled = true; btn.style.opacity = "0.55"; }
      });
      $$("input", form).forEach((inp) =>
        inp.addEventListener("input", () => {
          if (inp.style.borderColor) inp.style.borderColor = "";
        })
      );
    });
  }

  /* ---------------------------------------------------------------
     10b. 浮游金点
     --------------------------------------------------------------- */
  function initFloaters() {
    if (reduce.matches) return;
    $$("[data-floaters]").forEach((box) => {
      const n = 14;
      let html = "";
      for (let i = 0; i < n; i++) {
        const size = 2 + Math.random() * 4;
        const left = Math.random() * 100;
        const dur = 11 + Math.random() * 12;
        const delay = -Math.random() * dur;
        const dx = (Math.random() - 0.5) * 90;
        const o = 0.28 + Math.random() * 0.45;
        html += `<i class="floater" style="
          left:${left.toFixed(2)}%;
          bottom:-6%;
          width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;
          animation-duration:${dur.toFixed(1)}s;
          animation-delay:${delay.toFixed(1)}s;
          --dx:${dx.toFixed(0)}px;
          --o:${o.toFixed(2)};
        "></i>`;
      }
      box.innerHTML = html;
    });
  }

  /* ---------------------------------------------------------------
     10c. 金光跟随 / 金色描边生长
     --------------------------------------------------------------- */
  function initGoldFx() {
    if (!finePointer.matches) return;
    $$(".glow-follow").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });
    const rules = $$(".gold-rule");
    if (rules.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("is-in"), io.unobserve(e.target))),
        { threshold: 0.6 }
      );
      rules.forEach((r) => io.observe(r));
    }
  }

  /* ---------------------------------------------------------------
     启动
     --------------------------------------------------------------- */
  function boot() {
    /* 首屏标题逐字入场 */
    $$("[data-split-text]").forEach((el, i) => {
      splitChars(el, 120 + i * 220);
      requestAnimationFrame(() => el.classList.add("is-in"));
    });
    initReveal();
    initNav();
    initSpotlight();
    initCounters();
    initParallax();
    initScrollSpyNav();
    initAnchors();
    initForms();
    initFloaters();
    initGoldFx();
    document.documentElement.classList.add("is-ready");
  }

  window.SHAOHE = { rich, plain, esc, splitChars, reduce };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
