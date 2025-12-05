// _worker.js
// Cloudflare Worker - тестовый магазин + обработчик FreeKassa
// Требует: FREEKASSA_MERCHANT_ID, FREEKASSA_SECRET1, FREEKASSA_SECRET2 (в env/secrets)

const MERCHANT_ID = Deno.env ? Deno.env.get("FREEKASSA_MERCHANT_ID") : (typeof FREEKASSA_MERCHANT_ID !== 'undefined' ? FREEKASSA_MERCHANT_ID : null);
const SECRET1 = Deno.env ? Deno.env.get("FREEKASSA_SECRET1") : (typeof FREEKASSA_SECRET1 !== 'undefined' ? FREEKASSA_SECRET1 : null);
const SECRET2 = Deno.env ? Deno.env.get("FREEKASSA_SECRET2") : (typeof FREEKASSA_SECRET2 !== 'undefined' ? FREEKASSA_SECRET2 : null);
const BASE_URL = (typeof BASE_URL !== 'undefined' && BASE_URL) ? BASE_URL : 'https://your-worker.example.com';

// Небольшая реализация MD5 (автономная, компактная).
// Источник: общеупотребимый compact JS md5 snippet (встраиваем прямо в воркер)
function md5cycle(x, k) {
  // ... реализaция внутренних функций md5 ...
}
function md5blk(s) {
  const md5blk = [];
  for (let i = 0; i < 64; i += 4) {}
  // we'll use a simpler implementation below
}
function add32(a, b) { return (a + b) & 0xFFFFFFFF; }

