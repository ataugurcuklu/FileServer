import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from 'hono/bun'
import { filesRoute } from "./routes/files";

const app = new Hono();

app.use("*", logger());

app.route("/api/files", filesRoute);

app.use('/files/*', serveStatic({ root: './' }))
app.use('/*', serveStatic({ root: './frontend/dist' }))
app.get('/*', serveStatic({ path: './frontend/dist/index.html' }))

export default app;