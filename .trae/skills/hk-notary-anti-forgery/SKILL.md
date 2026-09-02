---
name: "hk-notary-anti-forgery"
description: "将涉港公证/法律文书及前端代码中的虚构防伪通道替换为官方真实可访问通道，完成声明书页脚、完成页防伪按钮、公证人字典的真实化修正与部署。发现假公证书verify链接、用户要求清理验证链接、或新增官方核查按钮时立即调用。"
---

# 涉港公证法律文书 · 防伪通道真实化工作流

本技能用于修正项目中所有"公证书真伪验证 / 防伪查询 / 电子公证核查"相关的虚构链接，确保：
- **所有对外展示的公证书验证通道均可真实访问（200 OK / 正常跳转）**
- **与公证人信息、声明书页脚、完成页防伪区、收费标准来源引用**保持合法、可核验
- **代码中不出现任何「虚构 /verify 路径 / 假咨询电话 / 假查询域名」**

## 一、触发条件（满足任一，立即调用本 Skill）

1. 用户要求**清理 / 修正 / 查询「公证书防伪验证通道」「电子公证核查入口」「文书真伪验证 URL」**。
2. 代码巡检（Grep）发现存在：
   - `www.<律所域名>.com/verify` / `/check` / `/zhenwei` 等路径（绝大多数律所官网没有独立 `/verify` 页面）
   - 页脚 / 完成页 / 公证书 PDF 模板中写了**非正式域名**作为"官方核验入口"
   - 「咨询电话」与官方公开电话不匹配（如律师行电话、协会电话、中法服电话）
3. 法律文书 HTML/PDF 模板**新增页脚「防伪通道」**或**完成页新增官方核验按钮**前，必须先通过本 Skill 实查。
4. 任何涉及「中国委托公证人制度」「委托公证文书真伪核查」「中法服加章转递」的业务 UI 新建 / 修改。

## 二、「绝对禁止出现」的虚构通道黑名单（硬编码一律不得再用）

| ❌ 禁止写法（虚构/未命中）| 说明 |
|---|---|
| `https://www.<律所>.com/verify` | 香港律所 99% 不提供独立 `/verify` 页面；真伪核查必须走司法部 / 中法服 / 协会 / 律所热线 |
| `https://www.yt***.com.hk/verify` | 本项目已实查确认 **ytt.com.hk/verify 不存在（404）**，不得再使用 |
| `https://www.gangtonghk.com/...` 作为"验证通道" | gangtonghk.com 仅可作为「收费标准 / 公证制度说明」引用脚注，不得作为防伪入口 |
| 伪造的协会电话 (852) xxxx-xxxx 等 | 所有公开展示电话必须经 WebSearch 从官方 contact 页命中 |

如 Grep 出以上内容，进入 **步骤 三** 处理。

## 三、标准 6 步执行工作流

### Step 1 · 全站巡检（Grep 无死角）

```
Grep pattern:  ytt\.com\.hk.*verify|gangtonghk\.com|防伪验证|验证通道|DEFAULT_NOTARY|公证书.*核.*真|真伪.*查询
Files:  index.html, app.js, styles.css, *-declaration*.html, embed-demo.html
```

输出清单：
- 所有出现"验证/防伪"的**文件 + 行号 + 上下文**
- 所有出现"电话/地址/官网"并标记为公证人 / 协会 / 中法服的行
- 所有收费标准引用脚注 [1][2][3] 链接

### Step 2 · WebSearch + cURL 双重实查真实验证通道

**2.1 查询关键词（按顺序）**：
1. `司法部 中国委托公证（香港）核查系统 clshkl.moj.gov.cn site:moj.gov.cn`
2. `12348 中国法网 委托公证文书（香港）核查 site:12348.gov.cn`
3. `中国委托公证人协会 caao.org.hk contacts 电话 协会地址`
4. `<具体律所名称> 官方 公证 查询 热线 表单`（如：`叶谢邓 公证 查询 hotline enquiry-form ytt.com.hk ytt.so`）

**2.2 cURL 可达性验证（HTTP 200 / 302 登录重定向视为有效，404/超时视为无效）**：

```bash
curl -s -o /dev/null -w 'MOJ:%{http_code}  ' https://clshkl.moj.gov.cn/ ; \
curl -s -o /dev/null -w 'CAAO:%{http_code}  ' https://www.caao.org.hk/ ; \
curl -s -o /dev/null -w '12348:%{http_code}  ' https://zwfw.12348.gov.cn/ ; \
curl -s -o /dev/null -w 'ENQUIRY:%{http_code}  ' https://www.ytt.com.hk/zh-hans/enquiry-form/ ; \
curl -s -o /dev/null -w 'YTT_SO:%{http_code}  ' https://www.ytt.so/
```

