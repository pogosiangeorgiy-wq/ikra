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
  {s: 1024, c: 1024}, {s: 901, c: 960, m: 1}, {s: 761, c: 800, m: 1}, {s: 641, c: 700, m: 1},
  {s: 561, c: 600, m: 1}, {s: 480, c: 520, m: 1}, {s: 430, c: 430}, {s: 412, c: 412},
  {s: 390, c: 390}, {s: 375, c: 375}, {s: 320, c: 360, m: 1},
];
const SCREENS = RAZMETKA.map((r) => r.s);       // по убыванию
const TOP = SCREENS[0];                          // значения без суффикса
const SNYATIE = RAZMETKA.map((r) => r.c);        // ширины снятия, по убыванию
const S_MASSHTABOM = RAZMETKA.filter((r) => r.m).map((r) => r.s); // раскладки с автомасштабом
const S_TELEFON = RAZMETKA.filter((r) => r.c <= 760).map((r) => r.s); // у лендинга ≤760 первый экран 92svh
const MODUL = './index-bbX7hnLP.min.js';

// Типичная высота окна браузера (px) на ширине снятия раскладки: ноутбуки,
// планшеты, телефоны. Нужна там, где лендинг меряет движение высотой окна
// (ход сцены 260vh, проход кадра параллакса), а Zero — пикселями.
const VH_TIP = {1440: 800, 1366: 680, 1280: 720, 1190: 700, 1024: 700, 960: 680, 800: 950,
  700: 900, 600: 850, 520: 800, 430: 830, 412: 780, 390: 740, 375: 700, 360: 640};
const razm = (s) => RAZMETKA.find((r) => r.s === s);
const vhOkna = (s) => VH_TIP[razm(s).c];
// Пиксели окна → единицы раскладки (у раскладок с автомасштабом они мельче).
const vEdinicah = (s, px) => px * s / razm(s).c;
// Сцена: трек 360vh, кадр 100vh — ход прокрутки, пока кадр стоит, 260vh.
// Ход один на все компьютерные раскладки (260 % от окна 800 px): и шаги
// анимации, и высота «прокрутки» растут с автомасштабом одинаково, а шаги,
// одинаковые на всех раскладках, хранятся один раз — у Тильды есть предел
// объёма данных блока.
const DLINA_SCENY = 2.6;
const hodSceny = () => Math.round(DLINA_SCENY * VH_TIP[1440]);
const S_KOMP = RAZMETKA.filter((r) => r.c > 760).map((r) => r.s); // у лендинга сцена только шире 760

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
      // Фон во всю высоту блока — в процентах от блока. На раскладках с
      // автомасштабом блок растёт вместе с окном, а элемент «по окну» в
      // пикселях — нет: затемнение «Качества» не доставало до низа на 24 px
      // (360) и 18 px (820), фото «Производства» — на 83 px (820).
      const verh = T <= 1, niz = T + h >= H - 1;
      // Слой параллакса выше блока нарочно (запас на ход) — его не трогаем.
      if (verh && niz && (vh || el.layer !== 'px')) { set(el, 'top', s, 0); set(el, 'heightunits', s, '%'); set(el, 'height', s, 100); }
      else if (vh && niz) { set(el, 'axisy', s, 'bottom'); set(el, 'top', s, 0); }
    }
  }
}

