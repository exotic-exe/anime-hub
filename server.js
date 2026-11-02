/**
 * Anime Hub Scraper Server
 * Launches the full scraping backend from ./api
 * Powered by HiAnime + GogoAnime + MegaCloud scrapers
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.join(__dirname, 'server');
const port = process.env.PORT || '3030';

console.log(`Starting Anime Hub Scraper API on port ${port} from ./api ...`);

const child = spawn(process.execPath, ['index.js'], {
  cwd: apiDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
  },
});

child.on('error', (err) => {
  console.error('Failed to start scraper API:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
