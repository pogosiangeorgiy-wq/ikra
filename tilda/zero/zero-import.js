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
// Раскладки Zero Block: s — с какой ширины окна раскладка действует
// (брейкпоинт), c — на какой ширине она снимается с лендинга, m — идёт ли она
// с автомасштабом по ширине окна.
//
// Лендинг «резиновый»: контейнер растёт до 1332 px, крупные кегли — с шириной
// окна, а мелкий текст фиксирован (13–16 px). Поэтому на частых ширинах
// экранов (телефоны 375/390/412/430, планшет 1024, ноутбуки 1280/1366/1440)
// раскладка снимается ровно на этой ширине и показывается как есть — 1:1.
// Промежуточные диапазоны, где устройств мало, закрываются раскладкой с
// автомасштабом: она растёт вместе с окном, как лендинг (мелкий текст при
// этом тоже чуть масштабируется, до ±7 %). Пороги совпадают с медиазапросами
// лендинга (560/640/760/900/1100). Шире 1440 лендинг не меняется.
const RAZMETKA = [
  {s: 1440, c: 1440}, {s: 1366, c: 1366}, {s: 1280, c: 1280}, {s: 1101, c: 1190, m: 1},
  {s: 1024, c: 1024}, {s: 901, c: 960, m: 1}, {s: 768, c: 800, m: 1}, {s: 641, c: 700, m: 1},
  {s: 561, c: 600, m: 1}, {s: 480, c: 520, m: 1}, {s: 430, c: 430}, {s: 412, c: 412},
  {s: 390, c: 390}, {s: 375, c: 375}, {s: 320, c: 360, m: 1},
];
const SCREENS = RAZMETKA.map((r) => r.s);       // по убыванию
const TOP = SCREENS[0];                          // значения без суффикса
const SNYATIE = RAZMETKA.map((r) => r.c);        // ширины снятия, по убыванию
const S_MASSHTABOM = RAZMETKA.filter((r) => r.m).map((r) => r.s); // раскладки с автомасштабом
const S_TELEFON = RAZMETKA.filter((r) => r.c <= 760).map((r) => r.s); // у лендинга ≤760 первый экран 92svh
const MODUL = './index-bbX7hnLP.min.js';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const kluch = (field, s) => (s === TOP ? field : `${field}-res-${s}`);
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
// в сетку раскладки — на широком экране они обрывались бы на её краю.
// Здесь они переводятся в «контейнер: окно» с шириной в процентах.
// Исходная геометрия элемента на всех ширинах — снимается до любых правок:
// правка значения на верхней раскладке иначе «протекла» бы через наследование в нижние.
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

// Подпись, поставленная на ребро через writing-mode: vertical-rl, приходит
// узкой высокой рамкой с поворотом 180°. В Zero writing-mode нет, поэтому
// строка кладётся горизонтально и поворачивается вокруг того же центра:
// vertical-rl + rotate(180deg) = 270°, просто vertical-rl = 90°.
function vertikalnyyTekst(code) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'text') continue;
    const g = geometriya(code, el);
    const {w, h} = g[TOP];
    if (!(h > 3 * w && (el.text || '').length > 5)) continue;
    set(el, 'rotate', TOP, num(el.rotate) === 180 ? 270 : 90);
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
  const box = (el) => { const g = geometriya(code, el)[TOP]; return [g.L, g.T, g.L + g.w, g.T + g.h]; };
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
// большее из (высота раскладки × масштаб) и высоты окна. Раскладка снята во
// фрейме конвертера высотой больше обычного телефона, и на экране 375×660
// первый экран выходил выше окна — подписи внизу уходили за край. Поэтому
// высота телефонной раскладки ужимается до содержимого с полем снизу:
// дальше её дотягивает до 92 % окна сама Тильда (как 92svh у лендинга), а
// подписи прижаты к низу окна. Содержимое стоит сверху — так и в лендинге.
function telefonPoOknu(code, {vh = 92, pole = 40} = {}) {
  for (const s of S_TELEFON) {
    const H = abH(code, s);
    const obychnye = elementy(code).filter((el) => !skryt(el, s) && eff(el, 'container', s) !== 'window');
    if (!obychnye.length) continue;
    const niz = Math.max(...obychnye.map((el) => { const g = geometriya(code, el)[s]; return g.T + g.h; }));
    const nH = Math.round(niz + pole);
    if (nH < H) code[`ab_height-res-${s}`] = String(nH);
    code[`ab_height_vh-res-${s}`] = String(vh);
  }
}