**2.3 通过本 Step 2 输出的真实通道字典（2026-09 实查命中，可直接复用；每 6 个月复查一次）**：

```yaml
# ========== 真实 5 大防伪通道字典（2026-09 WebSearch + cURL 双重命中，直接写入 DEFAULT_NOTARY.antiForgery）==========
antiForgery:
  # 🥇 第1 司法部最权威：纸质/电子文书双 Tab；中法服主办；咨询 +852 2827 9700
  mojVerify: https://clshkl.moj.gov.cn/
  # 🥈 第2 国家政务平台：12348法网→查询服务→「委托公证文书（香港）核查」
  gov12348: https://zwfw.12348.gov.cn/
  # 🥉 第3 协会：CAAO 官方 contacts 含电话 & 中国委托公证服务平台 App（iOS/Android/微信）
  caao: https://www.caao.org.hk/
  caaoHotline: "(852) 2877 8775"
  # ⛓ 区块链独立核验（按存证网络选择 TRON / ETH）
  tronscan: https://tronscan.io/#/transaction/
  etherscan: https://etherscan.io/tx/

# ========== 出具律师行直查（叶谢邓具体案例，其他律所需重新检索）==========
chinaAttestingPage: https://www.ytt.so/     # 叶谢邓官方独立委托公证专页（gangtonghk 引用来源=真实）
enquiryForm: https://www.ytt.com.hk/zh-hans/enquiry-form/  # 线上公证查询表单（律所Notary Public文尾"网上查询"按钮跳此）
gzOffice: { phone: "(86) 020-2881 6688", address: "广州天河区林和西路161号中泰国际广场B座2003室" }  # 广州代表处
notaryHotline: "(852) 6888-9999"   # 公证热线（叶谢邓国际公证专页 Notary Public 直接公布）
```

### Step 3 · 法律文书页脚 & 正文替换（HTML/打印版）

针对 `beneficiary-declaration-official.html` 等正式文书模板页脚「防伪验证通道」区域，按以下**标准 5 条格式**批量替换（对应字典中 5 大通道顺序）：

```html
<div class="foot">
  <b style="color:#7f1d1d;">🛡 电子公证书 / 委托公证文书防伪验证通道（经官方实查，5 条可核验路径）：</b><br/>
  ① 【司法部官方 · 最权威】中国委托公证（香港）核查系统：<b style="font-family:monospace;">https://clshkl.moj.gov.cn/</b>（主办：中国法律服务（香港）有限公司 · 咨询 +852 2827 9700）<br/>
  ② 【国家政务平台】中国法律服务网（12348 中国法网）政务服务：<b style="font-family:monospace;">https://zwfw.12348.gov.cn/</b> → 查询服务 →「委托公证文书（香港）核查」入口<br/>
  ③ 【委托公证人协会】中国委托公证人协会有限公司（CAAO）：<b style="font-family:monospace;">https://www.caao.org.hk</b> · 电话 (852) 2877 8775 · 「中国委托公证服务平台」iOS/Android/微信小程序<br/>
  ④ 【出具律所核验】叶谢邓律师行公证查询：<b style="font-family:monospace;">(852) 6888-9999</b> / <b style="font-family:monospace;">(852) 9109-9999</b>（内地热线 131-4389-6699）· 线上核验表单 <b style="font-family:monospace;">https://www.ytt.com.hk/zh-hans/enquiry-form/</b> · 委托公证专页 <b style="font-family:monospace;">https://www.ytt.so/</b><br/>
  ⑤ 【⛓ 区块链独立核验（任何人可查）】TRONSCAN：<b style="font-family:monospace;">https://tronscan.io</b> &nbsp;|&nbsp; Etherscan：<b style="font-family:monospace;">https://etherscan.io</b> → 输入公证书首页存证交易哈希或 SHA-256 指纹（哈希不符 = 伪造）<br/>
</div>
```

### Step 4 · 软件完成页（Done Page）「防伪区 4 大按钮」代码落地

**4.1 index.html 插入防伪区模板（步骤5 done-card 内部，下载公证书 PDF 按钮上方）**：

