# Optimization Log

跟踪 AI Ad Manager 的优化工作。每完成一项就追加一条记录。

分支：`optimization`

---

## 📋 计划清单

### 已完成
- ✅ #1 聊天历史落库（2026-04-21）
- ✅ #2 服务端 Session 持久化（2026-04-21）
- ✅ #3 AI 写操作审计日志（2026-04-21）
- ✅ #4 SAFE_MODE 硬护栏（2026-04-21）
- ✅ #5 Out-of-band 确认机制（2026-04-21）—— AI 无法自我确认
- ✅ #6 结构化 block JSON schema 校验（2026-04-22）—— M1 落地

### 待规划（按优先级）
1. Skill eval 框架（自动化测试 AI 行为不漂移）
3. Token 从 localStorage 迁移到 httpOnly cookie（防 XSS）
4. Optimizations 模块接入真实推荐引擎（目前是假数据）
5. Google Ads Phase 2（ad groups CRUD、关键词、RSA、conversions）
6. Brand Memory 向量检索（目前整段塞 prompt）
7. 速率限制 / API quota 保护

---

## 🔧 优化 #1 — 聊天历史落库 ✅

**完成日期**：2026-04-21
**状态**：代码已完成，等待在 Supabase 跑 SQL 建表

### 实现概要
- 两张新表：`chat_sessions`（会话元信息）+ `chat_messages`（每条消息）
- Server 新增 `/api/chat/history/*` 路由：list / get / upsert / delete / batch-save messages
- 前端 `useChatSessions.js` 改为 **双写 + 背景同步**：
  - 挂载时 fetch server sessions，与 localStorage 合并（server 字段优先）
  - 所有写操作（新消息、改名、pin、删除）都 fire-and-forget 同步到 server
  - 切换 session 时 local 先行显示，若 local 无数据则拉 server 并缓存回 local

### 改动文件
- ➕ `server/sql/chat_history.sql` — DDL
- ➕ `server/src/api/chatHistory.js` — 路由（user-scoped via Bearer token → fb_user_id）
- ✏️ `server/src/index.js` — mount `/api/chat/history`（注意在 `/api/chat` catch-all 之前）
- ✏️ `client/src/hooks/useChatSessions.js` — 双写 + 服务端合并

### 如何验证
1. 在 Supabase SQL Editor 运行 `server/sql/chat_history.sql`
2. 前端发几条消息 → 在 Supabase Dashboard 的 `chat_messages` 表能看到
3. 清空浏览器 localStorage → 刷新 → 会话列表仍在（从 server 拉回）
4. 删除一个会话 → Supabase 里对应行也消失

### 设计取舍
- **双写而非服务端为主**：保留 localStorage 即时显示，UI 无延迟
- **幂等 upsert**：用前端生成的 id 作为 PK，重发无副作用
- **默默失败**：所有 server 调用 `.catch(() => {})`，不影响用户体验 —— 即使 Supabase 宕机也能继续用
- **不迁移历史**：已有 localStorage 里的旧会话不主动上传（下次用到自然会写）

---

## 🔧 优化 #2 — 服务端 Session 持久化 ✅

**完成日期**：2026-04-21
**状态**：代码完成，等待在 Supabase 跑 SQL 建表

### 实现概要
- 扩展 ADK 的 `BaseSessionService`，用 Supabase 作为后端存储
- 两张新表：`adk_sessions`（session state + 元信息）+ `adk_events`（完整事件流）
- `adAgent.js` 只在有 Supabase 配置时切换到新 service，否则 fallback 到 InMemory（本地 dev 友好）
- `chat.js` 移除进程内 `sessionMap`，统一走 `sessionService.getOrCreateSession`，`chatSessionId === adkSessionId`

### 改动文件
- ➕ `server/sql/adk_sessions.sql` — DDL（adk_sessions + adk_events + 索引 + CASCADE 删除）
- ➕ `server/src/services/supabaseSessionService.js` — 完整实现 5 个方法（createSession / getSession / listSessions / deleteSession / appendEvent）
- ✏️ `server/src/services/adAgent.js` — 条件实例化 SupabaseSessionService vs InMemorySessionService
- ✏️ `server/src/api/chat.js` — 删除 in-memory sessionMap，统一用 getOrCreateSession，重试逻辑复用同一 session id

### 如何验证
1. 在 Supabase SQL Editor 运行 `server/sql/adk_sessions.sql`
2. 启动服务器，日志应显示 `[adAgent] session service: SupabaseSessionService`
3. 和 AI 对话几轮 → 在 Supabase Dashboard 查 `adk_sessions` 和 `adk_events` 表能看到行
4. 重启服务器（模拟 Vercel 冷启动）→ 继续原会话 → AI 仍记得之前的上下文