// Раскладки снимаются с лендинга на своих ширинах c и пересчитываются в
// сетку своего брейкпоинта s с коэффициентом s/c: с автомасштабом Zero на
// экране шириной c раскладка выходит ровно в размер лендинга. Пример —
// телефон: снято на 375, лежит в сетке 320; на экране 375 — 1:1,
// на 360 — 0,96, на 414 — 1,1.
function effCap(obj, f, c) {
  let v = obj[f];
  for (const t of SNYATIE.slice(1)) {
    if (t < c) break;
    const x = obj[`${f}-res-${t}`];
    if (x !== undefined && x !== '') v = x;
  }
  return v;
}
const MASSHTAB = ['top', 'left', 'width', 'height', 'fontsize', 'letterspacing', 'borderwidth'];
function vRazmetku(code, stroki, ramki) {
  const r1 = (v, k) => String(Math.round(num(v) * k * 10) / 10);
  const nizhnie = RAZMETKA.slice(1);
  for (const el of elementy(code)) {
    const nov = {};
    for (const {s, c} of nizhnie) {
      const k = s / c;
      const suf = `-res-${c}`;
      const res = Object.keys(el).filter((key) => key.endsWith(suf));
      const polya = new Set([...MASSHTAB, 'lineheight', 'borderradius', ...res.map((key) => key.slice(0, -suf.length))]);
      for (const f of polya) {
        const v = effCap(el, f, c);
        if (v === undefined || v === '') continue;
        let out;
        // Линии и обводки в 1–2 px не пересчитываются: 0,9 px Zero не рисует.
        if ((f === 'borderwidth' || f === 'height' || f === 'width') && num(v) > 0 && num(v) <= 2) out = String(num(v));
        else if (MASSHTAB.includes(f)) out = r1(v, k);
        else if (f === 'lineheight' && num(v) > 3) out = r1(v, k);
        else if (f === 'borderradius' && /px$/.test(v)) out = `${r1(v, k)}px`;
        else if (res.includes(`${f}${suf}`)) out = v;
        else continue;
        nov[`${f}-res-${s}`] = out;
      }
    }
    for (const {c} of nizhnie) Object.keys(el).filter((key) => key.endsWith(`-res-${c}`)).forEach((key) => delete el[key]);
    Object.assign(el, nov);
  }
  const ab = Object.fromEntries(Object.entries(code).filter(([k]) => k.startsWith('ab_')).map(([k, v]) => [k.slice(3), v]));
  const abNov = {};
  for (const {s, c} of nizhnie) { const h = effCap(ab, 'height', c); if (h) abNov[`ab_height-res-${s}`] = r1(h, s / c); }
  for (const {c} of nizhnie) Object.keys(code).filter((k) => k.startsWith('ab_') && k.endsWith(`-res-${c}`)).forEach((k) => delete code[k]);
  Object.assign(code, abNov);
  code.ab_screens = [...SCREENS].sort((x, y) => x - y).join(',');
  for (const {s, c} of nizhnie) {
    const k = s / c;
    Object.values(stroki).forEach((z) => { if (z[c]) z[s] = {l: z[c].l * k, fs: z[c].fs * k}; });
    Object.values(ramki).forEach((z) => {
      const r = z[c];
      if (r) z[s] = {t: r.t * k, l: r.l * k, w: r.w * k, h: Math.max(1, r.h * k), c: r.c};
    });
  }
}

