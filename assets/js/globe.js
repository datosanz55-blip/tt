/* ============================================================
   Вращающийся глобус портала.
   Canvas 2D, без библиотек. Два маркера на противоположных
   сторонах шара — логистика и обмен валюты.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('globe');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SITES = [
    { key: 'logistic', lon: 100, lat: 26, href: 'logistic.html',
      title: 'TT LOGISTIC', sub: 'Доставка из Китая' },
    { key: 'exchange', lon: -80, lat: 40, href: 'exchange.html',
      title: 'TT EXCHANGE', sub: 'Обмен рублей на юани' }
  ];

  var TILT = -20 * Math.PI / 180;
  var yaw = -100;              // текущий угол поворота, градусы
  var vel = 0;                 // инерция
  var target = null;           // угол, к которому «доводим» шар
  var dragging = false, moved = 0, lastX = 0, lastPointer = null;
  var active = null;
  var size = 0, R = 0, cx = 0, cy = 0, dpr = 1;

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

  function strokePath(points, color, width) {
    var started = false;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p.z <= 0.02) { started = false; continue; }
      if (!started) { ctx.beginPath(); ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
      var next = points[i + 1];
      if (!next || next.z <= 0.02) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); started = false; }
    }
  }

  /* ---------- отрисовка ---------- */
  function draw() {
    ctx.clearRect(0, 0, size, size);

    // свечение
    var glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
    glow.addColorStop(0, 'rgba(62,127,193,0.30)');
    glow.addColorStop(0.55, 'rgba(62,127,193,0.07)');
    glow.addColorStop(1, 'rgba(62,127,193,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

    // тело шара
    var body = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    body.addColorStop(0, 'rgba(38,57,90,0.92)');
    body.addColorStop(1, 'rgba(9,14,25,0.96)');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // меридианы
    var i, j, pts;
    for (i = 0; i < 180; i += 15) {
      pts = [];
      for (j = -90; j <= 90; j += 4) pts.push(project(j, i));
      strokePath(pts, 'rgba(155,167,180,0.42)', 1.1);
    }
    // параллели
    for (i = -60; i <= 60; i += 20) {
      pts = [];
      for (j = 0; j <= 360; j += 4) pts.push(project(i, j));
      strokePath(pts, i === 0 ? 'rgba(220,227,234,0.68)' : 'rgba(155,167,180,0.32)', i === 0 ? 1.6 : 1.1);
    }

    // терминатор
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(220,227,234,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();

    // орбита-лента, как на логотипах
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-18 * Math.PI / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.22, R * 0.44, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(155,167,180,0.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();

    // маркер-спутник на орбите
    var t = performance.now() / 3400;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(-18 * Math.PI / 180);
    ctx.beginPath();
    ctx.arc(Math.cos(t) * R * 1.22, Math.sin(t) * R * 0.44, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#DCE3EA'; ctx.fill();
    ctx.restore();

    // дуга-маршрут между двумя точками
    drawRoute();

    // маркеры
    SITES.forEach(function (s) {
      var p = project(s.lat, s.lon);
      s._p = p;
      if (p.z <= 0) return;
      var k = 0.45 + 0.55 * p.z;
      var isActive = active && active.key === s.key;
      var r = (isActive ? 7 : 5) * k;

      if (isActive) {
        var pulse = (performance.now() % 2200) / 2200;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + pulse * 26, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(62,127,193,' + (0.55 * (1 - pulse)) + ')';
        ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(11,17,30,0.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#FFFFFF' : 'rgba(188,198,209,' + k + ')';
      ctx.fill();

      // подпись
      var label = s.title.replace('TT ', '');
      ctx.font = '600 ' + Math.round(11 * dprScale()) + 'px Oswald, sans-serif';
      ctx.textBaseline = 'middle';
      var dir = s.lon > 0 ? 1 : -1;
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillStyle = isActive ? 'rgba(255,255,255,0.95)' : 'rgba(155,167,180,' + (0.35 + 0.45 * p.z) + ')';
      ctx.fillText(label, p.x + dir * (r + 12), p.y - 10);
      ctx.beginPath();
      ctx.moveTo(p.x + dir * (r + 3), p.y - 3);
      ctx.lineTo(p.x + dir * (r + 9), p.y - 10);
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
    });
  }

  function drawRoute() {
    var a = SITES[0], b = SITES[1], steps = 48, pts = [];
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var lat = a.lat + (b.lat - a.lat) * f + Math.sin(Math.PI * f) * 18;
      var lonDelta = b.lon - a.lon;
      if (lonDelta > 180) lonDelta -= 360;
      if (lonDelta < -180) lonDelta += 360;
      pts.push(project(lat, a.lon + lonDelta * f));
    }
    ctx.setLineDash([6, 7]);
    strokePath(pts, 'rgba(120,178,235,0.95)', 2.2);
    ctx.setLineDash([]);
  }

  function dprScale() { return dpr; }

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
    canvas.setAttribute('aria-label', 'Глобус выбора направления. Выбрано: ' + site.title + ' — ' + site.sub);
  }

  function normalize(deg) {
    while (deg > 180) deg -= 360;
    while (deg < -180) deg += 360;
    return deg;
  }

  function spinTo(key) {
    var site = SITES.filter(function (s) { return s.key === key; })[0];
    if (!site) return;
    var want = -site.lon;
    target = yaw + normalize(want - yaw);
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
      if (Math.abs(vel) < 0.0015) { vel = 0; if (!reduced) yaw += 0.006 * dt; }
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
    R = size * 0.355; cx = size / 2; cy = size / 2;
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
      if (Math.hypot(p.x - x, p.y - y) < 26 * dpr) { window.ttGo(SITES[i].href); return; }
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
