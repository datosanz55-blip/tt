/* ============================================================
   Общая логика внутренних сайтов
   ============================================================ */
(function () {
  'use strict';
  var T = window.TT || {};

  /* --- Мобильное меню --------------------------------------- */
  var burger = document.querySelector('.hdr__burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('.hdr__nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- Появление блоков ------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --- Подстановка контактов -------------------------------- */
  var c = T.contacts || {};
  document.querySelectorAll('[data-c]').forEach(function (el) {
    var key = el.dataset.c;
    if (!c[key]) return;
    el.textContent = c[key];
  });
  document.querySelectorAll('[data-href]').forEach(function (el) {
    var key = el.dataset.href;
    if (c[key]) el.setAttribute('href', c[key]);
  });

  /* --- Год в подвале ---------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* --- Формы: письмо без бэкенда ---------------------------- */
  /* TODO: подключить реальный обработчик (CRM / бот / почтовый сервис).
     Сейчас заявка собирается в письмо и открывается почтовый клиент. */
  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var lines = [];
      data.forEach(function (v, k) { if (String(v).trim()) lines.push(k + ': ' + v); });
      var subject = form.dataset.lead === 'exchange'
        ? 'Заявка на обмен валюты — TT Exchange'
        : 'Заявка на доставку — TT Logistic';
      var href = 'mailto:' + (c.email || '') +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      var status = form.querySelector('.form-status');
      if (status) status.textContent = 'Открываем почтовый клиент — письмо уже заполнено. Не открылось? Напишите нам в Telegram.';
      window.location.href = href;
    });
  });

  /* --- Форматирование --------------------------------------- */
  window.ttNum = function (n, digits) {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: digits || 0,
      maximumFractionDigits: digits === undefined ? 0 : digits
    }).format(n);
  };
})();
