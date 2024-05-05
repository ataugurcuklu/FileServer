import app from "./app";

const port = 80;

Bun.serve({
  hostname: "0.0.0.0",
  port: port,
  fetch: app.fetch,
  maxRequestBodySize: 1024 * 1024 * 10000,
});
console.log(`Server running on http://localhost:${port}`);
