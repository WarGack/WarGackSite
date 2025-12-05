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
      div.innerHTML = `
        <div class="donation-amount">+${d.amount} ₽</div>
        <div>${d.message ? d.message : "<i>Без сообщения</i>"}</div>
        <small>${new Date(d.time).toLocaleString()}</small>
      `;
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
