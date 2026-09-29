// Импорт экрана лендинга в Zero Block.
//
// Запускается в редакторе страницы Тильды (tilda.ru/page/?pageid=…) —
// там есть встроенный конвертер HTML → Zero, которым Тильда превращает свои
// «Вайб-блоки» в Zero Block. Мы кормим его экранами из tilda/zero/ekrany/,
// поправляем то, чего конвертер не знает про наш макет, и превращаем
// обычный блок страницы в Zero с этими элементами.
//
//   const ZI = (await import('https://pogosiangeorgiy-wq.github.io/ikra/tilda/zero/zero-import.js?v=' + Date.now())).default;
//   const code = await ZI.build('hero', 'section.hero', {vh: 100, pinBottom: /^(Москва|ТУ 10|HACCP)/});
//   await ZI.put(code);            // в конец страницы
//   await ZI.replace(recid, code); // на место существующего блока
//
// Подробности и причины каждой поправки — tilda/zero/КАК-РАБОТАЕТ.md.

const BAZA = 'https://pogosiangeorgiy-wq.github.io/ikra/tilda/zero/ekrany/';
// Ширины Zero Block. 1200 — основная, значения без суффикса.
const SCREENS = [1200, 960, 640, 480, 320];
const MODUL = './index-bbX7hnLP.min.js';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const kluch = (field, s) => (s === 1200 ? field : `${field}-res-${s}`);
const elementy = (code) => Object.keys(code).filter((k) => /^\d+$/.test(k)).map((k) => code[k]);

// Значение поля на ширине s с учётом наследования: меньшие ширины берут
// значение у ближайшей большей, где оно задано.
function eff(obj, field, s) {
  let v = obj[field];
  for (const t of SCREENS.slice(1)) {
    if (t < s) break;
    const x = obj[`${field}-res-${t}`];
    if (x !== undefined && x !== '') v = x;
  }
  return v;
}
const num = (v) => parseFloat(v || 0);
function set(obj, field, s, val) { obj[kluch(field, s)] = String(val); }
const abH = (code, s) => num(eff(Object.fromEntries(
  Object.entries(code).filter(([k]) => k.startsWith('ab_')).map(([k, v]) => [k.slice(3), v])), 'height', s));
const skryt = (el, s) => eff(el, 'hidden', s) === 'y';

// Фото и вуали, которые у лендинга уходят под край окна, конвертер кладёт
// в сетку 1200 — на широком экране они обрывались бы на её краю.
// Здесь они переводятся в «контейнер: окно» с шириной в процентах.
// Исходная геометрия элемента на всех ширинах — снимается до любых правок:
// правка значения на 1200 иначе «протекла» бы через наследование в 960 и ниже.
function geometriya(code, el) {
  return Object.fromEntries(SCREENS.map((s) => [s, {
    L: num(eff(el, 'left', s)), w: num(eff(el, 'width', s)),
    T: num(eff(el, 'top', s)), h: num(eff(el, 'height', s)),
    H: abH(code, s), skryt: skryt(el, s),
  }]));
}

function kKrayuOkna(code, {vh = false} = {}) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'image' && el.elem_type !== 'shape') continue;
    const g = geometriya(code, el);
    for (const s of SCREENS) {
      if (g[s].skryt) continue;
      const {L, w, T, h, H} = g[s];
      const lev = L <= 1, prav = L + w >= s - 1;
      if (!lev && !prav) {
        // На этой ширине элемент внутри сетки — явно возвращаем сетку,
        // иначе он унаследует «окно» от большей ширины.
        set(el, 'container', s, 'grid'); set(el, 'axisx', s, 'left');
        set(el, 'widthunits', s, 'px'); set(el, 'left', s, Math.round(L)); set(el, 'width', s, Math.round(w));
        continue;
      }
      set(el, 'container', s, 'window');
      set(el, 'axisx', s, lev ? 'left' : 'right');
      set(el, 'left', s, 0);
      set(el, 'widthunits', s, '%');
      set(el, 'width', s, lev && prav ? 100 : +(w / s * 100).toFixed(2));
      if (vh) {
        // Экран растягивается по высоте окна: фон на всю высоту — в процентах.
        const verh = T <= 1, niz = T + h >= H - 1;
        if (verh && niz) { set(el, 'top', s, 0); set(el, 'heightunits', s, '%'); set(el, 'height', s, 100); }
        else if (niz) { set(el, 'axisy', s, 'bottom'); set(el, 'top', s, 0); }
      }
    }
  }
}

