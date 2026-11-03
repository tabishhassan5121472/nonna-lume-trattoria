(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const seg = (p, a, b) => clamp((p - a) / (b - a));

  // Deterministic pseudo-random so the illustration is identical every load
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ---------------------------------------------------------------
     HERO — build the spaghetti nest
  --------------------------------------------------------------- */
  function buildNest() {
    const back = $("#strandsBack"), front = $("#strandsFront"), shine = $("#strandsShine"), dangles = $("#dangles");
    const cx = 300, top = 268, rows = 22;
    for (let i = 0; i < rows; i++) {
      const t = i / (rows - 1);
      const profile = Math.sin(Math.PI * (0.12 + t * 0.82)); // round nest silhouette
      const rx = 60 + profile * 112 + (rnd() - 0.5) * 10;
      const ry = rx * (0.24 + rnd() * 0.08);
      const cy = top + t * 128;
      const tilt = (rnd() - 0.5) * 14;
      const ox = (rnd() - 0.5) * 10;
      const tf = `rotate(${tilt.toFixed(2)} ${cx} ${cy.toFixed(1)})`;
      const w = (5.2 + rnd() * 2.2).toFixed(2);
      const x0 = cx + ox - rx, x1 = cx + ox + rx;
      el("path", { d: `M${x0} ${cy} A${rx} ${ry} 0 0 1 ${x1} ${cy}`, "stroke-width": w, transform: tf }, back);
      el("path", { d: `M${x0} ${cy} A${rx} ${ry} 0 0 0 ${x1} ${cy}`, "stroke-width": w, transform: tf }, front);
      if (i % 2 === 0) {
        el("path", {
          d: `M${x0 + rx * 0.35} ${cy + ry * 0.8} A${rx} ${ry} 0 0 0 ${x1 - rx * 0.2} ${cy + ry * 0.75}`,
          "stroke-width": 1.6, "stroke-opacity": 0.7, "stroke-dasharray": "26 104",
          "stroke-dashoffset": (rnd() * 130).toFixed(0), transform: tf,
          style: `animation-delay:-${(rnd() * 3).toFixed(2)}s`,
        }, shine);
      }
    }
    // A few loose strands that tumble out of the nest
    const d = [
      "M232 392 C 222 440, 252 470, 238 520 S 248 580, 262 598",
      "M282 404 C 290 450, 270 490, 290 540 S 300 590, 296 612",
      "M336 400 C 350 446, 330 470, 352 520 S 360 560, 350 588",
      "M372 380 C 398 420, 384 452, 404 486",
      "M210 370 C 186 404, 196 436, 180 466",
    ];
    d.forEach((p, i) => {
      el("path", { d: p, "stroke-width": i < 3 ? 6 : 5, style: `animation-delay:-${i * 0.8}s` }, dangles);
    });
  }

  /* ---------------------------------------------------------------
     BALLET — ingredients, spiral, plating
  --------------------------------------------------------------- */
  const C = { x: 500, y: 600 };        // plate centre
  const S = { x: 500, y: 540 };        // swirl centre
  const placements = {
    ribbon: [[-20, -10, 0], [10, 20, 40], [0, -30, -50], [-10, 10, 80], [20, 0, 120]],
    tomato: [[-150, -60, 10], [128, -96, -20], [158, 74, 30], [-118, 112, 0], [24, -152, 50], [-30, 36, -10]],
    basil: [[-48, -26, -30], [64, 28, 40], [-92, -116, 10], [112, -18, 80], [6, 122, -60]],
    mussel: [[-212, 18, -100], [204, -30, 70], [-58, -204, 10], [82, 194, 160]],
    shrimp: [[-76, -62, 20], [92, 96, -150], [44, -64, 200]],
    oil: [[-246, -110, 0], [238, 112, 0], [-180, 190, 0], [196, -176, 0], [14, 252, 0], [-8, -258, 0]],
  };
  const finalScale = { ribbon: 0.5, tomato: 0.95, basil: 0.95, mussel: 0.9, shrimp: 1, oil: 0.45 };
  const flyers = [];
  let nestPaths = [];

  function buildBallet() {
    const host = $("#flyers");
    const types = Object.keys(placements);
    let idx = 0;
    const total = types.reduce((n, t) => n + placements[t].length, 0);
    // Interleave so the spiral reads as a mix of colours
    const order = [];
    const max = Math.max(...types.map((t) => placements[t].length));
    for (let i = 0; i < max; i++) types.forEach((t) => { if (placements[t][i]) order.push([t, placements[t][i]]); });

    order.forEach(([type, [fx, fy, fr]]) => {
      const a = (idx / total) * Math.PI * 2 + rnd() * 0.3;
      const startR = 820 + rnd() * 200;
      const node = type === "ribbon"
        ? el("path", {
            d: "M-110 0 C -80 -36, -40 36, 0 0 S 70 -36, 110 0",
            fill: "none", stroke: "url(#gRibbon)", "stroke-width": 13, "stroke-linecap": "round",
          }, host)
        : el("use", { href: `#ing-${type}` }, host);
      const len = type === "ribbon" ? node.getTotalLength() : 0;
      if (len) { node.style.strokeDasharray = len; node.style.strokeDashoffset = len; }
      flyers.push({
        node, type, len,
        sx: 500 + Math.cos(a) * startR, sy: 500 + Math.sin(a) * startR,
        a0: a + Math.PI * 0.35, R: 300 + rnd() * 110, spin: (rnd() - 0.5) * 520,
        fx: C.x + fx, fy: C.y + fy, fr, fs: finalScale[type],
        delay: rnd() * 0.06,
      });
      idx++;
    });

    // The plated nest that appears as the ribbons land
    const g = $("#platedNest");
    for (let i = 0; i < 16; i++) {
      const rx = 150 - i * 7.5 + (rnd() - 0.5) * 12;
      const ry = rx * (0.8 + rnd() * 0.15);
      const rot = rnd() * 180;
      const ox = (rnd() - 0.5) * 22, oy = (rnd() - 0.5) * 18;
      const p = el("path", {
        d: `M${C.x - rx + ox} ${C.y + oy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`,
        "stroke-width": (8 + rnd() * 3).toFixed(1), transform: `rotate(${rot.toFixed(1)} ${C.x} ${C.y})`,
      }, g);
      const L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
      nestPaths.push({ p, L, d: i * 0.012 });
    }
  }

  const chapters = [
    { n: "01", name: "Il mercato", cap: "Ribbons of pasta, sun-split tomatoes and mussels from the morning boat arrive at the pass." },
    { n: "02", name: "Il vortice", cap: "Everything turns together — oil, basil, shellfish — the way Nonna stirs: slowly, and never in a hurry." },
    { n: "03", name: "Il piatto", cap: "It lands warm on the plate. Linguine allo scoglio, finished with a thread of new olive oil." },
  ];
  let currentChapter = -1;
  function setChapter(i, animate) {
    if (i === currentChapter) return;
    currentChapter = i;
    const c = chapters[i];
    const num = $("#chapterNum"), name = $("#chapterName"), cap = $("#chapterCap");
    const swap = () => { num.textContent = c.n; name.textContent = c.name; cap.textContent = c.cap; };
    if (!animate || !hasGsap) return swap();
    gsap.timeline()
      .to([num, name, cap], { y: -14, opacity: 0, duration: 0.25, stagger: 0.04, ease: "power2.in", onComplete: swap })
      .fromTo([num, name, cap], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.06, ease: "power3.out" });
  }

  function renderBallet(p, animate = true) {
    // p: 0 → 1 over the pinned scroll
    flyers.forEach((f) => {
      const q = clamp((p - f.delay) / (1 - f.delay));
      const t1 = ease(seg(q, 0, 0.3));     // fly in from the edges
      const t2 = seg(q, 0.3, 0.64);        // spiral
      const t3 = ease(seg(q, 0.64, 0.92)); // land on the plate
      // Point on the orbit at the start of the spiral
      const e0x = S.x + Math.cos(f.a0) * f.R, e0y = S.y + Math.sin(f.a0) * f.R;
      // Spiral position
      const ang = f.a0 + ease(t2) * Math.PI * 2.1;
      const rad = lerp(f.R, f.R * 0.42, ease(t2));
      const spx = S.x + Math.cos(ang) * rad, spy = S.y + Math.sin(ang) * rad;
      let x, y;
      if (q < 0.3) { x = lerp(f.sx, e0x, t1); y = lerp(f.sy, e0y, t1); }
      else if (q < 0.64) { x = spx; y = spy; }
      else {
        const endA = f.a0 + Math.PI * 2.1, endR = f.R * 0.42;
        const ex = S.x + Math.cos(endA) * endR, ey = S.y + Math.sin(endA) * endR;
        x = lerp(ex, f.fx, t3); y = lerp(ey, f.fy, t3) - Math.sin(t3 * Math.PI) * 40; // little arc as it drops
      }
      const rot = lerp(f.spin, 0, t3) * (1 - t3) + f.fr * t3 + Math.sin(q * 9 + f.a0) * 12 * (1 - t3);
      const sc = lerp(1.25, f.fs, t3) * lerp(0.6, 1, t1);
      f.node.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(3)})`);
      if (f.len) {
        f.node.style.strokeDashoffset = (f.len * (1 - easeOut(seg(q, 0, 0.26)))).toFixed(1);
        f.node.style.opacity = (1 - seg(q, 0.82, 0.94)).toFixed(3);
      }
    });
    nestPaths.forEach(({ p: path, L, d }) => {
      const t = easeOut(seg(p, 0.72 + d, 0.9 + d * 0.5));
      path.style.strokeDashoffset = (L * (1 - t)).toFixed(1);
    });
    $("#sauce").setAttribute("opacity", (seg(p, 0.7, 0.86) * 0.92).toFixed(3));
    $("#balletBar").style.transform = `scaleX(${p.toFixed(4)})`;
    setChapter(p < 0.3 ? 0 : p < 0.66 ? 1 : 2, animate);
  }

  /* ---------------------------------------------------------------
     MENU — cursor-following illustration
  --------------------------------------------------------------- */
  function initMenu() {
    const card = $("#cursorCard"), use = $("#cursorUse");
    if (!hasGsap || !window.matchMedia("(hover: hover)").matches) return;
    const xTo = gsap.quickTo(card, "x", { duration: 0.55, ease: "power3" });
    const yTo = gsap.quickTo(card, "y", { duration: 0.55, ease: "power3" });
    gsap.set(card, { xPercent: -50, yPercent: -50, x: innerWidth / 2, y: innerHeight / 2 });
    let first = true;
    window.addEventListener("pointermove", (e) => {
      if (first) { gsap.set(card, { x: e.clientX + 110, y: e.clientY }); first = false; }
      xTo(e.clientX + 110); yTo(e.clientY);
    }, { passive: true });
    document.querySelectorAll(".dish").forEach((d) => {
      d.addEventListener("pointerenter", () => {
        use.setAttribute("href", `#ing-${d.dataset.ing}`);
        gsap.to(card, { opacity: 1, scale: 1, rotation: gsap.utils.random(-8, 8), duration: 0.5, ease: "back.out(1.8)", overwrite: "auto" });
        gsap.fromTo(use, { rotation: -25, scale: 0.6, svgOrigin: "0 0" }, { rotation: 0, scale: 1.05, svgOrigin: "0 0", duration: 0.6, ease: "back.out(2)" });
      });
      d.addEventListener("pointerleave", () => {
        gsap.to(card, { opacity: 0, scale: 0.4, duration: 0.35, ease: "power2.in", overwrite: "auto" });
      });
    });
  }

  /* ---------------------------------------------------------------
     RESERVATION
  --------------------------------------------------------------- */
  const state = { date: null, guests: 2, time: null };
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
  const fmtLong = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

  function initReserve() {
    const pills = $("#datePills"), indicator = $("#dateIndicator");
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (d.getDay() === 1) continue; // closed Mondays
      const b = document.createElement("button");
      b.type = "button"; b.className = "pill";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", fmtLong.format(d));
      b.innerHTML = `<small>${i === 0 ? "Today" : fmtDay.format(d)}</small><b>${d.getDate()}</b>`;
      b.dataset.label = fmtLong.format(d);
      b.addEventListener("click", () => selectDate(b, true));
      pills.appendChild(b);
    }
    const moveIndicator = (b, animate) => {
      const props = { x: b.offsetLeft, width: b.offsetWidth };
      if (hasGsap && animate && !reduce) gsap.to(indicator, { ...props, duration: 0.6, ease: "elastic.out(1, 0.75)" });
      else if (hasGsap) gsap.set(indicator, props);
      else { indicator.style.transform = `translateX(${props.x}px)`; }
    };
    function selectDate(b, animate) {
      pills.querySelectorAll(".pill").forEach((p) => p.setAttribute("aria-pressed", String(p === b)));
      state.date = b.dataset.label;
      moveIndicator(b, animate);
    }
    const firstPill = pills.querySelector(".pill");
    selectDate(firstPill, false);
    window.addEventListener("resize", () => {
      const sel = pills.querySelector('[aria-pressed="true"]');
      if (sel) moveIndicator(sel, false);
    });

    // Guests stepper with rolling number
    const val = $("#guestVal"), minus = $("#guestMinus"), plus = $("#guestPlus");
    const setGuests = (n, dir) => {
      n = clamp(n, 1, 10);
      if (n === state.guests && dir) return;
      state.guests = n;
      minus.disabled = n <= 1; plus.disabled = n >= 10;
      const span = document.createElement("span");
      span.textContent = n;
      if (hasGsap && dir && !reduce) {
        const old = val.firstElementChild;
        span.style.position = "absolute"; span.style.left = 0; span.style.right = 0; span.style.top = 0;
        val.appendChild(span);
        gsap.fromTo(span, { yPercent: dir * 100 }, { yPercent: 0, duration: 0.45, ease: "power3.out", onComplete: () => { span.style.position = ""; } });
        gsap.to(old, { yPercent: -dir * 100, duration: 0.45, ease: "power3.out", onComplete: () => old.remove() });
      } else {
        val.replaceChildren(span);
      }
    };
    minus.addEventListener("click", () => setGuests(state.guests - 1, -1));
    plus.addEventListener("click", () => setGuests(state.guests + 1, 1));
    setGuests(2, 0);

    // Time slots
    const slotsHost = $("#timeSlots");
    const times = ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
    const full = new Set(["19:30", "21:00"]);
    times.forEach((t) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "slot"; b.textContent = t;
      b.setAttribute("aria-pressed", "false");
      if (full.has(t)) { b.disabled = true; b.setAttribute("aria-label", `${t}, fully booked`); }
      b.addEventListener("click", () => {
        slotsHost.querySelectorAll(".slot").forEach((s) => s.setAttribute("aria-pressed", String(s === b)));
        state.time = t;
        if (hasGsap && !reduce) gsap.fromTo(b, { scale: 0.92 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
      });
      slotsHost.appendChild(b);
    });
    const defSlot = slotsHost.querySelector(".slot:nth-child(4)");
    defSlot.setAttribute("aria-pressed", "true"); state.time = defSlot.textContent;

    // Entrance stagger for pills and slots
    if (hasGsap && !reduce) {
      gsap.from(".pill, .slot", {
        y: 24, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.035,
        scrollTrigger: { trigger: ".card", start: "top 80%", once: true },
      });
    }

    // Submit → confirmation (purely local, no network)
    const form = $("#booking"), btn = $("#submitBtn"), confirm = $("#confirm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true;
      const name = $("#guestName").value.trim();
      $("#confirmName").textContent = name ? `, ${name.split(" ")[0]}` : "";
      $("#confirmGuests").textContent = state.guests;
      $("#confirmDate").textContent = state.date;
      $("#confirmTime").textContent = state.time;
      $("#confirmCode").textContent = "NL-" + String(Math.floor(1000 + Math.random() * 9000));

      const showConfirm = () => {
        form.hidden = true; confirm.hidden = false;
        if (hasGsap && !reduce) {
          gsap.from(confirm.children, { y: 26, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" });
        }
        confirm.querySelector("button").focus({ preventScroll: true });
      };
      if (!hasGsap || reduce) return showConfirm();

      gsap.timeline({ onComplete: showConfirm })
        .to(".submit__label", { y: -30, opacity: 0, duration: 0.3, ease: "power2.in" })
        .to(btn, { width: 64, duration: 0.55, ease: "power3.inOut" }, "<0.1")
        .to(".submit__spin", { opacity: 1, duration: 0.2 }, "-=0.15")
        .to(".submit__spin", { rotation: 720, svgOrigin: "25 25", duration: 1.1, ease: "power1.inOut" }, "<")
        .to(".submit__spin", { opacity: 0, duration: 0.2 })
        .to(btn, { backgroundColor: "#4f7a3a", scale: 1.12, duration: 0.3, ease: "power2.out" }, "<")
        .set(".submit__check", { opacity: 1 }, "<")
        .to(".submit__check path", { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" }, "<")
        .add(burst, "<")
        .to(btn, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" }, "<0.1")
        .to({}, { duration: 0.6 })
        .to(form, { opacity: 0, y: -10, duration: 0.4, ease: "power2.in" });
    });

    function burst() {
      const host = $("#burst");
      const kinds = ["tomato", "basil", "oil", "tomato", "basil", "nest"];
      for (let i = 0; i < 16; i++) {
        const s = el("svg", { viewBox: "-40 -40 80 80" }, host);
        el("use", { href: `#ing-${kinds[i % kinds.length]}`, transform: "scale(.7)" }, s);
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const r = 90 + Math.random() * 90;
        gsap.fromTo(s, { x: 0, y: 0, scale: 0.2, opacity: 1, rotation: 0 }, {
          x: Math.cos(a) * r, y: Math.sin(a) * r - 40, scale: 0.6 + Math.random() * 0.5,
          rotation: (Math.random() - 0.5) * 360, duration: 1.1, ease: "power3.out",
        });
        gsap.to(s, { opacity: 0, y: "+=60", duration: 0.6, delay: 0.7, ease: "power1.in", onComplete: () => s.remove() });
      }
    }

    $("#resetBtn").addEventListener("click", () => {
      confirm.hidden = true; form.hidden = false; btn.disabled = false;
      if (hasGsap) {
        gsap.set(form, { clearProps: "opacity,transform" });
        gsap.set(btn, { clearProps: "width,backgroundColor,transform" });
        gsap.set(".submit__label", { clearProps: "all" });
        gsap.set([".submit__spin", ".submit__check"], { opacity: 0 });
        gsap.set(".submit__check path", { strokeDashoffset: 40 });
      }
      btn.focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------------------------
     BOOT
  --------------------------------------------------------------- */
  buildNest();
  buildBallet();
  // Frame the plate tighter on narrow screens
  const fitStage = () => $("#balletSvg").setAttribute("viewBox", innerWidth < 860 ? "90 160 820 820" : "0 0 1000 1000");
  fitStage();
  window.addEventListener("resize", fitStage);
  initReserve();
  initMenu();

  // Pause hero CSS loops when offscreen
  const hero = $(".hero");
  new IntersectionObserver(([e]) => hero.classList.toggle("is-paused", !e.isIntersecting)).observe(hero);

  if (!hasGsap || reduce) { renderBallet(1, false); return; }

  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll, driven by GSAP's ticker
  if (typeof window.Lenis !== "undefined") {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
      });
    });
  }

  // Hero intro
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from(".hero__title .line > span", { yPercent: 110, duration: 1.4, stagger: 0.12 })
    .from(".hero .eyebrow, .hero__lede, .hero__actions", { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, "-=1.1")
    .from(".hero__art", { scale: 0.85, opacity: 0, rotation: -12, duration: 1.8 }, "-=1.3");
  gsap.to(".hero__art svg", {
    yPercent: 14, rotation: 6, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // Pinned ingredient ballet
  renderBallet(0, false);
  const proxy = { p: 0 };
  gsap.to(proxy, {
    p: 1, ease: "none",
    onUpdate: () => renderBallet(proxy.p),
    scrollTrigger: { trigger: ".ballet", start: "top top", end: "+=280%", pin: true, scrub: 1 },
  });

  // Nav: frosted bar once scrolled, ink colour over cream sections
  const nav = $(".nav");
  ScrollTrigger.create({ start: 40, end: "max", onToggle: (st) => nav.classList.toggle("is-scrolled", st.isActive) });
  [$(".ballet").parentElement, $(".menu")].forEach((trg) => ScrollTrigger.create({
    trigger: trg, start: "top 40px", end: "bottom 40px",
    onToggle: (st) => nav.classList.toggle("is-dark", st.isActive),
  }));

  // Menu reveal
  gsap.utils.toArray(".dish").forEach((d) => {
    gsap.from(d, { y: 40, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: d, start: "top 90%", once: true } });
  });
  gsap.utils.toArray(".section-head, .reserve__intro").forEach((h) => {
    gsap.from(h.children, { y: 30, opacity: 0, duration: 1, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: h, start: "top 85%", once: true } });
  });
})();
