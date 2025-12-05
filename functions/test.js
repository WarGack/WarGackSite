export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/callback') {
      if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      return new Response('YES', { headers: { 'Content-Type': 'text/plain' }});
    }
    if (url.pathname === '/success') {
      return new Response('<html><body><h1>Оплата успешна</h1></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8' }});
    }
    return new Response('OK');
  }
}
