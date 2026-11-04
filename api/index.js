import app from '../server/src/app.js';
import { getRequestListener } from '@hono/node-server';

export default getRequestListener(app.fetch);
