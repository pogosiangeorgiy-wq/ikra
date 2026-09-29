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
// На телефонной раскладке с автомасштабом подписи остаются в сетке: элементы
// «по окну» Zero не масштабирует вместе с сеткой, и строка съезжала вправо
// от заголовка. Там их прижимает к низу telefonPoOknu — вместе со всем
// содержимым экрана.
function kNizu(code, re, {krome = []} = {}) {
  for (const el of elementy(code)) {
    if (!re.test(el.layer || '')) continue;
    const g = geometriya(code, el);
    for (const s of SCREENS) {
      const {L, w, T, h, H} = g[s];
      if (krome.includes(s)) {
        set(el, 'container', s, 'grid'); set(el, 'axisx', s, 'left'); set(el, 'axisy', s, 'top');
        set(el, 'left', s, Math.round(L)); set(el, 'top', s, Math.round(T));
        continue;
      }
      set(el, 'container', s, 'window');
      set(el, 'axisx', s, 'center'); set(el, 'left', s, Math.round(L - s / 2 + w / 2));
      set(el, 'axisy', s, 'bottom'); set(el, 'top', s, Math.round(T + h - H));
    }
  }
}

// Подпись, поставленная на ребро через writing-mode: vertical-rl, приходит
// узкой высокой рамкой с поворотом 180°. В Zero writing-mode нет, поэтому
// строка кладётся горизонтально и поворачивается вокруг того же центра:
// vertical-rl + rotate(180deg) = 270°, просто vertical-rl = 90°.
function vertikalnyyTekst(code) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'text') continue;
    const g = geometriya(code, el);
    const {w, h} = g[1200];
    if (!(h > 3 * w && (el.text || '').length > 5)) continue;
    set(el, 'rotate', 1200, num(el.rotate) === 180 ? 270 : 90);
    for (const s of SCREENS) {
      if (g[s].skryt) continue;
      const {L, T, w: ws, h: hs} = g[s];
      const cx = L + ws / 2, cy = T + hs / 2;
      set(el, 'width', s, Math.round(hs)); set(el, 'height', s, Math.round(ws));
      set(el, 'left', s, Math.round(cx - hs / 2)); set(el, 'top', s, Math.round(cy - ws / 2));
    }
  }
}

// Конвертер округляет кегль (46,8 → 47), и строка, влезавшая в рамку
// впритык, в Тильде переносится. Рамке текста даётся запас 3 %, со сдвигом
// по выравниванию, чтобы строка не уехала с места.
// Однострочному тексту — запас 3 %: конвертер округляет кегль (46,8 → 47),
// и строка, влезавшая впритык, в Тильде переносится.
// Многострочному — ширина самой длинной его строки на лендинге плюс ровно
// столько, на сколько округление кегля расширило текст. Оба числа снимает
// замерщик в экране (ZAMER_JS в sborka-zero.py). При такой ширине Тильда
// переносит слова там же, где лендинг. Текст — «высота по содержимому»:
// с фиксированной высотой Zero центрирует его по вертикали.
const normTekst = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return d.textContent.replace(/\s+/g, ' ').trim();
};
function zapasTeksta(code, stroki = {}, dolya = 0.03) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'text') continue;
    el.textfit = 'autoheight';
    const g = geometriya(code, el);
    const zamer = stroki[normTekst(el.text)] || {};
    for (const s of SCREENS) {
      if (g[s].skryt) continue;
      const {L, w, h} = g[s];
      const fs = num(eff(el, 'fontsize', s)) || 16;
      const lh = num(eff(el, 'lineheight', s)) || 1.4;
      const strok = Math.round(h / (fs * (lh > 3 ? lh / fs : lh)));
      let nw;
      if (strok <= 1) nw = w + Math.ceil(w * dolya) + 2;
      else {
        const z = zamer[s];
        const base = z && z.l < w ? z.l : w;
        const rost = z && z.fs ? Math.max(0, fs / z.fs - 1) : 0;
        nw = base + base * rost + 1.5;
      }
      const al = eff(el, 'align', s) || 'left';
      set(el, 'width', s, Math.ceil(nw));
      set(el, 'left', s, Math.round(al === 'center' ? L + (w - nw) / 2 : al === 'right' ? L + w - nw : L));
    }
  }
}

// Конвертер ставит слои в порядке разметки, не глядя на z-index. Вуаль,
// повешенная на саму секцию (::after), оказывается последней — поверх текста.
// Фигура, накрывающая картинку, переезжает сразу за эту картинку.
function podlozhkiPodTekst(code) {
  const els = elementy(code).sort((a, b) => num(a.zindex) - num(b.zindex));
  const box = (el) => { const g = geometriya(code, el)[1200]; return [g.L, g.T, g.L + g.w, g.T + g.h]; };
  // «Накрывает» — пересечение не меньше 80 % меньшей из рамок: фото в
  // рамке параллакса выше своей полосы, и строгое вложение не срабатывает.
  const ploshad = (r) => Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
  const nakryvaet = (a, b) => {
    const x = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
    return ploshad(x) >= 0.8 * Math.min(ploshad(a), ploshad(b));
  };
  const poryadok = [...els];
  for (const sh of els.filter((e) => e.elem_type === 'shape' && /tn-pseudo/.test(e.layer || ''))) {
    const b = box(sh);
    const img = els.find((e) => e.elem_type === 'image' && nakryvaet(b, box(e)));
    if (!img) continue; // декоративная фигура без фото — остаётся где была
    poryadok.splice(poryadok.indexOf(sh), 1);
    poryadok.splice(poryadok.indexOf(img) + 1, 0, sh);
  }
  poryadok.forEach((e, i) => { e.zindex = String(3 + i); });
}

