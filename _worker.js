export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ------------------
    // Главная страница (ТОЛЬКО /donate)
    // ------------------
    if (url.pathname === "/donate") {
      return new Response(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Пожертвования</title>
</head>
<body>
<h1>Пожертвования</h1>

<div>
  <h2>Отправить пожертвование</h2>
  <form action="/create" method="POST">
    <label>Сумма (₽):</label>
    <input type="number" name="amount" min="1" step="1" required>
    <button type="submit">Отправить</button>
  </form>
</div>

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
      const orderId = "ord" + Date.now() + Math.floor(Math.random() * 1000);

      // Формирование подписи: md5(MERCHANT_ID:AMOUNT:SECRET1:RUB:ORDER_ID)
      const str = `${env.FREEKASSA_MERCHANT_ID}:${amount}:${env.FREEKASSA_SECRET1}:RUB:${orderId}`;
      const md5 = buf => Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2,"0")).join("");
      const hash = await crypto.subtle.digest("MD5", new TextEncoder().encode(str));
      const sign = md5(hash);

      const baseUrl = env.BASE_URL || url.origin;

      const params = new URLSearchParams({
        m: env.FREEKASSA_MERCHANT_ID,
        oa: amount,
        o: orderId,
        currency: "RUB",
        s: sign,
        lang: "ru",
        success_url: `${baseUrl}/success`,
        fail_url: `${baseUrl}/fail`
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

      if (!MERCHANT_ID || !AMOUNT || !ORDER_ID || !SIGN) {
        return new Response("Bad Request", { status: 400 });
      }

      // Проверка подписи md5(MERCHANT_ID:AMOUNT:SECRET2:ORDER_ID)
      const str = `${MERCHANT_ID}:${AMOUNT}:${env.FREEKASSA_SECRET2}:${ORDER_ID}`;
      const md5 = buf => Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2,"0")).join("");
      const hash = await crypto.subtle.digest("MD5", new TextEncoder().encode(str));
      const expected = md5(hash);

      if (expected === SIGN) {
        return new Response("YES", { status: 200 });
      }

      return new Response("Bad sign", { status: 400 });
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

    // -------------------
    // Пропуск остальных запросов (включая "/")
    // -------------------
    // Если путь не соответствует ни одному из обработчиков, мы передаем запрос дальше
    // к Origin-серверу, который отдаст ваш index.html
    return fetch(request);
  }
};
