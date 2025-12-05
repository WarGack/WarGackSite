// _worker.js - FreeKassa donations for warnight.net
// Requires KV binding: DONATIONS
// Requires env secrets: FREEKASSA_MERCHANT_ID, FREEKASSA_SECRET1, FREEKASSA_SECRET2
// Optional: BASE_URL

// -----------------
// Compact MD5 impl
// -----------------
function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
function cmn(q, a, b, x, s, t) {
  a = add32(add32(a, q), add32(x, t));
  return add32((a << s) | (a >>> (32 - s)), b);
}
function ff(a,b,c,d,x,s,t){ return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
function gg(a,b,c,d,x,s,t){ return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
function hh(a,b,c,d,x,s,t){ return cmn(b ^ c ^ d, a, b, x, s, t); }
function ii(a,b,c,d,x,s,t){ return cmn(c ^ (b | (~d)), a, b, x, s, t); }

function md5(str) {
  // convert to UTF-8 bytes
  const msg = [];
  for (let i=0; i<str.length; i++){
    const c = str.charCodeAt(i);
    if (c < 128) msg.push(c);
    else if (c < 2048) { msg.push((c >> 6) | 192, (c & 63) | 128); }
    else {
      msg.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
    }
  }

  const origLenBits = msg.length * 8;
  // append 0x80, then pad with zeros until length ≡ 56 (mod 64)
  msg.push(0x80);
  while ((msg.length % 64) !== 56) msg.push(0);
  // append 64-bit little-endian length
  for (let i = 0; i < 8; i++) msg.push((origLenBits >>> (8 * i)) & 0xFF);

  // helper to get little-endian 32-bit words
  function bytesToWords(bytes) {
    const words = [];
    for (let i = 0; i < bytes.length; i += 4) {
      words.push(
        (bytes[i]) |
        (bytes[i+1] << 8) |
        (bytes[i+2] << 16) |
        (bytes[i+3] << 24)
      );
    }
    return words;
  }

  const x = bytesToWords(msg);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

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
    const s = "0123456789abcdef";
    let str = "";
    for (let j = 0; j < 4; j++) {
      str += s[(n >> (j * 8 + 4)) & 0xF] + s[(n >> (j * 8)) & 0xF];
    }
    return str;
  }
  return rhex(a) + rhex(b) + rhex(c) + rhex(d);
}

// -----------------------------
// Helper utilities
// -----------------------------
function makeOrderId(){
  return 'ord' + Date.now() + Math.floor(Math.random()*1000);
}

function buildFKLink(env, amount, orderId, currency='RUB'){
  // md5(MERCHANT_ID:AMOUNT:SECRET1:CURRENCY:ORDER_ID)
  const sign = md5(`${env.FREEKASSA_MERCHANT_ID}:${amount}:${env.FREEKASSA_SECRET1}:${currency}:${orderId}`);
  const params = new URLSearchParams({
    m: env.FREEKASSA_MERCHANT_ID,
    oa: amount,
    currency,
    o: orderId,
    s: sign,
    lang: 'ru'
  });
  return `https://pay.fk.money/?${params.toString()}`;
}

// -----------------------------
// Exported fetch
// -----------------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Serve index.html at "/"
    if (pathname === "/") {
      return new Response(INDEX_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" }});
    }

    // Create donation: POST /donate
    if (pathname === "/donate" && request.method === "POST") {
      const form = await request.formData();
      const amount = (form.get('amount') || '').toString();
      const msg = (form.get('msg') || '').toString().substring(0,300);

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return new Response("Invalid amount", { status: 400 });
      }

      const orderId = makeOrderId();
      // save pending: key pending_{orderId}
      await env.DONATIONS.put(`pending_${orderId}`, JSON.stringify({ amount, msg, created: Date.now() }));

      const redirectUrl = buildFKLink(env, amount, orderId);
      return Response.redirect(redirectUrl, 302);
    }

    // FreeKassa callback: POST /callback
    if (pathname === "/callback" && request.method === "POST") {
      const form = await request.formData();
      const MERCHANT_ID = form.get('MERCHANT_ID') || form.get('m');
      const AMOUNT = form.get('AMOUNT') || form.get('oa') || form.get('amount');
      const MERCHANT_ORDER_ID = form.get('MERCHANT_ORDER_ID') || form.get('o') || form.get('MERCHANT_ORDER_ID');
      const SIGN = form.get('SIGN') || form.get('s');

      if (!MERCHANT_ID || !AMOUNT || !MERCHANT_ORDER_ID || !SIGN) {
        return new Response("Bad Request", { status: 400 });
      }

      // expected = md5(MERCHANT_ID:AMOUNT:SECRET2:MERCHANT_ORDER_ID)
      const expected = md5(`${MERCHANT_ID}:${AMOUNT}:${env.FREEKASSA_SECRET2}:${MERCHANT_ORDER_ID}`);

      if (expected.toLowerCase() !== SIGN.toString().toLowerCase()) {
        return new Response("Bad signature", { status: 400 });
      }

      // retrieve pending info
      const pendingRaw = await env.DONATIONS.get(`pending_${MERCHANT_ORDER_ID}`);
      let message = "";
      if (pendingRaw) {
        try {
          const p = JSON.parse(pendingRaw);
          message = p.msg || "";
          await env.DONATIONS.delete(`pending_${MERCHANT_ORDER_ID}`);
        } catch (e) { /* ignore */ }
      }

      // store donation
      const donation = {
        id: 'don_' + Date.now() + '_' + Math.floor(Math.random()*1000000),
        amount: AMOUNT,
        message,
        time: Date.now()
      };
      await env.DONATIONS.put(donation.id, JSON.stringify(donation));

      // FreeKassa expects "YES"
      return new Response("YES", { status: 200 });
    }

    // API to list donations: GET /api/donations
    if (pathname === "/api/donations" && request.method === "GET") {
      const listResp = await env.DONATIONS.list({ prefix: 'don_' });
      const res = [];
      for (const k of listResp.keys) {
        const item = await env.DONATIONS.get(k.name, { type: "json" });
        if (item) res.push(item);
      }
      // sort newest first
      res.sort((a,b) => b.time - a.time);
      return new Response(JSON.stringify(res), { headers: { "Content-Type": "application/json" }});
    }

    return new Response("Not found", { status: 404 });
  }
};

