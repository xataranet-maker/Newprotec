
import { createClient } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = process.env.KV_REST_API_URL || 
                process.env.UPSTASH_REDIS_REST_URL || 
                process.env.KV_URL || 
                process.env.REDIS_URL;

    const token = process.env.KV_REST_API_TOKEN || 
                  process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return new Response(
        JSON.stringify({ error: 'Chưa cấu hình Database.' }), 
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const kv = createClient({ url, token });

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return new Response(JSON.stringify({ error: 'Dữ liệu không hợp lệ' }), { status: 400 });

    const { action, data } = body;
    const DB_KEY_V2 = 'newprotec_v2_full_state';
    const DB_KEY_V1 = 'newprotec_full_state'; // Khóa cũ của phiên bản trước

    if (action === 'PUSH') {
      if (!data) return new Response(JSON.stringify({ error: 'Dữ liệu trống' }), { status: 400 });
      await kv.set(DB_KEY_V2, data);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } 
    
    if (action === 'PULL') {
      // Logic khôi phục: Thử lấy v2, nếu không có thì lấy v1
      let savedData = await kv.get(DB_KEY_V2);
      
      if (!savedData) {
          console.log('V2 empty, attempting recovery from V1...');
          savedData = await kv.get(DB_KEY_V1);
          if (savedData) {
              // Tự động chuyển dữ liệu v1 sang v2 để đồng bộ hóa
              await kv.set(DB_KEY_V2, savedData);
          }
      }

      return new Response(JSON.stringify({ success: true, data: savedData }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Hành động không hợp lệ' }), { status: 400 });
  } catch (error: any) {
    console.error('KV Sync Error:', error);
    return new Response(JSON.stringify({ error: 'Lỗi hệ thống' }), { 
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
