export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {

      const res = await fetch("https://donatepay.ru/api/v1/transactions?access_token=GtbWY4qqxy5HUJWm761Mcq0lSwyBElC41ToR2AXUjSkJBed2idPPKbPIsSaW&status=success&limit=100&type=donation");
      const json = await res.json();
      const list = json.data || [];

      // безопасное экранирование HTML
      const esc = (str) =>
        String(str || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      // строим таблицу
      let rows = list
        .map(
          (d) => `
            <tr>
              <td>${d.id}</td>
              <td>${esc(d.what)}</td>
              <td>${d.sum} ${d.currency}</td>
              <td>${esc(d.comment)}</td>
              <td>${new Date(d.created_at).toLocaleString("ru-RU")}</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <title>Список донатов</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f2f2f7;
              padding: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              border-radius: 10px;
              overflow: hidden;
            }
            th, td {
              padding: 12px 15px;
              border-bottom: 1px solid #ddd;
            }
            th {
              background: #4a90e2;
              color: white;
              text-align: left;
            }
            tr:hover {
              background: #f1f7ff;
            }
          </style>
        </head>
        <body>
          <h2>Последние донаты</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Имя</th>
                <th>Сумма</th>
                <th>Комментарий</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // отдаём статику
    return env.ASSETS.fetch(request);
  },
};