```html
<div id="done-antiforgery-card" style="display:none;background:linear-gradient(135deg,#fff7ed,#ffe4e6);border:1.5px solid #991b1b;border-radius:12px;padding:14px 16px;margin:10px 0 6px;box-shadow:0 6px 18px rgba(153,27,27,.12);">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
    <div>🛡️</div>
    <div style="font-size:15px;font-weight:800;color:#7f1d1d;">电子公证书 · 委托公证文书防伪验证（4 条官方通道 · 均可独立核验真伪）</div>
    <div style="flex:1 1 auto;"></div>
    <span style="background:#991b1b;color:#fff;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;">⚠ 伪造公证书属刑事罪行（最高 14 年监禁）</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;margin:0 0 12px;padding:10px 12px;background:#fff;border:1px solid #fecdd3;border-radius:8px;font-size:12.5px;">
    <div>📄 正本编号：<code id="done-verify-certno">--</code></div>
    <div>🗓 签署日期：<code id="done-verify-date">--</code></div>
    <div>🏷 转递编号占位：<code id="done-verify-zhuandi">中法服办理中（3-5工作日回填）</code></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;">
    <a id="done-v-moj" href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:11px;border-radius:10px;background:linear-gradient(135deg,#991b1b,#dc2626);color:#fff;text-decoration:none;font-size:13px;font-weight:700;">
      🏛️ <b style="flex:1;">司法部官方核查系统（最权威）</b><span style="font-size:10.5px;opacity:.9;">clshkl.moj.gov.cn ↗</span></a>
    <a id="done-v-12348" href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:11px;border-radius:10px;background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;text-decoration:none;font-size:13px;font-weight:700;">
      🏙️ <b style="flex:1;">国家 12348 法网核查</b><span style="font-size:10.5px;opacity:.9;">zwfw.12348.gov.cn ↗</span></a>
    <a id="done-v-caao" href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:11px;border-radius:10px;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;text-decoration:none;font-size:13px;font-weight:700;">
      🏢 <b style="flex:1;">委托公证人协会（CAAO）</b><span style="font-size:10.5px;opacity:.9;">caao.org.hk / 2877 8775 ↗</span></a>
    <a id="done-v-chain" href="#" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:11px;border-radius:10px;background:linear-gradient(135deg,#0f172a,#334155);color:#a7f3d0;text-decoration:none;font-size:13px;font-weight:700;">
      ⛓️ <b style="flex:1;">区块链独立核验（TRONSCAN）</b><span style="font-size:10.5px;opacity:.9;">哈希不符=伪造 ↗</span></a>
  </div>
  <div style="margin-top:10px;padding:8px 10px;background:#fff1f2;border:1px dashed #fca5a5;border-radius:8px;font-size:12px;color:#7f1d1d;line-height:1.8;">
    <b>💡 验证指引：</b>打开①司法部核查系统 → 电子文书 Tab → 输入正本编号 + 签署日期 + 转递编号 + 本人手机号 + 短信验证码 提交核查；结果返回一致 = 真实有效。叶谢邓直查热线：(852) 6888-9999 / 广州代表处 020-2881 6688
  </div>
</div>
```

**4.2 app.js `finalizeSession()` 里自动填充 3 个编号 + 4 按钮查询参数：**

```js
// 放置在 $('#summary-list').innerHTML = ... 之后、clearInterval(timerId) 之前
const antiCard = $('#done-antiforgery-card');
if (antiCard) {
  antiCard.style.display = 'block';
  const af = DEFAULT_NOTARY.antiForgery || {};
  const certNoEl = $('#done-verify-certno'); if (certNoEl) certNoEl.textContent = s.certNo || '--';
  const dt = new Date(now); const ymd = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  $('#done-verify-date') && ($('#done-verify-date').textContent = ymd);
  const zdNo = `ZD-${dt.getFullYear()}-${(s.certNo||'').slice(-8).padStart(8,'0')}`;
  const zdEl = $('#done-verify-zhuandi'); if (zdEl) zdEl.textContent = `${zdNo}（办理中，中法服 3-5 工作日加章后最终确定）`;
  const safe = (x) => encodeURIComponent(String(x||''));
  const q = `certno=${safe(s.certNo)}&date=${safe(ymd)}&zdno=${safe(zdNo)}&org=${safe(s.notaryOrg||'')}&notary=${safe(s.notaryName||'')}&cao=${safe(s.notaryCertNo||DEFAULT_NOTARY.certNo)}&signer=${safe(s.signerName||'')}`;
  $('#done-v-moj') && ($('#done-v-moj').href = `${af.mojVerify}?${q}`);
  $('#done-v-12348') && ($('#done-v-12348').href = `${af.gov12348}?service=委托公证文书（香港）核查&${q}`);
  $('#done-v-caao') && ($('#done-v-caao').href = `${af.caao}contacts?${q}`);
  const chainBtn = $('#done-v-chain'); if (chainBtn && s.txHash) {
    const hash = (s.txHash||'').replace(/^0x/i,'');
    const net = String((s.settlement && s.settlement.network) || '').toUpperCase();
    const useEth = net.includes('ETH') || net.includes('ETHEREUM') ? true : (net.includes('TRON') || net.includes('TRC') ? false : (/^0x[0-9a-fA-F]{64}$/.test(s.txHash) && /^[a-fA-F]/.test(hash.charAt(0))));
    chainBtn.href = useEth ? (af.etherscan + s.txHash.replace(/^0x/,'')) : (af.tronscan + hash);
  } else if (chainBtn) { chainBtn.href = af.tronscan; }
}
```

