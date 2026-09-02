---
name: "frontend-scenario-verify"
description: "Browser-based frontend scenario verification: drive forms, assert UI states, capture screenshots, produce pass/fail reports with screenshots. Invoke when validating user journeys, verifying UI fixes, or running regression tests on the app."
---

# Frontend Scenario Verifier

端到端浏览器前端场景验证技能。用于对公证签约前端或任意单页应用执行用户旅程级自动化验证，并输出标准化报告。

## When to Invoke (触发条件)

- 用户说「验证 XX 场景 / 流程」「跑一遍 XX 操作流程」「前端用户全流程操作验证」
- 用户说「XX 场景回归测试」「复现步骤 A/B/C」「操作验证一下前端全部流程」
- 任何代码修复后需要在真实浏览器环境中检查 UI 联动、表单提交、弹窗、页面切换的场景

## Standard Workflow (标准工作流)

每次验证遵循以下固定 6 步：

1. **环境准备**
   - 先用 `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/index.html` 检查本地 HTTP 服务，返回非 200 则启动：`python3 -m http.server <port> --bind 0.0.0.0`
   - 浏览器中先：`localStorage.clear(); sessionStorage.clear();` → 再 navigate，确保缓存干净
   - 截图保存目录：`<workspace>/screenshots/`（不存在则 mkdir）

2. **节点拆分**（使用 TodoWrite 建立任务清单）
   - 每个独立操作为 1 个节点：如「B1 创建弹窗打开」「B2 主题切换联动」「B3 表单填写」「B4 支付弹窗校验」「S1 建会取号」「S2 清缓存填入会表单」「S3 进入房间+AI 流程验证」
   - 每个节点明确：Action / Expected Checks / Actual Assertions

3. **浏览器执行**（优先 TRAE-browseruse Skill + integrated_code_mode Exec 工具链）
   - 每次 DOM 变更后先 snapshot 取 ref，再点击/输入
   - 断言优先用 `browser_evaluate` 取客观值：
     - 存在性：`!!document.getElementById('x')` / `.querySelector` 返回非 null
     - 显示/隐藏：`getComputedStyle(el).display !== 'none'` 或 `el.offsetParent !== null`
     - 状态：`input.disabled` / `checkbox.checked` / `radio.checked`
     - 文本：`(el.innerText || el.textContent || '').includes('关键字')` 或正则匹配
     - 计数：`document.querySelectorAll('select#cm-topic option').length === 9`
   - 每完成 1 节点调用 `browser_take_screenshot({ filename: '<代号>_<描述>.png', fullPage: true })`，文件名仅用 portable basename，不要绝对路径。随后拷贝进 `<workspace>/screenshots/`。

4. **失败回退与修复**
   - 节点断言失败时，先用 `Grep` 定位相关函数的代码位置
   - 用 `Read` 查看上下文 → `Edit` 精确替换修复
   - **修复后立刻重跑该节点**，直到通过（否则报告不可信）
   - 修复内容：在最终报告中另开「本轮代码变更清单」表格，列出文件、行号、修复内容、影响节点

5. **典型节点断言模板**
   - **B 组（创建会议表单 + 支付）**：
     - 主题下拉选项数、选 PTAHDAO 后的 UI 联动（ptah-fields display / readonly card exists / topicWrap hidden / labels replaced）
     - 8+ 字段写入后逐个 value 校验、checkbox checked、updateCreateFee 后费用预览文本含 `687 USDT` / `合计`
     - 提交按钮 `textContent.trim()` 与 disabled 状态
     - 支付弹窗：`input[name=pay-channel][value=trc20].checked === true` / `bankRadio.checked === false`
     - 案件信息条 5 字段（主题、签约人、信托账户、结算编号、结算资产）正则命中
     - 金额 `#pay-amount-usdt.textContent` 与 `#pay-amount-hkd.textContent`
   - **S 组（凭会议号远程加入）**：
     - 建会后 session.id 格式必须匹配首页示例（如 `GZ\d+`）
     - 清缓存后目标 session 不存在：`Store.sessions.find(s => s.id === sid)` 为假
     - 入会按钮 `onclick` 走 `App.joinById(sid, name, phone)`
     - 提交后 `App.state.currentUser.role === 'signer'` 且 `guest === true`
     - 导航栏显示、5 步流程条元素存在、video 元素存在、AI 启动 Toast（身份证读取/人脸核验）文本出现
     - 若 `autoNotary=true`，等待 3–5 秒后 AX snapshot 中应出现「签约完成」与「下载公证书 PDF」按钮

6. **最终报告格式**（固定表格结构）
   - 表头：**7 节点验证总报告**（节点数按实际调整）
   - **本轮代码变更清单**：表格（文件 / 行号 / 修复内容 / 影响节点）
   - **N 节点详细验证矩阵**：每行列 `# 节点 操作 关键检查项 期望 实际 PASS?`
   - **通过率汇总**：分组（B/S/总）× `总检查项 / 通过 / 失败 / 通过率(%)`
   - **截图文件索引**：表格（顺序 / 文件名 / 对应节点 / 画面内容），使用 `[display_name](file:///absolute/path)` 可点击链接格式

## Naming Conventions (命名规范)

- 截图文件名：`<分组><序号>_<两位英文描述>.png`，如 `B1_create_modal.png`、`S3_join_room.png`
- 节点代号：`B` = 表单创建 & 支付主流程；`S` = 加入/深链/嵌入等旁支场景；后续可扩展 `E`=嵌入、`U`=URL 入口 等
- 报告中通过率标记一律使用 `⭐ 100%`（全通过）或百分比数字

## Guardrails (注意事项)

- **永远不要泄露敏感数据**：本 Skill 中的断言和示例一律用占位符（会议号 GZ\d+、示例 tx hash、姓名=「张三受益人模板」、手机=138****0007 之类），不要把真实用户手机号、证件号、真实交易哈希写入 SKILL 正文
- 若首次点击按钮后 refs 失效，**必须重新 snapshot** 获取新 ref，不要在旧 snapshot 上重复点击
- 浏览器 `browser_take_screenshot` 的 filename 参数只允许文件名（不含 `/` 路径），保存后记得用 `cp /data/tool/browser_snapshots/X.png <workspace>/screenshots/X.png` 汇总
- 当 `joinById` 在纯客户端无 session 时，允许按「重建占位 session」逻辑回退：真实姓名 + 手机非空 → 构造含 `_rebuiltFromMeetingNo:true / feePaid:true / autoNotary:true` 的 stub session 写入 Store
