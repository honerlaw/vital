// Self-hosted entry for VITAL's Expo Router server export.
//
// `expo export -p web` (with web.output: "server") emits:
//   dist/client  — static assets + pre-rendered HTML
//   dist/server  — API route + SSR handlers, mounted via the expo-server adapter
//
// This file is intentionally CommonJS `.js` so it stays under the lenient base lint
// rather than the strict TypeScript guardrails (see .minerva/knowledge). It is the
// process DigitalOcean App Platform runs via `npm run serve`.

const path = require('path');
const express = require('express');
const compression = require('compression');
const { createRequestHandler } = require('expo-server/adapter/express');

const CLIENT_BUILD_DIR = path.join(process.cwd(), 'dist/client');
const SERVER_BUILD_DIR = path.join(process.cwd(), 'dist/server');

const app = express();

app.disable('x-powered-by');
app.use(compression());

// Static client assets first, so hashed bundles/images are served directly and do
// not fall through to the SSR handler.
app.use(express.static(CLIENT_BUILD_DIR, { maxAge: '1h', extensions: ['html'] }));

// Terminal catch-all: every unmatched request (routes + /api/*) goes to the Expo
// server handler. `app.use(handler)` is used instead of `app.all('*', handler)` so it
// works on both Express 4 and Express 5 (whose path matcher rejects a bare '*').
app.use(createRequestHandler({ build: SERVER_BUILD_DIR }));

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`VITAL server listening on port ${port}`);
});
