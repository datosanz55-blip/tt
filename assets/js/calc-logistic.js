/* Калькулятор доставки — предварительная оценка */
(function () {
  'use strict';
  var form = document.getElementById('calc-log');
  if (!form) return;
  var L = window.TT.logistics, FEE = window.TT.logisticsBrandFee, BUY = window.TT.buyoutFee;

  var out = {
    ship:  document.getElementById('r-ship'),
    days:  document.getElementById('r-days'),
    perKg: document.getElementById('r-perkg'),
    buy:   document.getElementById('r-buy'),
    total: document.getElementById('r-total')
  };

  function calc() {
    var mode = form.querySelector('input[name="mode"]:checked').value;
    var t = L[mode];
    var w = parseFloat(form.weight.value) || 0;
    var v = parseFloat(form.volume.value) || 0;
    var goods = parseFloat(form.goods.value) || 0;
    var hard = form.hard.checked;

    var byWeight = w * t.perKg;
    var byVolume = v * t.perM3;
    var ship = Math.max(byWeight, byVolume, w || v ? t.min : 0);
    if (hard) ship *= (1 + FEE);

    var buyout = goods > 0 ? goods * BUY : 0;
    var total = ship + buyout + goods;

    out.ship.textContent = '$' + window.ttNum(Math.round(ship));
    out.days.textContent = t.days;
    out.perKg.textContent = w > 0 ? '$' + window.ttNum(ship / w, 2) + ' / кг' : '—';
    out.buy.textContent = buyout > 0 ? '$' + window.ttNum(Math.round(buyout)) : '—';
    out.total.textContent = '$' + window.ttNum(Math.round(total));
  }

  form.addEventListener('input', calc);
  form.addEventListener('change', calc);
  form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