// Вместо длинной реализации md5 в продакшне используй библиотеку.
// Для компактности ниже — лёгкая реализация готового md5 из доступных сниппетов:
function md5(s) {
  // compact MD5 taken from widely used snippets (works in Workers)
  function rotl(a,b){return (a<<b)|(a>>> (32-b));}
  function cmn(q,a,b,x,s,t){a = add32(add32(a,q), add32(x,t)); return add32(rotl(a,s),b);}
  function ff(a,b,c,d,x,s,t){ return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a,b,c,d,x,s,t){ return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a,b,c,d,x,s,t){ return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a,b,c,d,x,s,t){ return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function toBytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      if (c < 128) out.push(c);
      else if (c < 2048) { out.push((c >> 6) | 192); out.push((c & 63) | 128); }
      else {
        out.push((c >> 12) | 224);
        out.push(((c >> 6) & 63) | 128);
        out.push((c & 63) | 128);
      }
    }
    return out;
  }
  function bytesToWords(bytes) {
    const words = [];
    for (let i = 0; i < bytes.length; i++) {
      words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    }
    return words;
  }
  const bytes = toBytes(s);
  const origLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  // append length (little-endian)
  for (let i = 0; i < 8; i++) bytes.push(origLen >>> (8 * i) & 0xFF);
  const x = bytesToWords(bytes);
  // initialize
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;

  for (let i = 0; i < x.length; i += 16) {
    let olda = a, oldb = b, oldc = c, oldd = d;
    a = ff(a,b,c,d,x[i+0],7,-680876936);
    d = ff(d,a,b,c,x[i+1],12,-389564586);
    c = ff(c,d,a,b,x[i+2],17,606105819);
    b = ff(b,c,d,a,x[i+3],22,-1044525330);
    a = ff(a,b,c,d,x[i+4],7,-176418897);
    d = ff(d,a,b,c,x[i+5],12,1200080426);
    c = ff(c,d,a,b,x[i+6],17,-1473231341);
    b = ff(b,c,d,a,x[i+7],22,-45705983);
    a = ff(a,b,c,d,x[i+8],7,1770035416);
    d = ff(d,a,b,c,x[i+9],12,-1958414417);
    c = ff(c,d,a,b,x[i+10],17,-42063);
    b = ff(b,c,d,a,x[i+11],22,-1990404162);
    a = ff(a,b,c,d,x[i+12],7,1804603682);
    d = ff(d,a,b,c,x[i+13],12,-40341101);
    c = ff(c,d,a,b,x[i+14],17,-1502002290);
    b = ff(b,c,d,a,x[i+15],22,1236535329);

    a = gg(a,b,c,d,x[i+1],5,-165796510);
    d = gg(d,a,b,c,x[i+6],9,-1069501632);
    c = gg(c,d,a,b,x[i+11],14,643717713);
    b = gg(b,c,d,a,x[i+0],20,-373897302);
    a = gg(a,b,c,d,x[i+5],5,-701558691);
    d = gg(d,a,b,c,x[i+10],9,38016083);
    c = gg(c,d,a,b,x[i+15],14,-660478335);
    b = gg(b,c,d,a,x[i+4],20,-405537848);
    a = gg(a,b,c,d,x[i+9],5,568446438);
    d = gg(d,a,b,c,x[i+14],9,-1019803690);
    c = gg(c,d,a,b,x[i+3],14,-187363961);
    b = gg(b,c,d,a,x[i+8],20,1163531501);
    a = gg(a,b,c,d,x[i+13],5,-1444681467);
    d = gg(d,a,b,c,x[i+2],9,-51403784);
    c = gg(c,d,a,b,x[i+7],14,1735328473);
    b = gg(b,c,d,a,x[i+12],20,-1926607734);

    a = hh(a,b,c,d,x[i+5],4,-378558);
    d = hh(d,a,b,c,x[i+8],11,-2022574463);
    c = hh(c,d,a,b,x[i+11],16,1839030562);
    b = hh(b,c,d,a,x[i+14],23,-35309556);
    a = hh(a,b,c,d,x[i+1],4,-1530992060);
    d = hh(d,a,b,c,x[i+4],11,1272893353);
    c = hh(c,d,a,b,x[i+7],16,-155497632);
    b = hh(b,c,d,a,x[i+10],23,-1094730640);
    a = hh(a,b,c,d,x[i+13],4,681279174);
    d = hh(d,a,b,c,x[i+0],11,-358537222);
    c = hh(c,d,a,b,x[i+3],16,-722521979);
    b = hh(b,c,d,a,x[i+6],23,76029189);
    a = hh(a,b,c,d,x[i+9],4,-640364487);
    d = hh(d,a,b,c,x[i+12],11,-421815835);
    c = hh(c,d,a,b,x[i+15],16,530742520);
    b = hh(b,c,d,a,x[i+2],23,-995338651);

    a = ii(a,b,c,d,x[i+0],6,-198630844);
    d = ii(d,a,b,c,x[i+7],10,1126891415);
    c = ii(c,d,a,b,x[i+14],15,-1416354905);
    b = ii(b,c,d,a,x[i+5],21,-57434055);
    a = ii(a,b,c,d,x[i+12],6,1700485571);
    d = ii(d,a,b,c,x[i+3],10,-1894986606);
    c = ii(c,d,a,b,x[i+10],15,-1051523);
    b = ii(b,c,d,a,x[i+1],21,-2054922799);
    a = ii(a,b,c,d,x[i+8],6,1873313359);
    d = ii(d,a,b,c,x[i+15],10,-30611744);
    c = ii(c,d,a,b,x[i+6],15,-1560198380);
    b = ii(b,c,d,a,x[i+13],21,1309151649);
    a = ii(a,b,c,d,x[i+4],6,-145523070);
    d = ii(d,a,b,c,x[i+11],10,-1120210379);
    c = ii(c,d,a,b,x[i+2],15,718787259);
    b = ii(b,c,d,a,x[i+9],21,-343485551);

    a = add32(a, olda);
    b = add32(b, oldb);
    c = add32(c, oldc);
    d = add32(d, oldd);
  }

  function rhex(n) {
    let s='', j=0;
    for (; j<4; j++) {
      s += ('0'+ ((n >> (j*8 + 4)) & 0xF).toString(16)).slice(-1) + ('0'+ ((n >> (j*8)) & 0xF).toString(16)).slice(-1);
    }
    return s;
  }
  return rhex(a)+rhex(b)+rhex(c)+rhex(d);
}

// Вспомогательные функции
function makeOrderId() {
  return 'ord' + Date.now() + Math.floor(Math.random()*1000);
}

