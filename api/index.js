import app from '#app.js';
import { serve } from '@hono/node-server';

const port = process.env.PORT || 3030;

console.log(`Server is running on port ${port}`);
console.log(`Visit http://localhost:${port}/doc for documentation`);

serve({
  fetch: app.fetch,
  port: Number(port),
});
