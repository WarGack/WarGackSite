export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -------------------
    // Главная страница
    // -------------------
    if (url.pathname === "/") {
      const baseUrl = env.BASE_URL || url.origin;
      return new Response(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Пожертвования</title>
<style>
body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; }
.donate-box { padding: 20px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 30px; }
input, textarea { width: 100%; padding: 10px; margin: 8px 0; border-radius: 6px; border: 1px solid #aaa; }
button { padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; }
button:hover { background: #218838; }
.donation { border-bottom: 1px solid #ddd; padding: 10px 0; }
.donation-amount { font-weight: bold; color: #28a745; }
</style>
</head>
<body>
<h1>Пожертвования</h1>

<div class="donate-box">
  <h2>Отправить пожертвование</h2>
  <form action="/create" method="POST">
    <label>Сумма (₽):</label>
    <input type="number" name="amount" min="1" step="1" required>
    <label>Сообщение (до 300 символов):</label>
    <textarea name="message" maxlength="300" placeholder="Ваше сообщение..."></textarea>
    <button type="submit">Отправить</button>
  </form>
</div>

<h2>Последние пожертвования:</h2>
<div id="donations">Загрузка...</div>

<script>
async function loadDonations() {
  try {
    const res = await fetch("/api/donations");
    const donations = await res.json();
    const box = document.getElementById("donations");
    box.innerHTML = "";
    donations.forEach(d => {
      const div = document.createElement("div");
      div.className = "donation";
      div.innerHTML = \`
        <div class="donation-amount">+\${d.amount} ₽</div>
        <div>\${d.message ? d.message : "<i>Без сообщения</i>"}</div>
        <small>\${new Date(d.time).toLocaleString()}</small>
      \`;
      box.appendChild(div);
    });
  } catch (e) {
    document.getElementById("donations").innerHTML = "Ошибка загрузки";
  }
}
loadDonations();
</script>

</body>
</html>
      `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // -------------------
    // Создание заказа
    // -------------------
    if (url.pathname === "/create" && request.method === "POST") {
      const form = await request.formData();
      const amount = form.get("amount") || "1.00";
      const message = form.get("message") || "";
      const orderId = "ord" + Date.now() + Math.floor(Math.random() * 1000);

      // Формирование подписи: md5(MERCHANT_ID:AMOUNT:SECRET1:RUB:ORDER_ID)
      const str = `${env.FREEKASSA_MERCHANT_ID}:${amount}:${env.FREEKASSA_SECRET1}:RUB:${orderId}`;
      const md5 = buf => Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2,"0")).join("");
      const hash = await crypto.subtle.digest("MD5", new TextEncoder().encode(str));
      const sign = md5(hash);

      const params = new URLSearchParams({
        m: env.FREEKASSA_MERCHANT_ID,
        oa: amount,
        o: orderId,
        currency: "RUB",
        s: sign,
        us_message: message,
        lang: "ru",
        success_url: `${env.BASE_URL || url.origin}/success`,
        fail_url: `${env.BASE_URL || url.origin}/fail`
      });

      return Response.redirect(`https://pay.fk.money/?${params.toString()}`, 302);
    }

    // -------------------
    // Callback FreeKassa
    // -------------------
    if (url.pathname === "/callback" && request.method === "POST") {
      const form = await request.formData();
      const MERCHANT_ID = form.get("MERCHANT_ID");
      const AMOUNT = form.get("AMOUNT");
      const ORDER_ID = form.get("MERCHANT_ORDER_ID");
      const SIGN = form.get("SIGN");
      const MESSAGE = form.get("us_message") || "";

      if (!MERCHANT_ID || !AMOUNT || !ORDER_ID || !SIGN) {
        return new Response("Bad Request", { status: 400 });
      }

      // Проверка подписи md5(MERCHANT_ID:AMOUNT:SECRET2:ORDER_ID)
      const str = `${MERCHANT_ID}:${AMOUNT}:${env.FREEKASSA_SECRET2}:${ORDER_ID}`;
      const md5 = buf => Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2,"0")).join("");
      const hash = await crypto.subtle.digest("MD5", new TextEncoder().encode(str));
      const expected = md5(hash);

      if (expected === SIGN) {
        // Сохраняем донат в KV
        const data = {
          amount: AMOUNT,
          message: MESSAGE,
          time: Date.now()
        };
        await env.DONATIONS.put(ORDER_ID, JSON.stringify(data));
        return new Response("YES", { status: 200 });
      }

      return new Response("Bad sign", { status: 400 });
    }

    // -------------------
    // API: список донатов
    // -------------------
    if (url.pathname === "/api/donations") {
      const list = [];
      for await (const key of env.DONATIONS.list({ limit: 100 })) {
        const item = await env.DONATIONS.get(key.name, "json");
        if(item) list.push(item);
      }
      // сортируем по времени DESC
      list.sort((a,b) => b.time - a.time);
      return new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } });
    }

    // -------------------
    // Success / Fail страницы
    // -------------------
    if (url.pathname === "/success") {
      return new Response("<h1>Платёж успешно завершён</h1><p>Спасибо за пожертвование!</p>", { headers: { "Content-Type":"text/html;charset=UTF-8" } });
    }
    if (url.pathname === "/fail") {
      return new Response("<h1>Платёж не выполнен</h1><p>Оплата была отменена или произошла ошибка.</p>", { headers: { "Content-Type":"text/html;charset=UTF-8" } });
    }

    return new Response("Not found", { status: 404 });
  }
};
