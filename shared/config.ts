// 配置文件 - 处理不同环境的API基础URL

export const getApiBase = (): string => {
  // 在浏览器环境中
  if (typeof window !== 'undefined') {
    // 开发环境
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return ''; // 使用 Vite 代理
    }
    
    // 生产环境 - Vercel部署
    if (window.location.hostname.includes('vercel.app')) {
      return ''; // 相对路径，使用同域名
    }
    
    // 其他生产环境
    return ''; // 默认使用相对路径
  }
  
  // 服务器端渲染环境
  return process.env.API_BASE_URL || '';
};

export const config = {
  apiBase: getApiBase(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};
