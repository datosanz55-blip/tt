/* Калькулятор обмена RUB ⇄ CNY */
(function () {
  'use strict';
  var form = document.getElementById('calc-fx');
  if (!form) return;
  var FX = window.TT.fx;

  var out = {
    get:  document.getElementById('fx-get'),
    rate: document.getElementById('fx-rate'),
    fee:  document.getElementById('fx-fee'),
    tier: document.getElementById('fx-tier'),
    warn: document.getElementById('fx-warn')
  };

  document.querySelectorAll('[data-fx-base]').forEach(function (el) {
    el.textContent = window.ttNum(FX.rubPerCny, 2);
  });
  document.querySelectorAll('[data-fx-updated]').forEach(function (el) {
    el.textContent = FX.updatedAt || 'уточняйте у менеджера';
  });

  function tierFor(rub) {
    var t = FX.tiers[0];
    FX.tiers.forEach(function (x) { if (rub >= x.from) t = x; });
    return t;
  }

  function calc() {
    var dir = form.querySelector('input[name="dir"]:checked').value; // rub2cny | cny2rub
    var amount = parseFloat(form.amount.value) || 0;
    var rub = dir === 'rub2cny' ? amount : amount * FX.rubPerCny;
    var tier = tierFor(rub);

    // Комиссия заложена в курс сделки
    var rate = dir === 'rub2cny'
      ? FX.rubPerCny * (1 + tier.fee)   // покупаем юань дороже
      : FX.rubPerCny * (1 - tier.fee);  // продаём юань дешевле

    var result = dir === 'rub2cny' ? amount / rate : amount * rate;

    out.get.textContent = amount > 0
      ? (dir === 'rub2cny' ? '¥ ' + window.ttNum(result, 2) : window.ttNum(result, 2) + ' ₽')
      : '—';
    out.rate.textContent = window.ttNum(rate, 3) + ' ₽ / ¥';
    out.fee.textContent = window.ttNum(tier.fee * 100, 1) + ' %';
    out.tier.textContent = tier.label;

    var below = rub > 0 && rub < FX.minDeal;
    out.warn.textContent = below
      ? 'Минимальная сумма сделки — ' + window.ttNum(FX.minDeal) + ' ₽. Для меньших сумм условия обсуждаются отдельно.'
      : '';

    var unit = form.querySelector('.amount-unit');
    if (unit) unit.textContent = dir === 'rub2cny' ? '₽' : '¥';
  }

  form.addEventListener('input', calc);
  form.addEventListener('change', calc);
  form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
