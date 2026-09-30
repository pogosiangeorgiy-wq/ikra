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
    anchor: 'top', opts: {vh: 100, geroy: true, pinBottom: /^(Москва|ТУ 10|HACCP)/}},
  uslugi: {title: 'Услуги', orig: '#uslugi', anchor: 'uslugi'},
  band: {title: 'Качество начинается с сырья', orig: 'section.band'},
  syrye: {title: 'Сырьё', orig: '#syrye', anchor: 'syrye'},
  proizvodstvo: {title: 'Производство', orig: '#proizvodstvo', anchor: 'proizvodstvo'},
  partiya: {title: 'Готовая партия', orig: 'h2:Готовая', opts: {spisokChteniya: true}},
  'o-kompanii': {title: 'О компании', orig: '#o-kompanii', anchor: 'o-kompanii'},
  // posle — после какого блока ставить экран, если его ещё нет на странице.
  // Лента: числа сняты с работающего лендинга на 1440 и 375 (высота
  // логотипа, промежуток, отступ ряда, верх ряда, высота секции, круг в с).
  trust: {title: 'Нам доверяют', orig: 'section.trust', posle: 'hero', opts: {lenta: {
    // Растушёвка краёв — --trust-fade: 120 px, до 760 px — 48.
    desktop: {h: 104, gap: 96, pad: 96, top: 101, secH: 269, dur: 88, fade: 120},
    mobile: {h: 76, gap: 56, pad: 56, top: 85, secH: 209, dur: 110, fade: 48},
    fade: 120,
  }}},
  // Липкие сцены: кадр высотой в окно (на телефоне — список актов) и за ним
  // «прокрутка» — прозрачный блок высотой в ход сцены (prostavka).
  etapy: {title: 'Этапы работы', sel: 'main > .zi-scena', orig: '#etapy', posle: 'uslugi', anchor: 'etapy',
    opts: {scena: {fonTelefon: '#e9e4de'}}},
  'etapy-prokrutka': {title: 'Этапы работы — прокрутка', prostavka: {fonTelefon: '#e9e4de'}, posle: 'etapy'},
  upakovka: {title: 'Тара и маркировка', sel: 'main > .zi-scena', orig: '#upakovka', posle: 'proizvodstvo',
    anchor: 'upakovka', opts: {scena: {fonTelefon: '#191510'}}},
  'upakovka-prokrutka': {title: 'Тара и маркировка — прокрутка', prostavka: {fonTelefon: '#191510'}, posle: 'upakovka'},
  'upakovka-tablica': {title: 'Тара — форматы', orig: '#upakovka', posle: 'upakovka-prokrutka'},
  start: {title: 'Как начать', orig: 'h2:Как начать', posle: 'o-kompanii'},
  ekonomika: {title: 'Экономика и условия', orig: '#ekonomika', posle: 'start', anchor: 'ekonomika'},
  // Заголовок — по сетке лендинга: список вопросов (T585) переведён на неё
  // же правилами в блоке «Плавная прокрутка» (30.09.2026).
  voprosy: {title: 'Вопросы', orig: 'h2:Вопросы', posle: 'ekonomika', anchor: 'voprosy'},
  kontakty: {title: 'Контакты', orig: '#kontakty', posle: 'ekonomika', anchor: 'kontakty', opts: {forma: {
    // Те же имена полей, что уходили в «Заявки» из версии на блоках кода.
    imena: {name: 'Имя', company: 'Компания', phone: 'Телефон', email: 'Почта', product: 'Продукт',
      volume: 'Объём партии', message: 'Задача', consent: 'Согласие'},
    soglasie: 'Я даю согласие ООО «ГУРМАН-ГУРУ» на обработку моих персональных данных на условиях <a href="/soglasie">Согласия</a> и подтверждаю ознакомление с <a href="/politika">Политикой обработки персональных данных</a>.',
    skrytye: [{imya: 'Версия согласия', znachenie: '2026-09-09'}, {imya: 'Форма', znachenie: 'lead-kontakty'}],
    nazvanie: 'Заявка — контакты',
    uspeh: 'Заявка принята. Свяжемся с вами по указанным контактам.',
    // Сообщения лендинга (index.html, раздел формы).
    oshibkaPustye: 'Заполните имя, телефон и отметьте согласие.',
    oshibka: 'Не удалось отправить. Напишите нам на sale@gurman.guru или позвоните.',
  }}},
  map: {title: 'Как добраться', orig: 'section.map', posle: 'kontakty'},
  footer: {title: 'Подвал', sel: 'footer', orig: 'footer.site-footer', posle: 'map'},

  // Вторичные страницы (свои черновики). 404: шапка и блок ошибки — один
  // экран высотой в окно (у страницы 100svh − 88 px под шапкой, это ~93 %),
  // строка разделов прижата к низу; подвал — отдельно.
  '404': {title: 'Страница 404', sel: '.zi-stranica', opts: {vh: 93, nizProcentom: true,
    pinBottom: /^(Услуги|Производство|Упаковка|Контакты)$/}},
  '404-podval': {title: 'Подвал страницы', sel: '.zi-stranica', posle: '404'},
  // Политика и согласие: шапка с заголовком документа, текст — блок
  // «Статья» (S.statya), подвал. Zero-блоки встают по полям сетки Тильды —
  // по тем же, что и колонка статьи.
  'politika-verh': {title: 'Шапка и заголовок', sel: '.zi-stranica', opts: {polyaTildy: true}},
  'politika-podval': {title: 'Подвал страницы', sel: '.zi-stranica', opts: {polyaTildy: true}},
  'soglasie-verh': {title: 'Шапка и заголовок', sel: '.zi-stranica', opts: {polyaTildy: true}},
  'soglasie-podval': {title: 'Подвал страницы', sel: '.zi-stranica', opts: {polyaTildy: true}},
};

