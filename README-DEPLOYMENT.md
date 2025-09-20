# 🚀 Vercel 部署指南

## ✅ 已完成的工作

1. **✅ Vercel 配置文件** - 创建了 `vercel.json` 配置文件
2. **✅ API 路由迁移** - 将所有 Express 路由迁移到 Vercel Serverless Functions
3. **✅ 存储层适配** - 使用 Vercel KV 替代内存存储
4. **✅ 环境配置** - 配置了环境变量和部署设置
5. **✅ 前端 API 更新** - 更新了前端 API 调用以支持 Vercel 环境
6. **✅ 构建测试** - 验证了构建过程正常工作

## 📁 文件结构

```
├── api/                        # Vercel Serverless Functions
│   ├── _lib/                   # 共享工具库
│   │   ├── auth.ts             # 管理员认证
│   │   ├── storage.ts          # Vercel KV 存储层
│   │   └── utils.ts            # 工具函数
│   ├── admin/                  # 管理员 API
│   │   ├── login.ts            # 登录
│   │   ├── logout.ts           # 登出
│   │   ├── me.ts               # 获取状态
│   │   ├── participants.ts     # 参与者列表
│   │   ├── reset-all.ts        # 重置所有数据
│   │   ├── reset/[pid].ts      # 重置单个参与者
│   │   └── set-state.ts        # 设置活动状态
│   ├── lottery/                # 抽奖 API
│   │   ├── config.ts           # 配置管理
│   │   ├── deal.ts             # 发牌
│   │   ├── draw.ts             # 抽奖
│   │   ├── join.ts             # 加入抽奖
│   │   ├── pick.ts             # 选牌
│   │   └── status.ts           # 状态查询
│   └── health.ts               # 健康检查
├── vercel.json                 # Vercel 配置
├── deploy.sh                   # Linux/Mac 部署脚本
├── deploy.bat                  # Windows 部署脚本
└── DEPLOYMENT.md               # 部署说明
```

## 🛠️ 部署步骤

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 创建 Vercel KV 数据库

1. 访问 [Vercel 控制台](https://vercel.com/dashboard)
2. 选择你的项目（如果还没有，先创建一个）
3. 进入 "Storage" 选项卡
4. 点击 "Create Database" 
5. 选择 "KV"
6. 创建数据库并记录连接信息

### 4. 设置环境变量

在 Vercel 项目设置中添加以下环境变量：

```
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
ADMIN_PASSWORD=Dreammore123
NODE_ENV=production
```

### 5. 部署

#### 方式一：使用部署脚本

**Windows:**
```cmd
deploy.bat
```

**Linux/Mac:**
```bash
./deploy.sh
```

#### 方式二：手动部署

```bash
# 构建项目
npm run build

# 部署到 Vercel
vercel --prod
```

#### 方式三：Git 自动部署

```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

## 🔗 API 端点

部署后，以下 API 端点将可用：

### 公共 API
- `GET /api/health` - 健康检查
- `POST /api/lottery/join` - 加入抽奖
- `POST /api/lottery/draw` - 执行抽奖
- `GET /api/lottery/status` - 获取活动状态
- `POST /api/lottery/deal` - 发牌
- `POST /api/lottery/pick` - 选牌
- `GET /api/lottery/config` - 获取配置

### 管理员 API
- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/logout` - 管理员登出
- `GET /api/admin/me` - 获取管理员状态
- `POST /api/admin/set-state` - 设置活动状态
- `GET /api/admin/participants` - 获取参与者列表
- `POST /api/admin/reset-all` - 重置所有数据
- `POST /api/admin/reset/[pid]` - 重置单个参与者
- `POST /api/lottery/config` - 更新配置（需要管理员权限）

## 🔧 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: Vercel Serverless Functions
- **存储**: Vercel KV (Redis)
- **部署**: Vercel
- **认证**: Cookie-based sessions

## ⚠️ 注意事项

1. **执行时间限制**: Vercel Serverless Functions 有 10 秒执行时间限制
2. **内存限制**: 配置为 1GB 内存
3. **并发限制**: Vercel KV 有请求频率限制
4. **安全性**: 确保在生产环境中使用强密码
5. **CORS**: 已配置支持跨域请求

## 🐛 故障排除

### 构建错误
- 确保所有依赖都已安装：`npm install`
- 检查 TypeScript 错误：`npm run check`

### 部署错误
- 检查环境变量是否正确设置
- 验证 Vercel KV 数据库连接
- 查看 Vercel 部署日志

### API 错误
- 检查 `/api/health` 端点是否响应
- 验证管理员密码是否正确
- 查看浏览器开发者工具的网络请求

## 📞 支持

如果遇到问题，请检查：
1. Vercel 部署日志
2. 浏览器开发者工具
3. API 响应错误信息

## 🎉 部署成功后

1. 访问你的 Vercel 域名
2. 测试抽奖功能
3. 使用管理员密码登录后台
4. 验证所有功能正常工作

恭喜！你的麻将抽奖应用已成功部署到 Vercel！🎊
