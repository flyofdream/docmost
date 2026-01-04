# AI 功能调试指南

## 问题：404 错误

### 检查步骤

1. **确认服务器已重启**
   ```bash
   # 停止当前服务器（Ctrl+C）
   # 然后重新启动
   pnpm run server:dev
   # 或生产环境
   pnpm run server:start
   ```

2. **检查编译是否成功**
   ```bash
   cd apps/server
   npm run build
   ```
   如果编译失败，修复错误后再重启。

3. **验证路由是否注册**
   启动服务器后，查看日志中是否有：
   ```
   AiController initialized
   ```
   如果没有，说明模块没有正确加载。

4. **测试路由**
   使用 curl 或 Postman 测试：
   ```bash
   # 测试配置端点（需要认证）
   curl -X POST http://localhost:3000/api/ai/test \
     -H "Content-Type: application/json" \
     -H "Cookie: authToken=your-token"
   ```

5. **检查环境变量**
   确保 `.env` 文件中配置了：
   ```env
   AI_DRIVER=openai
   OPENAI_API_KEY=sk-your-deepseek-key
   OPENAI_API_URL=https://api.deepseek.com
   AI_COMPLETION_MODEL=deepseek-chat
   AI_EMBEDDING_MODEL=deepseek-embedding
   AI_EMBEDDING_DIMENSION=1536
   ```
   
   **注意**：如果使用 Deepseek，确保 `OPENAI_API_URL` 设置为 `https://api.deepseek.com`（不带 `/v1` 后缀）。代码会自动处理 URL 格式。

6. **检查浏览器控制台**
   - 打开浏览器开发者工具
   - 查看 Network 标签
   - 找到失败的请求
   - 查看请求 URL 和响应状态

### 常见问题

1. **模块未加载**
   - 检查 `apps/server/src/core/core.module.ts` 中是否导入了 `AiModule`
   - 检查 `apps/server/src/core/ai/ai.module.ts` 是否存在

2. **路由路径不匹配**
   - 前端调用：`/api/ai/generate`
   - 后端路由：`@Controller('ai')` + `@Post('generate')` = `/api/ai/generate`
   - 确保全局前缀是 `api`

3. **认证问题**
   - AI 路由需要 JWT 认证
   - 确保请求中包含有效的 `authToken` cookie

4. **Workspace 检查**
   - 确保 DomainMiddleware 正确设置了 `workspaceId`
   - 检查 `main.ts` 中的 preHandler hook

### 调试端点

已添加测试端点 `/api/ai/test`，可以用来验证路由是否工作。

