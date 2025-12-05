// _worker.js — Тестовый магазин FreeKassa для Cloudflare Workers

// Лёгкий MD5 (подходящий для CF Workers)
function md5(str) {
  return crypto.subtle.digest("MD5", new TextEncoder().encode(str)).then(buf =>
    Array.from(new Uint8Array(buf))
      .map(x => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

function makeOrderId() {
  return "ord" + Date.now() + Math.floor(Math.random() * 1000);
}

async function buildPaymentLink(env, amount, orderId) {
  const currency = "RUB";

  // подпись md5(MERCHANT_ID:AMOUNT:SECRET1:CURRENCY:ORDER_ID)
  const sign = await md5(
    `${env.FREEKASSA_MERCHANT_ID}:${amount}:${env.FREEKASSA_SECRET1}:${currency}:${orderId}`
  );

  const params = new URLSearchParams({
    m: env.FREEKASSA_MERCHANT_ID,
    oa: amount,
    currency,
    o: orderId,
    s: sign,
    lang: "ru",
  });

  return `https://pay.fk.money/?${params.toString()}`;
}

function indexPage(baseUrl) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>FreeKassa Test Shop</title></head>
<body>
<h1>Тестовый магазин FreeKassa</h1>

<ul>
  <li>50 RUB
    <form method="post" action="/create">
      <input type="hidden" name="amount" value="50.00">
      <button>Купить</button>
    </form>
  </li>

  <li>500 RUB
    <form method="post" action="/create">
      <input type="hidden" name="amount" value="500.00">
      <button>Купить</button>
    </form>
  </li>
</ul>

<p>Callback URL: <b>${baseUrl}/callback</b></p>

</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Главная
    if (url.pathname === "/") {
      const baseUrl = env.BASE_URL || url.origin;
      return new Response(indexPage(baseUrl), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // Создание заказа
    if (url.pathname === "/create" && request.method === "POST") {
      const form = await request.formData();
      const amount = form.get("amount") || "1.00";
      const orderId = makeOrderId();

      const payUrl = await buildPaymentLink(env, amount, orderId);

      return Response.redirect(payUrl, 302);
    }

    // Callback FreeKassa
    if (url.pathname === "/callback" && request.method === "POST") {
      const form = await request.formData();

      const MERCHANT_ID = form.get("MERCHANT_ID");
      const AMOUNT = form.get("AMOUNT");
      const ORDER_ID = form.get("MERCHANT_ORDER_ID");
      const SIGN = form.get("SIGN");

      if (!MERCHANT_ID || !AMOUNT || !ORDER_ID || !SIGN) {
        return new Response("Bad Request", { status: 400 });
      }

      // Проверка подписи: md5(MERCHANT_ID:AMOUNT:SECRET2:ORDER_ID)
      const expected = await md5(
        `${MERCHANT_ID}:${AMOUNT}:${env.FREEKASSA_SECRET2}:${ORDER_ID}`
      );

      if (expected === SIGN) {
        // TODO: пометить заказ как оплаченный
        return new Response("YES");
      }

      return new Response("Bad sign", { status: 400 });
    }

    return new Response("Not found", { status: 404 });
  },
};
