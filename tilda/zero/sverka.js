// Сверка черновика на Zero Block со свёрстанным лендингом — по текстам.
//
// Запускается на странице черновика в браузере (домен проекта *.tilda.ws):
//   const V = (await import('https://pogosiangeorgiy-wq.github.io/ikra/tilda/zero/sverka.js?v=' + Date.now())).default;
//   await V.otkryt(1280);          // оригинал «/» и черновик рядом, оба шириной 1280
//   V.sravnit();                   // расхождения по каждому тексту
//
// Оригинал — главная страница проекта (блоки T123 из index.html, со своими
// скриптами), черновик — страница pageid 273252009. Оба на одном домене,
// поэтому документы фреймов доступны. Текст сопоставляется по содержимому:
// один и тот же абзац должен стоять на том же месте своего экрана, тем же
// кеглем, тем же цветом и в то же число строк.

const CHERNOVIK = '/page273252009.html';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.replace(/\s+/g, ' ').trim();

let A = null, B = null, shirina = 1280;

// orig и chernovik — адреса страниц на домене проекта; по умолчанию главная
// и черновик главной. Для 404: {orig: '/stranica-ne-naydena', chernovik: '/page273701609.html'}.
export async function otkryt(w = 1280, h = 900, {orig = '/', chernovik = CHERNOVIK, etalon = false, bystro = false} = {}) {
  // etalon — вместо страницы-оригинала на домене взять саму вёрстку index.html
  // с GitHub Pages: без скриптов, появления на месте, шапка и cookie скрыты
  // (как её видел конвертер). Кладётся во фрейм srcdoc того же происхождения,
  // поэтому её можно измерять. bystro — без прокрутки до конца (в фоновой
  // вкладке таймеры редкие, а для раскладки прокрутка не нужна).
  shirina = w;
  document.getElementById('zi-sverka')?.remove();
  const d = document.createElement('div');
  d.id = 'zi-sverka';
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#777;overflow:auto';
  const mk = (src, i, srcdoc) => {
    const f = document.createElement('iframe');
    if (srcdoc) f.srcdoc = srcdoc;
    else f.src = `${src}${src.includes('?') ? '&' : '?'}zi=${Date.now()}`;
    f.style.cssText = `position:absolute;top:0;left:${i * (w + 10)}px;width:${w}px;height:${h}px;border:0;background:#fff`;
    d.appendChild(f);
    return f;
  };
  let srcdoc = null;
  if (etalon) {
    const KOREN = 'https://pogosiangeorgiy-wq.github.io/ikra/';
    srcdoc = await fetch(`${KOREN}${orig === '/' ? 'index.html' : orig.replace(/^\//, '') + '.html'}?v=${Date.now()}`).then((r) => r.text());
    srcdoc = srcdoc.replace(/<script[\s\S]*?<\/script>/g, '')
      .replace('<head>', `<head><base href="${KOREN}">`)
      .replace('</head>', '<style>.reveal,.reveal *,.line__i{opacity:1!important;transform:none!important;transition:none!important}.cookie{display:none!important}</style></head>');
  }
  A = mk(orig, 0, srcdoc);
  B = mk(chernovik, 1);
  document.body.appendChild(d);
  await Promise.all([A, B].map((f) => new Promise((r) => { f.onload = r; })));
  await pause(bystro ? 2500 : 3500);
  // У лендинга блоки стоят в стартовом положении появления (сдвиг вниз,
  // прозрачность), пока их не «увидит» прокрутка, а в скрытом окне она не
  // срабатывает. Для сверки — конечное положение, как после появления. То же
  // у Zero: элементы с «появлением» до срабатывания сдвинуты и прозрачны.
  const st = A.contentDocument.createElement('style');
  st.textContent = '.reveal,.reveal *,.line__i{transform:none!important;opacity:1!important;transition:none!important}';
  A.contentDocument.head.appendChild(st);
  const st2 = B.contentDocument.createElement('style');
  st2.textContent = '.t396 .t-animate,.t396 .t-animate *{opacity:1!important;transform:none!important;transition:none!important}';
  B.contentDocument.head.appendChild(st2);
  if (!bystro) {
    // Прокрутка до конца и обратно будит ленивую загрузку и появления.
    for (const f of [A, B]) {
      const win = f.contentWindow, doc = f.contentDocument;
      const H = doc.documentElement.scrollHeight;
      for (let y = 0; y < H; y += h) { win.scrollTo({top: y, behavior: 'instant'}); win.dispatchEvent(new Event('scroll')); await pause(120); }
      win.scrollTo({top: 0, behavior: 'instant'});
    }
    await pause(1500);
  }
  return 'ok';
}

// Экран, к которому относится текст: секция лендинга или блок Тильды.
function ekranOrig(el) { return el.closest('section, footer, header, .site-header, .cookie'); }
function ekranChern(el) { return el.closest('.r.t-rec'); }

