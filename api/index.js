import app from '../server/src/app.js';
import { handle } from 'hono/vercel';

export default handle(app);
