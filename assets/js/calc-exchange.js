/* Калькулятор обмена RUB ⇄ CNY по табло курса */
(function () {
  'use strict';
  var FX = window.TT.fx;

  /* Ставки, по которым можно считать (без строки «лучший курс») */
  var TIERS = FX.board.filter(function (t) { return typeof t.rate === 'number'; });
  var BEST = FX.board.filter(function (t) { return t.best; })[0];

  /* --- Табло курса ------------------------------------------ */
  document.querySelectorAll('[data-board]').forEach(function (host) {
    var rows = FX.board.map(function (t) {
      var best = !!t.best;
      var value = best
        ? '<span class="board__val">' + (t.text || 'Лучший курс') + '</span>'
        : '<span class="board__val">' + window.ttNum(t.rate, 2) +
          '<span class="board__cur">₽</span></span>';
      return '<div class="board__row' + (best ? ' board__row--best' : '') + '">' +
               '<span class="board__from">' + t.label + '</span>' +
               '<span class="leader"></span>' + value +
             '</div>';
    }).join('');

    var trend = FX.trend === 'down' ? 'Курс понизился ↓'
              : FX.trend === 'up'   ? 'Курс вырос ↑' : '';

    host.innerHTML =
      '<div class="board__head">' +
        '<div class="board__date">' + (FX.date || 'Курс дня') + '</div>' +
        (trend ? '<div class="board__delta">' + trend + '</div>' : '') +
      '</div>' +
      '<div class="board__rows">' + rows + '</div>' +
      '<div class="board__foot">' + FX.boardNote + '</div>';
  });

  /* Курс верхней ступени — для витрин «от N ₽ за юань» */
  document.querySelectorAll('[data-fx-base]').forEach(function (el) {
    el.textContent = window.ttNum(TIERS[TIERS.length - 1].rate, 2);
  });
  document.querySelectorAll('[data-fx-updated]').forEach(function (el) {
    el.textContent = FX.updatedAt || 'уточняйте у менеджера';
  });

  /* --- Калькулятор ------------------------------------------ */
  var form = document.getElementById('calc-fx');
  if (!form) return;

  var out = {
    get:  document.getElementById('fx-get'),
    rate: document.getElementById('fx-rate'),
    tier: document.getElementById('fx-tier'),
    warn: document.getElementById('fx-warn')
  };

  function tierFor(cny) {
    var t = TIERS[0];
    TIERS.forEach(function (x) { if (cny >= x.from) t = x; });
    return t;
  }

  function calc() {
    var dir = form.querySelector('input[name="dir"]:checked').value; // rub2cny | cny2rub
    var amount = parseFloat(form.amount.value) || 0;

    // объём сделки в юанях — по нему определяется ступень
    var approx = dir === 'rub2cny' ? amount / TIERS[0].rate : amount;
    var tier = tierFor(approx);
    var cny = dir === 'rub2cny' ? amount / tier.rate : amount;
    tier = tierFor(cny);

    var result = dir === 'rub2cny' ? amount / tier.rate : amount * tier.rate;

    out.get.textContent = amount > 0
      ? (dir === 'rub2cny' ? '¥ ' + window.ttNum(result, 2) : window.ttNum(result, 2) + ' ₽')
      : '—';
    out.rate.textContent = window.ttNum(tier.rate, 2) + ' ₽ / ¥';
    out.tier.textContent = tier.label;

    var msg = '';
    if (cny > 0 && cny < FX.minDealCny) {
      msg = 'Минимальный объём сделки — ' + window.ttNum(FX.minDealCny) +
            ' ¥. Меньшие суммы обсуждаются отдельно.';
    } else if (BEST && cny >= BEST.from) {
      msg = 'От ' + window.ttNum(BEST.from) + ' ¥ действует индивидуальный курс — ' +
            'он выгоднее показанного, менеджер назовёт его по заявке.';
    }
    out.warn.textContent = msg;

    var unit = form.querySelector('.amount-unit');
    if (unit) unit.textContent = dir === 'rub2cny' ? '₽' : '¥';
  }

  form.addEventListener('input', calc);
  form.addEventListener('change', calc);
  form.addEventListener('submit', function (e) { e.preventDefault(); calc(); });
  calc();
})();
