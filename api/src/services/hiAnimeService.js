import { spawn } from 'child_process';
import axios from 'axios';
import https from 'https';
import config from '#config/config';

const agent = new https.Agent({ rejectUnauthorized: false });

export const hiAnimeService = {
    async fetchWithAxios(url, headers = {}) {
        try {
            console.log(`HiAnime Axios Fetching: ${url}`);
            const res = await axios.get(url, {
                httpsAgent: agent,
                headers: {
                    ...config.headers,
                    ...headers
                },
                timeout: 30000 // Increased to 30s
            });
            return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        } catch (err) {
            console.warn(`Axios fetch failed for ${url}: ${err.message}`);
            throw err;
        }
    },

    async fetchWithCurl(url, headers = {}, retries = 3) {
        // Try Axios first as it's more reliable for SSL on this system
        try {
            return await this.fetchWithAxios(url, headers);
        } catch (axiosErr) {
            console.log(`Axios failed, falling back to Curl for ${url}`);
        }

        let lastError = null;
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`HiAnime Curl Fetching (Attempt ${i + 1}): ${url}`);

                const allHeaders = {
                    ...config.headers,
                    ...headers
                };

                const args = ['-s', '-L', '-k', '--ssl-no-revoke', '--connect-timeout', '15', '--max-time', '30'];

                for (const [key, value] of Object.entries(allHeaders)) {
                    args.push('-H', `${key}: ${value}`);
                }

                args.push(url);

                const result = await new Promise((resolve, reject) => {
                    const child = spawn('curl', args);
                    let stdout = '';
                    let stderr = '';

                    child.stdout.on('data', (data) => { stdout += data.toString(); });
                    child.stderr.on('data', (data) => { stderr += data.toString(); });
                    child.on('error', reject);
                    child.on('close', (code) => {
                        resolve({ stdout, stderr, status: code });
                    });
                });

                if (result.status === 0) return result.stdout;
                lastError = new Error(`Curl failed with code ${result.status}: ${result.stderr}`);
            } catch (err) {
                lastError = err;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
        throw lastError;
    },

    async fetchPage(path) {
        const url = path.startsWith('http') ? path : `${config.baseurl}${path}`;
        return await this.fetchWithCurl(url);
    },

    async fetchAjax(path) {
        const url = path.startsWith('/ajax') ? `${config.baseurl}${path}` : `${config.baseurl}/ajax/v2/${path}`;
        console.log(`HiAnime AJAX Fetching: ${url}`);
        try {
            // Try Axios directly for AJAX as it's preferred
            const res = await axios.get(url, {
                httpsAgent: agent,
                headers: {
                    ...config.headers,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 30000 // Increased to 30s
            });
            console.log(`HiAnime AJAX Success for ${url}`);
            return res.data;
        } catch (err) {
            console.warn(`Axios Ajax failed for ${url}: ${err.message}`);
            const output = await this.fetchWithCurl(url, {
                'X-Requested-With': 'XMLHttpRequest'
            });
            try {
                return JSON.parse(output);
            } catch (parseErr) {
                return { html: output, status: output.includes('nav-item') };
            }
        }
    }
};
