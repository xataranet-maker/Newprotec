import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const syncApiPlugin = (): Plugin => {
  const dataDir = path.resolve(__dirname, 'data');
  const storeFile = path.resolve(dataDir, 'local_sync.json');

  const readStore = () => {
    try {
      if (fs.existsSync(storeFile)) {
        const raw = fs.readFileSync(storeFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error reading local sync data:', e);
    }
    return null;
  };

  const writeStore = (data: any) => {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(storeFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing local sync data:', e);
    }
  };

  return {
    name: 'api-sync-handler',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url === '/api/sync' || url.startsWith('/api/sync?') || url.startsWith('/api/sync/')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            const currentData = readStore();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: currentData }));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsed = body ? JSON.parse(body) : {};
                const { action, data } = parsed;

                // Check for KV credentials if configured
                const kvUrl = process.env.KV_REST_API_URL || 
                              process.env.UPSTASH_REDIS_REST_URL || 
                              process.env.KV_URL || 
                              process.env.REDIS_URL;
                const kvToken = process.env.KV_REST_API_TOKEN || 
                                process.env.UPSTASH_REDIS_REST_TOKEN;

                let kvClient: any = null;
                if (kvUrl && kvToken) {
                  try {
                    const { createClient } = await import('@vercel/kv');
                    kvClient = createClient({ url: kvUrl, token: kvToken });
                  } catch (e) {
                    console.warn('KV client init failed, using local storage:', e);
                  }
                }

                const DB_KEY_V2 = 'newprotec_v2_full_state';
                const DB_KEY_V1 = 'newprotec_full_state';

                if (action === 'PUSH') {
                  if (data) {
                    writeStore(data);
                    if (kvClient) {
                      try {
                        await kvClient.set(DB_KEY_V2, data);
                      } catch (err) {
                        console.warn('KV push failed, kept local:', err);
                      }
                    }
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                  return;
                }

                if (action === 'PULL') {
                  let resultData: any = null;
                  if (kvClient) {
                    try {
                      resultData = await kvClient.get(DB_KEY_V2);
                      if (!resultData) {
                        resultData = await kvClient.get(DB_KEY_V1);
                        if (resultData) {
                          await kvClient.set(DB_KEY_V2, resultData);
                        }
                      }
                    } catch (err) {
                      console.warn('KV pull failed, using local store:', err);
                    }
                  }

                  if (!resultData) {
                    resultData = readStore();
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, data: resultData }));
                  return;
                }

                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Hành động không hợp lệ' }));
              } catch (e: any) {
                console.error('Error handling /api/sync request:', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Lỗi máy chủ', message: e?.message }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
};

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), syncApiPlugin()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
