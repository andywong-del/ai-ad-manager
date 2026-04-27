# DEFECT — AI Ad Manager 系统设计缺陷盘点

> 记录当前已识别但尚未修复的架构 / 安全 / 运维 / 代码质量问题。
> 已完成的优化见 `OPTIMIZATION_LOG.md`（#1–#6）。
> 冲刺任务见 `TASK.txt`。
>
> 风险等级：🔴 真风险 · 🟠 架构债 · 🟡 体验/小债 · 🟢 清理项

---

## A. 存储 / 数据持久化

| # | 问题 | 现状 | 风险 |
|---|---|---|---|
| **A1** | 图片/视频直传 Meta，无中转层 | 已在 #7 讨论设计（GCS 中转） | 🟠 素材库污染、多平台不复用、4GB 视频无断点续传 |
| **A2** | 文档上传（PDF/XLS）**解析完就扔** | 只把截断文本塞 chat，原文件丢 | 🟠 事后无法复现 AI 看到了什么，debug 难、合规难 |
| **A3** | Brand Memory 整段塞进 prompt | 没向量检索 | 🔴 Token 浪费 + 内容一大就撑爆 context 上限 |
| **A4** | 聊天附件不落库 | 附件 base64 只活在请求体里 | 🟠 用户说"你上次分析那张图"→ AI 找不回 |
| **A5** | 自定义 skill 无版本控制 | `custom_skills` 表只存当前版本 | 🟡 改错回滚不了；多人协作冲突 |
| **A6** | `/api/debug` + `/api/dev-config` 在 prod 仍暴露 | 后者若配了 `META_DEMO_TOKEN` 直接吐出来 | 🔴 Token 泄露，建议生产禁用 |

---

## B. 安全 / 认证

| # | 问题 | 现状 | 风险 |
|---|---|---|---|
| **B1** | FB token 存 localStorage | XSS 任意第三方脚本可偷 | 🔴 一旦前端有 XSS，整个 ad account 被接管。应迁 httpOnly cookie |
| **B2** | `CORS { origin: true }` | 回显请求 origin | 🟠 开放给任何站点（只要带凭据就能调） |
| **B3** | `/api/chat` 接收 `body.token` 作为备选 | 两路认证 | 🟠 CSRF 表面积大；应强制只认 Authorization header |
| **B4** | 无 rate limiting / quota 保护 | 单用户能拼命刷 Meta API | 🔴 Meta 会限流甚至封号；恶意用户可耗尽 ad budget |
| **B5** | Meta long-lived token（60 天）无刷新流程 | 到期用户必须重登录 | 🟡 UX 断崖 |
| **B6** | Google `ALLOW_GOOGLE_ENV_FALLBACK` 所有用户共享同一 refresh token | audit_log 无法分辨操作人 | 🔴 合规问题、无法追责 |
| **B7** | 错误处理把 `err.stack` 回写 response | production 也泄 | 🟠 内部路径、库版本暴露给前端 |
| **B8** | `load_skill` 工具接受用户输入的 path | 如果没 sanitize 可能路径穿越读 server 文件 | 🔴 需要验证实现 |
| **B9** | 确认机制虽然做了，但**审计 log 记的是 args**，不记**发起该操作的用户自然语言原话** | 看不到"为什么" | 🟡 事后追踪弱 |

---

## C. AI / 架构

| # | 问题 | 现状 | 风险 |
|---|---|---|---|
| **C1** | `isWriteTool` 用正则匹配工具名前缀 | 新加的 write 工具忘了按命名就绕过 SAFE_MODE | 🔴 护栏是"打补丁"式，不是白名单 |
| **C2** | 三 agent（root/analyst/executor）**没有 transfer 次数上限** | agent 可以无限互转 | 🟠 理论上死循环烧 Gemini quota |
| **C3** | MALFORMED_FUNCTION_CALL retry 用**同 prompt** | AI 确定性错误会把 2 次 retry 全耗掉 | 🟡 浪费配额 |
| **C4** | System prompt 是 JS 模板字符串 inline | 改 prompt 要重新部署 | 🟠 不能 A/B、不能让非工程调参 |
| **C5** | Skills 是纯 Markdown 文本喂给 AI | 没有 schema 约束 skill 输出 | 🟡 skill 质量参差，eval 框架缺（M4） |
| **C6** | 部分 tool handler **不验证 args**，靠 Meta API 报错 | 错误信息对用户不友好 | 🟡 体验 |
| **C7** | ADK session state `{token, adAccountId, activeCustomSkill}` 无 schema | 改字段没类型检查 | 🟡 |

