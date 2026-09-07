/* ============================================================
   Вращающийся глобус портала.
   Canvas 2D, без библиотек: точечная сфера с материками,
   сетка узлов и две точки направлений на разных сторонах шара.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('globe');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SITES = [
    { key: 'logistic', lon: 104, lat: 30, href: 'logistic.html',
      title: 'TT LOGISTIC', sub: 'Доставка из Китая', label: 'ГУАНЧЖОУ' },
    { key: 'exchange', lon: -76, lat: 40, href: 'exchange.html',
      title: 'TT EXCHANGE', sub: 'Обмен рублей на юани', label: 'ОБМЕН' }
  ];

  /* Материки заданы «кляксами» (широта, долгота, радиус в градусах) —
     сильно упрощённая карта, её задача передать узнаваемый силуэт. */
  var LAND = [
    // Африка
    [28,10,12],[25,26,10],[14,2,10],[10,22,10],[7,-6,7],[4,12,8],[0,22,9],
    [-6,26,8],[6,40,6],[-6,37,6],[-20,26,9],[-31,23,7],
    // Европа
    [48,9,9],[52,26,9],[44,-2,6],[40,20,6],[56,42,9],[61,16,7],[58,32,7],[64,28,6],
    // Азия
    [55,60,12],[60,92,12],[62,122,11],[50,102,12],[45,74,10],[36,100,11],[30,74,8],
    [22,79,8],[26,110,9],[40,128,7],[15,100,7],[10,106,6],[62,150,9],[50,140,7],
    [31,45,8],[24,50,6],[36,60,7],
    // Юго-Восточная Азия и Океания
    [0,114,5],[-4,120,5],[-25,133,12],[-31,146,8],[-20,122,8],[-41,172,4],
    // Северная Америка
    [60,-100,13],[56,-122,10],[50,-96,11],[41,-100,10],[37,-86,9],[45,-71,7],
    [64,-150,8],[71,-82,10],[30,-101,7],[20,-101,6],[72,-42,10],[64,-48,8],
    // Южная Америка
    [6,-71,7],[-4,-61,10],[-14,-55,10],[-25,-59,8],[-35,-63,6],[-45,-70,5],[-10,-76,6]
  ];

  /* Узлы «сети» — декоративные связи поверх шара */
  var NODES = [
    [55,37],[30,104],[23,113],[39,116],[48,2],[25,55],[1,103],[52,13]
  ];

  var TILT = -17 * Math.PI / 180;
  var yaw = -104;
  var vel = 0;
  var target = null;
  var dragging = false, moved = 0, lastX = 0, lastPointer = null;
  var active = null;
  var size = 0, R = 0, cx = 0, cy = 0, dpr = 1;
  var dots = [];

  /* ---------- точки сферы ---------- */
  function isLand(lat, lon) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    for (var i = 0; i < LAND.length; i++) {
      var b = LAND[i];
      var bla = b[0] * Math.PI / 180, blo = b[1] * Math.PI / 180;
      var c = Math.sin(la) * Math.sin(bla) +
              Math.cos(la) * Math.cos(bla) * Math.cos(lo - blo);
      if (Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI < b[2]) return true;
    }
    return false;
  }

  function buildDots() {
    dots = [];
    for (var lat = -85; lat <= 85; lat += 3.2) {
      var count = Math.max(8, Math.round(116 * Math.cos(lat * Math.PI / 180)));
      for (var i = 0; i < count; i++) {
        var lon = -180 + 360 * i / count;
        dots.push({ lat: lat, lon: lon, land: isLand(lat, lon) });
      }
    }
  }

  /* ---------- геометрия ---------- */
  function project(lat, lon) {
    var la = lat * Math.PI / 180;
    var lo = (lon + yaw) * Math.PI / 180;
    var x = Math.cos(la) * Math.sin(lo);
    var y = Math.sin(la);
    var z = Math.cos(la) * Math.cos(lo);
    var y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
    var z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
    return { x: cx + x * R, y: cy - y2 * R, z: z2 };
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

  /* ---------- отрисовка ---------- */
  function draw() {
    ctx.clearRect(0, 0, size, size);
    var k = size / 520;

    // внешнее свечение
    var glow = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.55);
    glow.addColorStop(0, 'rgba(11,87,240,0.30)');
    glow.addColorStop(0.5, 'rgba(127,186,252,0.16)');
    glow.addColorStop(1, 'rgba(127,186,252,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2); ctx.fill();

    // тело шара — освещение сверху слева, глубокий синий к терминатору
    var body = ctx.createRadialGradient(
      cx - R * 0.36, cy - R * 0.40, R * 0.05,
      cx, cy, R * 1.04);
    body.addColorStop(0, '#4E93EE');
    body.addColorStop(0.34, '#1F63D8');
    body.addColorStop(0.72, '#0B3AA6');
    body.addColorStop(1, '#04205E');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // затемнение к краю — объём
    var shade = ctx.createRadialGradient(cx, cy, R * 0.45, cx, cy, R);
    shade.addColorStop(0, 'rgba(2,14,48,0)');
    shade.addColorStop(1, 'rgba(2,14,48,0.55)');
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // точки материков и океана — в 5 слоёв по глубине, по одному проходу
    var LEVELS = 5, i, j;
    var buckets = [];
    for (i = 0; i < LEVELS * 2; i++) buckets.push([]);
    for (i = 0; i < dots.length; i++) {
      var d = dots[i];
      var p = project(d.lat, d.lon);
      if (p.z <= 0.04) continue;
      var lvl = Math.min(LEVELS - 1, Math.floor(p.z * LEVELS));
      buckets[(d.land ? LEVELS : 0) + lvl].push(p);
    }
    for (i = 0; i < LEVELS * 2; i++) {
      var list = buckets[i];
      if (!list.length) continue;
      var land = i >= LEVELS;
      var lvl2 = i % LEVELS;
      var t = (lvl2 + 0.5) / LEVELS;
      var r = (land ? 1.85 : 1.15) * k * (0.6 + 0.7 * t);
      ctx.fillStyle = land
        ? 'rgba(248,252,255,' + (0.5 + 0.5 * t) + ')'
        : 'rgba(173,214,255,' + (0.16 + 0.34 * t) + ')';
      ctx.beginPath();
      for (j = 0; j < list.length; j++) {
        ctx.moveTo(list[j].x + r, list[j].y);
        ctx.arc(list[j].x, list[j].y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // светящийся край
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(214,234,255,0.9)';
    ctx.lineWidth = 1.2 * k;
    ctx.shadowColor = 'rgba(120,180,255,0.95)';
    ctx.shadowBlur = 22 * k;
    ctx.stroke();
    ctx.restore();

    drawNetwork(k);
    drawRoute(k);
    drawMarkers(k);
  }

  function drawNetwork(k) {
    var pts = [], i, j;
    for (i = 0; i < NODES.length; i++) {
      var p = project(NODES[i][0], NODES[i][1]);
      if (p.z > 0.12) pts.push(p);
    }
    ctx.lineWidth = 1 * k;
    for (i = 0; i < pts.length; i++) {
      for (j = i + 1; j < pts.length; j++) {
        var dist = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (dist > R * 0.92) continue;
        ctx.strokeStyle = 'rgba(232,244,255,' + (0.30 * (1 - dist / (R * 0.92))) + ')';
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) {
      ctx.moveTo(pts[i].x + 2 * k, pts[i].y);
      ctx.arc(pts[i].x, pts[i].y, 2 * k, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function drawRoute(k) {
    var a = SITES[0], b = SITES[1], steps = 54, i;
    var lonDelta = b.lon - a.lon;
    if (lonDelta > 180) lonDelta -= 360;
    if (lonDelta < -180) lonDelta += 360;
    var started = false;
    ctx.setLineDash([5 * k, 6 * k]);
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    for (i = 0; i <= steps; i++) {
      var f = i / steps;
      var p = project(a.lat + (b.lat - a.lat) * f + Math.sin(Math.PI * f) * 16,
                      a.lon + lonDelta * f);
      if (p.z <= 0.04) {
        if (started) { ctx.stroke(); started = false; }
        continue;
      }
      if (!started) { ctx.beginPath(); ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    if (started) ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawMarkers(k) {
    SITES.forEach(function (s) {
      var p = project(s.lat, s.lon);
      s._p = p;
      if (p.z <= 0) return;
      var isActive = active && active.key === s.key;
      var r = (isActive ? 6 : 4) * k;

      if (isActive) {
        var pulse = (performance.now() % 2400) / 2400;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + pulse * 30 * k, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - pulse)) + ')';
        ctx.lineWidth = 1.6 * k; ctx.stroke();
      }

      ctx.save();
      ctx.shadowColor = 'rgba(11,87,240,0.9)';
      ctx.shadowBlur = 14 * k;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();

      // подпись на светлой плашке — читается и на шаре, и за его краем
      var dir = s.lon > 0 ? 1 : -1;
      var text = s.label;
      ctx.font = '700 ' + Math.round(11 * k) + 'px Manrope, sans-serif';
      var w = ctx.measureText(text).width + 18 * k;
      var h = 22 * k;
      var bx = dir > 0 ? p.x + 12 * k : p.x - 12 * k - w;
      var by = p.y - 14 * k - h;

      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1 * k;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(dir > 0 ? bx : bx + w, by + h);
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = 'rgba(10,15,30,0.22)';
      ctx.shadowBlur = 12 * k; ctx.shadowOffsetY = 3 * k;
      ctx.fillStyle = isActive ? '#0B57F0' : 'rgba(255,255,255,0.94)';
      roundRect(bx, by, w, h, h / 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = isActive ? '#fff' : '#0A0F1E';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(text, bx + w / 2, by + h / 2 + 0.5 * k);
    });
  }

  /* ---------- состояние ---------- */
  function updateActive() {
    var best = null;
    SITES.forEach(function (s) {
      var p = project(s.lat, s.lon);
      if (!best || p.z > best.z) best = { z: p.z, site: s };
    });
    var site = best.site;
    if (active && active.key === site.key) return;
    active = site;
    document.querySelectorAll('.choice').forEach(function (el) {
      el.classList.toggle('is-active', el.dataset.site === site.key);
    });
    var t = document.getElementById('globe-title');
    var s = document.getElementById('globe-sub');
    if (t) t.textContent = site.title;
    if (s) s.textContent = site.sub;
    canvas.setAttribute('aria-label',
      'Глобус выбора направления. Выбрано: ' + site.title + ' — ' + site.sub);
  }

  function normalize(deg) {
    while (deg > 180) deg -= 360;
    while (deg < -180) deg += 360;
    return deg;
  }

  function spinTo(key) {
    var site = SITES.filter(function (s) { return s.key === key; })[0];
    if (!site) return;
    target = yaw + normalize(-site.lon - yaw);
    vel = 0;
  }

  /* ---------- цикл ---------- */
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(50, now - last); last = now;
    if (target !== null) {
      yaw += (target - yaw) * Math.min(1, dt / 220);
      if (Math.abs(target - yaw) < 0.15) { yaw = target; target = null; }
    } else if (!dragging) {
      yaw += vel * dt;
      vel *= 0.94;
      if (Math.abs(vel) < 0.0015) { vel = 0; if (!reduced) yaw += 0.005 * dt; }
    }
    updateActive();
    draw();
    requestAnimationFrame(loop);
  }

  /* ---------- размеры ---------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    var css = Math.max(260, Math.min(rect.width || 500, 600));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    size = css * dpr;
    canvas.width = size; canvas.height = size;
    canvas.style.height = css + 'px';
    R = size * 0.345; cx = size / 2; cy = size / 2;
    draw();
  }

  /* ---------- ввод ---------- */
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true; moved = 0; lastX = e.clientX; target = null;
    lastPointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    moved += Math.abs(dx);
    yaw += dx * 0.38;
    vel = dx * 0.38 / 16;
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (lastPointer !== null && canvas.hasPointerCapture && canvas.hasPointerCapture(lastPointer)) {
      canvas.releasePointerCapture(lastPointer);
    }
    lastPointer = null;
    if (moved < 6) hitTest(e);
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', function () { dragging = false; });

  function hitTest(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (size / rect.width);
    var y = (e.clientY - rect.top) * (size / rect.width);
    for (var i = 0; i < SITES.length; i++) {
      var p = SITES[i]._p;
      if (!p || p.z <= 0) continue;
      if (Math.hypot(p.x - x, p.y - y) < 28 * dpr) { window.ttGo(SITES[i].href); return; }
    }
    if (active) window.ttGo(active.href);
  }

  canvas.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { target = null; yaw -= 14; e.preventDefault(); }
    else if (e.key === 'ArrowRight') { target = null; yaw += 14; e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { if (active) { window.ttGo(active.href); } e.preventDefault(); }
  });

  document.querySelectorAll('.choice').forEach(function (el) {
    el.addEventListener('mouseenter', function () { spinTo(el.dataset.site); });
    el.addEventListener('focus', function () { spinTo(el.dataset.site); });
    el.addEventListener('click', function (ev) {
      ev.preventDefault();
      spinTo(el.dataset.site);
      setTimeout(function () { window.ttGo(el.getAttribute('href')); }, reduced ? 0 : 420);
    });
  });

  window.addEventListener('resize', resize);
  buildDots();
  resize();
  requestAnimationFrame(loop);
})();

/* Переход со шторкой */
window.ttGo = function (href) {
  var c = document.querySelector('.curtain');
  if (!c || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.location.href = href; return;
  }
  c.classList.add('is-on');
  setTimeout(function () { window.location.href = href; }, 380);
};