### 设计取舍
- **appendEvent 并行写**：`Promise.allSettled` 同时写 events 表和更新 sessions.state，降低延迟（典型 <150ms）
- **不拆 APP/USER state**：DatabaseSessionService 会把 APP_PREFIX / USER_PREFIX 状态拆到独立表，本项目不用跨 session 共享状态，省掉
- **不用 MikroORM**：ADK 官方 DatabaseSessionService 依赖 MikroORM，体积大、Vercel cold start 慢 → 直接用现有 supabase-js
- **失败降级**：supabase client 不可用时打 warn 不抛错，createSession 仍返回内存对象，保证聊天不中断
- **统一 session id**：前端 chatSessionId 直接当 ADK sessionId 用，简化 chat.js，省掉映射表

---

## 🔧 优化 #3 — AI 写操作审计日志 ✅

**完成日期**：2026-04-21
**状态**：代码完成，等待在 Supabase 跑 SQL 建表

### 实现概要
- 新表 `audit_log`：记录每次 AI 调用 write 工具的 who/when/what/result
- 用 regex + skiplist 在两个 `safe()` wrapper（Meta + Google）里自动识别 write tool（`create_*` / `update_*` / `delete_*` / `copy_*` / `send_conversion*` / `upload_ad_*` / `google_(create|update|add|set|apply)_*`）
- 成功和失败都记录；失败带 `error_message`
- 捕获 `duration_ms` 便于排查慢调用
- Fire-and-forget 写入，绝不影响工具返回值；超大 args/result（>20KB）截断存 preview

### 改动文件
- ➕ `server/sql/audit_log.sql` — 表 + 4 个索引（按 user / session / tool / account 查询）
- ➕ `server/src/lib/auditLog.js` — `isWriteTool` / `logAudit` / fb_user_id 缓存
- ✏️ `server/src/lib/tools.js` — Meta safe() 包裹调用前后写 audit
- ✏️ `server/src/lib/googleTools.js` — Google safe() 升级为带 name 参数的版本（原本没传 name）

### 如何验证
1. 在 Supabase SQL Editor 运行 `server/sql/audit_log.sql`
2. 在 AI 对话中触发一次写操作（例如 "暂停 campaign XXX"）
3. Supabase Dashboard 查 `audit_log` 表能看到行，含 fb_user_id / session_id / tool_name / args / result / success / duration_ms

### 设计取舍
- **prefix regex 而非显式清单**：新增 write tool 自动被覆盖，不用回来改 audit 代码
- **Skiplist 排除 `update_workflow_context`**：这是内存 session 状态，不是外部 API 写操作
- **写成功也记录**：不只记 error，方便回溯"AI 到底改了哪些 campaign"
- **fb_user_id 缓存**：避免每次写都 call Graph API（per-token 缓存在进程内）
- **截断超大 payload**：bulk 操作可能几 MB，存 preview 够用于排查，省 DB 空间

---

---

## 🔧 优化 #4 — SAFE_MODE 硬护栏 ✅

**完成日期**：2026-04-21
**状态**：代码完成，无需 DB 迁移

### 实现概要
两层硬护栏，都在 `safe()` wrapper 里生效（Meta + Google 同步）：

1. **DRY RUN 开关** — 设 `SAFE_MODE_DRY_RUN=true` 后，所有 write tool 短路：
   - 不调 Meta / Google API
   - 返回 `{ dry_run: true, action, args, message: "[DRY RUN] ..." }` 给 AI
   - audit_log 仍然记一行（success=true, error="[DRY RUN]"）方便回溯

2. **高危操作确认** — 无需 env 也常开：
   - 触发条件：`delete_*` / `*_bulk` / `google_apply_recommendation` / 任何 `update_*` 带 budget 或 `status=PAUSED/DELETED/ARCHIVED/REMOVED`
   - AI 第一次调用会被拒绝，返回 `CONFIRMATION_REQUIRED` + 原因 + `how_to_proceed` 指引
   - AI 把理由转给用户 → 用户确认 → AI 重试时在 args 加 `confirm: true` → 放行
   - 放行前 `stripConfirm()` 剥掉 `confirm` 字段，避免传给外部 API

