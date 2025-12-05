export default {
  async fetch(request) {
    const url = "https://donatepay.ru/api/v1/transactions?access_token=GtbWY4qqxy5HUJWm761Mcq0lSwyBElC41ToR2AXUjSkJBed2idPPKbPIsSaW&status=success&limit=100&type=donation";

    const response = await fetch(url);
    const data = await response.json();

    let rows = "";

    if (data && data.data) {
      rows = data.data
        .map(item => {
          const name = item.nickname || "Аноним";
          const amount = item.amount;
          const msg = item.comment || "";
          const date = item.created_at;

          return `
            <tr>
              <td>${name}</td>
              <td>${amount}</td>
              <td>${msg}</td>
              <td>${date}</td>
            </tr>
          `;
        })
        .join("");
    }

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<title>Список донатов</title>
<style>
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    background: #f3f3f3;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    background: white;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 10px;
  }
  th {
    background: #eee;
  }
</style>
</head>
<body>
  <h2>Последние донаты DonatePay</h2>
  <table>
    <tr>
      <th>Имя</th>
      <th>Сумма</th>
      <th>Комментарий</th>
      <th>Дата</th>
    </tr>
    ${rows}
  </table>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  },
};
