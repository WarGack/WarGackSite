export function onRequest(context) {
  const message = "<strong>Hello, world!</strong>";

  return new Response(message, {
    headers: { 'Content-Type': 'text/html' },
  });
}
