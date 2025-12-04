export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/callback") {
      if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
      // Для теста просто отвечаем YES
      return new Response("YES", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("OK");
  }
}