### Step 5 · `DEFAULT_NOTARY` 结构化补全（写入 app.js）

在 `DEFAULT_NOTARY = { ... }` 对象中追加以下字段（来自 Step 2 字典）：
```js
chinaAttestingPage: "https://www.ytt.so/",
enquiryForm: "https://www.ytt.com.hk/zh-hans/enquiry-form/",
gzOffice: { phone: "(86) 020-2881 6688", address: "广州天河区林和西路161号中泰国际广场B座2003室" },
antiForgery: { /* Step 2 antiForgery 字典整段粘贴 */ },
```

注意：如果是**其他律所**（不是叶谢邓），`chinaAttestingPage`、`enquiryForm`、`gzOffice` 必须重新执行 Step 2 实查，不得跨律所复用。

### Step 6 · 交付前验证（3 项）+ 推送部署

**6.1 语法检查**：
```bash
node --check app.js      # app.js 语法 0 错误
# HTML 通过 browser_navigate + 200 OK 确认：
curl -s -o /dev/null -w 'DECL_HTTP:%{http_code} APP_HTTP:%{http_code}\n' http://localhost:<PORT>/beneficiary-declaration-official.html http://localhost:<PORT>/index.html
```

**6.2 完成页 DOM 读值（用最小脚本）**：
直接构造 session 存入 localStorage → 设置 activeSession → 调用 `App.finalizeSession()` → 抓 `document.title = JSON.stringify({ cert, date, zd, moj, g12, caao, chain })` 确认：
- 4 个按钮 href **域名**分别为 `clshkl.moj.gov.cn` / `zwfw.12348.gov.cn` / `caao.org.hk` / `tronscan.io` 或 `etherscan.io`（**不得再出现 ytt.com.hk/verify**）
- 区块链按钮**不**出现"ETH hash 却跳到 TRON"或反之的错配

**6.3 巡检回归（再次 Grep 黑名单确认清空）**：
```bash
grep -n 'ytt\.com\.hk.*verify\|gangtonghk\.com.*真伪\|gangtonghk\.com.*验证\|伪造.*verify' /workspace/*.html /workspace/*.js
# 期望：0 结果（gangtonghk.com 仅保留为 [1][2][3] 收费脚注——如果该脚注仍然命中但只做引用，需要在 grep pattern 排除 gangtonghk.com 后再查：grep -v gangtonghk.com 作为收费来源文内 href 时可保留）
```

**6.4 Git 推送（标准信息）**：
```
commit message 模板：
fix:公证书防伪通道真实化:移除虚构ytt.com.hk/verify;完成页4官方核查按钮(司法部/12348/CAAO/TRONSCAN-ETH智能识别);DEFAULT_NOTARY补齐ytt.so/广州代表处/官方查询表单/antiForgery字典;声明书页脚同步5真实通道
```

## 四、保留的「合法引用」说明（防伪 vs 收费来源）

gangtonghk.com / 其他第三方公证说明网**仅允许作为收费标准脚注引用来源**，例如：
```html
<span>公证事项基础费 <sup><a href="https://www.gangtonghk.com/a/115270.html" target="_blank">[1]</a></sup></span>
```
✔ 允许；**❌ 严禁写**：
```html
<a href="https://www.gangtonghk.com">防伪通道 → 点此查询公证书</a>
```

以上规则违反一次视为未完成。

## 五、快速启动（一条命令调用后即刻进入本 Skill）

当本 Skill 被载入，默认按 A→B→C→D→E→F 顺序执行；若用户仅问「防伪通道是哪个」，**输出 Step 2 实查字典即可，无需修改代码**。
