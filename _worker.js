export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      // TODO: Add your custom /api/* logic here.
        const data = await fetch("https://donatepay.ru/api/v1/transactions?access_token=GtbWY4qqxy5HUJWm761Mcq0lSwyBElC41ToR2AXUjSkJBed2idPPKbPIsSaW&status=success&limit=100&type=donation")
  const facts = await data.json();
  return new Response(JSON.stringify(facts), {status: 200})
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },
};
