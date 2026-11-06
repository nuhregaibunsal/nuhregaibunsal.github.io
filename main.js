document.documentElement.classList.add("js");
document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------ reveal on scroll */
const revealer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      revealer.unobserve(entry.target);
    });
  },
  { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  // small stagger for siblings that appear together
  el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
  revealer.observe(el);
});

/* ------------------------------------------------ nav state */
const nav = document.querySelector(".nav");
const links = [...document.querySelectorAll(".nav nav a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));

function onScroll() {
  nav.classList.toggle("scrolled", window.scrollY > 8);
  const y = window.scrollY + window.innerHeight * 0.35;
  let current = -1;
  sections.forEach((s, i) => {
    if (s && s.offsetTop <= y) current = i;
  });
  links.forEach((a, i) => a.classList.toggle("active", i === current));
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ------------------------------------------------ event-stream canvas */
(function stream() {
  const canvas = document.getElementById("stream");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0;
  let H = 0;
  let colors = {};
  let running = false;
  let last = 0;

  const producers = [
    { label: "orders", y: 0.2 },
    { label: "telemetry", y: 0.5 },
    { label: "prices", y: 0.8 }
  ];
  const partitions = [0.3, 0.5, 0.7].map((y, i) => ({ y, label: `P${i}`, offset: 0, cells: [] }));
  const consumers = [
    { label: "group A", y: 0.36, reads: [0, 1], pulse: 0, acked: 0 },
    { label: "group B", y: 0.68, reads: [2], pulse: 0, acked: 0 }
  ];
  const messages = [];
  const spawnTimers = producers.map(() => Math.random() * 0.8);

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    colors = {
      ink: v("--ink"),
      muted: v("--muted"),
      line: v("--line"),
      paper: v("--paper"),
      signal: v("--signal"),
      accent: v("--accent")
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // geometry helpers (all in CSS pixels)
  const narrow = () => W < 460;
  const px = () => (narrow() ? 0.13 : 0.12) * W;
  const topicX0 = () => W * (narrow() ? 0.32 : 0.34);
  const topicX1 = () => W * (narrow() ? 0.68 : 0.66);
  const cx = () => W * 0.88;

  function bezier(a, b, t) {
    const mx = (a.x + b.x) / 2;
    const u = 1 - t;
    // cubic with horizontal tangents
    const x = u * u * u * a.x + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * b.x;
    const y = u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y;
    return { x, y };
  }

  function spawn(pi) {
    const part = Math.floor(Math.random() * partitions.length);
    messages.push({
      producer: pi,
      part,
      stage: 0, // 0 → to topic, 1 → along partition, 2 → to consumer
      t: 0,
      hue: pi === 0 ? "signal" : pi === 1 ? "accent" : "ink"
    });
  }

  function consumerFor(part) {
    return consumers.findIndex((c) => c.reads.includes(part));
  }

  function update(dt) {
    spawnTimers.forEach((t, i) => {
      spawnTimers[i] = t - dt;
      if (spawnTimers[i] <= 0) {
        spawn(i);
        spawnTimers[i] = 0.55 + Math.random() * 0.9;
      }
    });

    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const speed = m.stage === 1 ? 0.55 : 0.9;
      m.t += dt * speed;
      if (m.t >= 1) {
        m.t = 0;
        m.stage += 1;
        if (m.stage === 1) {
          const p = partitions[m.part];
          p.offset += 1;
          p.cells.push({ hue: m.hue, age: 0 });
          if (p.cells.length > 7) p.cells.shift();
        }
        if (m.stage === 3) {
          const c = consumers[consumerFor(m.part)];
          c.pulse = 1;
          c.acked += 1;
          messages.splice(i, 1);
        }
      }
    }
    consumers.forEach((c) => (c.pulse = Math.max(0, c.pulse - dt * 2.5)));
    partitions.forEach((p) => p.cells.forEach((c) => (c.age += dt)));
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const font = getComputedStyle(document.body).fontFamily;
    const small = narrow() ? 11 : 12;
    ctx.textBaseline = "middle";

    // wires
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = colors.line;
    producers.forEach((p) => {
      partitions.forEach((part) => {
        wire({ x: px() + 14, y: p.y * H }, { x: topicX0(), y: part.y * H });
      });
    });
    partitions.forEach((part, i) => {
      const c = consumers[consumerFor(i)];
      wire({ x: topicX1(), y: part.y * H }, { x: cx() - 16, y: c.y * H });
    });
    ctx.setLineDash([]);

    // topic box
    const tx0 = topicX0();
    const tx1 = topicX1();
    const ty0 = H * 0.16;
    const ty1 = H * 0.84;
    roundRect(tx0, ty0, tx1 - tx0, ty1 - ty0, 14);
    ctx.fillStyle = colors.paper;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.ink;
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.font = `600 ${small}px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText("topic · events", tx0 + 12, ty0 + 16);

    // partitions with offset cells
    partitions.forEach((p) => {
      const y = p.y * H;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx0 + 34, y);
      ctx.lineTo(tx1 - 12, y);
      ctx.stroke();
      ctx.fillStyle = colors.muted;
      ctx.font = `600 ${small}px ${font}`;
      ctx.fillText(p.label, tx0 + 10, y);

      const cell = narrow() ? 9 : 11;
      const gap = 4;
      const startX = tx1 - 14 - cell;
      p.cells.forEach((c, k) => {
        const idx = p.cells.length - 1 - k;
        const x = startX - idx * (cell + gap);
        if (x < tx0 + 34) return;
        const fresh = Math.max(0, 1 - c.age * 2);
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(fresh, 1 - idx / 7);
        ctx.fillStyle = colors[c.hue];
        ctx.fillRect(x, y - cell / 2, cell, cell);
      });
      ctx.globalAlpha = 1;
      if (narrow()) return; // no room for offset labels on phones
      ctx.fillStyle = colors.muted;
      ctx.font = `400 ${small - 1}px ${font}`;
      ctx.textAlign = "right";
      ctx.fillText(`offset ${p.offset}`, tx1 - 12, y - (narrow() ? 13 : 15));
      ctx.textAlign = "left";
    });

    // producers
    producers.forEach((p, i) => {
      const x = px();
      const y = p.y * H;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fillStyle = colors[i === 0 ? "signal" : i === 1 ? "accent" : "ink"];
      ctx.fill();
      ctx.fillStyle = colors.ink;
      ctx.font = `600 ${small}px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(p.label, x, y + 26);
    });

    // consumers
    consumers.forEach((c) => {
      const x = cx();
      const y = c.y * H;
      const r = 16 + c.pulse * 6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colors.paper;
      ctx.fill();
      ctx.lineWidth = 1.5 + c.pulse * 1.5;
      ctx.strokeStyle = c.pulse > 0.05 ? colors.accent : colors.ink;
      ctx.stroke();
      ctx.fillStyle = colors.ink;
      ctx.font = `700 ${small}px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(String(c.acked % 1000), x, y);
      ctx.font = `600 ${small}px ${font}`;
      ctx.fillText(c.label, x, y + 32);
    });

    // messages
    messages.forEach((m) => {
      let pos;
      const part = partitions[m.part];
      if (m.stage === 0) {
        pos = bezier({ x: px() + 14, y: producers[m.producer].y * H }, { x: tx0, y: part.y * H }, ease(m.t));
      } else if (m.stage === 1) {
        pos = { x: tx0 + 34 + (tx1 - 12 - tx0 - 34) * m.t, y: part.y * H };
      } else {
        const c = consumers[consumerFor(m.part)];
        pos = bezier({ x: tx1, y: part.y * H }, { x: cx() - 16, y: c.y * H }, ease(m.t));
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = colors[m.hue];
      ctx.fill();
    });
  }

  function wire(a, b) {
    const mx = (a.x + b.x) / 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
    ctx.stroke();
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  readColors();
  resize();

  // pre-warm so the first frame is already busy
  for (let i = 0; i < 240; i++) update(1 / 30);
  draw();

  new ResizeObserver(() => {
    resize();
    draw();
  }).observe(canvas);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    readColors();
    draw();
  });

  new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? start() : stop()));
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  document.fonts && document.fonts.ready.then(draw);
})();
