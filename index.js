import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { setupSwagger } from './_extras/api-docs/swagger.js';
import { errorHandler } from './src/utils/_errors.js';
import { authRouter } from './src/routes/authRoutes.js';
import { sessionRouter } from './src/routes/sessionRoutes.js';
import { userRouter } from './src/routes/userRoutes.js';
import { crateRouter } from './src/routes/crateRoutes.js';
import { itemRouter } from './src/routes/itemRoutes.js';
import { inventoryRouter } from './src/routes/inventoryRoutes.js';

const app = express();

// Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      },
    },
  }),
);

// No cors() middleware — the frontend and API are served from the same
// origin (express.static('src/frontend') alongside the /api routes below),
// so there is no cross-origin request to permit in the first place. With no
// CORS headers set, the browser's own default behavior already blocks any
// cross-origin request from reading the response — at least as restrictive
// as a narrowly-configured allowlist would have been, without the extra
// dependency.

app.use(cookieParser());
app.use(express.json());
app.use(express.static('src/frontend'));

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/users', userRouter);
app.use('/api/crates', crateRouter);
app.use('/api/items', itemRouter);
app.use('/api/inventory', inventoryRouter);

// Add your routes here — before the error handler, like this:
// app.use('/api/your-resource', yourRoutes);

// Swagger API docs
await setupSwagger(app);

// Global error handler (must be last)
app.use(errorHandler);

// Only listen when run directly (not imported for testing)
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API docs at http://localhost:${PORT}/api-docs`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Try a different port by setting the PORT environment variable.`);
      process.exit(1);
    }
    throw err;
  });
}

export default app;