import app from '#app.js';
import { handle } from '@hono/node-server/vercel';

export default handle(app);
