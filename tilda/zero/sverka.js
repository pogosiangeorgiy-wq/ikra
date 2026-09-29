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

export async function otkryt(w = 1280, h = 900) {
  shirina = w;
  document.getElementById('zi-sverka')?.remove();
  const d = document.createElement('div');
  d.id = 'zi-sverka';
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#777;overflow:auto';
  const mk = (src, i) => {
    const f = document.createElement('iframe');
    f.src = `${src}${src.includes('?') ? '&' : '?'}zi=${Date.now()}`;
    f.style.cssText = `position:absolute;top:0;left:${i * (w + 10)}px;width:${w}px;height:${h}px;border:0;background:#fff`;
    d.appendChild(f);
    return f;
  };
  A = mk('/', 0);
  B = mk(CHERNOVIK, 1);
  document.body.appendChild(d);
  await Promise.all([A, B].map((f) => new Promise((r) => { f.onload = r; })));
  await pause(3500);
  // У лендинга блоки стоят в стартовом положении появления (сдвиг вниз,
  // прозрачность), пока их не «увидит» прокрутка, а в скрытом окне она не
  // срабатывает. Для сверки — конечное положение, как после появления.
  const st = A.contentDocument.createElement('style');
  st.textContent = '.reveal,.reveal *,.line__i{transform:none!important;opacity:1!important;transition:none!important}';
  A.contentDocument.head.appendChild(st);
  // Прокрутка до конца и обратно будит ленивую загрузку и появления.
  for (const f of [A, B]) {
    const win = f.contentWindow, doc = f.contentDocument;
    const H = doc.documentElement.scrollHeight;
    for (let y = 0; y < H; y += h) { win.scrollTo({top: y, behavior: 'instant'}); win.dispatchEvent(new Event('scroll')); await pause(120); }
    win.scrollTo({top: 0, behavior: 'instant'});
  }
  await pause(1500);
  return 'ok';
}

// Экран, к которому относится текст: секция лендинга или блок Тильды.
function ekranOrig(el) { return el.closest('section, footer, .site-header, .cookie'); }
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
    while (blok.parentElement && (win.getComputedStyle(blok).display.startsWith('inline')
      || /(^|\s)line(__i)?(\s|$)/.test(blok.className || ''))) blok = blok.parentElement;
    if (out.some((o) => o.el === blok)) continue;
    const t = norm(blok.textContent);
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
  const poTekstu = new Map();
  b.forEach((x) => { if (!poTekstu.has(x.t)) poTekstu.set(x.t, []); poTekstu.get(x.t).push(x); });
  const res = [];
  let sovp = 0, net = 0;
  for (const x of a) {
    const kand = poTekstu.get(x.t);
    if (!kand || !kand.length) { net += 1; res.push({ekran: x.metka, t: x.t.slice(0, 50), problema: 'нет в черновике'}); continue; }
    // Одинаковый текст бывает в разных местах (пункт меню и подпись) —
    // в пару берётся ближайший по положению.
    kand.sort((p, q) => (Math.abs(p.L - x.L) + Math.abs(p.Trel - x.Trel)) - (Math.abs(q.L - x.L) + Math.abs(q.Trel - x.Trel)));
    const y = kand.shift();
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
