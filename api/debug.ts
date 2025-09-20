import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 检查环境变量
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    const debug = {
      kvUrl: kvUrl ? 'SET' : 'NOT_SET',
      kvToken: kvToken ? 'SET' : 'NOT_SET', 
      adminPassword: adminPassword ? 'SET' : 'NOT_SET',
      defaultPassword: process.env.ADMIN_PASSWORD || 'Dreammore123'
    };
    
    // 测试 KV 连接
    let kvTest = 'NOT_TESTED';
    try {
      if (kvUrl && kvToken) {
        const { kv } = await import('@vercel/kv');
        await kv.set('test_key', 'test_value');
        await kv.get('test_key');
        kvTest = 'SUCCESS';
      }
    } catch (error) {
      kvTest = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    res.json({
      ok: true,
      environment: process.env.NODE_ENV || 'development',
      debug,
      kvTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
