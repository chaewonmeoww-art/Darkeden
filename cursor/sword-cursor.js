/* =========================================================
   Sword Cursor — 독립 커서 컴포넌트 (JS)
   사용법: <link rel="stylesheet" href="cursor/sword-cursor.css">
           <script src="cursor/sword-cursor.js" defer></script>
   → 수정은 아래 CONFIG 만 바꾸면 됩니다.
   ========================================================= */
(function () {
  'use strict';

  /* ═════════════ 여기 값만 바꾸면 됩니다 ═════════════ */
  const CURSOR_IMAGE       = 'cursor/sword.png'; // 칼 이미지 (투명 PNG) — 모양은 이 파일 그대로 사용
  const CURSOR_SIZE        = 42;         // 칼 이미지 세로 크기(px). 이전 32 → 약 1.3배
  const CURSOR_HOVER_SCALE = 1.12;       // Hover 시 확대 비율 (1.10 ~ 1.15)
  const OUTLINE_COLOR      = '#FFFFFF';  // 칼 주변 흰색 그림자(drop-shadow) 색
  const OUTLINE_OPACITY    = .6;         // 흰색 그림자 진하기 (0 ~ 1)
  const OUTLINE_BLUR       = 2;          // 흰색 그림자 번짐(px) — 클수록 부드러움
  const GLOW_COLOR         = '#D90000';  // 칼 바깥 붉은 빛 색
  const GLOW_INTENSITY     = 1;          // 빛 세기 (0 = 없음, 1 = 기본, 2 = 강하게)
  const TRAIL_COUNT        = 3;          // 이동 잔상 최대 개수 (2 ~ 3)
  const TRAIL_DURATION     = 200;        // 잔상이 사라지는 시간(ms) (150 ~ 250)
  const CLICK_DURATION     = 250;        // 클릭 베기 효과 전체 시간(ms) (200 ~ 300)
  /* ═══════════════════════════════════════════════════ */

  const hexRgb = hex => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
  };
  const GLOW_RGB = hexRgb(GLOW_COLOR);
  const clamp01 = v => Math.max(0, Math.min(1, v));

  /* ───────────────────────── CONFIG ───────────────────────── */
  const CONFIG = {
    image: CURSOR_IMAGE,
    size: CURSOR_SIZE,
    tip: { x: 0.99, y: 0.004 },  // 이미지 안에서 칼끝 위치(0~1) = 실제 클릭 지점(Hotspot)
    bladeAngle: -50,             // 손잡이 → 칼끝 방향(도). 0=오른쪽, -90=위쪽

    outline: {                  // 딱딱한 테두리 대신 흰색 drop-shadow 로 표현
      color: OUTLINE_COLOR,
      opacity: OUTLINE_OPACITY,
      blur: OUTLINE_BLUR,
      hoverOpacity: Math.min(1, OUTLINE_OPACITY + .25),
      width: 0, hoverWidth: 0   // (그려진 외곽선은 사용하지 않음)
    },

    color: {
      glowIdle:  'rgba(' + GLOW_RGB + ', ' + clamp01(.55 * GLOW_INTENSITY) + ')',
      glowHover: 'rgba(' + GLOW_RGB + ', ' + clamp01(.9 * GLOW_INTENSITY) + ')',
      trail:     GLOW_RGB,                 // 잔상 색 (r, g, b)
      sparks:    ['255, 70, 40', GLOW_RGB, '255, 140, 100'], // 스파크 색
      slashEdge: GLOW_RGB,                 // 베기 궤적 바깥색
      slashCore: '255, 200, 185'           // 베기 궤적 중심 하이라이트
    },

    glow: { idleBlur: 3 * GLOW_INTENSITY, hoverBlur: 6 * GLOW_INTENSITY }, // 빛 번짐(px)

    trail: {
      max: TRAIL_COUNT,
      life: TRAIL_DURATION,
      spawnDistance: 18,    // 이만큼(px) 움직일 때마다 잔상 1개
      spawnInterval: 45,    // 잔상 생성 최소 간격(ms)
      opacity: .45,         // 잔상 시작 투명도 (붉은 빛 + 아주 약한 칼날 형태)
      blur: 1.6             // 잔상 번짐(px) — 칼 실루엣이 또렷하게 반복되지 않도록
    },

    hover: {
      scale: CURSOR_HOVER_SCALE,
      sparks: [1, 2],       // 나타나는 스파크 개수 [최소, 최대]
      flash: 1.45,          // Hover 순간 칼날이 밝아지는 정도
      shineDuration: 180    // Hover 전환 시간(ms)
    },

    click: {
      duration: CLICK_DURATION,
      thrust: 6,            // 앞으로 나가는 거리(px)
      sparks: [3, 5],       // 튀는 파편 개수 [최소, 최대]
      slashLength: 52,      // 베기 궤적 길이(px)
      slashWidth: 5,        // 베기 궤적 두께(px)
      slashLife: CLICK_DURATION
    },

    // 자동으로 '클릭 가능'으로 인식할 요소
    clickable: [
      'a[href]', 'button', 'summary', 'label[for]',
      '[role="button"]', '[role="link"]', '[role="tab"]', '[onclick]',
      'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
      'input[type="checkbox"]', 'input[type="radio"]', 'input[type="image"]',
      '[tabindex]:not([tabindex="-1"])',
      '[class*="card"]', '[data-cursor="hover"]'
    ].join(','),

    // 기본 시스템 커서를 그대로 쓸 요소 (칼 커서는 잠시 숨김)
    text: [
      'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"])',
      'textarea', 'select', '[contenteditable=""]', '[contenteditable="true"]'
    ].join(','),

    // 이 속성이 있는 영역에서는 커스텀 커서를 끔
    ignore: '[data-cursor="native"]'
  };
  /* ─────────────────────────────────────────────────────────── */

  // 마우스(정밀 포인터 + hover 가능) 환경에서만 동작 — 모바일/터치 비활성화
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!finePointer.matches) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rad = CONFIG.bladeAngle * Math.PI / 180;
  const DIR = { x: Math.cos(rad), y: Math.sin(rad) };   // 검이 향하는 방향
  const PERP = { x: -DIR.y, y: DIR.x };                  // 수직 방향
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = ([a, b]) => Math.round(rand(a, b));

  /* ---------- DOM ---------- */
  const root = document.createElement('div');
  root.className = 'sc-root is-hidden';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<canvas class="sc-fx"></canvas>' +
    '<div class="sc-cursor"><div class="sc-sword">' +
      '<canvas class="sc-img sc-img--base"></canvas>' +
      '<canvas class="sc-img sc-img--hover"></canvas>' +
    '</div></div>';
  const canvas = root.querySelector('.sc-fx');
  const ctx = canvas.getContext('2d');
  const cursorEl = root.querySelector('.sc-cursor');
  const baseEl = root.querySelector('.sc-img--base');
  const hoverEl = root.querySelector('.sc-img--hover');

  /* ---------- 상태 ---------- */
  const S = {
    x: -100, y: -100, w: 0, h: 0, tipX: 0, tipY: 0,
    visible: false, hover: false, suppressed: false,
    scale: 1, dpr: 1, running: false, dirty: true,
    lastGhost: { x: 0, y: 0, t: 0 },
    ghosts: [], sparks: [], slashes: []
  };
  let ghostSprite = null;   // 잔상용 붉은 실루엣

  /* ---------- 초기화 ---------- */
  const img = new Image();
  img.onload = () => {
    S.h = CONFIG.size;
    S.w = Math.round(CONFIG.size * img.naturalWidth / img.naturalHeight);
    S.tipX = S.w * CONFIG.tip.x;
    S.tipY = S.h * CONFIG.tip.y;
    S.pad = Math.ceil(CONFIG.outline.hoverWidth + 1);
    applyCssVars();
    ghostSprite = makeGhostSprite(img);
    drawOutlined(baseEl, img, 0, 0);
    drawOutlined(hoverEl, img, 0, 0);
    document.body.appendChild(root);
    document.documentElement.classList.add('sc-active');
    resize();
    bindEvents();
  };
  img.src = CONFIG.image;

  function applyCssVars() {
    const c = CONFIG, st = root.style;
    st.setProperty('--sc-w', S.w + 'px');
    st.setProperty('--sc-h', S.h + 'px');
    st.setProperty('--sc-pad', S.pad + 'px');
    const wr = hexRgb(c.outline.color);
    st.setProperty('--sc-shadow', 'rgba(' + wr + ', ' + c.outline.opacity + ')');
    st.setProperty('--sc-shadow-hover', 'rgba(' + wr + ', ' + c.outline.hoverOpacity + ')');
    st.setProperty('--sc-shadow-blur', c.outline.blur + 'px');
    st.setProperty('--sc-tip-x', (c.tip.x * 100) + '%');
    st.setProperty('--sc-tip-y', (c.tip.y * 100) + '%');
    st.setProperty('--sc-glow-idle', c.color.glowIdle);
    st.setProperty('--sc-glow-hover', c.color.glowHover);
    st.setProperty('--sc-glow-idle-blur', c.glow.idleBlur + 'px');
    st.setProperty('--sc-glow-hover-blur', c.glow.hoverBlur + 'px');
    st.setProperty('--sc-flash', c.hover.flash);
    st.setProperty('--sc-hover-scale', c.hover.scale);
    st.setProperty('--sc-shine-dur', c.hover.shineDuration + 'ms');
    st.setProperty('--sc-click-dur', c.click.duration + 'ms');
    st.setProperty('--sc-thrust-x', (DIR.x * c.click.thrust).toFixed(2) + 'px');
    st.setProperty('--sc-thrust-y', (DIR.y * c.click.thrust).toFixed(2) + 'px');
    st.setProperty('--sc-cur-scale', 1);
  }

  // 원본 칼 이미지 + 칼 실루엣을 정확히 따라가는 얇은 외곽선
  // (칼 자체는 칠하지 않고, 실루엣을 사방으로 조금씩 밀어 만든 테두리 위에 원본을 그대로 올림)
  function drawOutlined(canvasEl, source, width, opacity) {
    const k = Math.max(2, window.devicePixelRatio || 1);   // 선명도용 배율
    const pad = S.pad;
    const W = S.w + pad * 2, H = S.h + pad * 2;
    canvasEl.width = Math.round(W * k);
    canvasEl.height = Math.round(H * k);
    const g = canvasEl.getContext('2d');
    g.setTransform(k, 0, 0, k, 0, 0);

    // 외곽선용 실루엣
    const sil = document.createElement('canvas');
    sil.width = canvasEl.width; sil.height = canvasEl.height;
    const sg = sil.getContext('2d');
    sg.setTransform(k, 0, 0, k, 0, 0);
    sg.drawImage(source, pad, pad, S.w, S.h);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = CONFIG.outline.color;
    sg.fillRect(0, 0, W, H);

    g.globalAlpha = opacity;
    const steps = width > 0 ? 24 : 0;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      g.drawImage(sil, Math.cos(a) * width, Math.sin(a) * width, W, H);
    }
    g.globalAlpha = 1;
    g.drawImage(source, pad, pad, S.w, S.h);   // 원본 칼 (은색/검은색 금속 질감 그대로)
  }

  // 잔상용: 붉은 빛 + 아주 약한 칼날 형태 (흐리게 번진 붉은 실루엣)
  function makeGhostSprite(source) {
    const k = Math.max(2, window.devicePixelRatio || 1);
    const pad = 6;
    const c = document.createElement('canvas');
    c.width = (S.w + pad * 2) * k;
    c.height = (S.h + pad * 2) * k;
    const tmp = document.createElement('canvas');
    tmp.width = c.width; tmp.height = c.height;
    const t = tmp.getContext('2d');
    t.drawImage(source, pad * k, pad * k, S.w * k, S.h * k);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = 'rgb(' + CONFIG.color.trail + ')';
    t.fillRect(0, 0, c.width, c.height);
    const g = c.getContext('2d');
    g.filter = 'blur(' + (CONFIG.trail.blur * k) + 'px)';
    g.drawImage(tmp, 0, 0);
    c.pad = pad;
    return c;
  }

  function resize() {
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * S.dpr);
    canvas.height = Math.round(innerHeight * S.dpr);
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
  }

  /* ---------- 이벤트 ---------- */
  function bindEvents() {
    addEventListener('resize', resize, { passive: true });

    document.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      S.x = e.clientX; S.y = e.clientY;
      S.dirty = true;
      if (!S.visible) { S.visible = true; S.lastGhost = { x: S.x, y: S.y, t: 0 }; updateVisibility(); }
      start();
    }, { passive: true });

    // 요소 감지 (hover / 텍스트 입력 / 예외 영역)
    document.addEventListener('pointerover', e => {
      if (e.pointerType === 'touch') return;
      const t = e.target instanceof Element ? e.target : null;
      const ignore = t && t.closest(CONFIG.ignore);
      const text = t && t.closest(CONFIG.text);
      S.suppressed = !!(ignore || text);
      setHover(!S.suppressed && !!(t && t.closest(CONFIG.clickable)));
      updateVisibility();
    }, { passive: true });

    // 창 밖으로 나가면 숨김
    document.addEventListener('pointerout', e => {
      if (!e.relatedTarget) { S.visible = false; updateVisibility(); }
    }, { passive: true });
    addEventListener('blur', () => { S.visible = false; updateVisibility(); });

    document.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') { disableForTouch(); return; }
      if (e.button !== 0 || S.suppressed) return;
      S.x = e.clientX; S.y = e.clientY;
      onClick();
    }, { passive: true });

    // 입력 방식이 터치로 바뀌면 끄고, 다시 마우스를 쓰면 켬
    finePointer.addEventListener?.('change', ev => ev.matches ? enable() : disableForTouch());
  }

  function disableForTouch() {
    document.documentElement.classList.remove('sc-active');
    S.visible = false; updateVisibility();
  }
  function enable() { document.documentElement.classList.add('sc-active'); }

  function updateVisibility() {
    root.classList.toggle('is-hidden', !S.visible || S.suppressed);
  }

  function setHover(on) {
    if (on === S.hover) return;
    S.hover = on;
    S.scale = on ? CONFIG.hover.scale : 1;
    root.style.setProperty('--sc-cur-scale', S.scale);
    root.classList.toggle('is-hover', on);
    if (on) {
      restartClass('is-hover-enter', CONFIG.hover.shineDuration);
      if (!reduceMotion) spawnSparks(randInt(CONFIG.hover.sparks), .55);
      start();
    }
  }

  function onClick() {
    restartClass('is-click', CONFIG.click.duration);
    if (reduceMotion) return;
    S.slashes.push({ x: S.x, y: S.y, age: 0, life: CONFIG.click.slashLife });
    spawnSparks(randInt(CONFIG.click.sparks), 1);
    start();
  }

  // 같은 클래스를 연속으로 줘도 애니메이션이 다시 시작되도록
  const classTimers = {};
  function restartClass(name, dur) {
    root.classList.remove(name);
    void root.offsetWidth;
    root.classList.add(name);
    clearTimeout(classTimers[name]);
    classTimers[name] = setTimeout(() => root.classList.remove(name), dur + 30);
  }

  /* ---------- 이펙트 생성 ---------- */
  function spawnSparks(n, power) {
    const colors = CONFIG.color.sparks;
    for (let i = 0; i < n; i++) {
      // 검 끝 방향 ±50° 범위로 튐
      const a = Math.atan2(DIR.y, DIR.x) + rand(-0.9, 0.9);
      const sp = rand(120, 260) * power;
      S.sparks.push({
        x: S.x, y: S.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        age: 0, life: rand(160, 260),
        size: rand(1, 1.8),
        color: colors[(Math.random() * colors.length) | 0]
      });
    }
  }

  /* ---------- 루프 (requestAnimationFrame) ---------- */
  let lastT = 0;
  function start() {
    if (S.running) return;
    S.running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(now - lastT, 50));
    lastT = now;

    // 1) 커서 위치 — 검 끝이 정확히 포인터 위치에 오도록
    if (S.dirty) {
      cursorEl.style.transform =
        'translate3d(' + (S.x - S.tipX) + 'px,' + (S.y - S.tipY) + 'px,0)';
      S.dirty = false;
      maybeSpawnGhost(now);
    }

    // 2) 이펙트 그리기
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    drawGhosts(dt);
    drawSlashes(dt);
    drawSparks(dt);

    // 3) 할 일이 없으면 루프 정지 (성능)
    if (S.dirty || S.ghosts.length || S.sparks.length || S.slashes.length) {
      requestAnimationFrame(frame);
    } else {
      S.running = false;
    }
  }

  function maybeSpawnGhost(now) {
    if (reduceMotion || S.suppressed || !S.visible) return;
    const t = CONFIG.trail, lg = S.lastGhost;
    const dist = Math.hypot(S.x - lg.x, S.y - lg.y);
    if (dist >= t.spawnDistance && now - lg.t >= t.spawnInterval) {
      // 이전 위치에 잔상을 남김 (검 '뒤'에 생기도록)
      S.ghosts.push({ x: lg.x, y: lg.y, scale: S.scale, age: 0 });
      if (S.ghosts.length > t.max) S.ghosts.shift();
      S.lastGhost = { x: S.x, y: S.y, t: now };
    }
  }

  function drawGhosts(dt) {
    if (!ghostSprite) return;
    const t = CONFIG.trail;
    for (let i = S.ghosts.length - 1; i >= 0; i--) {
      const g = S.ghosts[i];
      g.age += dt;
      const p = g.age / t.life;
      if (p >= 1) { S.ghosts.splice(i, 1); continue; }
      const pd = ghostSprite.pad * g.scale;
      const w = (S.w + ghostSprite.pad * 2) * g.scale, h = (S.h + ghostSprite.pad * 2) * g.scale;
      ctx.globalAlpha = t.opacity * Math.pow(1 - p, 1.6);
      ctx.drawImage(ghostSprite, g.x - S.tipX * g.scale - pd, g.y - S.tipY * g.scale - pd, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks(dt) {
    if (!S.sparks.length) return;
    const s = dt / 1000;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const p = S.sparks[i];
      p.age += dt;
      const k = p.age / p.life;
      if (k >= 1) { S.sparks.splice(i, 1); continue; }
      p.vx *= 0.9; p.vy = p.vy * 0.9 + 260 * s;   // 감속 + 약한 중력
      p.x += p.vx * s; p.y += p.vy * s;
      const a = 1 - k;
      ctx.strokeStyle = 'rgba(' + p.color + ',' + a + ')';
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);   // 짧은 불꽃 줄기
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // 검이 찌르는 방향(검 끝 방향)으로 한 번 베는 초승달 궤적
  function drawSlashes(dt) {
    if (!S.slashes.length) return;
    const c = CONFIG.click, col = CONFIG.color;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = S.slashes.length - 1; i >= 0; i--) {
      const sl = S.slashes[i];
      sl.age += dt;
      const k = sl.age / sl.life;
      if (k >= 1) { S.slashes.splice(i, 1); continue; }

      const grow = 1 - Math.pow(1 - Math.min(k / 0.4, 1), 3);    // 빠르게 그어짐
      const fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;             // 이후 사라짐
      const L = c.slashLength, W = c.slashWidth;

      // 시작점(검 끝 뒤쪽) → 끝점(검 끝 앞쪽), 옆으로 살짝 휘어짐
      const sx = sl.x - DIR.x * L * 0.55 - PERP.x * L * 0.08;
      const sy = sl.y - DIR.y * L * 0.55 - PERP.y * L * 0.08;
      const ex = sx + DIR.x * L * grow;
      const ey = sy + DIR.y * L * grow;
      const mx = (sx + ex) / 2, my = (sy + ey) / 2;
      const bulge = L * 0.22 * grow;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx + PERP.x * bulge, my + PERP.y * bulge, ex, ey);
      ctx.quadraticCurveTo(mx + PERP.x * (bulge - W), my + PERP.y * (bulge - W), sx, sy);
      ctx.closePath();

      const grad = ctx.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, 'rgba(' + col.slashEdge + ',0)');
      grad.addColorStop(0.55, 'rgba(' + col.slashEdge + ',' + (0.9 * fade) + ')');
      grad.addColorStop(0.85, 'rgba(' + col.slashCore + ',' + (0.85 * fade) + ')');
      grad.addColorStop(1, 'rgba(' + col.slashCore + ',0)');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(' + col.slashEdge + ',' + fade + ')';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
  }
})();