// Подписи внизу первого экрана прижимаются к низу окна. По горизонтали на
// широких раскладках — ось по центру и смещение от центра (сетка стоит по
// центру окна). На телефонной раскладке с автомасштабом элементы «по окну»
// Zero не масштабирует вместе с сеткой, поэтому там левый край задаётся в
// процентах ширины: L/320 от окна — ровно то место, куда автомасштаб ставит
// левый край сетки.
function kNizu(code, re, {telefon = [], krome = []} = {}) {
  for (const el of elementy(code)) {
    if (!re.test(el.layer || '')) continue;
    const g = geometriya(code, el);
    for (const s of SCREENS) {
      const {L, w, T, h, H} = g[s];
      if (krome.includes(s)) {
        set(el, 'container', s, 'grid'); set(el, 'axisx', s, 'left'); set(el, 'axisy', s, 'top');
        set(el, 'leftunits', s, 'px'); set(el, 'left', s, Math.round(L)); set(el, 'top', s, Math.round(T));
        continue;
      }
      set(el, 'container', s, 'window');
      set(el, 'axisy', s, 'bottom'); set(el, 'top', s, Math.round(T + h - H));
      if (telefon.includes(s)) {
        set(el, 'axisx', s, 'left'); set(el, 'leftunits', s, '%');
        // Целым числом: Тильда берёт значение через parseInt и дробь
        // отбрасывает (3,94 % превращалось в 3 %, подпись уезжала на 7 px).
        set(el, 'left', s, Math.round(L / s * 100));
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

// Фото и вуаль, которые начинаются чуть ниже верха экрана и тянутся до его
// низа (у 404 блок ошибки заходит под шапку не целиком): привязка к низу и
// высота — той же долей высоты экрана, что при снятии. Экран растёт с
// окном, и фото растёт вместе с ним.
function nizProcentom(code) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'image' && el.elem_type !== 'shape') continue;
    const g = geometriya(code, el);
    for (const s of SCREENS) {
      const {T, h, H, skryt: sk} = g[s];
      if (sk || T <= 1 || T + h < H - 1 || h < H / 2) continue;
      set(el, 'axisy', s, 'bottom'); set(el, 'top', s, 0);
      set(el, 'heightunits', s, '%'); set(el, 'height', s, +(h / H * 100).toFixed(2));
    }
  }
}

// Первый экран на телефоне (у лендинга ≤760). Там у строки подписей нет
// margin-top:auto, и всё содержимое — от заголовка до подписей — центрируется
// по вертикали внутри 92svh с отступами 120 сверху и 48 снизу. Конвертер
// снял его во фрейме высотой 800, то есть уже с центровкой под 736 px. Здесь
// содержимое сдвигается к верхнему отступу, высота раскладки становится
// «содержимое + отступы», а центровку по высоте окна делает сам артборд:
// выравнивание по центру и высота 92 % окна. Фон на всю высоту не трогается.
function telefonPoOknu(code, {vh = 92, verhPx = 120, nizPx = 48} = {}) {
  for (const s of S_TELEFON) {
    const k = s / RAZMETKA.find((r) => r.s === s).c;
    const obychnye = elementy(code).filter((el) => !skryt(el, s) && eff(el, 'container', s) !== 'window');
    if (!obychnye.length) continue;
    const g = obychnye.map((el) => geometriya(code, el)[s]);
    const verh = Math.min(...g.map((x) => x.T)), niz = Math.max(...g.map((x) => x.T + x.h));
    const sdvig = verh - verhPx * k;
    obychnye.forEach((el, i) => set(el, 'top', s, Math.round(g[i].T - sdvig)));
    code[`ab_height-res-${s}`] = String(Math.round(niz - sdvig + nizPx * k));
    code[`ab_height_vh-res-${s}`] = String(vh);
    code[`ab_valign-res-${s}`] = 'center';
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

// Политика и согласие: текст документа — блок «Статья», он стоит в сетке
// Тильды (1200/960/640 с полями 20 px). Zero-блоки этих страниц (шапка с
// заголовком, подвал) встают по тем же полям, чтобы края совпадали. Края
// контейнера лендинга замерены на странице (роль kont). Что в левой
// половине, сдвигается вместе к левому полю, что в правой — к правому
// (так группы, например две ссылки в подвале, не разъезжаются), что во всю
// ширину — растягивается между полями. Ширины текстов не меняются.
function kPolyamTildy(code, roli = {}) {
  const els = elementy(code).filter((el) => eff(el, 'container', TOP) !== 'window');
  const g = new Map(els.map((el) => [el, geometriya(code, el)]));
  for (const s of SCREENS) {
    const vid = els.filter((el) => !g.get(el)[s].skryt);
    const kont = (roli[s] || []).find((r) => r.rol === 'kont');
    if (!vid.length || !kont) continue;
    const L0 = kont.l, R0 = kont.l + kont.w;
    const [L1, R1] = POLYA_TILDY[s];
    for (const el of vid) {
      const {L, w} = g.get(el)[s];
      const lev = Math.abs(L - L0) < 2, prav = L + w >= R0 - Math.max(2, 0.05 * w);
      if (lev && prav) { set(el, 'left', s, Math.round(L1)); set(el, 'width', s, Math.round(R1 - L1)); }
      else if (L + w / 2 > (L0 + R0) / 2) set(el, 'left', s, Math.round(L + (R1 - R0)));
      else set(el, 'left', s, Math.round(L + (L1 - L0)));
    }
  }
}

// Форма заявки. Конвертер делает из <form> штатную форму Zero: поля, подписи,
// варианты списка, кнопку. Имена полей он берёт из атрибута name — в вёрстке
// они короткие латинские, а в «Заявках» Тильды и в письмах поля должны
// называться по-русски, как было в версии на блоках кода. Здесь же — ссылки
// в тексте согласия и служебное скрытое поле с версией текста согласия.
function podpravitFormu(code, {imena = {}, soglasie = '', skrytye = [], nazvanie = '', uspeh = '', oshibkaPustye = '', oshibka = ''} = {}) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'form') continue;
    const inputs = JSON.parse(el.inputs || '[]');
    for (const it of inputs) {
      if (imena[it.li_nm]) it.li_nm = imena[it.li_nm];
      // Согласие: текст со ссылками на /soglasie и /politika — в подпись у
      // галочки (li_label); заголовок поля пустой, иначе текст выходил дважды.
      // Ссылки — как .form__consent a лендинга (белые, подчёркнутые); у
      // формы Zero им иначе достаётся цвет Тильды по умолчанию.
      if (it.li_type === 'cb' && soglasie) {
        // Интервал 1,7 — как .form__consent (у формы Zero ~1,2: строки
        // слипались, подчёркивание ложилось на следующую строку).
        it.li_label = '<span style="line-height:1.7">' + soglasie.replace(/<a /g, '<a style="color:#ffffff;text-decoration:underline;'
          + 'text-underline-offset:3px;text-decoration-thickness:1px" ') + '</span>';
        it.li_title = '';
      }
      // «Задача» у лендинга — textarea в 84 px (min-height); у формы Zero
      // высота задаётся строками: 3 × 25 + 10 = 85 px. Без этого поле было
      // высотой в строку, и линия под ним (отдельная фигура по вёрстке)
      // ложилась на текст согласия.
      else if (it.li_type === 'ta') { it.li_rows = '3'; if (it.li_title) it.li_title = it.li_title.toUpperCase(); }
      // Подписи полей у лендинга заглавными (.field label, text-transform);
      // у подписей формы Zero регистра нет — заглавные в самом тексте.
      // В заявку уходит имя поля (li_nm), не подпись.
      else if (it.li_title && it.li_type !== 'hd') it.li_title = it.li_title.toUpperCase();
    }
    let n = inputs.length;
    for (const h of skrytye) {
      inputs.push({lid: String(1790000002000 + n), ls: String((n + 1) * 10), loff: '', li_parent_id: '',
        li_type: 'hd', li_nm: h.imya, li_title: h.imya, li_value: h.znachenie, li_ph: h.znachenie});
      n += 1;
    }
    el.inputs = JSON.stringify(inputs);
    // Кнопка отправки — .btn--solid лендинга: при наведении сталь, 0,22 с;
    // галочка согласия — тоже сталь (accent-color).
    Object.assign(el, {buttonhoverbgcolor: '#b9b2a6', buttonhoverbordercolor: '#b9b2a6',
      buttonhovercolor: '#191510', buttonspeedhover: '0.22', inputelscolor: '#b9b2a6'});
    // Надпись кнопки у лендинга заглавными (.btn, text-transform) — регистра у
    // кнопки формы Zero нет, заглавные в самом тексте. Текст согласия — кегль
    // --t-micro (13 px), у формы по умолчанию 16.
    if (el.buttontitle) el.buttontitle = el.buttontitle.toUpperCase();
    el.inputelsfontsize = '13';
    // Подпись поля у лендинга — строка 23 px (13 px × 1,75) и зазор 8 px:
    // поле начинается на 31 px от подписи. У формы Zero строка подписи ~16 px,
    // и её интервал не настраивается — зазор 15 px возвращает поле на 31 px.
    // Иначе каждое поле стояло на 7 px выше, чем линия под ним (линии —
    // отдельные фигуры, сняты с вёрстки), и расхождение копилось вниз.
    el.inputtitlemargbottom = '15';
    // Шаг полей у лендинга ~125 px (подпись 23 + 8 + поле 47 + 48, с дробями
    // clamp-кегля), у формы Zero получался ровно 126 — за семь полей линия
    // отставала на 7 px. Отступ 47 даёт шаг 125.
    el.inputmargbottom = '47';
    if (nazvanie) el.formname = nazvanie;
    if (uspeh) el.formmsgsuccess = uspeh;
    // Сообщения лендинга: не заполнены обязательные поля и сбой отправки.
    if (oshibkaPustye) el.formerrreq = oshibkaPustye;
    if (oshibka) el.formerr = oshibka;
  }
}

// Линии под полями формы — отдельные фигуры, снятые с вёрстки. Форма Zero
// раскладывается по своим размерам, в пикселях раскладки и без масштаба:
// строка подписи ~16 px + зазор, поле inputheight, отступ inputmargbottom,
// «Задача» — li_rows × 25 + 10. Снятые с лендинга линии на раскладках с
// автомасштабом пересчитаны в масштаб (320, 761, 1101) и от полей уходили;
// на двух колонках Тильда делит форму сама: колонка (Ш − отступ)/2, правая —
// с (Ш + отступ)/2, а у лендинга правая шла на 14–16 px правее. Поэтому
// линии ставятся по расчёту формы Тильды: ряд за рядом, последний — «Задача».
function liniiFormy(code) {
  const forma = elementy(code).find((el) => el.elem_type === 'form');
  if (!forma) return 0;
  // Зазор колонок — как .form__row лендинга (--grid-gap): 44 px шире 1100,
  // 32 px до 1100; блок «Плавная прокрутка» ставит форме Тильды тот же.
  const zazor = (s) => (RAZMETKA.find((r) => r.s === s).c > 1100 ? 44 : 32);
  const PODPIS = 16 + num(forma.inputtitlemargbottom || 0);
  const POLE = num(forma.inputheight || 47);
  const SHAG = PODPIS + POLE + num(forma.inputmargbottom || 0);
  const ta = JSON.parse(forma.inputs || '[]').find((x) => x.li_type === 'ta');
  const TA = ta && +ta.li_rows > 1 ? +ta.li_rows * 25 + 10 : POLE;
  const gf = geometriya(code, forma);
  const figury = elementy(code).filter((el) => el.elem_type === 'shape');
  let n = 0;
  for (const s of SCREENS) {
    if (gf[s].skryt) continue;
    const {L: fL, w: fW, T: fT, h: fH} = gf[s];
    const linii = figury.map((el) => ({el, g: geometriya(code, el)[s]}))
      .filter(({g}) => !g.skryt && g.h <= 3 && g.T >= fT - 4 && g.T <= fT + fH + 80
        && g.L < fL + fW && g.L + g.w > fL)
      .sort((a, b) => a.g.T - b.g.T);
    const ryady = [];
    for (const x of linii) {
      const r = ryady.find((q) => Math.abs(q[0].g.T - x.g.T) <= 6);
      if (r) r.push(x); else ryady.push([x]);
    }
    const m = zazor(s);
    const kol = (fW - m) / 2;
    ryady.forEach((r, i) => {
      const niz = i * SHAG + PODPIS + (i === ryady.length - 1 ? TA : POLE);
      r.sort((a, b) => a.g.L - b.g.L);
      r.forEach((x, j) => {
        set(x.el, 'top', s, Math.round(fT + niz - Math.max(1, x.g.h)));
        if (r.length === 2) {
          set(x.el, 'left', s, Math.round(j ? fL + (fW + m) / 2 : fL));
          set(x.el, 'width', s, Math.round(kol));
        }
        n += 1;
      });
    });
  }
  return n;
}

