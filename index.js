export default {
  async fetch(req) {
    const url = new URL(req.url);
    return new Response("OK");
  }
}