// -----------------------------
// Your INDEX_HTML (keep exactly as you want)
// -----------------------------
const INDEX_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Официальный список сложнейших демонов Geometry Dash</title>
</head>
<body style="font-size: 33px">
<center>
Официальный список сложнейших демонов Geometry Dash:<br><br>
<table border=1 style="font-size: 33px">
<tr><th>№<th>Уровень<th>Строитель<th>Верификатор<th>Версия
<tr><td>1<td><a href="http://youtu.be/nIbvJmRLRjM">WarCora</a><td>WarGackTeam<td><a href="http://youtube.com/WarGack">WarGack</a><td>2.1-2.11
<tr><td>2<td><a href="http://youtu.be/9fsZ014qB3s">Tidal Wave</a><td>OniLink<td><a href="http://youtube.com/Zoink">Zoink</a><td>2.1-2.204
<tr><td>3<td><a href="http://youtu.be/16Zh8jssanc">Avernus</a><td>PockeWindfish<td><a href="http://youtube.com/Zoink">Zoink</a><td>2.1-2.204
<tr><td>4<td><a href="http://youtu.be/EIKJAiYkBrs">Acheron</a><td>ryamu<td><a href="http://youtube.com/Zoink">Zoink</a><td>2.1-2.204
<tr><td>5<td><a href="http://youtu.be/DmrPjZrJlAg">Silent clubstep</a><td>TheRealSailent<td><a href="http://youtube.com/paqoe">zoe</a><td>1.8-2.204
<tr><td>6<td><a href="http://youtu.be/nAn7u0z1Rnk">Abyss of Darkness</a><td>Exen<td><a href="http://youtube.com/cursed6125">Cursed</a><td>2.1-2.204
<tr><td>7<td><a href="http://youtu.be/1I3aQLb5Vvc">Kyouki</a><td>出見塩<td><a href="http://youtube.com/demishio5434">出見塩</a><td>2.1-2.204
<tr><td>8<td><a href="http://youtu.be/eRyUPOHDU9s">Slaughterhouse</a><td>icedcave<td><a href="http://youtube.com/DoggieDasher">Doggie</a><td>2.1-2.204
<tr><td>9<td><a href="http://youtu.be/tqEVXARNRts">Sakupen Circles</a><td>Diamond<td><a href="http://youtube.com/DiamondGD">Diamond</a><td>2.1-2.204
<tr><td>10<td><a href="http://youtu.be/2CxE-UWCIG4">KOCMOC</a><td>cherryteam<td><a href="http://youtube.com/Zoink">Zoink</a><td>2.1-2.204
</table>

<br><a href="http://youtube.com/WarGack">YouTube</a> | <a href="http://t.me/WarGackChat">Telegram</a> | <a href="http://discord.gg/warnight-net-866417946095386654">Discord</a>

<hr>
<h2>Пожертвование</h2>
<form method="POST" action="/donate" style="font-size:30px">
  Сумма (RUB): <br>
  <input type="number" name="amount" min="1" step="1" required style="font-size:30px"><br><br>
  Сообщение (до 300 символов):<br>
  <textarea name="msg" maxlength="300" style="width:600px; height:150px; font-size:28px"></textarea><br><br>
  <button style="font-size:30px">Пожертвовать</button>
</form>

<hr>
<h2>Последние пожертвования</h2>
<div id="donates" style="font-size:28px">Загрузка...</div>

<script>
async function loadDonates() {
  try {
    const r = await fetch('/api/donations');
    const list = await r.json();
    if (!list.length) {
      document.getElementById('donates').innerText = 'Пока нет пожертвований';
      return;
    }
    document.getElementById('donates').innerHTML =
      list.map(d => `<p><b>${d.amount} ₽</b> — ${d.message || '(без сообщения)'}<br><small>${new Date(d.time).toLocaleString()}</small></p>`).join('');
  } catch(e) {
    document.getElementById('donates').innerText = 'Ошибка загрузки';
  }
}
loadDonates();
</script>

</center>
</body>
</html>
`;