// ── Движение ─────────────────────────────────────────────────────────────
// Всё, что у лендинга делает скрипт, здесь переводится в штатные настройки
// элементов Zero. Числа — из токенов лендинга: --dur-slow 620 мс (на
// телефоне 460), каскад 70 мс (50), сдвиг появления 18 px (12),
// --parallax 64 px (28). «Телефон» у этих токенов — ширина до 640.
//
// Анимации Zero на экранах уже 1200 работают, только если у элемента
// включено «анимация на мобильных» (animmobile) — иначе Тильда их
// отключает. Поэтому оно ставится каждому анимированному элементу.

// Значение поля на всех раскладках: базовое — на верхней, дальше только там,
// где оно меняется (остальное Zero наследует сверху вниз).
function poRazmetke(el, f, znach) {
  let prev;
  for (const {s, c} of RAZMETKA) {
    const v = String(znach(s, c));
    if (v !== prev) set(el, f, s, v);
    prev = v;
  }
}

// Шаги пошаговой анимации — строкой с одинарными кавычками, как их хранит
// сама Тильда. Значения раскладок сервер кладёт в HTML-атрибут без замены
// кавычек, и двойная кавычка внутри обрывала атрибут на «[{» — на всех
// раскладках, кроме верхней, анимация пропадала. Движок перед разбором
// сам меняет одинарные кавычки на двойные.
const sbsStroka = (shagiSpisok) => JSON.stringify(shagiSpisok).replace(/"/g, "'");

// Замеры из экрана (по ширинам снятия) → по раскладкам, в их единицах.
function zameryVRazmetku(zamery = {}) {
  const out = {};
  for (const {s, c} of RAZMETKA) {
    const z = zamery[c];
    if (!z) continue;
    const k = s / c;
    out[s] = z.map((r) => ({...r, l: r.l * k, t: r.t * k, w: r.w * k, h: r.h * k}));
  }
  return out;
}

// Появление: элемент получает анимацию того блока .reveal, внутри которого
// лежит (самого маленького из накрывающих его центр), на самой широкой
// раскладке, где элемент виден. Задержка — место в каскаде, как у лендинга.
//
// Точка срабатывания. У лендинга блок проявляется целиком, когда 8 % его
// высоты зашло выше линии в 12 % от низа окна. В Zero каждый элемент
// срабатывает сам по себе — по своему верху, — поэтому ему ставится своя
// точка: минус его отступ от верха блока. Так все элементы блока трогаются
// вместе (для нижних точка отрицательная — они срабатывают, ещё не зайдя в
// окно). Первый экран у лендинга играет сразу при загрузке — точка 0.
function poyavlenie(code, reveal = {}, {isklyuchit = () => false} = {}) {
  for (const el of elementy(code)) {
    if (isklyuchit(el)) continue;
    const g = geometriya(code, el);
    const s0 = SCREENS.find((s) => !g[s].skryt && reveal[s]?.length);
    if (!s0) continue;
    // Фон секции (фото, вуаль, заливка во всю ширину и почти во всю высоту
    // блока) у лендинга стоит сразу — ему появление не нужно, иначе текст
    // проявляется раньше своего фона (тёмный текст на тёмном и т. п.).
    if (el.elem_type !== 'text' && g[s0].w >= 0.95 * s0 && g[s0].h >= 0.8 * g[s0].H) continue;
    const vnutri = (s) => {
      const {L, w, T, h} = g[s];
      const cx = L + w / 2, cy = T + h / 2;
      return (reveal[s] || []).filter((r) => cx >= r.l - 1 && cx <= r.l + r.w + 1 && cy >= r.t - 1 && cy <= r.t + r.h + 1)
        // Самый маленький блок; при равной площади — заголовок (у <h1 class="reveal">
        // рамка заголовка совпадает с рамкой блока).
        .sort((x, y) => (x.w * x.h - y.w * y.h) || ((y.zagolovok ? 1 : 0) - (x.zagolovok ? 1 : 0)))[0];
    };
    const b = vnutri(s0);
    if (!b) continue;
    // Вид появления:
    //   обычный блок — снизу на 18 px за 620 мс;
    //   заголовок, который лендинг режет на строки, — строки выезжают снизу
    //     из-под маски; маски у Zero нет, поэтому заголовок целиком въезжает
    //     снизу за то же время;
    //   прочее в блоке с таким заголовком и таблица — только проявляются,
    //     за 220 мс;
    //   строка таблицы — проявляется за 420 мс, с шагом 60 мс по строкам.
    const vid = b.zagolovok ? 'zag' : b.stroka !== undefined ? 'stroka' : b.linii || b.tbl ? 'bystro' : 'obychno';
    el.animstyle = vid === 'zag' || vid === 'obychno' ? 'fadeinup' : 'fadein';
    el.animmobile = 'y';
    // Кривая у Тильды одна на все появления — cubic-bezier(.19,1,.22,1),
    // резче, чем --ease лендинга: за первые 100 мс проходит 68 % пути против
    // 50 %. Длительности ×1,6 дают ту же кривую, что у лендинга, в первые
    // 200 мс (620 → 1000 мс: 26/48/77 % против 26/50/78 %).
    poRazmetke(el, 'animduration', (s, c) => (vid === 'stroka' ? 0.68 : vid === 'bystro' ? 0.35 : c <= 640 ? 0.74 : 1));
    if (el.animstyle === 'fadeinup') poRazmetke(el, 'animdistance', (s, c) => (c <= 640 ? 12 : 18));
    // Задержку Тильда применяет дважды: ждёт её перед стартом
    // (setTimeout(delay + 250 мс)) и ещё раз как transition-delay. Поэтому
    // в поле — половина: каскад выходит тот же, что у лендинга.
    poRazmetke(el, 'animdelay', (s, c) => {
      const shag = c <= 640 ? 50 : 70;
      const d0 = b.hero !== undefined ? 260 + b.hero * shag : b.mesto * shag;
      return +((d0 + (vid === 'stroka' ? 60 * (b.stroka + 1) : 0)) / 2000).toFixed(3);
    });
    // Точка срабатывания в пикселях окна, с шагом 8 px — чтобы соседние
    // раскладки чаще совпадали и не раздували данные блока. Минус запас на
    // 250 мс, которые Тильда ждёт перед каждым появлением: иначе блок
    // проявлялся, уже доехав до середины экрана.
    poRazmetke(el, 'animtriggeroffset', (s, c) => {
      if (b.hero !== undefined) return 0;
      const bs = g[s].skryt ? b : (vnutri(s) || b);
      const k = c / s; // единицы раскладки → пиксели окна
      const bt = bs.bt ?? bs.t, bh = bs.bh ?? bs.h;
      const zapas = c <= 640 ? 128 : 96;
      const px = 0.12 * vhOkna(s) + 0.08 * bh * k - (g[s].T - bt) * k - zapas;
      return Math.round(px / 8) * 8;
    });
  }
}

// Шаги пошаговой анимации Zero из ключевых точек [доля хода, стили].
// Сдвиги (mx, my) Zero считает от первого шага, поэтому первый шаг — всегда
// исходное состояние. skryt — элемент невидим, пока анимация не началась:
// у Zero это второй шаг нулевой длины с прозрачностью 0.
function shagi(D, {t, skryt = false, fiks = true}) {
  const polno = (st) => {
    const o = {op: 1, sx: 1, sy: 1, mx: 0, my: 0, ...st};
    if (st.s !== undefined) { o.sx = st.s; o.sy = st.s; delete o.s; }
    // Значения по умолчанию (видим, масштаб 1, без сдвига) не пишутся.
    const umolch = {op: 1, sx: 1, sy: 1, mx: 0, my: 0};
    return Object.fromEntries(Object.entries(o).filter(([k, v]) => +v !== umolch[k])
      .map(([k, v]) => [k, String(+(+v).toFixed(4))]));
  };
  // Первый шаг — точка отсчёта сдвигов, поэтому без сдвига; исходный сдвиг
  // (строки акта ждут на 20 px ниже) ставит шаг нулевой длины сразу за ним.
  const nol = polno(t[0][1]);
  const {mx, my, ...bezSdviga} = nol;
  const out = [{di: '0', ...bezSdviga}];
  if (skryt) out.push({di: '0', ...nol, op: '0'});
  if (skryt || mx !== undefined || my !== undefined) out.push({di: '0', ...nol});
  let akk = 0;
  for (let i = 1; i < t.length; i += 1) {
    const kon = Math.round(t[i][0] * D);
    const shag = {di: String(kon - akk), ...polno(t[i][1])};
    if (fiks) shag.fi = 'fixed';
    out.push(shag);
    akk = kon;
  }
  return sbsStroka(out);
}

// Параллакс. У лендинга кадр в рамке .px-frame выше рамки на 2 × --parallax
// и за проход рамки через окно (от входа снизу до выхода сверху) едет вверх
// на --parallax: от +½ до −½. Здесь это пошаговая анимация по прокрутке с
// тем же ходом и той же дистанцией. Штатный параллакс Zero для этого груб:
// он двигает минимум на 100 px.
function parallaks(code) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'image' || el.layer !== 'px') continue;
    const g = geometriya(code, el);
    el.sbsevent = 'scroll'; el.sbstrg = '1'; el.animmobile = 'y';
    for (const s of SCREENS) {
      const {T, H, skryt: sk} = g[s];
      if (sk || T >= 0) continue;
      const d = -T; // кадр поднят на --parallax
      const verh = Math.round(T + d / 2);
      set(el, 'top', s, verh);
      set(el, 'sbstrgofst', s, verh); // старт — когда верх рамки у низа окна
      const put = Math.round(vEdinicah(s, vhOkna(s)) + H);
      set(el, 'sbsopts', s, sbsStroka([{di: '0', my: '0'}, {di: String(put), my: String(-Math.round(d))}]));
    }
  }
}

