import app from '#app.js';
import { serve } from '@hono/node-server';
import { handle } from '@hono/node-server/vercel';

const port = process.env.PORT || 3030;

// Export for Vercel Serverless Functions
export default handle(app);

// Standalone server when executed locally / on a server
if (!process.env.VERCEL) {
  console.log(`Server is running on port ${port}`);
  console.log(`Visit http://localhost:${port}/doc for documentation`);

  serve({
    fetch: app.fetch,
    port: Number(port),
  });
}