// Подписи внизу первого экрана: прижать к низу окна, а по горизонтали
// оставить на месте в сетке (ось — центр, смещение от центра).
// Подписи внизу первого экрана прижимаются к низу окна. По горизонтали на
// широких раскладках — ось по центру и смещение от центра (сетка стоит по
// центру окна). На телефонной раскладке с автомасштабом элементы «по окну»
// Zero не масштабирует вместе с сеткой, поэтому там левый край задаётся в
// процентах ширины: L/320 от окна — ровно то место, куда автомасштаб ставит
// левый край сетки.
function kNizu(code, re, {telefon = []} = {}) {
  for (const el of elementy(code)) {
    if (!re.test(el.layer || '')) continue;
    const g = geometriya(code, el);
    for (const s of SCREENS) {
      const {L, w, T, h, H} = g[s];
      set(el, 'container', s, 'window');
      set(el, 'axisy', s, 'bottom'); set(el, 'top', s, Math.round(T + h - H));
      if (telefon.includes(s)) {
        set(el, 'axisx', s, 'left'); set(el, 'leftunits', s, '%');
        set(el, 'left', s, +(L / s * 100).toFixed(2));
      } else {
        set(el, 'axisx', s, 'center'); set(el, 'leftunits', s, 'px');
        set(el, 'left', s, Math.round(L - s / 2 + w / 2));
      }
    }
  }
}

// Первый экран на телефоне. Высота «по окну» при автомасштабе берётся как
// большее из (высота раскладки × масштаб) и высоты окна. Раскладка снята во
// фрейме конвертера высотой больше обычного телефона, и на экране 375×660
// первый экран выходил выше окна — подписи внизу уходили за край. Поэтому
// высота телефонной раскладки ужимается до содержимого с полем снизу:
// дальше её дотягивает до 92 % окна сама Тильда (как 92svh у лендинга), а
// подписи прижаты к низу окна. Содержимое стоит сверху — так и в лендинге.
function telefonPoOknu(code, {vh = 92, pole = 40} = {}) {
  const s = 320;
  const H = abH(code, s);
  const obychnye = elementy(code).filter((el) => !skryt(el, s) && eff(el, 'container', s) !== 'window');
  if (!obychnye.length) return;
  const niz = Math.max(...obychnye.map((el) => { const g = geometriya(code, el)[s]; return g.T + g.h; }));
  const nH = Math.round(niz + pole);
  if (nH < H) code[`ab_height-res-${s}`] = String(nH);
  code[`ab_height_vh-res-${s}`] = String(vh);
}

// Телефонная раскладка снимается с лендинга на ширине 375 — самой частой у
// телефонов — и пересчитывается в сетку 320 с коэффициентом 320/375. Zero
// показывает её с автомасштабом по ширине окна, и на экране 375 она выходит
// ровно в размер лендинга (360 → 0,96, 414 → 1,1). Если снимать сразу на 320,
// на 375 всё выходит на 17 % крупнее и текст переносится чаще.
const TELEFON = 375;
const K_TEL = 320 / TELEFON;
const SNYATIE = [1200, 960, 640, 480, TELEFON];
function eff375(obj, f) {
  let v = obj[f];
  for (const t of SNYATIE.slice(1)) {
    const x = obj[`${f}-res-${t}`];
    if (x !== undefined && x !== '') v = x;
  }
  return v;
}
const MASSHTAB = ['top', 'left', 'width', 'height', 'fontsize', 'letterspacing', 'borderwidth'];
function vSetku320(code, stroki, ramki) {
  const r1 = (v) => String(Math.round(num(v) * K_TEL * 10) / 10);
  for (const el of elementy(code)) {
    const res = Object.keys(el).filter((k) => k.endsWith(`-res-${TELEFON}`));
    const polya = new Set([...MASSHTAB, 'lineheight', 'borderradius', ...res.map((k) => k.slice(0, -`-res-${TELEFON}`.length))]);
    const nov = {};
    for (const f of polya) {
      const v = eff375(el, f);
      if (v === undefined || v === '') continue;
      // Линии и обводки в 1–2 px не пересчитываются: 0,9 px Zero не рисует.
      if ((f === 'borderwidth' || f === 'height' || f === 'width') && num(v) > 0 && num(v) <= 2) nov[f] = String(num(v));
      else if (MASSHTAB.includes(f)) nov[f] = r1(v);
      else if (f === 'lineheight' && num(v) > 3) nov[f] = r1(v);
      else if (f === 'borderradius' && /px$/.test(v)) nov[f] = `${r1(v)}px`;
      else if (res.includes(`${f}-res-${TELEFON}`)) nov[f] = v;
    }
    res.forEach((k) => delete el[k]);
    Object.entries(nov).forEach(([f, v]) => { el[`${f}-res-320`] = v; });
  }
  const ab = Object.fromEntries(Object.entries(code).filter(([k]) => k.startsWith('ab_')).map(([k, v]) => [k.slice(3), v]));
  const hAb = eff375(ab, 'height');
  Object.keys(code).filter((k) => k.startsWith('ab_') && k.endsWith(`-res-${TELEFON}`)).forEach((k) => delete code[k]);
  if (hAb) code['ab_height-res-320'] = r1(hAb);
  code.ab_screens = String(code.ab_screens || '').replace(String(TELEFON), '320') || '320,480,640,960,1200';
  Object.values(stroki).forEach((z) => { if (z[TELEFON]) z[320] = {l: z[TELEFON].l * K_TEL, fs: z[TELEFON].fs * K_TEL}; });
  Object.values(ramki).forEach((z) => {
    const r = z[TELEFON];
    if (r) z[320] = {t: r.t * K_TEL, l: r.l * K_TEL, w: r.w * K_TEL, h: Math.max(1, r.h * K_TEL), c: r.c};
  });
}

