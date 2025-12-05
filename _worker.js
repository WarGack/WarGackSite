export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // -----------------------------
    //  ROOT PAGE — HTML
    // -----------------------------
    if (url.pathname === "/") {
      return new Response(renderHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // -----------------------------
    // CREATE PAYMENT (POST)
    // -----------------------------
    if (url.pathname === "/create" && request.method === "POST") {
      const form = await request.formData();
      const amount = form.get("amount");
      const message = form.get("message")?.toString().slice(0, 300) || "";

      const merchant_id = env.FREEKASSA_SHOP_ID;
      const secret = env.FREEKASSA_SECRET1;

      const order_id = Date.now().toString();

      // sign = md5(shop_id:amount:secret:order_id)
      const sign = await md5(`${merchant_id}:${amount}:${secret}:${order_id}`);

      const paymentUrl =
        `https://pay.freekassa.ru/?m=${merchant_id}` +
        `&oa=${amount}` +
        `&o=${order_id}` +
        `&s=${sign}` +
        `&us_message=${encodeURIComponent(message)}`;

      return Response.redirect(paymentUrl, 302);
    }

    // -----------------------------
    // FREEKASSA CALLBACK (POST)
    // -----------------------------
    if (url.pathname === "/callback" && request.method === "POST") {
      const form = await request.formData();

      const amount = Number(form.get("AMOUNT"));
      const order_id = form.get("MERCHANT_ORDER_ID");
      const message = form.get("us_message") || "";

      // Save donation in KV
      await env.DONATIONS.put(order_id, JSON.stringify({
        amount,
        message,
        time: Date.now()
      }));

      return new Response("YES");
    }

    // -----------------------------
    // API: all donations
    // -----------------------------
    if (url.pathname === "/api/donations") {
      const list = await loadDonations(env);
      return json(list);
    }

    // -----------------------------
    // API: top 5 latest
    // -----------------------------
    if (url.pathname === "/api/top-latest") {
      const list = await loadDonations(env);
      return json(list.slice(-5).reverse());
    }

    // -----------------------------
    // API: top 5 biggest
    // -----------------------------
    if (url.pathname === "/api/top-biggest") {
      const list = await loadDonations(env);
      const sorted = [...list].sort((a, b) => b.amount - a.amount);
      return json(sorted.slice(0, 5));
    }

    return new Response("Not Found", { status: 404 });
  }
};

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json" }
  });
}

async function loadDonations(env) {
  const keys = await env.DONATIONS.list();
  const arr = [];

  for (const k of keys.keys) {
    const data = await env.DONATIONS.get(k.name, "json");
    if (data) arr.push(data);
  }

  // sort by time
  arr.sort((a, b) => a.time - b.time);
  return arr;
}

async function md5(str) {
  const buf = await crypto.subtle.digest("MD5", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// -----------------------------------------------------
// HTML TEMPLATE
// -----------------------------------------------------

function renderHTML() {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Пожертвования</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 24px; }
  .box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
  input, textarea { width: 100%; padding: 10px; border: 1px solid #aaa; border-radius: 6px; margin: 8px 0; }
  button { padding: 12px 18px; background: #000; color: white; border: none; border-radius: 6px; cursor: pointer; }
  .donation { border-bottom: 1px solid #eee; padding: 10px 0; }
  .amount { font-weight: bold; }
  .gray { color: #555; }
</style>
</head>
<body>

<h1>Пожертвования</h1>

<div class="box">
  <h2>Отправить донат</h2>
  <form action="/create" method="POST">
    <label>Сумма (₽):</label>
    <input type="number" name="amount" min="1" required>

    <label>Сообщение (до 300 символов):</label>
    <textarea name="message" maxlength="300" placeholder="Ваше сообщение..."></textarea>

    <button type="submit">Отправить</button>
  </form>
</div>

<div class="box">
  <h2>Последние 5</h2>
  <div id="latest">Загрузка...</div>
</div>

<div class="box">
  <h2>ТОП-5 самых щедрых</h2>
  <div id="biggest">Загрузка...</div>
</div>

<script>
async function load(id, endpoint) {
  const box = document.getElementById(id);
  try {
    const res = await fetch(endpoint);
    const list = await res.json();

    if (list.length === 0) {
      box.innerHTML = "<i>Пока нет донатов</i>";
      return;
    }

    box.innerHTML = "";
    list.forEach(d => {
      const div = document.createElement("div");
      div.className = "donation";
      div.innerHTML = \`
        <div class="amount">+ \${d.amount} ₽</div>
        <div>\${d.message || "<span class='gray'>Без сообщения</span>"}</div>
        <small class="gray">\${new Date(d.time).toLocaleString()}</small>
      \`;
      box.appendChild(div);
    });
  } catch (e) {
    box.innerHTML = "Ошибка загрузки";
  }
}

load("latest", "/api/top-latest");
load("biggest", "/api/top-biggest");
</script>

</body>
</html>
`;
}