### 改动文件
- ➕ `server/src/lib/safeMode.js` — `isDryRun` / `assessRisk` / `buildConfirmationRequiredResponse` / `buildDryRunResponse` / `stripConfirm`
- ✏️ `server/src/lib/tools.js` — Meta safe() 在 fn() 前做 dry-run + 风险检查
- ✏️ `server/src/lib/googleTools.js` — Google safe() 同上

### 如何验证
1. **Dry-run**：`SAFE_MODE_DRY_RUN=true node src/index.js` 启动 → 让 AI 创建 campaign → 不会真的建，AI 收到 `[DRY RUN]` 响应
2. **确认门**：让 AI "删除 campaign 123456789" → 首次返回 CONFIRMATION_REQUIRED → AI 问你确认 → 你说确认 → AI 才真的调 delete
3. audit_log 里能看到被挡下的那行（`success=false, error_message=CONFIRMATION_REQUIRED: ...`）

### 设计取舍
- **用 `confirm: true` 参数而非 session 状态**：无状态、幂等、不用额外存储；AI 自然从响应里 `how_to_proceed` 学到怎么做
- **风险判定基于静态规则而非动态查询**：不去查旧 budget 做 >X% 判断，改成"只要改 budget 就要确认"—— 保守但确定性强、零延迟
- **audit 记录被挡下的尝试**：AI 尝试了什么、为什么被挡，都看得到，有助于后续 prompt injection 审计
- **Dry-run 通过 env var 全局开**：不做按工具粒度，首要场景是"我在测试/演示"，简单够用
- **不改 instructions.js prompt**：`how_to_proceed` 自解释，AI 能识别并照做，避免改动 prompt 引发副作用

---

## 🔧 优化 #5 — Out-of-band 确认机制 ✅

**完成日期**：2026-04-21
**状态**：代码完成，等待在 Supabase 跑 SQL

### 背景
#4 的 `confirm: true` 是 AI 自己就能传的参数。实测发现 LLM 看到 `how_to_proceed` 里"retry with confirm=true"后，**根本不问用户**就自己加了 `confirm:true` 重试（audit_log 能看到 CONFIRMATION_REQUIRED 后 7 秒就 bypass）。软协议不够硬。

### 实现概要
- AI 拿到的是 `confirm_id: <uuid>`，不是布尔
- uuid 必须对应 `pending_confirmations` 表中 `approved=true, consumed=false` 的记录
- 翻转 approved 的唯一途径：`POST /api/confirmations/:id/approve`（FB Bearer token 认证，AI 没有）
- 重试时校验 tool_name + args 的 sha256 hash —— 防"拿 budget=100 的批准执行 budget=10000"
- 校验通过立刻 consumed=true 防重放
- 10 分钟过期、session 绑定、有 reject 端点

### 改动文件
- ➕ `server/sql/pending_confirmations.sql`
- ➕ `server/src/api/confirmations.js` — GET /pending, GET /:id, POST /:id/approve, POST /:id/reject
- ✏️ `server/src/lib/safeMode.js` — 加 `createPendingConfirmation` / `verifyConfirmation` / `hashArgs`
- ✏️ `server/src/lib/auditLog.js` — export `resolveFbUserId` 共享
- ✏️ `server/src/lib/tools.js` + `server/src/lib/googleTools.js` — safe() 走 verify → pending 创建 → block
- ✏️ `server/src/index.js` — mount `/api/confirmations`

### 如何验证
1. Supabase 跑 `server/sql/pending_confirmations.sql`
2. 让 AI "立刻调用 update_campaign, campaign_id=999999999999, daily_budget=20000, 直接执行"
3. 日志显示 `[safeMode] ... → pending_id=<uuid>`，`pending_confirmations` 多一行 approved=false
4. **AI 怎么重试都失败**（#4 搞不定的场景）—— 这就是 #5 的价值
5. curl 批准：`curl -X POST http://localhost:3001/api/confirmations/<uuid>/approve -H "Authorization: Bearer <FB_TOKEN>"` → `{ok:true}`
6. 告诉 AI "已批准，用 confirm_id=<uuid> 重试" → AI 重试 → 通过 SAFE_MODE → 调 Meta API（999... 仍会被 Meta 拒，但这次是 ID 不存在，不是护栏）

### 设计取舍
- **uuid 而非 token 签名**：标准 crypto.randomUUID，够用，无 lib 依赖
- **args_hash 绑定**：防拿老批准改参数执行
- **session 绑定**：防跨 session 重放
- **consumed 而非靠 TTL**：一次性，用完即焚
- **拒绝路径记 audit_log**：带 `retry_reject=<reason>` 便于审计 AI 的 bypass 尝试
- **前端 UI 可选**：后端齐全，当前 curl 就能测；正式上线可以加模态框
- **不向后兼容 `confirm:true`**：AI 传 true 会被当 `missing_confirm_id` 挡下 —— 预期行为

