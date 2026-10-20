import express from 'express';

// Builds a minimal Express app around a router with the same error contract as
// server/index.js, so route tests do not need a database or a running server.
export function buildApp(router) {
  const app = express();

  app.use(express.json({ limit: '256kb' }));
  app.use(router);

  app.use((error, _req, res, _next) => {
    const status = Number(error.status) || 500;
    const payload = {
      error: status >= 500 ? 'Internal server error' : error.message,
    };

    if (status < 500 && error.details !== undefined) {
      payload.details = error.details;
    }

    res.status(status).json(payload);
  });

  return app;
}