// Первый экран: фото проявляется из масштаба 1,05 (1 с — прозрачность,
// 1,6 с — масштаб) и едет параллаксом. Здесь пошаговая анимация не годится:
// она заняла бы место проявления, а у Zero они не совмещаются. Поэтому —
// штатный параллакс Zero (скорость 110 — наименьшая, 100 px за проход окна;
// первый экран проходит половину — 50 px против 32 у лендинга) и запас
// кадра сверху и снизу, чтобы край не открывался.
function geroyFoto(code) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'image') continue;
    // Масштаб Тильда хранит долей (1.05 — в редакторе «105 %»), не процентом.
    el.animstyle = 'zoomin'; el.animscale = '1.05'; el.animduration = '1.6'; el.animdelay = '0';
    el.animmobile = 'y';
    if (el.layer !== 'px') continue;
    // Параллакс снят (30.09.2026). Обёртка параллакса Тильды наследует
    // высоту в процентах и применяет её второй раз — фото выходило крупнее
    // на 14–28 % и обрезалось; сам параллакс шёл целыми пикселями и крутил
    // вечный цикл кадров. Фото — во весь экран, как у лендинга в покое.
    delete el.animprx; delete el.animprxs;
    for (const {s} of RAZMETKA) {
      set(el, 'axisy', s, 'top'); set(el, 'topunits', s, '%'); set(el, 'heightunits', s, '%');
      set(el, 'top', s, 0); set(el, 'height', s, 100);
    }
  }
}

// Счётчики цифр (у лендинга — отсчёт от нуля) штатно не переносятся:
// анимация Тильды «число» работает только на экранах от 1200 px и там
// читает цифры из служебного атрибута элемента Zero — вместо отсчёта текст
// на секунду ломается («0">до 300»). Цифры появляются как остальной блок.

// Ссылки. Отдельные <a> экрана (роль link-N с адресом) конвертер переносит
// без адреса — здесь адрес ставится в поле link элемента Zero: текста или
// кнопки с тем же текстом рядом с рамкой ссылки, для ссылки-картинки
// (логотип) — картинки внутри рамки. Ищется на самой широкой раскладке, где
// ссылка есть. Если в тексте элемента ссылка уже стоит (<a …>), он не
// трогается.
function ssylki(code, roli) {
  const els = elementy(code);
  const zanyato = new Set();
  const tekstEl = (el) => normTekst(el.text || el.caption || el.buttontitle || '');
  let postavleno = 0;
  const ids = new Set();
  for (const s of SCREENS) for (const r of roli[s] || []) if (r.rol.startsWith('link-')) ids.add(r.rol);
  for (const id of ids) {
    const s = SCREENS.find((x) => (roli[x] || []).some((r) => r.rol === id));
    const r = roli[s].find((x) => x.rol === id);
    const cx = r.l + r.w / 2, cy = r.t + r.h / 2;
    let best = null, bd = Infinity;
    for (const el of els) {
      if (zanyato.has(el) || skryt(el, s)) continue;
      const g = geometriya(code, el)[s];
      let ok;
      if (r.img) ok = el.elem_type === 'image' && g.L >= r.l - 4 && g.L + g.w <= r.l + r.w + 4 && g.T >= r.t - 4 && g.T + g.h <= r.t + r.h + 4;
      else ok = (el.elem_type === 'text' || el.elem_type === 'button') && tekstEl(el) === r.tekst;
      if (!ok) continue;
      const d = Math.abs(g.L + g.w / 2 - cx) + Math.abs(g.T + g.h / 2 - cy);
      if (d < bd) { best = el; bd = d; }
    }
    if (!best || bd > 120) { console.warn('ssylki: не нашёл элемент для', id, r.tekst, r.href, bd); continue; }
    zanyato.add(best);
    if (/<a\s/i.test(best.text || '')) continue;
    best.link = r.href;
    // Подчёркивание ссылки (у лендинга 1 px с отступом 3 px) — стилем в
    // самом тексте: конвертер text-decoration теряет.
    if (r.podch && best.elem_type === 'text' && !/text-decoration/.test(best.text || '')) {
      best.text = `<span style="text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px">${best.text}</span>`;
    }
    if (/^https?:/i.test(r.href)) best.linktarget = '_blank';
    postavleno += 1;
  }
  return postavleno;
}

