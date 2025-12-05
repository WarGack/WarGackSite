export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ------------------
    // Главная страница (Список демонов)
    // ------------------
    if (url.pathname === "/") {
      return new Response(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Официальный список сложнейших демонов Geometry Dash</title>
</head>
<body style="font-size: 33px">
<center>
Официальный список сложнейших демонов Geometry Dash:<br><br>
<table border="1" style="font-size: 33px">
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
<br>
<a href=http://youtube.com/WarGack>YouTube</a> | <a href=http://t.me/WarGackChat>Telegram</a> | <a href=http://discord.gg/warnight-net-866417946095386654>Discord</a><br><br>
<a href="/donate">Пожертвовать на развитие</a>
</center>
</body>
</html>
      `, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // ------------------
    // Страница пожертвований (Перенесено с главной)
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
  <br>
  <a href="/">Вернуться к списку демонов</a>
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
      return new Response("<h1>Платёж успешно завершён</h1><p>Спасибо за пожертвование!</p><br><a href='/'>Вернуться на главную</a>", { headers: { "Content-Type":"text/html;charset=UTF-8" } });
    }
    if (url.pathname === "/fail") {
      return new Response("<h1>Платёж не выполнен</h1><p>Оплата была отменена или произошла ошибка.</p><br><a href='/'>Вернуться на главную</a>", { headers: { "Content-Type":"text/html;charset=UTF-8" } });
    }

    return new Response("Not found", { status: 404 });
  }
};
