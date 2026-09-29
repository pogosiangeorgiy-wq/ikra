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
function kNizu(code, re) {
  for (const el of elementy(code)) {
    if (!re.test(el.layer || '')) continue;
    const g = geometriya(code, el);
    for (const s of SCREENS) {
      const {L, w, T, h, H} = g[s];
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
  let code;
  try {
    code = await mod.html__buildBackendData(html, selector, {
      viewportWidth: 1200, viewportHeight: 800, rootMode: 'artboard',
      bypassMaxDepth: true, breakpoints: SCREENS, materialOnly: true,
      // По умолчанию конвертер уступает браузеру каждые 8 мс через таймер, а
      // в фоновой вкладке таймер тянется секунду и больше — экран собирался
      // минутами. Без пауз он проходит за один заход.
      frameBudgetMs: 1e9,
    });
  } finally {
    nablyudatel.disconnect();
  }
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
  if (opts.pinBottom) kNizu(code, opts.pinBottom);
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
