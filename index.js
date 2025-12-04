addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const data = await fetch("https://donatepay.ru/api/v1/transactions?access_token=GtbWY4qqxy5HUJWm761Mcq0lSwyBElC41ToR2AXUjSkJBed2idPPKbPIsSaW&status=success&limit=100&type=donation")
  const facts = await data.json();
  return new Response(JSON.stringify(facts), {status: 200})
}
