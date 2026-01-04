# AI 路由检查清单

## 问题：404 错误

### 已完成的检查
✅ AI 模块文件存在
✅ AI 控制器文件存在  
✅ AI 服务文件存在
✅ CoreModule 中已导入 AiModule
✅ 路由装饰器正确 (@Controller('ai'), @Post('ask'))

### 需要验证的步骤

#### 1. 检查后端服务器是否运行
```bash
# 检查端口 3000 是否被占用
lsof -i :3000

# 或者测试健康检查
curl http://localhost:3000/api/health
```

#### 2. 检查后端启动日志
启动后端服务器时，查看日志中是否有：
- `AiController initialized` - 说明控制器已加载
- 任何错误信息

#### 3. 检查编译
```bash
cd apps/server
npm run build
# 检查是否有编译错误
```

#### 4. 测试路由（需要认证）
```bash
# 先登录获取 token，然后测试
curl -X POST http://localhost:3000/api/ai/test \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=your-token"
```

#### 5. 检查环境变量
确保 `.env` 文件中有：
```env
APP_URL=http://localhost:3000
AI_DRIVER=openai
OPENAI_API_KEY=sk-...
OPENAI_API_URL=https://api.deepseek.com
AI_COMPLETION_MODEL=deepseek-chat
```

#### 6. 检查前端代理
确保前端服务器已重启，Vite 配置已生效。

### 常见问题

1. **服务器未重启** - 新模块需要重启才能加载
2. **编译错误** - 检查 TypeScript 编译是否有错误
3. **模块未加载** - 检查启动日志中是否有 "AiController initialized"
4. **路由路径错误** - 确保请求路径是 `/api/ai/ask` 而不是其他路径

