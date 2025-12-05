export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -------------------------------
    // 1. Главная страница (index.html)
    // -------------------------------
    if (url.pathname === "/") {
      return new Response(INDEX_HTML, {
        headers: { "Content-Type": "text/html; charset=UTF-8" }
      });
    }

    // -------------------------------------------------
    // 2. API: Получение списка донатов (GET /api/donations)
    // -------------------------------------------------
    if (url.pathname === "/api/donations") {
      const list = await env.DONATIONS.list();
      const result = [];

      for (const key of list.keys) {
        const data = await env.DONATIONS.get(key.name, { type: "json" });
        if (data) result.push(data);
      }

      result.sort((a, b) => b.time - a.time);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // -------------------------------------------------------------
    // 3. Обработчик FreeKassa callback (POST /callback)
    // -------------------------------------------------------------
    if (url.pathname === "/callback") {
      if (request.method !== "POST") {
        return new Response("Only POST allowed");
      }

      const form = await request.formData();

      const amount = form.get("AMOUNT");
      const orderId = form.get("MERCHANT_ORDER_ID");
      const sign = form.get("SIGN");
      const message = form.get("us_message") || "";

      // --- Проверка подписи FreeKassa ---
      const expected = await sha256(env.FK_SECRET2 + amount + env.FK_SHOP_ID + orderId);

      if (expected.toLowerCase() !== sign.toLowerCase()) {
        return new Response("Invalid signature", { status: 403 });
      }

      // --- Сохраняем запись ---
      const donation = {
        id: crypto.randomUUID(),
        amount,
        message,
        time: Date.now()
      };

      await env.DONATIONS.put(donation.id, JSON.stringify(donation));

      return new Response("YES"); // FreeKassa требует ответ YES
    }

    // 404
    return new Response("Not found", { status: 404 });
  }
};

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// --------------------------------------------------
// Вставленный index.html + FreeKassa форма + JS API
// --------------------------------------------------

const INDEX_HTML = `
<title>Официальный список сложнейших демонов Geometry Dash</title>
<body style="font-size: 33px">
<center>
Официальный список сложнейших демонов Geometry Dash:<br><br>

<table border=1 style="font-size: 33px">
<tr><th>№<th>Уровень<th>Строитель<th>Верификатор<th>Версия
<tr><td>1<td><a href=http://youtu.be/nIbvJmRLRjM>WarCora</a><td>WarGackTeam<td><a href=http://youtube.com/WarGack>WarGack</a><td>2.1-2.11
<tr><td>2<td><a href=http://youtu.be/9fsZ014qB3s>Tidal Wave</a><td>OniLink<td><a href=http://youtube.com/Zoink>Zoink</a><td>2.1-2.204
<tr><td>3<td><a href=http://youtu.be/16Zh8jssanc>Avernus</a><td>PockeWindfish<td><a href=http://youtube.com/Zoink>Zoink</a><td>2.1-2.204
<tr><td>4<td><a href=http://youtu.be/EIKJAiYkBrs>Acheron</a><td>ryamu<td><a href=http://youtube.com/Zoink>Zoink</a><td>2.1-2.204
<tr><td>5<td><a href=http://youtu.be/DmrPjZrJlAg>Silent clubstep</a><td>TheRealSailent<td><a href=http://youtube.com/paqoe>zoe</a><td>1.8-2.204
<tr><td>6<td><a href=http://youtu.be/nAn7u0z1Rnk>Abyss of Darkness</a><td>Exen<td><a href=http://youtube.com/cursed6125>Cursed</a><td>2.1-2.204
<tr><td>7<td><a href=http://youtu.be/1I3aQLb5Vvc>Kyouki</a><td>出見塩<td><a href=http://youtube.com/demishio5434>出見塩</a><td>2.1-2.204
<tr><td>8<td><a href=http://youtu.be/eRyUPOHDU9s>Slaughterhouse</a><td>icedcave<td><a href=http://youtube.com/DoggieDasher>Doggie</a><td>2.1-2.204
<tr><td>9<td><a href=http://youtu.be/tqEVXARNRts>Sakupen Circles</a><td>Diamond<td><a href=http://youtube.com/DiamondGD>Diamond</a><td>2.1-2.204
<tr><td>10<td><a href=http://youtu.be/2CxE-UWCIG4>KOCMOC</a><td>cherryteam<td><a href=http://youtube.com/Zoink>Zoink</a><td>2.1-2.204
</table>

<br><a href=http://youtube.com/WarGack>YouTube</a> | 
<a href=http://t.me/WarGackChat>Telegram</a> | 
<a href=http://discord.gg/warnight-net-866417946095386654>Discord</a>

<hr>

<h2>Пожертвование</h2>
<form method="GET" action="https://pay.freekassa.ru/">
  <input type="hidden" name="m" value="YOUR_SHOP_ID">
  <label>Сумма:</label><br>
  <input type="number" name="oa" min="1" required style="font-size:30px"><br><br>

  <label>Сообщение (до 300 символов)</label><br>
  <textarea name="us_message" maxlength="300" style="width:400px;height:120px;font-size:25px"></textarea><br><br>

  <button type="submit" style="font-size:30px">Оплатить</button>
</form>

<hr>
<h2>Последние донаты</h2>
<div id="donations" style="font-size:28px"></div>

<script>
async function loadDonations() {
  const r = await fetch("/api/donations");
  const list = await r.json();

  let html = "";
  for (const d of list) {
    const date = new Date(d.time).toLocaleString();
    html += \`<p><b>\${d.amount} ₽</b> — \${d.message || "(без сообщения)"} <br> <small>\${date}</small></p>\`;
  }
  document.getElementById("donations").innerHTML = html;
}

loadDonations();
</script>

</center>
</body>
`;