---

## D. 运维 / 可观测性

| # | 问题 | 现状 | 风险 |
|---|---|---|---|
| **D1** | 日志只有 `console.log`，Vercel logs 72h 就过期 | 出事后无从查 | 🔴 生产事故无法复盘 |
| **D2** | 没有真正的 health check | `/api/ping` 只返 ok，不测 Supabase/Gemini/Meta | 🟠 下游挂了监控看不出来 |
| **D3** | 启动时那行 `skill_creator` 清理查询**每次冷启都跑** | 浪费 | 🟡 改成一次性 migration |
| **D4** | Vercel cold start 每次重建 Gemini/ADK 实例 | 首个请求慢 3-5s | 🟡 用户感知 |
| **D5** | 没有任何指标（latency / 错误率 / token 消耗） | 不知道 AI 月烧多少 | 🟠 成本失控风险 |
| **D6** | 单 Vercel function 10s 默认超时 | 长 skill / 大 chat 打断 | 🟠 Pro 可调到 60s，但 serverless 本身不适合长连 |

---

## E. 代码质量

| # | 问题 | 现状 | 风险 |
|---|---|---|---|
| **E1** | 整个项目 0 TypeScript | 运行时才炸 | 🟠 refactor 如履薄冰 |
| **E2** | `ChatInterface.jsx` **3623 行** | 一个文件塞了 20+ 组件 | 🟠 改动极易连带 bug（Threads 那个 CSS 泄漏就是例子） |
| **E3** | #6 新加的 2 个文件之外**无其他单测** | Meta/Google tool handler、skill loader 都裸奔 | 🔴 重构零安全网 |
| **E4** | Meta/Google tool 两套文件（`tools.js` vs `googleTools.js`）重复很多模式 | 加 TikTok 时要复制第三份 | 🟠 该抽象个 tool factory |
| **E5** | 没有 API schema（OpenAPI / zod）规范 endpoints | 前后端靠默契 | 🟠 |
| **E6** | 依赖 `pdf-parse` 虽然 CLAUDE.md 警告过，但依赖表里还在 | 只是没用 | 🟢 清理 |

---

## 建议处理顺序

### P0（本月内）—— 真漏洞
- **B1** localStorage → httpOnly cookie
- **B4** rate limiting（至少对 write 工具加单用户 QPS）
- **B6** Google 共享 token 的审计归因
- **D1** 日志落 Supabase / Sentry
- **A6** 生产环境禁用 `/api/debug` + `/api/dev-config`
- **B8** 验证 `load_skill` path sanitize

### P1（1-2 个月）—— 架构债
- **#7** GCS 上传中转（连带 A1/A2/A4）
- **A3** Brand Memory 向量化
- **C1** SAFE_MODE 改白名单
- **E2** `ChatInterface.jsx` 拆分

### P2（季度级）—— 质量升级
- **E1** TypeScript 迁移
- **E3** 核心 tool handler 补单测
- **C4** prompt 外置（可在 Supabase 热更新）
- **E4** tool 抽象层（为 TikTok 集成铺路）

---

## 工作协议
- 修复一项后：DEFECT.md 把该行移到底部 `## 已修复` 分区并打上修复日期
- 大改动（P0/P1）在 `OPTIMIZATION_LOG.md` 追加新条目
- 新发现的缺陷：追加到对应字母分区，编号续下一位

---

## 已修复
（尚无）