async function build(key, selector, opts = {}) {
  const html = await fetch(`${BAZA}${key}.html?v=${Date.now()}`).then((r) => {
    if (!r.ok) throw new Error(`${key}.html: HTTP ${r.status}`);
    return r.text();
  });
  const mod = await window.tp__fallbackImport(MODUL);
  window.__ziLines = {}; // сюда пишет замерщик строк из экрана
  window.__ziRamki = {}; // а сюда — линии частичных границ
  // Конвертер меняет ширину своего фрейма и через 120 мс замеряет. Замерщик
  // в экране вызывается прямо отсюда, микрозадачей после смены ширины: на
  // событие resize в фоновой вкладке рассчитывать нельзя.
  const nablyudatel = new MutationObserver((zapisi) => {
    for (const z of zapisi) {
      const f = z.target;
      if (f.tagName === 'IFRAME' && f.classList.contains('tn-html-import__iframe')) {
        try { f.contentWindow.__ziVse?.(); } catch (e) { console.warn('zero-zamer', e); }
      }
    }
  });
  nablyudatel.observe(document.body, {subtree: true, attributes: true, attributeFilter: ['style']});
  const vernutTaimery = bystryeTaimery();
  let code;
  try {
    code = await mod.html__buildBackendData(html, selector, {
      viewportWidth: 1200, viewportHeight: 800, rootMode: 'artboard',
      bypassMaxDepth: true, breakpoints: opts.mobileScale === false ? SCREENS : SNYATIE, materialOnly: true,
      // По умолчанию конвертер уступает браузеру каждые 8 мс через таймер, а
      // в фоновой вкладке таймер тянется секунду и больше — экран собирался
      // минутами. Без пауз он проходит за один заход.
      frameBudgetMs: 1e9,
    });
  } finally {
    nablyudatel.disconnect();
    vernutTaimery();
  }
  if (opts.mobileScale !== false) vSetku320(code, window.__ziLines, window.__ziRamki);
  const neHvataet = SCREENS.filter((s) => !Object.values(window.__ziLines).some((z) => z[s]));
  if (neHvataet.length) console.warn('zero-zamer: нет замеров строк на ширинах', neHvataet);
  if (opts.vh) {
    // Содержимое первого экрана в лендинге стоит сверху (у строки подписей
    // margin-top:auto забирает всё свободное место), лишняя высота — снизу.
    code.ab_height_vh = String(opts.vh);
    code.ab_valign = 'top';
  }
  // Телефонная раскладка (экраны 320–479) масштабируется под ширину окна —
  // штатный автомасштаб Zero. Без него на 375–430 раскладка «320» стоит
  // посередине с пустыми полями по бокам и узкой колонкой текста.
  if (opts.mobileScale !== false) code['ab_upscale-res-320'] = 'window';
  vertikalnyyTekst(code);
  zapasTeksta(code, window.__ziLines);
  podlozhkiPodTekst(code);
  dobavitLinii(code, window.__ziRamki);
  kKrayuOkna(code, {vh: !!opts.vh});
  if (opts.pinBottom) kNizu(code, opts.pinBottom, {telefon: opts.mobileScale !== false ? [320] : []});
  if (opts.vh && opts.mobileScale !== false) telefonPoOknu(code);
  if (opts.after) opts.after(code);
  return code;
}

const zapisi = () => [...document.querySelectorAll('.record')];

async function put(code, afterid) {
  const bylo = new Set(zapisi().map((r) => r.id));
  window.tp__addRecord('106', afterid);
  let rec = null;
  for (let i = 0; i < 40 && !rec; i += 1) {
    await pause(300);
    rec = zapisi().find((r) => !bylo.has(r.id));
  }
  if (!rec) throw new Error('Блок не добавился');
  const id = +rec.id.replace('record', '');
  const otvet = await window.tp__fetch({
    url: '/page/submit/',
    body: {comm: 'converttozero', pageid: window.pageid, recordid: id, code: JSON.stringify(code)},
    explanation: 'convert block to ZeroBlock',
  });
  if (String(otvet) !== 'OK' && String(otvet) !== '') throw new Error(`converttozero: ${String(otvet).slice(0, 200)}`);
  window.tp__updateRecord(id, '396');
  await pause(1500);
  return id;
}

async function replace(recid, code) {
  const id = await put(code, recid);
  window.tp__delRecord(recid);
  await pause(1200);
  return id;
}

export default {SCREENS, eff, build, put, replace, elementy};
