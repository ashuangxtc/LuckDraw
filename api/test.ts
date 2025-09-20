import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 基本信息
    const info = {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'undefined'
    };

    // 检查环境变量
    const env = {
      adminPassword: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT_SET',
      kvUrl: process.env.KV_REST_API_URL ? 'SET' : 'NOT_SET',
      kvToken: process.env.KV_REST_API_TOKEN ? 'SET' : 'NOT_SET',
      storageUrl: process.env.STORAGE_URL ? 'SET' : 'NOT_SET',
      storageRestApiUrl: process.env.STORAGE_REST_API_URL ? 'SET' : 'NOT_SET',
      storageRestApiToken: process.env.STORAGE_REST_API_TOKEN ? 'SET' : 'NOT_SET'
    };

    // 测试简单的管理员密码验证
    let authTest = 'NOT_TESTED';
    if (req.query.testAuth === 'true') {
      const testPassword = 'Dreammore123';
      const envPassword = process.env.ADMIN_PASSWORD || 'Dreammore123';
      authTest = testPassword === envPassword ? 'MATCH' : 'NO_MATCH';
    }

    res.json({
      ok: true,
      message: 'Test endpoint working',
      info,
      env,
      authTest
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