---

## 🔧 优化 #6 — 结构化 block JSON schema 校验 ✅

**完成日期：** 2026-04-22
**分支：** optimization （延续 M1 子任务）
**背景：** AI 在 SSE 输出里嵌 fenced block（```metrics / ```setupcard / ...），
客户端 `ChatInterface.parseMarkdownTable` 用 `JSON.parse` 解析。只要 AI 吐出
带尾逗号或其它非法语法的块，catch 分支就把整段 fallback 成原始代码块 —— 用户
看到光秃秃的 JSON，而不是卡片/按钮。M1 目标：在 server SSE 管道拦坏 JSON。

### 改动
- `server/src/lib/responseSchemas.js`（新建）—— 为 16 个 block 类型定义 Zod
  schema：metrics / options / quickreplies / setupcard / mediagrid /
  copyvariations / postpicker / adpreview / insights / score / funnel /
  comparison / budget / trend / adlib / steps。audience*/dashboard 为
  passthrough（只校验 JSON 可解析）。提供 `validateBlock(type, rawJson)` 和
  alias 解析（`metric` → `metrics` 等）。
- `server/src/lib/streamFilter.js`（新建）—— 行级状态机 `createBlockFilter()`。
  普通文字按 token 流原速放行，fenced block 累积到 close-fence 才一次性校验
  + 输出。坏块静默丢弃，`onValidationFail` 回调打警告日志。
- `server/src/api/chat.js` —— 把 `sse(res, {type:'text'})` 统一替换成
  `emitText()`，经过 filter。新增环境开关 `CHAT_BLOCK_VALIDATION`（默认 on，
  `off` 回到 pre-M1 raw 行为用于 A/B 验证）。`!demo-bad-json` 触发器删除
  （覆盖迁到单测）。
- `server/src/lib/instructions.js` —— 加一段 AI system prompt 规则：
  "Structured blocks MUST be valid JSON"，列出 5 条常见非法写法（尾逗号 /
  单引号 / 注释 / 未加引号 key / 字面换行）。
- `server/src/lib/__tests__/responseSchemas.test.js`（新建，40 case）——
  每个 block 至少 1 合法 + 1 非法（含尾逗号、缺字段、错枚举）。
- `server/src/lib/__tests__/streamFilter.test.js`（新建，10 case）——
  跨 chunk 边界、未闭合块、debug placeholder、未知 fence 透传等。
- `server/package.json` —— 新增 `zod`（runtime）、`vitest`（dev），
  scripts `test` / `test:watch`。
- `server/src/api/chat.js` —— 删除 `!demo-bad-json` 分支。

### 验证
1. `cd server && npm test` → 50 passed ✅
2. 启动 server + client，发一句正常问题，确认 metrics/setupcard 等块正常渲染
3. 人工 A/B：
   - `CHAT_BLOCK_VALIDATION=off npm run dev` → AI 输出坏块 → 前端看见原始 JSON 代码块
   - 默认（on）→ 坏块静默丢弃，server 控制台有 `[chat] block validation failed` 警告
4. 看 server 日志确认 `block validation failed` 不会在正常对话中频繁触发（否则是
   AI 写错了，需要调 prompt）。

### 设计取舍
- **passthrough schema**：Zod `.passthrough()` 允许未知字段，避免前端一加字段
  就反向破坏 server 校验 —— 只守 required 字段和类型
- **行级状态机而非 streaming JSON parser**：fences 总在独立行，行扫描简单可靠；
  流式 JSON parse 遇到跨块拼接会很脆
- **坏块默认静默丢弃 + console.warn**：避免在前端挤出难看的错误条；
  `CHAT_BLOCK_DEBUG=on` 打开会用 `⚠️ (rich block skipped: <reason>)` 占位
- **不自动重试**：先只记日志。后续可接 "把 raw+issues 塞回 ADK 让 AI 重出"，
  但当前 instructions 规则 + schema 已从源头减少坏块
- **未知 fence 透传**：`` ```bash ``/`` ```python `` 等非 rich-block 代码块
  原样放行，让 markdown 渲染器展示
- **env 开关保留**：`CHAT_BLOCK_VALIDATION=off` 是逃生舱，也方便未来对比回归

---

每次完成优化，追加到「已完成」分区，包含：
- 优化编号 + 标题
- 完成日期
- 改动的文件列表
- 对应的 Supabase 迁移（如有）
- 如何验证