// Из исходного экрана — то, что конвертер теряет:
//   alt у картинок (описания снимков, названия клиентов в ленте, знаки);
//   неразрывные пробелы (у лендинга их 19 — «10 %», адрес, «г. Москва»):
//   конвертер делает из них обычные, и строка может переломиться не там.
function izEkrana(code, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const alty = new Map();
  doc.querySelectorAll('img[src]').forEach((i) => { if (i.alt && !alty.has(i.getAttribute('src'))) alty.set(i.getAttribute('src'), i.alt); });
  const PROB = /[ \t\n\r\f]+/g;
  const sNbsp = new Map();
  doc.body.querySelectorAll('*').forEach((e) => {
    if (/^(SCRIPT|STYLE)$/.test(e.tagName)) return;
    const t = e.textContent.replace(PROB, ' ').trim();
    if (t.includes('\u00a0')) sNbsp.set(t.replace(/\u00a0/g, ' '), t);
  });
  let alt = 0, nbsp = 0;
  for (const el of elementy(code)) {
    if (el.elem_type === 'image' && !el.alt && alty.has(el.img)) { el.alt = alty.get(el.img); alt += 1; }
    if (el.elem_type !== 'text' || !el.text) continue;
    const d = document.createElement('div');
    d.innerHTML = el.text;
    const orig = sNbsp.get(d.textContent.replace(PROB, ' ').trim());
    if (!orig) continue;
    // Проход по текстовым узлам: пробел становится неразрывным там, где он
    // неразрывный в исходнике. При любом расхождении — без изменений.
    let j = 0, ok = true;
    const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
    const uzly = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) uzly.push(n);
    const novye = uzly.map((n) => {
      let out = '';
      for (const ch of n.data) {
        if (/[ \t\n\r\f]/.test(ch)) {
          if (orig[j] === ' ' || orig[j] === '\u00a0') { out += orig[j]; j += 1; } else out += ch;
        } else if (orig[j] === ch) { out += ch; j += 1; } else { ok = false; out += ch; }
      }
      return out;
    });
    if (!ok || j !== orig.length) continue;
    uzly.forEach((n, i) => { n.data = novye[i]; });
    el.text = d.innerHTML;
    nbsp += 1;
  }
  return {alt, nbsp};
}

// Логотип-ссылка при наведении бледнеет до 78 % за 220 мс (.logo:hover у
// лендинга) — пошаговая анимация «при наведении», обратный ход — при уходе
// курсора. Логотипы помечены в экранах (роль logo-N).
function logotipy(code, rol) {
  for (const [r, el] of rol) {
    if (!r.startsWith('logo-')) continue;
    el.sbsevent = 'hover'; el.sbsloop = ''; el.animmobile = 'y'; // иначе уже 1200 px Тильда его гасит
    el.sbsopts = sbsStroka([{ti: '0'}, {ti: '220', op: '0.78', ea: 'easeOut'}]);
  }
}

// Наведение на кнопки — как .btn у лендинга: контурная заливается светлым,
// светлая сплошная — сталью, тёмная контурная — графитом. 0,22 с.
function navedenie(code) {
  for (const el of elementy(code)) {
    if (el.elem_type !== 'button') continue;
    const bg = (el.bgcolor || '').toLowerCase(), c = (el.color || '').toLowerCase();
    if (bg === '#ffffff') { el.bgcolorhover = '#b9b2a6'; el.bordercolorhover = '#b9b2a6'; el.colorhover = '#191510'; }
    else if (c === '#000000' || c === '#1a1714') { el.bgcolorhover = '#000000'; el.bordercolorhover = '#000000'; el.colorhover = '#e9e4de'; }
    else { el.bgcolorhover = '#ffffff'; el.bordercolorhover = '#ffffff'; el.colorhover = '#191510'; }
    el.speedhover = '0.22';
  }
}

// Бегущая лента логотипов «Нам доверяют». Конвертер снимает её статичный
// вариант (логотипы в несколько рядов, без скрипта лендинга). Здесь логотипы
// выстраиваются в один ряд тремя копиями и едут влево на ширину ряда по
// кругу — пошаговая анимация Zero с повтором, как @keyframes trust-run у
// лендинга. По краям — растушёвка, как маска .trust__viewport.
// Числа сняты с работающего лендинга (см. opts.lenta в stend.js).
function begushayaLenta(code, cfg) {
  const logos = elementy(code).filter((e) => e.elem_type === 'image').sort((a, b) => num(a.zindex) - num(b.zindex));
  if (!logos.length) return;
  const asp = logos.map((e) => { const g = geometriya(code, e)[TOP]; return g.w / g.h; });
  const kluchi = Object.keys(code).filter((k) => /^\d+$/.test(k)).map(Number);
  let sled = Math.max(...kluchi) + 1;
  let z = Math.max(...elementy(code).map((e) => num(e.zindex)));
  const baza = Date.now() % 1e9;
  const kopii = [logos];
  for (let j = 1; j < 3; j += 1) {
    kopii.push(logos.map((e, i) => {
      const c = JSON.parse(JSON.stringify(e));
      c.elem_id = `${baza}${j}${String(i).padStart(2, '0')}`;
      code[String(sled)] = c; sled += 1;
      return c;
    }));
  }
  const fade = {L: {elem_type: 'shape', layer: 'Растушёвка слева', elem_id: `${baza}91`},
    R: {elem_type: 'shape', layer: 'Растушёвка справа', elem_id: `${baza}92`}};
  for (const {s, c, m} of RAZMETKA) {
    const k = m ? s / c : 1;
    const p = c > 760 ? cfg.desktop : cfg.mobile;
    const h = p.h * k, gap = p.gap * k, pad = p.pad * k, top = Math.round(p.top * k);
    const w = asp.map((a) => a * h);
    const rowW = pad + w.reduce((x, y) => x + y, 0) + gap * (w.length - 1);
    // Без автомасштаба сетка стоит по центру окна: ряд начинается левее,
    // чтобы и на мониторе 2560 px лента с первой секунды шла от края до края.
    const zapas = m ? 0 : Math.max(0, (2560 - s) / 2);
    kopii.forEach((nabor, j) => {
      let x = -zapas + j * rowW + pad;
      nabor.forEach((el, i) => {
        set(el, 'container', s, 'grid'); set(el, 'axisx', s, 'left'); set(el, 'widthunits', s, 'px');
        set(el, 'hidden', s, 'n');
        set(el, 'left', s, Math.round(x)); set(el, 'top', s, top);
        set(el, 'width', s, Math.round(w[i])); set(el, 'height', s, Math.round(h));
        set(el, 'sbsopts', s, sbsStroka([{ti: '0', mx: '0'}, {ti: String(p.dur * 1000), mx: String(-Math.round(rowW)), ea: ''}]));
        x += w[i] + gap;
      });
    });
    code[`ab_height${s === TOP ? '' : `-res-${s}`}`] = String(Math.round(p.secH * k));
    // Растушёвка: у раскладок с автомасштабом сетка — во всю ширину окна.
    const fw = (p.fade ?? cfg.fade) * k;
    for (const [storona, f] of [['L', fade.L], ['R', fade.R]]) {
      set(f, 'top', s, top); set(f, 'height', s, Math.round(h)); set(f, 'width', s, Math.round(fw));
      set(f, 'widthunits', s, 'px');
      if (m) { set(f, 'container', s, 'grid'); set(f, 'axisx', s, 'left'); set(f, 'left', s, storona === 'L' ? 0 : Math.round(s - fw)); }
      else { set(f, 'container', s, 'window'); set(f, 'axisx', s, storona === 'L' ? 'left' : 'right'); set(f, 'left', s, 0); }
    }
  }
  kopii.flat().forEach((el) => { el.sbsevent = 'intoview'; el.sbsloop = 'loop'; el.animmobile = 'y'; });
  const fon = cfg.fon || '25,21,16';
  fade.L.bgcolor = `linear-gradient(90deg, rgba(${fon},1) 0%, rgba(${fon},0) 100%)`;
  fade.R.bgcolor = `linear-gradient(270deg, rgba(${fon},1) 0%, rgba(${fon},0) 100%)`;
  for (const f of [fade.L, fade.R]) {
    Object.assign(f, {rotate: '0', borderradius: '0px'});
    z += 1; f.zindex = String(z);
    code[String(sled)] = f; sled += 1;
  }
}

