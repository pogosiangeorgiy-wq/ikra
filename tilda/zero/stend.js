// Стенд для сборки черновика в редакторе Тильды: какие экраны есть, как
// найти их блоки на странице, фоновая пересборка и сверка с лендингом.
// Грузится в редакторе страницы:
//
//   const S = (await import('https://pogosiangeorgiy-wq.github.io/ikra/tilda/zero/stend.js?v=' + Date.now())).default;
//   S.fon(['hero', 'uslugi']);   // пересобрать в фоне, ход — S.hod()
//   await S.sverka(375);          // открыть черновик и лендинг рядом
//   await S.k('uslugi', 600);     // прокрутить оба к экрану (+ смещение)

const KOREN = 'https://pogosiangeorgiy-wq.github.io/ikra/';

// Ключ экрана → название блока в редакторе, корень для конвертера,
// параметры импорта и селектор той же секции на лендинге (для сверки).
export const EKRANY = {
  hero: {title: 'Первый экран', sel: 'section.hero', orig: 'section.hero',
    opts: {vh: 100, pinBottom: /^(Москва|ТУ 10|HACCP)/}},
  uslugi: {title: 'Услуги', orig: '#uslugi'},
  band: {title: 'Качество начинается с сырья', orig: 'section.band'},
  syrye: {title: 'Сырьё', orig: '#syrye'},
  proizvodstvo: {title: 'Производство', orig: '#proizvodstvo'},
  partiya: {title: 'Готовая партия', orig: 'h2:Готовая'},
  'o-kompanii': {title: 'О компании', orig: '#o-kompanii'},
  // posle — после какого блока ставить экран, если его ещё нет на странице.
  trust: {title: 'Нам доверяют', orig: 'section.trust', posle: 'hero'},
  etapy: {title: 'Этапы работы', orig: '#etapy', posle: 'uslugi', anchor: 'etapy'},
  upakovka: {title: 'Тара и маркировка', orig: '#upakovka', posle: 'proizvodstvo', anchor: 'upakovka'},
  start: {title: 'Как начать', orig: 'h2:Как начать', posle: 'o-kompanii'},
  ekonomika: {title: 'Экономика и условия', orig: '#ekonomika', posle: 'start', anchor: 'ekonomika'},
  voprosy: {title: 'Вопросы', orig: 'h2:Вопросы', posle: 'ekonomika', anchor: 'voprosy'},
  kontakty: {title: 'Контакты', orig: '#kontakty', posle: 'ekonomika', anchor: 'kontakty'},
  map: {title: 'Как добраться', orig: 'section.map', posle: 'kontakty'},
  footer: {title: 'Подвал', sel: 'footer', orig: 'footer.site-footer', posle: 'map'},
};

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let ZI = null;
async function modul() {
  ZI = (await import(`${KOREN}tilda/zero/zero-import.js?v=${Date.now()}`)).default;
  return ZI;
}

// Блоки страницы по названиям Zero Block.
export function bloki() {
  const res = {};
  document.querySelectorAll('.record').forEach((r) => {
    const t = r.getAttribute('data-title') || r.querySelector('.t396__artboard')?.getAttribute('data-artboard-title') || '';
    const k = Object.keys(EKRANY).find((x) => EKRANY[x].title === t);
    if (k) res[k] = +r.id.replace('record', '');
  });
  return res;
}

export async function nazvat(recid, title) {
  const otvet = await window.tp__fetch({url: '/zero/submit/',
    body: {comm: 'savezeroblocktitle', pageid: window.pageid, recordid: recid, ab_title: title},
    explanation: 'saving zero block title'});
  const r = document.getElementById(`record${recid}`);
  if (r) r.setAttribute('data-title', title);
  return otvet;
}