function listya(doc, ekran) {
  const win = doc.defaultView;
  const out = [];
  const vse = doc.body.querySelectorAll('*');
  for (const el of vse) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|OPTION|SELECT|TEXTAREA|INPUT|IFRAME)$/i.test(el.tagName)) continue;
    let svoy = false;
    for (let c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.textContent.trim()) { svoy = true; break; }
    if (!svoy) continue;
    const cs = win.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    // Берём самый внешний блочный предок текста: <a> или <span> внутри <p>
    // сравниваются в составе абзаца.
    let blok = el;
    // Строки заголовков, на которые их режет скрипт лендинга (.line), —
    // части одного заголовка, как и строчные элементы внутри абзаца.
    while (blok.parentElement && (win.getComputedStyle(blok).display === 'inline'
      || /(^|\s)line(__i)?(\s|$)/.test(blok.className || ''))) blok = blok.parentElement;
    if (out.some((o) => o.el === blok)) continue;
    // innerText, а не textContent: перенос <br> в заголовке Zero — это пробел.
    const t = norm(blok.innerText || blok.textContent);
    if (t.length < 2) continue;
    const ek = ekran(blok);
    if (!ek) continue;
    const rng = doc.createRange();
    rng.selectNodeContents(blok);
    const rects = [...rng.getClientRects()].filter((r) => r.width > 0.5);
    if (!rects.length) continue;
    const L = Math.min(...rects.map((r) => r.left)), R = Math.max(...rects.map((r) => r.right));
    const T = Math.min(...rects.map((r) => r.top)), Bn = Math.max(...rects.map((r) => r.bottom));
    const bs = win.getComputedStyle(blok);
    const lh = parseFloat(bs.lineHeight) || parseFloat(bs.fontSize) * 1.3;
    const ekR = ek.getBoundingClientRect();
    const metka = ek.id || (ek.className && String(ek.className).split(' ')[0]) || ek.tagName;
    out.push({el: blok, t, ek, metka, L: Math.round(L), W: Math.round(R - L), Trel: Math.round(T - ekR.top),
      stroki: Math.max(1, Math.round((Bn - T) / lh)), fs: parseFloat(bs.fontSize), fw: bs.fontWeight,
      c: bs.color, tt: bs.textTransform, ls: bs.letterSpacing});
  }
  return out;
}

export function sravnit({porogX = 6, porogY = 10, ekrany = null} = {}) {
  // ekrany — список меток секций лендинга (id или первый класс), если нужно
  // сверить не всю страницу, а отдельные экраны.
  const a = listya(A.contentDocument, ekranOrig).filter((x) => !ekrany || ekrany.includes(x.metka));
  const b = listya(B.contentDocument, ekranChern);
  // Экран лендинга сопоставляется с блоком черновика, у которого с ним больше
  // всего общих текстов: одинаковые «01», пункты меню и подвала иначе
  // попадают в пары из чужих экранов.
  const ekranyA = [...new Set(a.map((x) => x.ek))];
  const blokiB = [...new Set(b.map((x) => x.ek))];
  const pará = new Map();
  for (const ea of ekranyA) {
    const ta = new Set(a.filter((x) => x.ek === ea).map((x) => x.t));
    let best = null, bestN = 0;
    for (const eb of blokiB) {
      const n = b.filter((y) => y.ek === eb && ta.has(y.t)).length;
      if (n > bestN) { best = eb; bestN = n; }
    }
    pará.set(ea, best);
  }
  const poTekstu = new Map();
  b.forEach((x) => { if (!poTekstu.has(x.t)) poTekstu.set(x.t, []); poTekstu.get(x.t).push(x); });
  const res = [];
  let sovp = 0, net = 0;
  for (const x of a) {
    const vse = poTekstu.get(x.t) || [];
    const svoi = vse.filter((y) => y.ek === pará.get(x.ek));
    const kand = svoi.length ? svoi : vse;
    if (!kand || !kand.length) { net += 1; res.push({ekran: x.metka, t: x.t.slice(0, 50), problema: 'нет в черновике'}); continue; }
    // Одинаковый текст бывает в разных местах (пункт меню и подпись) —
    // в пару берётся ближайший по положению.
    kand.sort((p, q) => (Math.abs(p.L - x.L) + Math.abs(p.Trel - x.Trel)) - (Math.abs(q.L - x.L) + Math.abs(q.Trel - x.Trel)));
    const y = kand[0];
    vse.splice(vse.indexOf(y), 1);
    const raz = [];
    if (Math.abs(x.L - y.L) > porogX) raz.push(`x ${x.L}→${y.L}`);
    if (Math.abs(x.Trel - y.Trel) > porogY) raz.push(`y ${x.Trel}→${y.Trel}`);
    if (Math.abs(x.fs - y.fs) > 0.6) raz.push(`кегль ${x.fs}→${y.fs}`);
    if (x.fw !== y.fw) raz.push(`вес ${x.fw}→${y.fw}`);
    if (x.stroki !== y.stroki) raz.push(`строк ${x.stroki}→${y.stroki}`);
    if (x.c !== y.c) raz.push(`цвет ${x.c}→${y.c}`);
    if (x.tt !== y.tt && !(x.tt === 'none' && y.tt === '')) raz.push(`регистр ${x.tt}→${y.tt}`);
    if (raz.length) res.push({ekran: x.metka, t: x.t.slice(0, 50), problema: raz.join('; ')});
    else sovp += 1;
  }
  const lishnie = [...poTekstu.values()].flat().map((y) => y.t.slice(0, 50));
  return {shirina, vsego: a.length, sovpalo: sovp, netVChernovike: net, rashozhdeniy: res.length - net,
    spisok: res, lishnieVChernovike: lishnie};
}

export const zakryt = () => { document.getElementById('zi-sverka')?.remove(); return 'ok'; };

export default {otkryt, sravnit, zakryt};