// ── Липкая сцена ────────────────────────────────────────────────────────
// «Этапы работы» и «Тара и маркировка». У лендинга секция на компьютере —
// трек 360vh, внутри неподвижный кадр высотой в окно; пока трек идёт
// (260vh), по доле прокрутки p меняются снимки, акты и шкала этапов.
//
// В Zero: блок высотой в окно (сетка растянута на всю высоту: подпись
// сверху, акты по центру, шкала снизу — как во flex-колонке лендинга), а
// за ним прозрачная «прокрутка» высотой в ход сцены (prostavka). Каждый
// элемент кадра — пошаговая анимация по прокрутке с фиксацией: весь ход он
// стоит на месте окна, а стили меняются по той же формуле, что у скрипта:
//   кадр i (i ≥ 1) проступает за 10 % хода до начала своего этапа;
//   наезд всей стопки 1 → 1,06 за весь ход;
//   акт i виден в [i/4, (i+1)/4], смена — 6 % хода; его строки собираются
//   каскадом снизу вверх, когда акт виден больше чем на 30 %;
//   отрезок i шкалы заполняется слева за свой этап, подпись загорается
//   вместе с актом.
// Сглаживание кадров (инерция) штатно не повторить: кадры идут точно за
// прокруткой.
const ROLI_TIP = {kadr: 'image', scrim: 'shape', bar: 'shape', fill: 'shape', dline: 'shape', dfoto: 'image', logo: 'image'};
const ROLI_RAMKI = ['dli', 'dfig', 'kont', 'link']; // только рамка (ссылки — своя сверка, ssylki)

function naznachitRoli(code, roli = []) {
  const els = elementy(code).filter((el) => !skryt(el, TOP));
  const zanyato = new Set();
  const res = new Map();
  for (const r of roli) {
    if (ROLI_RAMKI.includes(r.rol.split('-')[0])) continue;
    const tip = ROLI_TIP[r.rol.split('-')[0]] || 'text';
    const cx = r.l + r.w / 2, cy = r.t + r.h / 2;
    let best = null, bd = Infinity;
    for (const el of els) {
      if (zanyato.has(el) || el.elem_type !== tip) continue;
      if (tip === 'text' && normTekst(el.text) !== r.tekst) continue;
      const g = geometriya(code, el)[TOP];
      const d = Math.abs(g.L + g.w / 2 - cx) + Math.abs(g.T + g.h / 2 - cy);
      if (d < bd || (d === bd && num(el.zindex) < num(best.zindex))) { best = el; bd = d; }
    }
    if (best && bd < 60) { zanyato.add(best); res.set(r.rol, best); }
    else console.warn('scena: не нашёл элемент роли', r.rol, bd);
  }
  return res;
}