const hod = {log: [], gotovo: true};
export function fon(kluchi, {posle} = {}) {
  hod.log = []; hod.gotovo = false;
  (async () => {
    await modul();
    for (const k of kluchi) {
      try {
        const e = EKRANY[k];
        const code = await ZI.build(k, e.sel || 'main > section', e.opts || {});
        const b = bloki();
        const est = b[k];
        const id = est ? await ZI.replace(est, code) : await ZI.put(code, posle ?? b[e.posle] ?? Object.values(b).pop());
        await nazvat(id, e.title);
        if (e.anchor) await window.tp__fetch({url: '/page/submit/', body: {comm: 'saverecord',
          pageid: window.pageid, recordid: id, onlythisfield: 'rec_anchor', rec_anchor: e.anchor}});
        hod.log.push(`${k} ✓`);
      } catch (err) {
        hod.log.push(`${k}: ОШИБКА ${err.message}`);
        break;
      }
    }
    hod.gotovo = true;
  })();
  return 'запущено';
}
export const hodRaboty = () => JSON.stringify({gotovo: hod.gotovo, log: hod.log});

// Сверка: черновик (предпросмотр Тильды) и лендинг без скриптов — то же
// статичное состояние, которое получает конвертер.
let origHtml = null;
export async function sverka(w = 1200, h = 1080, k = w > 700 ? 0.6 : 1) {
  if (!origHtml) {
    origHtml = await fetch(`${KOREN}index.html?v=${Date.now()}`).then((r) => r.text());
    origHtml = origHtml.replace('<head>', `<head><base href="${KOREN}">`)
      .replace('</head>', '<style>.reveal,.reveal *{opacity:1!important;transform:none!important;transition:none!important}.cookie,.site-header{display:none!important}</style></head>');
  }
  document.getElementById('zi-prev')?.remove();
  const d = document.createElement('div');
  d.id = 'zi-prev';
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#777;overflow:hidden';
  const a = document.createElement('iframe');
  a.id = 'zi-a';
  a.src = `/page/preview/?pageid=${window.pageid}&zi=${Date.now()}`;
  const b = document.createElement('iframe');
  b.id = 'zi-b';
  b.setAttribute('sandbox', 'allow-same-origin');
  b.srcdoc = origHtml;
  [a, b].forEach((f, i) => {
    f.style.cssText = `position:absolute;top:4px;left:${4 + i * (w * k + 8)}px;width:${w}px;height:${h}px;border:0;background:#fff;transform:scale(${k});transform-origin:0 0`;
    d.appendChild(f);
  });
  document.body.appendChild(d);
  await pause(6000);
  return 'ok';
}
export const zakryt = () => { document.getElementById('zi-prev')?.remove(); return 'ok'; };

export async function k(kluch, dy = 0) {
  const A = document.getElementById('zi-a').contentWindow;
  const B = document.getElementById('zi-b').contentWindow;
  const ra = A.document.getElementById(`rec${bloki()[kluch]}`);
  const o = EKRANY[kluch].orig;
  const rb = o.startsWith('h2:')
    ? [...B.document.querySelectorAll('section')].find((s) => s.querySelector('h2')?.textContent.includes(o.slice(3)))
    : B.document.querySelector(o);
  const ya = ra ? ra.getBoundingClientRect().top + A.scrollY : 0;
  const yb = rb ? rb.getBoundingClientRect().top + B.scrollY : 0;
  // behavior:'instant' — у лендинга scroll-behavior:smooth, а плавная
  // прокрутка в фоновой вкладке не идёт.
  A.scrollTo({top: ya + dy, behavior: 'instant'});
  B.scrollTo({top: yb + dy, behavior: 'instant'});
  A.dispatchEvent(new Event('scroll')); // будит ленивую отрисовку Тильды
  await pause(1500);
  return JSON.stringify({vysotaChernovik: ra ? Math.round(ra.getBoundingClientRect().height) : 0,
    vysotaLending: rb ? Math.round(rb.getBoundingClientRect().height) : 0});
}

export default {EKRANY, bloki, nazvat, fon, hodRaboty, sverka, zakryt, k};