// Экран, над которым или под которым стоит стандартный блок Тильды (шапка
// «Вопросов» над аккордеоном), выравнивается по полям сетки Тильды, а не
// лендинга: содержимое растягивается по горизонтали с [левый край, правый
// край] на [20, ширина − 20] — так стоят колонки стандартных блоков. На
// телефонной раскладке поля пересчитаны под автомасштаб (20 px на экране 375).
// Поля колонок Тильды на ширине окна c: контейнер 1200/960/640 или во всю
// ширину, внутри — отступ 20 px. В координатах раскладки — с её коэффициентом.
function polyaTildy(c) {
  const W = c >= 1200 ? 1200 : c >= 960 ? 960 : c >= 640 ? 640 : c;
  return [(c - W) / 2 + 20, (c + W) / 2 - 20];
}
const POLYA_TILDY = Object.fromEntries(RAZMETKA.map(({s, c}) => {
  const [L, R] = polyaTildy(c);
  const k = s === TOP ? 1 : s / c;
  return [s, [L * k, R * k]];
}));
function podSetkuTildy(code) {
  const els = elementy(code).filter((el) => eff(el, 'container', TOP) !== 'window');
  const g = new Map(els.map((el) => [el, geometriya(code, el)]));
  for (const s of SCREENS) {
    const vid = els.filter((el) => !g.get(el)[s].skryt);
    if (!vid.length) continue;
    const L0 = Math.min(...vid.map((el) => g.get(el)[s].L));
    const R0 = Math.max(...vid.map((el) => g.get(el)[s].L + g.get(el)[s].w));
    const [L1, R1] = POLYA_TILDY[s];
    const k = (R1 - L1) / (R0 - L0);
    for (const el of vid) {
      const {L, w} = g.get(el)[s];
      set(el, 'left', s, Math.round(L1 + (L - L0) * k));
      set(el, 'width', s, Math.round(w * k));
    }
  }
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
      viewportWidth: TOP, viewportHeight: 800, rootMode: 'artboard',
      bypassMaxDepth: true, breakpoints: SNYATIE, materialOnly: true,
      // По умолчанию конвертер уступает браузеру каждые 8 мс через таймер, а
      // в фоновой вкладке таймер тянется секунду и больше — экран собирался
      // минутами. Без пауз он проходит за один заход.
      frameBudgetMs: 1e9,
    });
  } finally {
    nablyudatel.disconnect();
    vernutTaimery();
  }
  vRazmetku(code, window.__ziLines, window.__ziRamki);
  const neHvataet = SCREENS.filter((s) => !Object.values(window.__ziLines).some((z) => z[s]));
  if (neHvataet.length) console.warn('zero-zamer: нет замеров строк на ширинах', neHvataet);
  if (opts.vh) {
    // Содержимое первого экрана в лендинге стоит сверху (у строки подписей
    // margin-top:auto забирает всё свободное место), лишняя высота — снизу.
    code.ab_height_vh = String(opts.vh);
    code.ab_valign = 'top';
  }
  // Все раскладки, кроме верхней, масштабируются под ширину окна — штатный
  // автомасштаб Zero (см. RAZMETKA).
  // Значение наследуется сверху вниз, поэтому раскладкам без масштаба
  // «сетка» прописывается явно — иначе 1024 унаследовал бы масштаб от 1101.
  for (const s of SCREENS.slice(1)) code[`ab_upscale-res-${s}`] = S_MASSHTABOM.includes(s) ? 'window' : 'grid';
  vertikalnyyTekst(code);
  zapasTeksta(code, window.__ziLines);
  podlozhkiPodTekst(code);
  dobavitLinii(code, window.__ziRamki);
  kKrayuOkna(code, {vh: !!opts.vh});
  if (opts.pinBottom) kNizu(code, opts.pinBottom, {telefon: S_MASSHTABOM});
  if (opts.vh) telefonPoOknu(code);
  if (opts.podSetkuTildy) podSetkuTildy(code);
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
