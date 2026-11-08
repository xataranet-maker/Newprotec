import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const syncApiPlugin = (env: Record<string, string>): Plugin => {
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

  const getEnv = (name: string): string | undefined => {
    return env[name] || process.env[name];
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

          const rawKvUrl = getEnv('KV_REST_API_URL') || 
                           getEnv('UPSTASH_REDIS_REST_URL') || 
                           getEnv('VITE_KV_REST_API_URL') || 
                           getEnv('VITE_UPSTASH_REDIS_REST_URL') ||
                           (getEnv('KV_URL')?.startsWith('https://') ? getEnv('KV_URL') : undefined);

          const kvToken = getEnv('KV_REST_API_TOKEN') || 
                          getEnv('UPSTASH_REDIS_REST_TOKEN') ||
                          getEnv('VITE_KV_REST_API_TOKEN') ||
                          getEnv('VITE_UPSTASH_REDIS_REST_TOKEN');

          const isValidKvUrl = (url?: string): boolean => {
            if (!url || typeof url !== 'string') return false;
            const trimmed = url.trim();
            return (trimmed.startsWith('https://') || trimmed.startsWith('http://')) && 
                   !trimmed.includes('your-kv-instance') && 
                   trimmed.length > 10;
          };

          let kvClient: any = null;
          if (isValidKvUrl(rawKvUrl) && kvToken && kvToken.trim().length > 10) {
            try {
              const { createClient } = await import('@vercel/kv');
              kvClient = createClient({ url: rawKvUrl!.trim(), token: kvToken.trim() });
            } catch {
              // Silently fallback to local store without polluting logs
            }
          }

          const DB_KEY_V2 = 'newprotec_v2_full_state';
          const DB_KEY_V1 = 'newprotec_full_state';
          const LEGACY_KEYS = [DB_KEY_V2, DB_KEY_V1, 'newprotec_state', 'newprotec_data'];

          if (req.method === 'GET') {
            let resultData: any = null;
            if (kvClient) {
              for (const k of LEGACY_KEYS) {
                try {
                  const val = await kvClient.get(k);
                  if (val !== null && val !== undefined) {
                    resultData = typeof val === 'string' ? JSON.parse(val) : val;
                    break;
                  }
                } catch {}
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

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const parsed = body ? JSON.parse(body) : {};
                const { action, data } = parsed;

                if (action === 'PUSH') {
                  if (data) {
                    writeStore(data);
                    if (kvClient) {
                      try {
                        await Promise.allSettled([
                          kvClient.set(DB_KEY_V2, data),
                          kvClient.set(DB_KEY_V1, data),
                        ]);
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
                    for (const k of LEGACY_KEYS) {
                      try {
                        const val = await kvClient.get(k);
                        if (val !== null && val !== undefined) {
                          resultData = typeof val === 'string' ? JSON.parse(val) : val;
                          if (k !== DB_KEY_V2) {
                            await kvClient.set(DB_KEY_V2, resultData).catch(() => {});
                          }
                          break;
                        }
                      } catch (err) {
                        console.warn(`KV pull failed for ${k}:`, err);
                      }
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
                res.end(JSON.stringify({ success: false, error: 'Hành động không hợp lệ' }));
              } catch (e: any) {
                console.error('Error handling /api/sync request:', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Lỗi máy chủ', message: e?.message }));
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), syncApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

