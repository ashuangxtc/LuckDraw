@echo off
echo 🚀 开始部署到 Vercel...

REM 检查是否安装了 vercel CLI
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI 未安装，正在安装...
    npm install -g vercel
)

REM 构建前端
echo 📦 构建前端...
npm run build

REM 部署到 Vercel
echo 🌐 部署到 Vercel...
vercel --prod

echo ✅ 部署完成！
echo.
echo 📋 请确保在 Vercel 控制台中设置以下环境变量：
echo    - KV_REST_API_URL
echo    - KV_REST_API_TOKEN
echo    - ADMIN_PASSWORD
echo    - NODE_ENV=production
echo.
echo 🔗 部署后的 API 端点：
echo    - GET  /api/health
echo    - POST /api/lottery/join
echo    - POST /api/lottery/draw
echo    - GET  /api/lottery/status
echo    - POST /api/admin/login
echo    - GET  /api/admin/participants
echo.
pause
