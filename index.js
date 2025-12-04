export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // --- 1. Генерация ссылки на оплату ---
    if (url.pathname === "/pay") {
      const amount = url.searchParams.get("amount") || "10";
      const order_id = Date.now().toString();

      const sign = await sha256(
        `${env.FK_SHOP_ID}:${amount}:${env.FK_SECRET1}:${order_id}`
      );

      const payUrl =
        `https://pay.freekassa.ru/?m=${env.FK_SHOP_ID}` +
        `&oa=${amount}` +
        `&o=${order_id}` +
        `&s=${sign}`;

      return Response.json({
        order_id,
        pay_url: payUrl
      });
    }

    // --- 2. Callback от FreeKassa ---
    if (url.pathname === "/callback") {
      const data = await req.formData();

      const shop_id = data.get("MERCHANT_ID");
      const amount = data.get("AMOUNT");
      const order_id = data.get("MERCHANT_ORDER_ID");
      const sign = data.get("SIGN");

      // Проверяем подпись
      const mySign = await sha256(
        `${shop_id}:${amount}:${env.FK_SECRET2}:${order_id}`
      );

      if (sign !== mySign) {
        return new Response("Invalid signature", { status: 400 });
      }

      // Возвращаем FreeKassa стандартный ответ
      // (если написать не "YES", они не засчитают платеж)
      return new Response("YES");
    }

    // --- 3. Страница успеха ---
    if (url.pathname === "/success") {
      return new Response(
        `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Оплата прошла успешно</title>
            <style>
              body {
                background: #121212;
                color: white;
                font-family: Arial, sans-serif;
                text-align: center;
                padding-top: 80px;
              }
              .box {
                background: #1e1e1e;
                padding: 40px;
                margin: auto;
                width: 400px;
                border-radius: 12px;
                box-shadow: 0 0 20px rgba(255,255,255,0.05);
              }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>🎉 Платёж успешно завершён!</h1>
              <p>Спасибо за оплату!<br>Ваш заказ принят.</p>
            </div>
          </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response("FreeKassa Worker работает");
  }
};

// --- Утилита для SHA-256 ---
async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