// Линии частичных границ (низ строки таблицы, верх пункта списка) конвертер
// не получает: их снимает и замеряет скрипт в самом экране (ZAMER_JS в
// sborka-zero.py). Здесь каждая линия становится фигурой толщиной в линию —
// с положением на каждой ширине и скрытием там, где линии нет.
function cvetFona(c) {
  const m = String(c).match(/rgba?\(([^)]+)\)/);
  if (!m) return c;
  const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  if (a >= 1) return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  const rgba = `rgba(${r},${g},${b},${a})`;
  return `linear-gradient(0deg, ${rgba} 0%, ${rgba} 100%)`;
}
function dobavitLinii(code, ramki = {}) {
  const kluchi = Object.keys(code).filter((k) => /^\d+$/.test(k)).map(Number);
  let sled = kluchi.length ? Math.max(...kluchi) + 1 : 0;
  let z = Math.max(2, ...elementy(code).map((e) => num(e.zindex)));
  const baza = Date.now() % 1e9;
  Object.values(ramki).forEach((poShirinam, i) => {
    const iz = SCREENS.find((s) => poShirinam[s]);
    if (!iz) return;
    const el = {layer: 'Линия', elem_type: 'shape', elem_id: `${baza}${i + 1}`,
      bgcolor: cvetFona(poShirinam[iz].c), rotate: '0', borderradius: '0px'};
    for (const s of SCREENS) {
      const r = poShirinam[s];
      if (!r) { set(el, 'hidden', s, 'y'); continue; }
      set(el, 'hidden', s, 'n');
      set(el, 'top', s, Math.round(r.t)); set(el, 'left', s, Math.round(r.l));
      set(el, 'width', s, Math.max(1, Math.round(r.w))); set(el, 'height', s, Math.max(1, Math.round(r.h)));
    }
    z += 1;
    el.zindex = String(z);
    code[String(sled)] = el;
    sled += 1;
  });
}

// Когда вкладка Chrome скрыта, браузер пускает цепочки таймеров раз в
// минуту, а конвертер между шагами ждёт по 80–200 мс через setTimeout —
// экран собирался бы десятки минут. На время сборки короткие таймеры
// редактора идут через MessageChannel: его сообщения не притормаживаются.
function bystryeTaimery() {
  const st = window.setTimeout, ct = window.clearTimeout;
  const moi = new Map();
  let n = 1e9;
  window.setTimeout = function (fn, ms = 0, ...args) {
    if (document.visibilityState === 'visible' || ms > 1000 || typeof fn !== 'function') return st.call(window, fn, ms, ...args);
    const id = n += 1, konec = performance.now() + (+ms || 0), ch = new MessageChannel();
    moi.set(id, ch);
    ch.port1.onmessage = () => {
      if (!moi.has(id)) return;
      if (performance.now() >= konec) { moi.delete(id); fn(...args); } else ch.port2.postMessage(0);
    };
    ch.port2.postMessage(0);
    return id;
  };
  window.clearTimeout = function (id) { if (moi.has(id)) moi.delete(id); else ct.call(window, id); };
  return () => { window.setTimeout = st; window.clearTimeout = ct; };
}

// Первый экран на телефоне. Высота «по окну» при автомасштабе берётся как
// большее из (высота раскладки × масштаб) и высоты окна; замеренные 649 px
// раскладки «320» на экране 375 дают 761 px — выше окна, и подписи внизу
// уходят за край. Поэтому высота телефонной раскладки ужимается до
// содержимого с полями, а содержимое сдвигается на полразницы: центровка
// сохраняется. Фон на всю высоту и подписи, прижатые к низу, не трогаются.
function telefonPoOknu(code, {vh = 92, pole = 40} = {}) {
  const s = 320;
  const H = abH(code, s);
  const obychnye = elementy(code).filter((el) => {
    if (skryt(el, s)) return false;
    return !(eff(el, 'container', s) === 'window'
      && (eff(el, 'axisy', s) === 'bottom' || eff(el, 'heightunits', s) === '%'));
  });
  if (!obychnye.length) return;
  const g = obychnye.map((el) => geometriya(code, el)[s]);
  const verh = Math.min(...g.map((x) => x.T)), niz = Math.max(...g.map((x) => x.T + x.h));
  const nH = Math.round(niz - verh + 2 * pole);
  if (nH >= H) return;
  const sdvig = Math.round((H - nH) / 2);
  obychnye.forEach((el, i) => set(el, 'top', s, Math.round(g[i].T - sdvig)));
  code[`ab_height-res-${s}`] = String(nH);
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
    code.ab_height_vh = String(opts.vh);
    code.ab_valign = 'center';
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
  if (opts.pinBottom) kNizu(code, opts.pinBottom, {krome: opts.mobileScale !== false ? [320] : []});
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
