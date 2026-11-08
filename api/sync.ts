
import { createClient } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const DB_KEY_V2 = 'newprotec_v2_full_state';
const DB_KEY_V1 = 'newprotec_full_state';
const LEGACY_KEYS = [DB_KEY_V2, DB_KEY_V1, 'newprotec_state', 'newprotec_data'];

function parseSafe(val: any) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

async function kvGet(client: any, url: string, token: string, key: string) {
  if (client) {
    try {
      const res = await client.get(key);
      if (res !== null && res !== undefined) return parseSafe(res);
    } catch (e) {
      console.warn(`KV client get failed for ${key}, trying REST API:`, e);
    }
  }

  try {
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const res = await fetch(`${cleanUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.result !== undefined && json.result !== null) {
        return parseSafe(json.result);
      }
    }
  } catch (err) {
    console.warn(`REST get failed for ${key}:`, err);
  }
  return null;
}

async function kvSet(client: any, url: string, token: string, key: string, value: any) {
  let done = false;
  if (client) {
    try {
      await client.set(key, value);
      done = true;
    } catch (e) {
      console.warn(`KV client set failed for ${key}, falling back to REST:`, e);
    }
  }

  if (!done) {
    try {
      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const payload = typeof value === 'string' ? value : JSON.stringify(value);
      await fetch(`${cleanUrl}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      });
    } catch (err) {
      console.warn(`REST set failed for ${key}:`, err);
    }
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const getEnv = (name: string): string | undefined => {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[name];
      }
      return undefined;
    };

    const rawUrl = getEnv('KV_REST_API_URL') || 
                   getEnv('UPSTASH_REDIS_REST_URL') || 
                   getEnv('VITE_KV_REST_API_URL') || 
                   getEnv('VITE_UPSTASH_REDIS_REST_URL') ||
                   (getEnv('KV_URL')?.startsWith('https://') ? getEnv('KV_URL') : undefined);

    const token = getEnv('KV_REST_API_TOKEN') || 
                  getEnv('UPSTASH_REDIS_REST_TOKEN') ||
                  getEnv('VITE_KV_REST_API_TOKEN') ||
                  getEnv('VITE_UPSTASH_REDIS_REST_TOKEN');

    const isValidKvUrl = (u?: string): boolean => {
      if (!u || typeof u !== 'string') return false;
      const trimmed = u.trim();
      return (trimmed.startsWith('https://') || trimmed.startsWith('http://')) && 
             !trimmed.includes('your-kv-instance') && 
             trimmed.length > 10;
    };

    if (!isValidKvUrl(rawUrl) || !token || token.trim().length <= 10) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Chưa cấu hình biến môi trường Vercel KV / Upstash Redis hợp lệ (URL phải bắt đầu bằng https://).',
          missingCredentials: true 
        }), 
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const url = rawUrl.trim();
    let kv: any = null;
    try {
      kv = createClient({ url, token: token.trim() });
    } catch {
      // REST fallback will be used
    }

    if (req.method === 'GET') {
      let savedData: any = null;
      for (const k of LEGACY_KEYS) {
        savedData = await kvGet(kv, url, token, k);
        if (savedData) {
          if (k !== DB_KEY_V2) {
            await kvSet(kv, url, token, DB_KEY_V2, savedData);
          }
          break;
        }
      }

      return new Response(JSON.stringify({ success: true, data: savedData }), {
        status: 200,
        headers: CORS_HEADERS,
      });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body) {
        return new Response(JSON.stringify({ success: false, error: 'Dữ liệu không hợp lệ' }), {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      const { action, data } = body;

      if (action === 'PUSH') {
        if (!data) {
          return new Response(JSON.stringify({ success: false, error: 'Dữ liệu trống' }), {
            status: 400,
            headers: CORS_HEADERS,
          });
        }
        // Save to V2 and keep V1 updated for backward compatibility
        await Promise.allSettled([
          kvSet(kv, url, token, DB_KEY_V2, data),
          kvSet(kv, url, token, DB_KEY_V1, data),
        ]);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      if (action === 'PULL') {
        let savedData: any = null;
        for (const k of LEGACY_KEYS) {
          savedData = await kvGet(kv, url, token, k);
          if (savedData) {
            if (k !== DB_KEY_V2) {
              await kvSet(kv, url, token, DB_KEY_V2, savedData);
            }
            break;
          }
        }

        return new Response(JSON.stringify({ success: true, data: savedData }), {
          status: 200,
          headers: CORS_HEADERS,
        });
      }

      return new Response(JSON.stringify({ success: false, error: 'Hành động không hợp lệ' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Phương thức không hỗ trợ' }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  } catch (error: any) {
    console.error('KV Sync Error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Lỗi hệ thống' }), { 
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