function scena(code, roli, rol, {fonTelefon = ''} = {}) {
  const akty = 1 + Math.max(-1, ...[...rol.keys()].filter((k) => /^akt-\d+-/.test(k)).map((k) => +k.split('-')[1]));
  if (akty < 2) throw new Error('сцена: не нашлись акты');
  const SEG = 1 / akty, FADE = 0.06, XFADE = 0.10, ZOOM = 1.06;
  const ZHIVOY = 0.3 * FADE;   // акт «ожил» — виден на 30 %
  // Подпись шкалы у лендинга загорается за 220 мс по порогу; здесь — за
  // прокрутку. 1 % хода (21 px) проскакивал за кадр, 5 % (≈ 100 px) — нет.
  const LBL = 0.025;
  // Строки акта въезжают за 5 % хода (≈ 104 px). Пробовали 10 %: текст акта
  // целиком стоял всего ~125 px прокрутки из 520 — читать некогда. С
  // инерцией колеса 104 px и так проходят за несколько кадров.
  const VHOD = 0.05;
  const zum = (p) => 1 + (ZOOM - 1) * p;
  const STROKA = {num: 0, title: 1, text: 2};

  const liniya = (r, w) => {
    const [vid, a, b] = r.split('-');
    const i = +a;
    const s = i * SEG, e = s + SEG;
    if (vid === 'kadr') {
      if (i === 0) return {t: [[0, {s: 1}], [1, {s: ZOOM}]]};
      return {skryt: true, t: [[0, {op: 0, s: 1}], [s - XFADE, {op: 0, s: zum(s - XFADE)}],
        [s, {op: 1, s: zum(s)}], [1, {op: 1, s: ZOOM}]]};
    }
    if (vid === 'akt') {
      const t = [];
      if (i === 0) t.push([0, {}]);
      else {
        const st = s + ZHIVOY + STROKA[b] * 0.006; // каскад 70 мс
        t.push([0, {op: 0, my: 20}], [st, {op: 0, my: 20}], [st + VHOD, {op: 1, my: 0}]);
      }
      if (i < akty - 1) t.push([e - FADE, {op: 1}], [e, {op: 0}], [1, {op: 0}]);
      else t.push([1, {op: 1}]);
      return {skryt: i > 0, t};
    }
    if (vid === 'fill') {
      const t = [[0, {sx: 0}]];
      if (s > 0) t.push([s, {sx: 0}]);
      t.push([e, {sx: 1, mx: w / 2}]);
      if (e < 1) t.push([1, {sx: 1, mx: w / 2}]);
      return {skryt: true, t};
    }
    if (vid === 'lblon') {
      const t = [[0, {op: i === 0 ? 1 : 0}]];
      if (i > 0) t.push([s + ZHIVOY - LBL, {op: 0}], [s + ZHIVOY + LBL, {op: 1}]);
      if (i < akty - 1) t.push([e - ZHIVOY - LBL, {op: 1}], [e - ZHIVOY + LBL, {op: 0}]);
      t.push([1, {op: i === akty - 1 ? 1 : 0}]);
      return {skryt: i > 0, t};
    }
    return {t: [[0, {}], [1, {}]]}; // подпись сверху, вуали, полосы шкалы, тусклые подписи
  };
  const yakor = (r) => (/^(kadr|scrim|shapka)/.test(r) ? 'top' : /^akt-/.test(r) ? 'center' : 'bottom');

  // Артборд. На компьютере — высота окна, сетка растянута на всю высоту;
  // высота в пикселях — только нижний предел. Элементы, уходящие после
  // сцены вниз, рисуются поверх «прокрутки» — отсюда видимое переполнение.
  const TEL = SCREENS.filter((s) => !S_KOMP.includes(s));
  for (const s of S_KOMP) {
    code[kluch('ab_height', s)] = String(Math.round(vEdinicah(s, 600)));
    code[kluch('ab_height_vh', s)] = '100';
    code[kluch('ab_valign', s)] = 'stretch';
  }
  if (TEL.length) { code[`ab_height_vh-res-${TEL[0]}`] = '0'; code[`ab_valign-res-${TEL[0]}`] = 'top'; }
  code.ab_ovrflw = 'visible';
  code.ab_bgcolor = '#191510';
  // На телефоне вместо сцены — список актов на фоне своей секции («Этапы» —
  // светлая, «Тара» — тёмная).
  if (TEL.length && fonTelefon) code[`ab_bgcolor-res-${TEL[0]}`] = fonTelefon;

  // Высота кадра при снятии — окно конвертера (по замеру первого снимка).
  const kadrH = (s) => (roli[s] || []).find((r) => r.rol === 'kadr-0')?.h || vEdinicah(s, 800);
  const svoi = new Set(rol.values());
  for (const [r, el] of rol) {
    // Нижняя полоса вертикальной вуали на компьютере не нужна: верхняя
    // растянута на весь кадр с градиентом --scrim-y (ниже). С верхом 58 %
    // полоса закреплялась на 0,58 высоты окна позже кадров и ползла по фото.
    if (r === 'scrim-foot') {
      for (const f of Object.keys(el)) if (/^(sbs|anim)/.test(f)) delete el[f];
      for (const s of S_KOMP) set(el, 'hidden', s, 'y');
      continue;
    }
    const g = geometriya(code, el);
    const y = yakor(r);
    const okno = /^(kadr|scrim)/.test(r);
    for (const f of Object.keys(el)) if (/^anim(style|duration|delay|distance|triggeroffset|scale)/.test(f)) delete el[f];
    el.sbsevent = 'scroll';
    el.sbstrg = y === 'top' ? '0' : y === 'center' ? '0.5' : '1';
    el.animmobile = 'y';
    // Тусклая подпись шкалы у лендинга — цвет ash с прозрачностью .45;
    // прозрачность конвертер не переносит.
    if (r.startsWith('lbl-')) el.opacity = '0.45';
    for (const s of S_KOMP) {
      const {L, w, T, h} = g[s];
      const H0 = kadrH(s);
      if (okno) {
        // Во всю ширину окна. На раскладках с автомасштабом — в сетке во всю
        // её ширину (она там и есть окно): элементы «по окну» Zero не
        // масштабирует, и их сдвиг после сцены отстал бы от остальных.
        if (S_MASSHTABOM.includes(s)) {
          set(el, 'container', s, 'grid'); set(el, 'axisx', s, 'left'); set(el, 'left', s, 0);
          set(el, 'widthunits', s, 'px'); set(el, 'width', s, s);
        } else {
          set(el, 'container', s, 'window'); set(el, 'axisx', s, 'left'); set(el, 'left', s, 0);
          set(el, 'widthunits', s, '%'); set(el, 'width', s, 100);
        }
        // По высоте — доли окна, как у лендинга. Всё, что закреплено «по
        // окну», начинается с верха кадра: у SBS старт элемента — его верх,
        // и слой с верхом ниже нуля закрепился бы позже остальных.
        const vesKadr = r === 'scrim-top';
        set(el, 'axisy', s, 'top'); set(el, 'topunits', s, '%'); set(el, 'top', s, vesKadr ? 0 : +(T / H0 * 100).toFixed(2));
        set(el, 'heightunits', s, '%'); set(el, 'height', s, vesKadr ? 100 : +(h / H0 * 100).toFixed(2));
        set(el, 'sbstrgofst', s, 0);
      } else {
        const oY = y === 'top' ? 0 : y === 'center' ? H0 / 2 : H0;
        set(el, 'container', s, 'grid'); set(el, 'axisx', s, 'left'); set(el, 'axisy', s, y);
        // Заливка шкалы растёт из левого края: стоит на полширины левее
        // и едет вправо, пока растёт от нуля.
        set(el, 'left', s, Math.round(r.startsWith('fill') ? L - w / 2 : L));
        set(el, 'top', s, Math.round(y === 'top' ? T : y === 'center' ? T + h / 2 - oY : T + h - oY));
        // Старт у всех элементов — когда верх блока доходит до верха окна.
        set(el, 'sbstrgofst', s, Math.round(T - oY));
      }
      set(el, 'sbsopts', s, shagi(hodSceny(), liniya(r, w)));
    }
    // Вертикальная вуаль одним слоем во весь кадр — --scrim-y лендинга.
    if (r === 'scrim-top') {
      el.bgcolor = 'linear-gradient(180deg, rgba(25,21,16,0.62) 0%, rgba(25,21,16,0) 24%, '
        + 'rgba(25,21,16,0) 58%, rgba(25,21,16,0.7) 100%)';
    }
  }
  // Всё прочее, что конвертер снял с кадра (фон секции и т. п.), на
  // компьютере не нужно: окно целиком закрывают снимки.
  for (const el of elementy(code)) {
    if (svoi.has(el)) continue;
    const g = geometriya(code, el);
    for (const s of S_KOMP) if (!g[s].skryt) { set(el, 'hidden', s, 'y'); console.warn('scena: скрыт лишний элемент', el.layer, s); }
    // На телефоне элемент должен остаться видимым, если был виден.
    const t0 = TEL.find((s) => !g[s].skryt);
    if (t0 && eff(el, 'hidden', t0) === 'y') set(el, 'hidden', t0, 'n');
  }
  return rol;
}

