import app from '../server/src/app.js';
import { handle } from '@hono/node-server/vercel';

export default handle(app);