function buildPaymentLink({ merchantId, amount, currency='RUB', orderId, secret1 }) {
  // Формирование подписи: md5(MERCHANT_ID:AMOUNT:SECRET1:CURRENCY:ORDER_ID)
  const sign = md5(`${merchantId}:${amount}:${secret1}:${currency}:${orderId}`);
  const params = new URLSearchParams({
    m: merchantId,
    oa: amount,
    currency,
    o: orderId,
    s: sign,
    lang: 'ru'
  });
  return `https://pay.fk.money/?${params.toString()}`;
}

async function handleIndex(request) {
  const html = `
  <!doctype html>
  <html>
  <head><meta charset="utf-8"><title>Test FreeKassa shop</title></head>
  <body>
    <h1>Тестовый магазин FreeKassa</h1>
    <p>Примеры товаров:</p>
    <ul>
      <li>Мелкий донат — 50.00 RUB
        <form method="post" action="/create" style="display:inline">
          <input type="hidden" name="amount" value="50.00"/>
          <input type="hidden" name="name" value="donate_small"/>
          <button type="submit">Купить</button>
        </form>
      </li>
      <li>Большой донат — 500.00 RUB
        <form method="post" action="/create" style="display:inline">
          <input type="hidden" name="amount" value="500.00"/>
          <input type="hidden" name="name" value="donate_big"/>
          <button type="submit">Купить</button>
        </form>
      </li>
    </ul>
    <p>Callback URL: <code>${BASE_URL}/callback</code></p>
  </body>
  </html>
  `;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function handleCreate(request) {
  // Ожидаем form-data / urlencoded
  const form = await request.formData();
  const amount = form.get('amount') || '1.00';
  const name = form.get('name') || 'product';
  const orderId = makeOrderId();

  // В реальном магазине тут сохранили бы заказ в БД/KV для дальнейшей сверки
  const link = buildPaymentLink({
    merchantId: MERCHANT_ID || '',
    amount,
    currency: 'RUB',
    orderId,
    secret1: SECRET1 || ''
  });

  return Response.redirect(link, 302);
}

async function handleCallback(request) {
  // FreeKassa шлёт form-data (POST)
  const form = await request.formData();
  const MERCHANT_ID_R = form.get('MERCHANT_ID');
  const AMOUNT = form.get('AMOUNT');
  const MERCHANT_ORDER_ID = form.get('MERCHANT_ORDER_ID');
  const SIGN = form.get('SIGN');

  // базовая проверка
  if (!MERCHANT_ID_R || !AMOUNT || !MERCHANT_ORDER_ID || !SIGN) {
    return new Response('Bad Request', { status: 400 });
  }

  // Проверяем подпись: md5(MERCHANT_ID:AMOUNT:SECRET2:MERCHANT_ORDER_ID)
  const expected = md5(`${MERCHANT_ID_R}:${AMOUNT}:${SECRET2}:${MERCHANT_ORDER_ID}`);

  // (опционально) можно проверить IP отправителя (см. документацию)
  if (expected === SIGN) {
    // TODO: пометить заказ как оплаченный в БД/KV
    console.log('Payment verified:', { order: MERCHANT_ORDER_ID, amount: AMOUNT, intid: form.get('intid') });

    // Если нужно, вернуть YES (Freekassa будет повторять уведомления пока не получит YES)
    return new Response('YES', { status: 200 });
  } else {
    console.warn('Bad sign', { expected, got: SIGN });
    return new Response('Bad signature', { status: 400 });
  }
}

export default {
  async fetch(request, env, ctx) {
    // Поддержка method routing
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return handleIndex(request);
    }

    if (request.method === 'POST' && pathname === '/create') {
      return handleCreate(request);
    }

    if (request.method === 'POST' && pathname === '/callback') {
      return handleCallback(request);
    }

    // простая страница успеха/отказа (опционально)
    if (pathname === '/success') {
      return new Response('Спасибо! Платёж завершен.', { status: 200 });
    }
    if (pathname === '/fail') {
      return new Response('Платёж отменён или с ошибкой.', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  }
};