// «Готовая партия». Список документов: у лендинга подсвечен пункт, центр
// которого ближе всех к линии чтения (45 % высоты окна): нижняя линия
// темнеет и выезжает слева, номер темнеет (420 мс). Пока список за экраном,
// не подсвечен ни один. Здесь у каждого пункта своя пара элементов поверх
// (линия и номер) с анимацией по прокрутке: пункт «загорается», когда
// линия чтения проходит середину между ним и предыдущим, и гаснет на
// середине до следующего. Смена — за 120 px прокрутки (не больше 45 %
// шага между пунктами): за 40 px она проскакивала за один-два кадра.
// Фото справа «липнет» к верху окна под шапкой (85 + 48 px) и едет со
// списком до конца его колонки — штатная фиксация Zero. На узких
// раскладках колонка одна, фото стоит на месте.
function spisokChteniya(code, roli, rol) {
  const linii = [...rol.keys()].filter((k) => k.startsWith('dline-'));
  const PER = 120;
  for (const k of linii) {
    const i = +k.split('-')[1];
    const para = [[rol.get(k), 'liniya'], [rol.get(`didx-${i}`), 'nomer']].filter(([el]) => el);
    for (const [el, vid] of para) {
      for (const f of Object.keys(el)) if (/^anim(style|duration|delay|distance|triggeroffset)/.test(f)) delete el[f];
      el.sbsevent = 'scroll'; el.sbstrg = '0.5'; el.animmobile = 'y';
      const g = geometriya(code, el);
      for (const s of SCREENS) {
        if (g[s].skryt) continue;
        const punkty = (roli[s] || []).filter((r) => r.rol.startsWith('dli-')).sort((x, y) => x.t - y.t);
        if (punkty.length < 2 || !punkty[i]) continue;
        const vh = vEdinicah(s, vhOkna(s));
        const centr = punkty.map((r) => r.t + r.h / 2);
        const a = i === 0 ? punkty[0].t - 0.55 * vh : (centr[i - 1] + centr[i]) / 2;
        const b = i === punkty.length - 1 ? punkty[i].t + punkty[i].h + 0.45 * vh : (centr[i] + centr[i + 1]) / 2;
        const per = Math.min(vEdinicah(s, PER), 0.45 * (b - a));
        const D = b - a + per;
        const {L, w, T} = g[s];
        if (vid === 'liniya') set(el, 'left', s, Math.round(L - w / 2));
        const vykl = vid === 'liniya' ? {sx: 0} : {op: 0};
        const vkl = vid === 'liniya' ? {sx: 1, mx: w / 2} : {op: 1};
        // Старт — линия чтения (45 % окна) на отметке a.
        set(el, 'sbstrgofst', s, Math.round(T - a - 0.05 * vh));
        set(el, 'sbsopts', s, shagi(D, {skryt: true, fiks: false,
          t: [[0, vykl], [per / D, vkl], [(b - a) / D, vkl], [1, vykl]]}));
      }
    }
  }
  const foto = rol.get('dfoto');
  if (foto) {
    const g = geometriya(code, foto);
    foto.animfix = '0';
    foto.animfixtrgofst = '133';
    foto.animmobile = 'y';
    for (const s of SCREENS) {
      const fig = (roli[s] || []).find((r) => r.rol === 'dfig');
      const hod = fig && !g[s].skryt ? Math.round(fig.t + fig.h - (g[s].T + g[s].h)) : 0;
      set(foto, 'animfixdist', s, hod > 4 ? hod : 0);
    }
  }
}

// «Прокрутка» сцены: пустой прозрачный блок высотой в ход сцены. На
// телефоне сцены нет. Нулевую высоту Тильда при сохранении выбрасывает
// (и берёт высоту большей раскладки), поэтому там — 1 px цвета фона
// списка актов над ним, чтобы шва не было видно.
function prostavka({fonTelefon = ''} = {}) {
  const code = {ab_screens: [...SCREENS].sort((x, y) => x - y).join(','), ab_bgcolor: ''};
  const tel = RAZMETKA.find((r) => r.c <= 760).s;
  for (const {s, c} of RAZMETKA) {
    code[kluch('ab_height', s)] = String(c > 760 ? hodSceny() : 1);
    if (s !== TOP) code[`ab_upscale-res-${s}`] = S_MASSHTABOM.includes(s) ? 'window' : 'grid';
  }
  if (fonTelefon) code[`ab_bgcolor-res-${tel}`] = fonTelefon;
  return code;
}

async function build(key, selector, opts = {}) {
  const html = await fetch(`${BAZA}${key}.html?v=${Date.now()}`).then((r) => {
    if (!r.ok) throw new Error(`${key}.html: HTTP ${r.status}`);
    return r.text();
  });
  const mod = await window.tp__fallbackImport(MODUL);
  window.__ziLines = {}; // сюда пишет замерщик строк из экрана
  window.__ziRamki = {}; // а сюда — линии частичных границ
  window.__ziReveal = {}; // рамки блоков появления — по ширинам
  window.__ziRoli = {};   // и роли элементов сцены (data-zi)
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
  // Роли элементов (data-zi) опознаются по исходной геометрии конвертера —
  // до поправок, которые переводят элементы в проценты и «окно».
  const roli = zameryVRazmetku(window.__ziRoli);
  const rol = roli[TOP] ? naznachitRoli(code, roli[TOP]) : new Map();
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
  // Появление назначается по исходной геометрии — до поправок, которые
  // прижимают элементы к низу окна и переводят их в проценты.
  const reveal = zameryVRazmetku(window.__ziReveal);
  poyavlenie(code, reveal, {isklyuchit: (el) => el.layer === 'px' || (opts.geroy && el.elem_type === 'image')});
  // Ссылки — тоже по исходной геометрии (элементы, прижатые к низу окна,
  // потом получают другие координаты).
  ssylki(code, roli);
  kKrayuOkna(code, {vh: !!opts.vh});
  // На телефонных раскладках подписи первого экрана остаются в сетке под
  // кнопкой — их ставит на место telefonPoOknu.
  if (opts.pinBottom) kNizu(code, opts.pinBottom, {telefon: S_MASSHTABOM, krome: opts.geroy ? S_TELEFON : []});
  if (opts.geroy) telefonPoOknu(code);
  if (opts.nizProcentom) nizProcentom(code);
  if (opts.podSetkuTildy) podSetkuTildy(code);
  if (opts.polyaTildy) kPolyamTildy(code, roli);
  if (opts.forma) { podpravitFormu(code, opts.forma); liniiFormy(code); }
  // Прибавка высоты блока на отдельных раскладках (форма Zero выше формы
  // лендинга — кнопка упиралась в низ блока на 320).
  for (const [s, px] of Object.entries(opts.vysotaPlus || {})) {
    const k = kluch('ab_height', +s);
    code[k] = String(Math.round(num(code[k] ?? code.ab_height) + px));
  }
  // Движение, которому нужна итоговая геометрия: параллакс, лента, сцены,
  // список документов, наведение.
  if (opts.geroy) geroyFoto(code);
  else parallaks(code);
  if (opts.lenta) begushayaLenta(code, opts.lenta);
  if (opts.scena) scena(code, roli, rol, typeof opts.scena === 'object' ? opts.scena : {});
  if (opts.spisokChteniya) spisokChteniya(code, roli, rol);
  navedenie(code);
  izEkrana(code, html);
  logotipy(code, rol);
  if (opts.after) opts.after(code);
  szhat(code);
  return code;
}

// Сжатие: значение раскладки, совпадающее с унаследованным от большей, не
// хранится — Zero и так возьмёт его сверху. У Тильды предел на объём данных
// блока (ZRO-SZC-003 «Too much data»).
function szhat(code) {
  const chistit = (obj, pref) => {
    const polya = new Set(Object.keys(obj).filter((k) => k.startsWith(pref) && /-res-\d+$/.test(k))
      .map((k) => k.replace(/-res-\d+$/, '')));
    for (const f of polya) {
      let prev = obj[f];
      for (const s of SCREENS.slice(1)) {
        const k = `${f}-res-${s}`;
        if (!(k in obj)) continue;
        const v = obj[k];
        if (v === '' || v === undefined || String(v) === String(prev)) delete obj[k];
        else prev = v;
      }
    }
  };
  for (const el of elementy(code)) chistit(el, '');
  chistit(code, 'ab_');
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

export default {SCREENS, eff, build, put, replace, elementy, prostavka};