// Блок «Статья» (TX24) с текстом документа: содержимое — из
// tilda/zero/dokumenty/<страница>.json (собирает statya.py), типографика и
// поля — как у .doc-body лендинга: заголовок раздела Golos 500, 22 px
// (телефон 17), заглавные, разрядка 0,12 em, белый; текст 15 px (14),
// интерлиньяж 1,75, #E8E5DF; колонка 8 из 12 (≈ 82 знака), поля блока
// 64 / 128 px (телефон 48 / 64), фон #191510.
export async function statya(stranica, {posle = null} = {}) {
  let rec = document.querySelector('.record[data-record-type="1211"]');
  if (!rec) {
    const bylo = new Set([...document.querySelectorAll('.record')].map((r) => r.id));
    window.tp__addRecord('1211', posle);
    for (let i = 0; i < 40 && !rec; i += 1) {
      await pause(300);
      rec = [...document.querySelectorAll('.record')].find((r) => !bylo.has(r.id));
    }
    if (!rec) throw new Error('Статья не добавилась');
  }
  const id = rec.id.replace('record', '');
  const bloki = await fetch(`${KOREN}tilda/zero/dokumenty/${stranica}.json?v=${Date.now()}`).then((r) => r.json());
  const polya = {
    blockeditordata: JSON.stringify(bloki),
    columns: '8', prefix: '0',
    title_typo: JSON.stringify({fontsize: '22px', fontsize_res_480: '17px', fontweight: '500', color: '#ffffff',
      uppercase: 'uppercase', letterspacing: '2.6px', letterspacing_res_480: '2px', lineheight: '1.75'}),
    text_typo: JSON.stringify({fontsize: '15px', fontsize_res_480: '14px', fontweight: '400', color: '#e8e5df',
      lineheight: '1.75', lineheight_res_480: '1.75'}),
    margintop: '64px', marginbottom: '128px', margintop_res_480: '48px', marginbottom_res_480: '64px',
    blockbackground: '#191510', // у «Статьи» фон — общее поле блока
  };
  const otvety = {};
  for (const [f, znach] of Object.entries(polya)) {
    otvety[f] = String(await window.tp__fetch({url: '/page/submit/', body: {comm: 'saverecord',
      pageid: window.pageid, recordid: id, onlythisfield: f, [f]: znach}})).slice(0, 20);
  }
  window.tp__updateRecord(id, '1211');
  return {id, otvety};
}

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

// Блок с таким названием на открытой странице. У разных страниц названия
// повторяются («Подвал страницы»), поэтому ищется по названию, а не по ключу.
function najti(title) {
  const r = [...document.querySelectorAll('.record')].find((x) => (x.getAttribute('data-title')
    || x.querySelector('.t396__artboard')?.getAttribute('data-artboard-title') || '') === title);
  return r ? +r.id.replace('record', '') : undefined;
}

const hod = {log: [], gotovo: true};
export function fon(kluchi, {posle} = {}) {
  hod.log = []; hod.gotovo = false;
  (async () => {
    await modul();
    for (const k of kluchi) {
      try {
        const e = EKRANY[k];
        const code = e.prostavka ? ZI.prostavka(e.prostavka) : await ZI.build(k, e.sel || 'main > section', e.opts || {});
        const est = najti(e.title);
        const poslednij = [...document.querySelectorAll('.record')].pop();
        const id = est ? await ZI.replace(est, code) : await ZI.put(code, posle
          ?? (e.posle && najti(EKRANY[e.posle].title)) ?? (poslednij && +poslednij.id.replace('record', '')));
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

export default {EKRANY, bloki, nazvat, fon, hodRaboty, sverka, zakryt, k, statya};
