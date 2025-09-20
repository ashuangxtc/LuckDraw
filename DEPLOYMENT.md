# Vercel 部署指南

## 前置条件

1. 安装 Vercel CLI: `npm i -g vercel`
2. 登录 Vercel: `vercel login`

## 部署步骤

### 1. 设置 Vercel KV 数据库

在 Vercel 控制台中：
1. 进入你的项目
2. 点击 "Storage" 选项卡
3. 创建一个新的 KV 数据库
4. 记录数据库的连接信息

### 2. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

```
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
ADMIN_PASSWORD=Dreammore123
NODE_ENV=production
```

### 3. 部署命令

```bash
# 部署到 Vercel
vercel --prod

# 或者通过 Git 自动部署
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

## API 端点

部署后，以下 API 端点将可用：

- `GET /api/health` - 健康检查
- `POST /api/lottery/join` - 加入抽奖
- `POST /api/lottery/draw` - 执行抽奖
- `GET /api/lottery/status` - 获取状态
- `POST /api/lottery/deal` - 发牌
- `POST /api/lottery/pick` - 选牌
- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/logout` - 管理员登出
- `GET /api/admin/me` - 管理员状态
- `POST /api/admin/set-state` - 设置活动状态
- `GET /api/admin/participants` - 获取参与者列表
- `POST /api/admin/reset-all` - 重置所有数据
- `GET/POST /api/lottery/config` - 配置管理

## 前端配置

确保前端的 API 调用指向正确的 Vercel 域名。

## 注意事项

1. Vercel Serverless Functions 有执行时间限制（10秒）
2. 内存限制为 1GB
3. KV 数据库有请求频率限制
4. 确保在生产环境中使用强密码
