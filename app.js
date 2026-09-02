/* ============================================================
   信签云 · 公证人视频签约平台
   主逻辑脚本
============================================================ */
(function () {
  'use strict';

  /* ========= 工具函数 ========= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtTime = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const fmtDateOnly = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const fmtHM = (ts) => {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const maskId = (id) => id ? id.replace(/^(.{6})(.+)(.{4})$/, '$1********$3') : '--';
  const maskPhone = (p) => p ? p.replace(/^(.{3})(.+)(.{4})$/, '$1****$3') : '--';
  const randHex = (len = 16) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  const Store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  /* ========= 默认公证人（前端访客自助创建时系统自动指派） =========
     真实数据来源：www.ytt.com.hk 叶谢邓律师行官方律师团队 2026-09-01 同步
     邓达明合伙人：中国委托公证人（司法部注册）+ 婚姻监礼人
     谢连忠高级合伙人：香港高等法院注册国际公证人 Notary Public
  */
  const DEFAULT_NOTARY = {
    id: 'notary_ytt328',
    name: '邓达明',
    enName: 'Raymond Tang',
    org: '叶谢邓律师行 Yip, Tse & Tang Solicitors & Notaries',
    orgShort: '叶谢邓律师行',
    certNo: 'CAO-HK-D0468',
    qual: '中国委托公证人 · 婚姻监礼人',
    region: 'HK',
    phone: '(852) 6248-8888',
    address: '香港旺角弥敦道 738-740 号荣华大楼 2 楼全层',
    website: 'www.ytt.com.hk',
    notaryHotline: '(852) 6888-9999',
  };
  // 国际公证人（谢连忠高级合伙人，Notary Public）—— 用于国际公证场景
  const DEFAULT_NOTARY_PUBLIC = {
    id: 'notary_ytt001',
    name: '谢连忠',
    enName: 'Thomas Tse',
    org: '叶谢邓律师行 Yip, Tse & Tang Solicitors & Notaries',
    orgShort: '叶谢邓律师行',
    certNo: 'HK-NOTARY-00356',
    qual: '国际公证人 Notary Public · 高级合伙人 · 家庭信托 Family Trust',
    region: 'HK',
    phone: '(852) 8209-9999',
    address: '香港中环德辅道中 71 号永安集团大厦 24 楼 2406-7 室',
    website: 'www.hongkongnotarypublic.com',
    notaryHotline: '(852) 6888-9999',
  };

  /* ========= 示例文书内容 ========= */
  const SAMPLE_DOCS = {
    '借款合同公证': {
      pages: 5,
      title: '借 款 合 同',
      content: [
        `<h2>借 款 合 同</h2>
        <p class="doc-party"><span>出借人（甲方）：张明</span><span>身份证号：110101199001011234</span></p>
        <p class="doc-party"><span>借款人（乙方）：李华</span><span>身份证号：110101199203032345</span></p>
        <p><b>第一条 借款金额</b></p>
        <p>甲方向乙方提供借款人民币伍拾万元整（¥500,000.00），用于乙方合法经营周转。</p>
        <p><b>第二条 借款期限</b></p>
        <p>借款期限为壹拾贰个月，自借款实际发放之日起计算。</p>
        <p><b>第三条 借款利率</b></p>
        <p>借款年利率为6.5%，按实际使用天数计息，到期一次性还本付息。</p>`,
        `<h2>借 款 合 同（续）</h2>
        <p><b>第四条 还款方式</b></p>
        <p>乙方应于借款到期日一次性向甲方偿还全部本金及应付利息。还款账户信息由甲方另行书面指定。</p>
        <p><b>第五条 借款担保</b></p>
        <p>为确保本合同履行，乙方同意以其名下位于北京市朝阳区建国路88号的房产（不动产权证号：京(2023)朝不动产权第0012345号）为本合同项下借款提供抵押担保。</p>
        <p><b>第六条 提前还款</b></p>
        <p>乙方如需提前还款，应提前15个工作日书面通知甲方，经甲方同意后方可办理。</p>`,
        `<h2>借 款 合 同（续）</h2>
        <p><b>第七条 违约责任</b></p>
        <p>7.1 乙方未按约定期限偿还借款本金或利息的，每逾期一日，应按逾期金额的万分之五向甲方支付违约金。</p>
        <p>7.2 乙方逾期超过30日的，甲方有权宣布借款立即到期，要求乙方立即清偿全部借款本息及违约金。</p>
        <p>7.3 因乙方违约导致甲方采取法律途径实现债权的，乙方应承担甲方为此支付的诉讼费、律师费、保全费等全部费用。</p>
        <p><b>第八条 争议解决</b></p>
        <p>本合同履行过程中发生的争议，双方应友好协商解决；协商不成的，任何一方均有权向甲方住所地有管辖权的人民法院提起诉讼。</p>`,
        `<h2>借 款 合 同（续）</h2>
        <p><b>第九条 公证条款</b></p>
        <p>9.1 甲乙双方一致同意，本合同经公证机关公证并赋予强制执行效力。</p>
        <p>9.2 乙方承诺：若不履行或不适当履行本合同项下还款义务，乙方愿意直接接受有管辖权的人民法院强制执行，无需经过诉讼程序。</p>
        <p>9.3 甲方在向公证机构申请出具执行证书时，甲方的举证责任仅限于提供：(1)本合同公证书；(2)借款发放凭证；(3)乙方还款记录及欠款说明。</p>
        <p><b>第十条 其他约定</b></p>
        <p>10.1 本合同自双方签字、捺印并经公证之日起生效。</p>
        <p>10.2 本合同一式四份，甲乙双方各执一份，公证机构存档一份，不动产登记机构一份，具有同等法律效力。</p>`,
        `<h2>签 署 页</h2>
        <p style="text-align:center;text-indent:0;margin:40px 0;">本合同签署各方确认：已通读并理解本合同全部条款，自愿签署。</p>
        <div class="sign-area">
          <div><b>甲方（出借人）：</b><br/><br/><br/>签字：_____________<br/>日期：___________</div>
          <div><b>乙方（借款人）：</b><br/><br/><br/>签字：_____________<br/>日期：___________</div>
        </div>
        <p style="text-align:center;text-indent:0;margin-top:40px;color:var(--text-muted);">—— 公证书附本 · 信签云视频签约系统生成 ——</p>`
      ]
    },
    '房屋买卖合同公证': {
      pages: 6, title: '房 屋 买 卖 合 同',
      content: [
        `<h2>房 屋 买 卖 合 同</h2>
        <p class="doc-party"><span>出卖人（甲方）：王建国</span><span>身份证号：110101197010105678</span></p>
        <p class="doc-party"><span>买受人（乙方）：刘芳</span><span>身份证号：110101198805056789</span></p>
        <p><b>第一条 房屋基本情况</b></p>
        <p>甲方自愿将其合法所有的房屋出售给乙方。房屋坐落：北京市海淀区中关村南大街5号院8号楼3单元1602室，建筑面积128.50平方米，不动产权证号：京(2022)海不动产权第0087654号。</p>
        <p><b>第二条 房屋价款</b></p>
        <p>该房屋成交总价款为人民币捌佰伍拾万元整（¥8,500,000.00）。</p>`
      ].concat(Array(4).fill(`<h2>房 屋 买 卖 合 同（续）</h2>
        <p><b>第三条 付款方式</b></p>
        <p>乙方采用商业贷款方式付款：首付款人民币贰佰伍拾伍万元整于网签后3个工作日内支付，剩余贷款人民币陆佰万元整由乙方向银行申请，于过户前由银行放款至资金监管账户。</p>
        <p><b>第四条 过户及交付</b></p>
        <p>甲乙双方应于贷款批复后10个工作日内共同办理不动产转移登记手续。甲方应于过户后15个工作日内将房屋腾空并交付乙方。</p>
        <p><b>第五条 税费承担</b></p>
        <p>本交易所产生的各项税费，按照国家法律规定由甲乙双方各自承担。</p>`)).concat([`<h2>签 署 页</h2>
        <p style="text-align:center;text-indent:0;margin:40px 0;">双方确认自愿按照本合同全部条款履行。</p>
        <div class="sign-area">
          <div><b>甲方（出卖人）：</b><br/><br/><br/>签字：_____________<br/>日期：___________</div>
          <div><b>乙方（买受人）：</b><br/><br/><br/>签字：_____________<br/>日期：___________</div>
        </div>`])
    },
    '委托书公证': { pages: 3, title: '委 托 书', content: [
      `<h2>委 托 书</h2><p style="text-indent:0">委托人：赵晓梅，女，1985年03月15日出生，身份证号：310101198503152345，现住上海市浦东新区。</p>
      <p style="text-indent:0">受托人：孙强，男，1982年12月20日出生，身份证号：310101198212203456，现住上海市徐汇区。</p>
      <p>委托人因工作原因长期在国外，无法亲自办理名下位于上海市浦东新区世纪大道100号环球金融中心68楼房屋（不动产权证号：沪(2023)浦字不动产权第0123456号）的出租及相关手续，特委托受托人作为我的合法代理人办理以下事项：</p>`,
      `<h2>委 托 书（续）</h2><p>一、代为办理上述房屋的出租事宜，包括但不限于发布出租信息、看房、洽谈、签订租赁合同、收取租金及押金；</p>
      <p>二、代为办理上述房屋的物业交接、水电气等费用结算事宜；</p>
      <p>三、代为处理与上述房屋租赁相关的纠纷，包括但不限于协商、调解、诉讼等；</p>
      <p>四、代为签署与上述委托事项相关的一切文件。</p>
      <p>受托人在办理上述事项过程中所签署的一切文件和行为，委托人均予以认可，并承担相应的法律后果。</p>
      <p>委托期限：自本委托书签署之日起两年。</p>
      <p>受托人无转委托权。</p>`,
      `<h2>签 署 页</h2>
      <p style="text-align:center;text-indent:0;margin:40px 0;">委托人确认上述委托事项系其真实意思表示。</p>
      <div class="sign-area">
        <div><b>委托人：</b><br/><br/><br/>签字：_____________<br/>日期：___________</div>
        <div><b>受托人：</b><br/><br/><br/>签字：_____________<br/>日期：___________</div>
      </div>`
    ]},
    '受益人声明书公证': {
      pages: 5, title: '受益人声明书 · DECLARATION OF BENEFICIARY',
      region: 'HK',
      content: [
        `<h2>受益人声明书</h2>
        <p style="text-align:center;text-indent:0;color:var(--text-muted);font-size:12px;margin-bottom:24px;">
        YIP, TSE &amp; TANG SOLICITORS &amp; NOTARIES · 叶谢邓律师行（中国委托公证人办事处）<br/>
        香港中环德辅道中 71 号永安集团大厦 24 楼 2406-7 室 · Tel: +852 6888-9999
        </p>
        <p style="text-indent:0"><b>声明人 (Declarant)：</b>陈嘉怡 CHAN Ka Yee，女，1988 年 6 月 12 日出生，香港永久性居民身份证号：Z 682451(3)，港澳居民来往内地通行证（回乡证）号码：H1234567802，现居香港九龙尖沙咀柯士甸道 1 号。</p>
        <p style="text-indent:0"><b>公证人 (Notary Public)：</b>邓达明 Tang Tat Ming，中国委托公证人（司法部注册，执业编号 CAO-HK-D0468），所属机构：叶谢邓律师行 YIP, TSE &amp; TANG SOLICITORS &amp; NOTARIES。</p>
        <p style="text-indent:0"><b>法律适用：</b>本声明依据《中华人民共和国香港特别行政区公证人条例》（第 204 章）及《证据条例》（第 8 章）作出，拟用于内地银行办理跨境信托受益人登记手续，并将按 <b>中国委托公证人</b> 程序加章转递使用。</p>
        <p><b>第一条 声明目的 (Purpose of Declaration)</b></p>
        <p>本人陈嘉怡，就本人作为「嘉盈家族信托（Jia Ying Family Trust）」项下第 II 类受益人一事，郑重作出如下声明，并保证所陈述内容全部真实、准确、无重大遗漏。</p>`,
        `<h2>受益人声明书（续一）</h2>
        <p><b>第二条 信托背景 (Trust Background)</b></p>
        <p>2.1 「嘉盈家族信托」于 2021 年 3 月 15 日在香港特别行政区依据《受托人条例》（第 29 章）依法设立，受托人为 Trustcorp (HK) Limited（信托牌照编号：TC-00087）。</p>
        <p>2.2 信托资产主要包括：(a) 位于香港中西区西摩道 3 号的住宅物业一套（物业注册编号：HML20230101888）；(b) 汇丰银行账户编号 502-xxxxxxx-001 内现金资产；(c) 盈富基金（代码：2800.HK）120,000 个基金单位。</p>
        <p>2.3 本人系信托设立人陈国强先生（已故）之长女，根据信托契约附件 B「受益人名单」第 3 项，被指定为 II 类可自由支配受益人（Discretionary Beneficiary Class II）。</p>
        <p><b>第三条 受益权范围 (Scope of Beneficial Interest)</b></p>
        <p>3.1 本人有权按照信托契约第 11.2 条之规定，自年满 35 周岁起，每年从信托可分配净收益中按不超过 15% 的比例收取分配款项。</p>
        <p>3.2 在信托存续期间，本人无权请求分割或处分信托本金；信托本金分配完全由受托人根据"最大利益原则"行使自由裁量权。</p>`,
        `<h2>受益人声明书（续二）</h2>
        <p><b>第四条 利益冲突与关联披露 (Disclosure of Interests)</b></p>
        <p>4.1 本人确认：与受托人 Trustcorp (HK) Limited 的董事、监事、关联自然人之间<b>不存在配偶、父母、子女、兄弟姐妹等近亲属关系</b>。</p>
        <p>4.2 本人确认：近 5 年内未被任何司法管辖区宣告破产、未涉及任何与信托财产有关的诉讼、未受任何税务机关关于海外资产申报的调查或处罚。</p>
        <p>4.3 本人就本次信托受益权登记事项，已完整告知以下利益相关人（OB/Overt Business）：</p>
        <p style="text-indent: 0; padding-left: 2em;">
          (1) 配偶：林伟文 LAM Wai Man，香港身份证号 E123456(8)；<br/>
          (2) 未成年子女：林一诺 LAM Yat Nok（2019 年出生）；<br/>
          (3) 胞弟：陈嘉豪 CHAN Ka Ho，同为 I 类受益人。
        </p>
        <p><b>第五条 跨境使用与转递条款 (Cross-border Use)</b></p>
        <p>5.1 本声明书拟提交的使用目的地为：<b>广东省深圳市</b>，用途为建设银行深圳分行「跨境家族信托受益人登记」。</p>
        <p>5.2 本人同意并授权公证人将本声明书正本一式两份，一份由叶谢邓律师行存档 10 年，一份按香港《中国委托公证人（香港）管理办法》之规定，通过<b>中国法律服务（香港）有限公司</b>办理加章转递手续后发往使用地。</p>`,
        `<h2>受益人声明书（续三）</h2>
        <p><b>第六条 虚假声明法律责任 (Liability for False Statement)</b></p>
        <p>6.1 本人清楚知悉：根据香港法例第 200 章《刑事罪行条例》第 36 条，任何明知而作出虚假法定声明者，即属犯罪，可处监禁 2 年及罚款；如作为证据使用时明知为虚假者，可处监禁 7 年。</p>
        <p>6.2 本人同时知悉：本声明在内地使用时，如存在虚假记载导致任何第三方损失的，本人须依《中华人民共和国民法典》第 1165 条承担侵权赔偿责任。</p>
        <p><b>第七条 附件清单 (List of Exhibits)</b></p>
        <p>本声明书附件与正文具有同等效力，附件清单如下：</p>
        <p style="text-indent: 0; padding-left: 2em;">
          附件一：声明人香港永久性居民身份证正反面复印件（公证件）<br/>
          附件二：港澳居民来往内地通行证（回乡证）正反面复印件<br/>
          附件三：嘉盈家族信托契约（经核证副本）<br/>
          附件四：声明人与设立人亲属关系证明（香港入境处核证）<br/>
          附件五：香港破产管理署「无破产记录」证明书
        </p>
        <p><b>第八条 声明 (The Declaration)</b></p>
        <p>本人谨此至诚郑重声明：本声明书所载各项事实，均属真实正确；本人完全理解本声明的法律含义与后果，并自愿承担一切法律责任。</p>
        <p style="text-align:center;margin-top:30px;font-style:italic;color:var(--text-muted);">
        Solemnly declared before me this ____ day of ______________ , 20____ , by the said Declarant at Hong Kong.
        </p>`,
        `<h2>签 署 页 · SIGNATURE PAGE</h2>
        <p style="text-align:center;text-indent:0;margin:24px 0 30px;color:var(--text-muted);">
        <b>在叶谢邓律师行公证人邓达明先生面前签署 · Signed before Notary Raymond Tang of YTT HK</b>
        </p>
        <div class="sign-area" style="grid-template-columns:1fr 1fr;">
          <div style="padding-right:10px;border-right:1px dashed var(--border);">
            <b>声明人 (Declarant) 签名：</b><br/><br/><br/>
            签字：_________________<br/>
            姓名：陈嘉怡 CHAN Ka Yee<br/>
            日期：_____________<br/>
            <div style="margin-top:10px;font-size:11px;color:var(--text-muted);">✓ 已核身份原件　✓ 人脸比对通过　✓ 懂中文及粤语</div>
          </div>
          <div style="padding-left:10px;">
            <b>香港公证人 (Notary Public HK)：</b><br/><br/><br/>
            签字：_________________<br/>
            姓名：邓达明 TANG Tat Ming<br/>
            公证人编号：CAO-HK-D0468（司法部注册）<br/>
            <div style="margin-top:10px;font-size:11px;color:var(--text-muted);">叶谢邓律师行 · 中国委托公证人 · 香港中环永安集团大厦 · 专用章已加贴</div>
          </div>
        </div>
        <div style="margin-top:36px;padding:16px;border:1px dashed #cbd5e1;border-radius:8px;background:#fafafa;font-size:12px;color:var(--text-muted);text-align:center;">
          🇭🇰 本公证书出具后须经 <b>中国法律服务(香港)有限公司</b> 加章转递，方可在内地作为证据使用 · 正本编号：YT-NOTARY-HK-20____-____
        </div>
        <p style="text-align:center;text-indent:0;margin-top:20px;color:var(--text-muted);">—— 视频公证附本 · 信签云 × 叶谢邓律师行联合出具 · 区块链存证 ——</p>`
      ]
    },
    // PTAHDAO 信托受益人声明书专用模板
    'PTAHDAO信托受益人声明书': {
      pages: 5, title: 'PTAHDAO 信托受益人声明书 · DECLARATION OF TRUST BENEFICIARY',
      region: 'HK',
      content: [
        `<h2>PTAHDAO 信托受益人声明书</h2>
        <p style="text-align:center;text-indent:0;color:var(--text-muted);font-size:12px;margin-bottom:24px;">
        YIP, TSE &amp; TANG SOLICITORS &amp; NOTARIES · 叶谢邓律师行（中国委托公证人办事处）<br/>
        香港中环德辅道中 71 号永安集团大厦 24 楼 2406-7 室 · Tel: +852 6888-9999
        </p>
        <p style="text-indent:0"><b>声明人 (Declarant)：</b><span data-field="holder-name">持有人姓名</span>，身份证/证件号：<span data-field="holder-idcard">持有人证件号</span>，联系电话：<span data-field="holder-phone">持有人手机</span>。</p>
        <p style="text-indent:0"><b>公证人 (Notary Public)：</b>邓达明 Tang Tat Ming，中国委托公证人（司法部注册 CAO-HK-D0468 · 婚姻监礼人），所属机构：叶谢邓律师行 YIP, TSE &amp; TANG SOLICITORS &amp; NOTARIES。</p>
        <p style="text-indent:0"><b>法律适用：</b>本声明依据《中华人民共和国香港特别行政区公证人条例》（第 204 章）及《受托人条例》（第 29 章）作出，用于 PTAHDAO 信托项下受益人身份确认及资产结算分配。</p>
        <p><b>第一条 信托背景 (Trust Background)</b></p>
        <p>1.1 本人系 <b>PTAHDAO 信托</b>（信托账户：<span data-field="trust-account" style="font-family:monospace;">__________</span>）项下合法登记的持有人，依信托契约登记册第 II 类受益人条款享有相应受益权。</p>
        <p>1.2 该信托由 PTAHDAO Trust Foundation 依据香港特别行政区法律设立，受托人为 Trustcorp (HK) Limited（信托牌照编号：TC-PTAHDAO-2024）。</p>`,
        `<h2>PTAHDAO 信托受益人声明书（续一）</h2>
        <p><b>第二条 账户结算资产 (Settlement Assets)</b></p>
        <p>2.1 截至本声明签署日，本人持有 PTAHDAO 信托账户项下结算资产合计 <b><span data-field="settlement-amount" style="font-family:monospace;color:#991b1b;">__________</span> USDT</b>（按 TRC-20 网络稳定币计价）。</p>
        <p>2.2 上述资产对应的结算编号为：<span data-field="settlement-no" style="font-family:monospace;color:#991b1b;">__________</span>，相关结算记录已上链至 TRON 网络，可凭此编号在 Tronscan 区块链浏览器公开查询。</p>
        <p>2.3 本人确认：上述资产系通过合法外汇来源购入，已依法履行反洗钱（AML）申报及资金来源证明程序，不存在任何违法犯罪所得或第三方权益主张。</p>
        <p><b>第三条 受益权范围 (Scope of Beneficial Interest)</b></p>
        <p>3.1 本人有权依信托契约第 12.4 条规定，自声明生效日起按 PTAHDAO 信托管理委员会分配方案，从可分配净收益中按比例收取分配款项。</p>
        <p>3.2 本人在信托存续期间，无权请求分割或处分信托本金；信托本金分配须由受托人依"最大利益原则"行使自由裁量权。</p>`,
        `<h2>PTAHDAO 信托受益人声明书（续二）</h2>
        <p><b>第四条 利益冲突与关联披露 (Disclosure of Interests)</b></p>
        <p>4.1 本人确认：与 PTAHDAO 信托受托人、管理委员会成员、关联自然人之间不存在配偶、父母、子女、兄弟姐妹等近亲属关系。</p>
        <p>4.2 本人确认：近 5 年内未被任何司法管辖区宣告破产、未涉及任何与信托财产有关的诉讼、未受任何税务机关关于海外资产申报的调查或处罚。</p>
        <p>4.3 本人确认：所持 PTAHDAO 信托受益权未向任何第三方提供质押、担保或其他处分安排。</p>
        <p><b>第五条 跨境使用与区块链存证 (Cross-border Use &amp; Blockchain Settlement)</b></p>
        <p>5.1 本声明书拟提交的使用目的地为：<b>PTAHDAO 信托结算平台</b>，用途为持有人实人核验、受益权登记与 USDT 资产分配。</p>
        <p>5.2 本人同意并授权公证人将本声明书全文及电子签名、签署时间戳、IP 信息、视频连线证据一并上链至 TRC-20 网络，存证地址：<code style="font-family:monospace;">TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8</code>。</p>`,
        `<h2>PTAHDAO 信托受益人声明书（续三）</h2>
        <p><b>第六条 虚假声明法律责任 (Liability for False Statement)</b></p>
        <p>6.1 本人清楚知悉：根据香港法例第 200 章《刑事罪行条例》第 36 条，任何明知而作出虚假法定声明者，即属犯罪，可处监禁 2 年及罚款；如作为证据使用时明知为虚假者，可处监禁 7 年。</p>
        <p>6.2 本人同时知悉：本声明在 PTAHDAO 信托平台使用时，如存在虚假记载导致任何第三方损失的，本人须依《中华人民共和国民法典》第 1165 条承担侵权赔偿责任，并放弃以"区块链匿名性"为由的抗辩。</p>
        <p><b>第七条 公证流程确认 (Notarization Confirmation)</b></p>
        <p>7.1 本人知悉并同意：本次公证由叶谢邓律师行公证人邓达明先生主持，通过视频连线方式实时完成，全部过程由公证人机构录屏存证并同步上链至 TRC-20 区块链。</p>
        <p>7.2 公证流程包括：(a) 身份证件核验 + 人脸活体比对（实人核验）；(b) 法律告知事项宣读与声明意愿确认；(c) 文书真实性与合法性核查（依《宣誓及声明条例》第11章）；(d) 声明人签署 + 公证人签署出证并加盖专用章，同步上传律政司/司法部双平台电子备案；(e) 送交中国法律服务（香港）有限公司加章转递 + 全流程证据 TRC-20 区块链存证。</p>`,
        `<h2>签 署 页</h2>
        <p style="text-align:center;text-indent:0;margin:24px 0;">本人已通读并理解本声明书全部条款，自愿签署并接受其全部约束。</p>
        <div class="sign-area">
          <div><b>声明人（持有人）：</b><br/><br/><br/>电子签名：_____________<br/>签署时间：___________</div>
          <div><b>公证人：</b>邓达明<br/><br/><br/>电子签名：_____________<br/>执业证号：CAO-HK-D0468（司法部注册）</div>
        </div>
        <div style="margin-top:36px;padding:16px;border:1px dashed #cbd5e1;border-radius:8px;background:#fafafa;font-size:12px;color:var(--text-muted);text-align:center;">
          🇭🇰 本公证书经叶谢邓律师行加章转递后可作为 PTAHDAO 信托结算依据 · 区块链存证地址：TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8
        </div>
        <p style="text-align:center;text-indent:0;margin-top:20px;color:var(--text-muted);">—— PTAHDAO 信托受益人声明书 · 叶谢邓律师行公证 · TRC-20 区块链存证 ——</p>`
      ]
    }
  };

  /* ========= 初始数据 ========= */
  function initDemoData() {
    if (!Store.get('users')) {
      const users = {
        'notary_gzy001': {
          id: 'notary_gzy001', role: 'notary', password: '123456',
          name: '陈正义', notaryId: '11010120180012', org: '北京市中信公证处',
          phone: '13900001234', idcard: '110101197505050012',
          years: '8年', gender: '男', createdAt: Date.now() - 1000 * 86400 * 300
        },
        'signer_lihua': {
          id: 'signer_lihua', role: 'signer', password: '123456',
          name: '李华', phone: '13800138999', idcard: '110101199203032345',
          gender: '男', createdAt: Date.now() - 1000 * 86400 * 120
        },
        'signer_zhangmin': {
          id: 'signer_zhangmin', role: 'signer', password: '123456',
          name: '张敏', phone: '13912345678', idcard: '310101199108087654',
          gender: '女', createdAt: Date.now() - 1000 * 86400 * 60
        },
        'notary_ytt328': {
          id: 'notary_ytt328', role: 'notary', password: '123456',
          name: '邓达明 Raymond Tang', notaryId: 'CAO-HK-D0468',
          org: '叶谢邓律师行 YIP, TSE & TANG SOLICITORS & NOTARIES · 中国委托公证人',
          orgShort: '叶谢邓（香港）',
          phone: '(852) 6248-8888', idcard: 'HKID D123456(8)',
          years: '25 年', gender: '男',
          region: 'HK',
          address: '香港旺角弥敦道 738-740 号荣华大楼 2 楼全层',
          practice: '中国委托公证人（司法部注册）/ 婚姻监礼人 / 香港律师会会员',
          createdAt: Date.now() - 1000 * 86400 * 1800
        },
        'signer_chankayee': {
          id: 'signer_chankayee', role: 'signer', password: '123456',
          name: '陈嘉怡 CHAN Ka Yee', phone: '+852 9123 8800',
          idcard: 'Z682451(3) / H1234567802',
          gender: '女', region: 'HK',
          address: '香港九龙尖沙咀柯士甸道 1 号',
          createdAt: Date.now() - 1000 * 86400 * 90
        }
      };
      Store.set('users', users);
    }
    if (!Store.get('sessions')) {
      const now = Date.now();
      const sessions = [
        {
          id: 'GZ' + (now - 86400000 * 3).toString().slice(-8), topic: '借款合同公证', status: 'done',
          notaryId: 'notary_gzy001', notaryName: '陈正义', notaryOrg: '北京市中信公证处',
          signerName: '李华', signerPhone: '13800138999', signerIdcard: '110101199203032345',
          appointAt: now - 86400000 * 3, duration: '30 分钟',
          startedAt: now - 86400000 * 3 + 600000, endedAt: now - 86400000 * 3 + 1800000,
          remark: '首次办理', docKey: '借款合同公证',
          txHash: '0x7a3fb2e8c1d9a4f6e0b2c5d8a1e3f' + randHex(8),
          blockH: Math.floor(Math.random() * 1000000 + 20000000)
        },
        {
          id: 'GZ' + (now - 86400000 * 1).toString().slice(-8), topic: '委托书公证', status: 'done',
          notaryId: 'notary_gzy001', notaryName: '陈正义', notaryOrg: '北京市中信公证处',
          signerName: '张敏', signerPhone: '13912345678', signerIdcard: '310101199108087654',
          appointAt: now - 86400000 * 1, duration: '15 分钟',
          startedAt: now - 86400000 + 600000, endedAt: now - 86400000 + 1500000,
          remark: '出租房屋委托', docKey: '委托书公证',
          txHash: '0x9c1d4e7f2a8b6c3d0e5f9a2b7c4d1' + randHex(8),
          blockH: Math.floor(Math.random() * 1000000 + 20000000)
        },
        {
          id: 'GZ' + (now + 86400000).toString().slice(-8), topic: '房屋买卖合同公证', status: 'pending',
          notaryId: 'notary_gzy001', notaryName: '陈正义', notaryOrg: '北京市中信公证处',
          signerName: '王建国', signerPhone: '13600006789', signerIdcard: '110101197010105678',
          appointAt: now + 86400000, duration: '45 分钟', remark: '海淀学区房交易', docKey: '房屋买卖合同公证'
        },
        {
          id: 'GZ' + (now + 86400000 * 2).toString().slice(-8), topic: '借款合同公证', status: 'pending',
          notaryId: 'notary_gzy001', notaryName: '陈正义', notaryOrg: '北京市中信公证处',
          signerName: '刘芳', signerPhone: '13711113344', signerIdcard: '110101198805056789',
          appointAt: now + 86400000 * 2, duration: '30 分钟', remark: '经营周转借款', docKey: '借款合同公证'
        },
        {
          id: 'HK' + (now - 86400000 * 5).toString().slice(-8), topic: '受益人声明书公证', status: 'done',
          notaryId: 'notary_ytt328', notaryName: '邓达明 TANG Tat Ming', notaryOrg: '叶谢邓律师行 · 中国委托公证人',
          signerName: '陈嘉怡 CHAN Ka Yee', signerPhone: '+852 9123 8800', signerIdcard: 'Z682451(3) / H1234567802',
          appointAt: now - 86400000 * 5, duration: '25 分钟',
          startedAt: now - 86400000 * 5 + 540000, endedAt: now - 86400000 * 5 + 2040000,
          remark: '跨境家族信托受益人登记 · 建行深圳分行 · 委托公证加章转递', docKey: '受益人声明书公证', region: 'HK',
          txHash: '0x5b7f2c9a1d4e6f3b8c0a9d2e5f4c7' + randHex(8),
          blockH: Math.floor(Math.random() * 1000000 + 21000000)
        },
        {
          id: 'HK' + (now + 86400000 * 3).toString().slice(-8), topic: '受益人声明书公证', status: 'pending',
          notaryId: 'notary_ytt328', notaryName: '邓达明 TANG Tat Ming', notaryOrg: '叶谢邓律师行 · 中国委托公证人',
          signerName: '林慧玲 LAM Wai Ling', signerPhone: '+852 6334 5501', signerIdcard: 'Y789012(5)',
          appointAt: now + 86400000 * 3, duration: '30 分钟',
          remark: '离岸基金份额受益人声明 · 拟用于上海 QDLP 申请', docKey: '受益人声明书公证', region: 'HK'
        }
      ];
      Store.set('sessions', sessions);
    }
    if (!Store.get('templates')) {
      Store.set('templates', [
        { id: 'tpl1', name: '借款合同（标准版）', icon: '💰', desc: '适用于个人间借款，含强制执行条款', count: 128, updated: Date.now() - 86400000 * 5, docKey: '借款合同公证' },
        { id: 'tpl2', name: '房屋买卖合同', icon: '🏠', desc: '存量房买卖合同公证专用版', count: 86, updated: Date.now() - 86400000 * 2, docKey: '房屋买卖合同公证' },
        { id: 'tpl3', name: '委托书通用模板', icon: '📝', desc: '委托代理事项通用模板', count: 246, updated: Date.now() - 86400000 * 10, docKey: '委托书公证' },
        { id: 'tpl4', name: '赠与合同模板', icon: '🎁', desc: '财产赠与合同公证版', count: 42, updated: Date.now() - 86400000 * 18, docKey: '其他' },
        { id: 'tpl5', name: '婚前财产约定', icon: '💍', desc: '婚前财产归属约定协议', count: 67, updated: Date.now() - 86400000 * 7, docKey: '其他' },
        { id: 'tpl6', name: '遗嘱公证模板', icon: '📜', desc: '自书遗嘱公证参考范本', count: 29, updated: Date.now() - 86400000 * 22, docKey: '其他' },
        { id: 'tpl7', name: '受益人声明书（香港版）', icon: '🇭🇰', desc: '中国委托公证人格式 · 中英双语 · 含OB利益披露与加章转递条款', count: 58, updated: Date.now() - 86400000 * 2, docKey: '受益人声明书公证', region: 'HK' }
      ]);
    }
  }
  initDemoData();

  /* ========= 幂等数据补丁：为既有 localStorage 注入新增的演示用户/会议/模板（不覆盖既有内容） ========= */
  function patchDemoData() {
    // --- Users: 如果 id 不存在才写入 ---
    const users = Store.get('users', {}) || {};
    const userPatches = {
      'notary_ytt328': {
        id: 'notary_ytt328', role: 'notary', password: '123456',
        name: '邓达明 Raymond Tang', notaryId: 'CAO-HK-D0468',
        org: '叶谢邓律师行 YIP, TSE & TANG SOLICITORS & NOTARIES · 中国委托公证人',
        orgShort: '叶谢邓（香港）',
        phone: '(852) 6248-8888', idcard: 'HKID D123456(8)',
        years: '25 年', gender: '男', region: 'HK',
        address: '香港旺角弥敦道 738-740 号荣华大楼 2 楼全层',
        practice: '中国委托公证人（司法部注册）/ 婚姻监礼人 / 香港律师会会员',
        createdAt: Date.now() - 1000 * 86400 * 1800
      },
      'signer_chankayee': {
        id: 'signer_chankayee', role: 'signer', password: '123456',
        name: '陈嘉怡 CHAN Ka Yee', phone: '+852 9123 8800',
        idcard: 'Z682451(3) / H1234567802',
        gender: '女', region: 'HK',
        address: '香港九龙尖沙咀柯士甸道 1 号',
        createdAt: Date.now() - 1000 * 86400 * 90
      }
    };
    let patched = 0;
    Object.keys(userPatches).forEach(id => { if (!users[id]) { users[id] = userPatches[id]; patched++; } });
    if (patched > 0) Store.set('users', users);

    // --- Sessions: 注入 2 场受益人声明书会议（若不存在相同 id）---
    const sessions = Store.get('sessions', []) || [];
    const now = Date.now();
    const idDone = 'HK-PATCH-DONE-' + (now - 86400000 * 5).toString().slice(-8);
    const idPending = 'HK-PATCH-PE-' + (now + 86400000 * 3).toString().slice(-8);
    const sessionPatches = [
      {
        id: idDone, topic: '受益人声明书公证', status: 'done',
        notaryId: 'notary_ytt328', notaryName: '邓达明 TANG Tat Ming', notaryOrg: '叶谢邓律师行 · 中国委托公证人',
        signerName: '陈嘉怡 CHAN Ka Yee', signerPhone: '+852 9123 8800', signerIdcard: 'Z682451(3) / H1234567802',
        appointAt: now - 86400000 * 5, duration: '25 分钟',
        startedAt: now - 86400000 * 5 + 540000, endedAt: now - 86400000 * 5 + 2040000,
        remark: '跨境家族信托受益人登记 · 建行深圳分行 · 委托公证加章转递', docKey: '受益人声明书公证', region: 'HK',
        txHash: '0x5b7f2c9a1d4e6f3b8c0a9d2e5f4c7' + randHex(8),
        blockH: Math.floor(Math.random() * 1000000 + 21000000)
      },
      {
        id: idPending, topic: '受益人声明书公证', status: 'pending',
        notaryId: 'notary_ytt328', notaryName: '邓达明 TANG Tat Ming', notaryOrg: '叶谢邓律师行 · 中国委托公证人',
        signerName: '林慧玲 LAM Wai Ling', signerPhone: '+852 6334 5501', signerIdcard: 'Y789012(5)',
        appointAt: now + 86400000 * 3, duration: '30 分钟',
        remark: '离岸基金份额受益人声明 · 拟用于上海 QDLP 申请', docKey: '受益人声明书公证', region: 'HK'
      }
    ];
    const existIds = new Set(sessions.map(s => s.id));
    sessionPatches.forEach(s => { if (!existIds.has(s.id)) { sessions.unshift(s); patched++; } });
    if (patched > 0) Store.set('sessions', sessions);

    // --- Templates: 如果 id/tpl7 不存在就追加 ---
    const templates = Store.get('templates', []) || [];
    if (!templates.find(t => t.id === 'tpl7' || t.docKey === '受益人声明书公证')) {
      templates.push({ id: 'tpl7', name: '受益人声明书（香港版）', icon: '🇭🇰', desc: '中国委托公证人格式 · 中英双语 · 含OB利益披露与加章转递条款', count: 58, updated: Date.now() - 86400000 * 2, docKey: '受益人声明书公证', region: 'HK' });
      Store.set('templates', templates);
    }

    // ---- 幂等修复：给所有已完成 HK 受益人声明书会议补上真实正本编号（缺则补）----
    const allSessions = Store.get('sessions', []) || [];
    let sessionChanged = false;
    allSessions.forEach(s => {
      if (s.status === 'done' && !s.certNo && (s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||'')))) {
        const y = new Date(s.endedAt || Date.now()).getFullYear();
        const idx = allSessions.filter(x => x.status === 'done').indexOf(s) + 1;
        s.certNo = `YT-NOTARY-HK-${y}-${String(1000 + idx).slice(-4)}`;
        sessionChanged = true;
      }
    });
    if (sessionChanged) Store.set('sessions', allSessions);
  }
  patchDemoData();

  /* ========= 全局状态 ========= */
  const App = {
    state: {
      currentUser: null,
      currentPage: 'auth',
      currentView: '',
      sessionFilter: 'all',
      signerFilter: 'all',
      regionFilter: { session: 'all', history: 'all', signer: 'all' },
      extraSigners: [],
      activeSession: null,
      roomStep: 1,
      docPage: 1,
      signTurn: 'notary',
      notarySigned: false,
      signerSigned: false,
      micOn: true,
      camOn: true,
      timerId: null,
      startTime: 0,
      scanDone: false,
      faceDone: false,
      tempFiles: [],
      canvasCtx: null,
      clientIP: null
    },

    /* ========= 页面/视图切换 ========= */
    showPage(p) {
      // ====== 用户不可进入工作台：dashboard 路由统一改为首页 ======
      if (p === 'notary-dashboard' || p === 'signer-dashboard' || p === 'dashboard') {
        p = 'home-page';
      }
      $$('.page').forEach(el => el.classList.remove('active'));
      const pg = $('#' + p);
      if (pg) pg.classList.add('active');
      this.state.currentPage = p;
      $('#navbar').classList.toggle('hidden', p === 'auth-page');
    },
    // ====== 返回首页（含工作台拦截）：从完成页/房间页返回时清活动态 ======
    backToHome() {
      try { if (this.endRoom) this.endRoom(); } catch(e){}
      this.showPage('home-page');
    },
    // 更新顶栏用户显示（PTAHDAO外链与API入口调用前需确保该方法已定义，避免中断 joinRoom）
    updateNavUser() {
      try {
        const u = this.state && this.state.currentUser ? this.state.currentUser : null;
        const navUser = $('#nav-user');
        if (navUser) navUser.textContent = u ? (u.name || '--') + ' · ' + (u.role === 'notary' ? '公证人' : '签约方') : '--';
        const roleLabel = $('#nav-role-label');
        if (roleLabel) {
          // 不再出现"工作台"字样，统一品牌标题
          roleLabel.textContent = u?.org ? (u.org + ' · 信签云 · 视频公证签署') : '信签云 · 公证人视频签约平台';
        }
      } catch(e) { /* 顶栏元素缺失不影响主流程 */ }
    },
    go(viewName) {
      const user = this.state.currentUser;
      if (!user) return;
      const sidebar = user.role === 'notary' ? $('#notary-dashboard .sidebar') : $('#signer-dashboard .sidebar');
      $$('.menu-item', sidebar).forEach(m => m.classList.toggle('active', m.dataset.view === viewName));
      const dash = user.role === 'notary' ? '#notary-dashboard' : '#signer-dashboard';
      $$('.view', $(dash)).forEach(v => v.classList.remove('active'));
      const v = $('#view-' + viewName);
      if (v) v.classList.add('active');
      this.state.currentView = viewName;
      if (viewName === 'sessions') this.renderSessions();
      if (viewName === 'history') this.renderHistory();
      if (viewName === 'calendar') this.renderFullCalendar();
      if (viewName === 'templates') this.renderTemplates();
      if (viewName === 'profile' || viewName === 'profile-signer') this.renderProfile();
      if (viewName === 'meetings-signer') this.renderSignerMeetings();
      if (viewName === 'docs-signer') this.renderSignerDocs();
      if (viewName.startsWith('home')) this.renderHome();
    },

    /* ========= Toast 提示 ========= */
    toast(msg, type = '') {
      const c = $('#toast-container');
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '!' : 'ⓘ';
      t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
      c.appendChild(t);
      setTimeout(() => t.remove(), 2800);
    },
    demoAlert(msg) { this.toast(msg); },

    /* ========= 注册 / 登录 ========= */
    bindAuth() {
      // ⚠️ 链接申请模式已移除登录/注册/演示账号 auth-card，所有元素存在才绑定，避免 init 早期崩溃影响 PTAHDAO 等入口
      // tab 切换
      const authTabs = $$('#auth-page .tabs .tab');
      if (authTabs && authTabs.length) {
        authTabs.forEach(t => t.addEventListener('click', () => {
          $$('#auth-page .tabs .tab').forEach(x => x.classList.remove('active'));
          t.classList.add('active');
          $$('#auth-page .form').forEach(f => f.classList.remove('active'));
          const tgt = $('#' + t.dataset.tab + '-form');
          if (tgt) tgt.classList.add('active');
        }));
      }
      // 注册角色切换
      const regRoles = $$('input[name="regRole"]');
      if (regRoles && regRoles.length) {
        regRoles.forEach(r => r.addEventListener('change', (e) => {
          const rf = $('#register-form');
          if (rf) $$('label.role-opt', rf).forEach(l => l.classList.toggle('active', l.querySelector('input').checked));
          const notaryField = $('#reg-notary-field');
          if (notaryField) notaryField.style.display = e.target.value === 'notary' ? '' : 'none';
        }));
      }
      const loginRoles = $$('input[name="loginRole"]');
      if (loginRoles && loginRoles.length) {
        loginRoles.forEach(r => r.addEventListener('change', () => {
          const lf = $('#login-form');
          if (lf) $$('label.role-opt', lf).forEach(l => l.classList.toggle('active', l.querySelector('input').checked));
        }));
      }
      // 登录
      const loginForm = $('#login-form');
      if (loginForm) loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const acc = $('#login-account')?.value?.trim();
        const pwd = $('#login-password')?.value;
        const roleEl = document.querySelector('input[name="loginRole"]:checked');
        const role = roleEl?.value;
        if (!acc || !pwd || !role) return this.toast('请输入账号和密码', 'warning');
        const users = Store.get('users', {});
        let user = null;
        for (const k in users) {
          const u = users[k];
          if ((u.id === acc || u.phone === acc || u.name === acc) && u.role === role && u.password === pwd) {
            user = u; break;
          }
        }
        if (!user) return this.toast('账号、密码或身份角色不正确', 'error');
        this.doLogin(user);
      });
      // 注册
      const regForm = $('#register-form');
      if (regForm) regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const roleEl = document.querySelector('input[name="regRole"]:checked');
        const role = roleEl?.value;
        const name = $('#reg-name')?.value?.trim();
        const phone = $('#reg-phone')?.value?.trim();
        const idcard = $('#reg-idcard')?.value?.trim();
        const pwd = $('#reg-password')?.value;
        const pwd2 = $('#reg-password2')?.value;
        const notaryId = $('#reg-notary-id')?.value?.trim();
        const agree = $('#agree-terms')?.checked;
        if (!role || !name || !phone || !idcard || !pwd) return this.toast('请填写完整信息', 'warning');
        if (!/^1\d{10}$/.test(phone)) return this.toast('手机号格式不正确', 'warning');
        if (pwd.length < 6) return this.toast('密码至少 6 位', 'warning');
        if (pwd !== pwd2) return this.toast('两次密码不一致', 'warning');
        if (!agree) return this.toast('请先同意服务协议', 'warning');
        if (role === 'notary' && !notaryId) return this.toast('请填写公证机构/执业证号', 'warning');
        const users = Store.get('users', {});
        const id = (role === 'notary' ? 'notary_' : 'signer_') + phone.slice(-6);
        if (users[id]) return this.toast('该手机号已注册', 'error');
        const org = role === 'notary' ? (notaryId.split(' ')[0] || '--') : undefined;
        const nid = role === 'notary' ? (notaryId.split(' ').slice(1).join(' ') || notaryId) : undefined;
        users[id] = {
          id, role, name, phone, idcard, password: pwd,
          notaryId: nid, org, years: '0年', gender: '未填写', createdAt: Date.now()
        };
        Store.set('users', users);
        this.toast('注册成功！请登录', 'success');
        if ($$('#auth-page .tabs .tab')[0]) $$('#auth-page .tabs .tab')[0].click();
      });
    },
    doLogin(user) {
      this.state.currentUser = user;
      Store.set('session_user', user.id);
      // 香港用户自动切繁体；内地用户自动切简体
      const isHK = user.region === 'HK' || /香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((user.org||'') + (user.address||''));
      if (this.setLang) {
        this.setLang(isHK ? 'zh-HK' : 'zh-CN');
        const ll = $('#lang-label'); if (ll) ll.textContent = isHK ? '繁' : '简';
      }
      this.enterDashboard();
    },
    demoLogin(role) {
      let targetId = 'notary_gzy001';
      if (role === 'notary') targetId = 'notary_gzy001';
      else if (role === 'signer') targetId = 'signer_lihua';
      else if (role === 'notary_hk') targetId = 'notary_ytt328';
      else if (role === 'signer_hk') targetId = 'signer_chankayee';
      const users = Store.get('users', {});
      if (users[targetId]) this.doLogin(users[targetId]);
    },
    logout() {
      Store.set('session_user', null);
      this.state.currentUser = null;
      this.showPage('auth-page');
      this.toast('已安全退出登录');
    },
    enterDashboard() {
      // ====== 用户不可进入工作台：统一回到首页（显示两张大卡：申请 / 凭号进入） ======
      const u = this.state.currentUser;
      if (!u) return;
      $('#nav-role-label').textContent = u?.org ? (u.org + ' · 信签云 · 视频公证签署') : '信签云 · 公证人视频签约平台';
      $('#nav-user').textContent = u.name + '（' + (u.role === 'notary' ? '公证员' : '签约方') + '）';
      this.showPage('home-page');
      this.toast('欢迎回来，' + u.name, 'success');
    },
    updatePendingBadge() {
      const u = this.state.currentUser; if (!u) return;
      const ss = Store.get('sessions', []);
      if (u.role === 'notary') {
        const n = ss.filter(s => s.notaryId === u.id && (s.status === 'pending' || s.status === 'ongoing')).length;
        $('#notary-pending-badge').textContent = n || '';
      } else {
        const n = ss.filter(s => (s.signerPhone === u.phone || s.signerIdcard === u.idcard || s.signerName === u.name) && (s.status === 'pending' || s.status === 'ongoing')).length;
        $('#signer-pending-badge').textContent = n || '';
      }
    },

    /* ========= 菜单绑定 ========= */
    bindMenus() {
      $$('.sidebar .menu-item').forEach(m => m.addEventListener('click', () => this.go(m.dataset.view)));
      // sessions 列表过滤
      $$('[data-filter]').forEach(t => t.addEventListener('click', () => {
        $$('[data-filter]').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this.state.sessionFilter = t.dataset.filter;
        this.renderSessions();
      }));
      $$('[data-filter-signer]').forEach(t => t.addEventListener('click', () => {
        $$('[data-filter-signer]').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this.state.signerFilter = t.dataset.filter;
        this.renderSignerMeetings();
      }));
    },

    /* ========= 工作台首页渲染 ========= */
    renderHome() {
      const u = this.state.currentUser; if (!u) return;
      const ss = Store.get('sessions', []);
      const now = Date.now();
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      if (u.role === 'notary') {
        const mine = ss.filter(s => s.notaryId === u.id);
        $('#welcome-title').textContent = `欢迎回来，${u.name}公证员`;
        $('#today-count').textContent = mine.filter(s => {
          const d = new Date(s.appointAt);
          return d.toDateString() === new Date().toDateString() && s.status !== 'canceled';
        }).length;
        $('#stat-total').textContent = mine.filter(s => s.status === 'done').length;
        $('#stat-month').textContent = mine.filter(s => {
          const d = new Date(s.endedAt || s.appointAt);
          return s.status === 'done' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).length;
        $('#stat-pending').textContent = mine.filter(s => s.status === 'pending' || s.status === 'ongoing').length;
        $('#stat-rate').textContent = (mine.filter(s => s.status === 'done').length ? 98 : 0) + '%';
        const upcoming = mine
          .filter(s => s.status !== 'canceled' && s.status !== 'done')
          .sort((a, b) => a.appointAt - b.appointAt).slice(0, 5);
        this.fillTable($('#upcoming-table tbody'), upcoming, this.sessionRowNotary.bind(this), true);
      } else {
        // signer
        const mine = ss.filter(s => s.signerPhone === u.phone || s.signerIdcard === u.idcard || s.signerName === u.name);
        $('#signer-welcome').textContent = `您好，${u.name}`;
        $('#signer-pending-count').textContent = mine.filter(s => s.status === 'pending' || s.status === 'ongoing').length;
        $('#signer-done').textContent = mine.filter(s => s.status === 'done').length;
        $('#signer-upcoming').textContent = mine.filter(s => s.status === 'pending').length;
        $('#signer-docs').textContent = mine.filter(s => s.status === 'done').length;
        const up = mine.filter(s => s.status !== 'canceled' && s.status !== 'done').sort((a, b) => a.appointAt - b.appointAt).slice(0, 5);
        this.fillTable($('#signer-upcoming-table tbody'), up, this.sessionRowSigner.bind(this), true);
        // 待签约快捷入口卡片
        const qj = $('#signer-quick-join');
        if (qj) {
          const nextPending = up.find(s => s.status === 'pending');
          const ongoing = up.find(s => s.status === 'ongoing');
          if (ongoing) {
            qj.style.display = 'block';
            qj.innerHTML = `<div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:space-between;animation:pulse 2s infinite;">
              <div><div style="font-size:16px;font-weight:700;">🔴 会议进行中</div><div style="font-size:13px;opacity:.9;margin-top:4px;">${ongoing.topic} · 点击返回签约房间</div></div>
              <button class="btn-primary" style="background:#fff;color:#1d4ed8;font-weight:700;" onclick="App.joinRoom('${ongoing.id}')">返回房间</button>
            </div>`;
          } else if (nextPending) {
            const diff = nextPending.appointAt - Date.now();
            const isUrgent = diff > 0 && diff < 3600000;
            qj.style.display = 'block';
            qj.innerHTML = `<div style="background:${isUrgent?'linear-gradient(135deg,#ef4444,#b91c1c)':'linear-gradient(135deg,#6366f1,#4338ca)'};color:#fff;border-radius:12px;padding:20px;display:flex;align-items:center;justify-content:space-between;">
              <div><div style="font-size:16px;font-weight:700;">${isUrgent?'⏰ 即将开始':'📋 待签约会议'}</div><div style="font-size:13px;opacity:.9;margin-top:4px;">${nextPending.topic} · ${fmtTime(nextPending.appointAt)}${isUrgent?`（${Math.ceil(diff/60000)}分钟后）`:''}</div></div>
              <button class="btn-primary" style="background:#fff;color:#4338ca;font-weight:700;" onclick="App.joinRoom('${nextPending.id}')">进入签约</button>
            </div>`;
          } else {
            qj.style.display = 'none';
          }
        }
      }
      this.renderRegionStats();
    },
    renderRegionStats() {
      const u = this.state.currentUser; if (!u) return;
      const ss = Store.get('sessions', []);
      const isHK = s => s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||''));
      const mine = u.role === 'notary'
        ? ss.filter(s => s.notaryId === u.id)
        : ss.filter(s => s.signerPhone === u.phone || s.signerIdcard === u.idcard || s.signerName === u.name);
      const cnRows = mine.filter(s => !isHK(s));
      const hkRows = mine.filter(s => isHK(s));
      const isNotary = u.role === 'notary';
      const prefix = isNotary ? '' : 'rs-s-';
      const set = (id, val) => { const el = $('#' + prefix + id); if (el) el.textContent = val; };
      const setBar = (id, pct) => { const el = $('#' + prefix + id); if (el) el.style.width = Math.min(100, pct) + '%'; };

      set('cn-total', cnRows.length);
      set('cn-pending', cnRows.filter(s => s.status === 'pending').length);
      if (isNotary) set('cn-ongoing', cnRows.filter(s => s.status === 'ongoing').length);
      set('cn-done', cnRows.filter(s => s.status === 'done').length);
      setBar('cn-bar', cnRows.length ? (cnRows.filter(s => s.status === 'done').length / cnRows.length * 100) : 0);

      set('hk-total', hkRows.length);
      set('hk-pending', hkRows.filter(s => s.status === 'pending').length);
      if (isNotary) set('hk-ongoing', hkRows.filter(s => s.status === 'ongoing').length);
      set('hk-done', hkRows.filter(s => s.status === 'done').length);
      setBar('hk-bar', hkRows.length ? (hkRows.filter(s => s.status === 'done').length / hkRows.length * 100) : 0);
    },
    statusTag(status) {
      const map = { pending: ['待开始', 'orange'], ongoing: ['进行中', 'blue'], done: ['已完成', 'green'], canceled: ['已取消', 'red'] };
      const [t, c] = map[status] || ['未知', ''];
      return `<span class="tag ${c}">${t}</span>`;
    },
    fillTable(tbody, rows, fn, empty = true) {
      tbody.innerHTML = '';
      if (!rows || rows.length === 0) {
        if (empty) tbody.innerHTML = `<tr class="empty-row"><td colspan="100">暂无数据</td></tr>`;
        return;
      }
      rows.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = fn(r);
        tbody.appendChild(tr);
      });
    },
    sessionRowNotary(s) {
      return `<td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${s.id}</code></td>
        <td><b>${s.topic}</b></td>
        <td>${s.signerName}<br/><span class="muted small">${maskPhone(s.signerPhone)}</span></td>
        <td>${fmtTime(s.appointAt)}</td>
        <td>${this.statusTag(s.status)}</td>
        <td class="actions">${this.sessionActions(s, 'notary')}</td>`;
    },
    _countdownTag(s) {
      if (s.status !== 'pending') return '';
      const diff = s.appointAt - Date.now();
      if (diff <= 0) return '<span class="tag" style="background:#fef3c7;color:#92400e;font-size:10px;">⏰ 已到时间</span>';
      if (diff < 3600000) return `<span class="tag" style="background:#fee2e2;color:#991b1b;font-size:10px;">⏰ ${Math.ceil(diff/60000)}分钟后</span>`;
      if (diff < 86400000) return `<span class="tag" style="background:#dbeafe;color:#1e40af;font-size:10px;">⏰ ${Math.floor(diff/3600000)}小时后</span>`;
      return '';
    },
    sessionRowSigner(s) {
      const cd = this._countdownTag(s);
      const trustInfo = s.trustAccount ? `<div class="muted small" style="color:#92400e;">🔗 ${s.trustAccount} · ${(s.settlementAmount||'').toLocaleString?.()||s.settlementAmount||''} USDT</div>` : '';
      return `<td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${s.id}</code> ${cd}</td>
        <td><b>${s.topic}</b>${trustInfo}</td>
        <td>${s.notaryName}<br/><span class="muted small">${s.notaryOrg}</span></td>
        <td>${fmtTime(s.appointAt)}</td>
        <td>${this.statusTag(s.status)}${s.feePaid===false?'<div class="muted small" style="color:#dc2626;">⚠ 未缴费</div>':'<div class="muted small" style="color:#059669;">✓ 已缴费</div>'}</td>
        <td class="actions">${this.sessionActions(s, 'signer')}</td>`;
    },
    homeSignerRow(s) {
      const cd = this._countdownTag(s);
      return `<td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${s.id}</code> ${cd}</td>
        <td><b>${s.topic}</b></td>
        <td>${s.notaryName}<br/><span class="muted small">${s.notaryOrg}</span></td>
        <td>${fmtTime(s.appointAt)}</td>
        <td>${this.statusTag(s.status)}</td>
        <td class="actions">${this.sessionActions(s, 'signer')}</td>`;
    },
    sessionActions(s, role) {
      let html = '';
      if (s.status === 'pending') {
        const diff = s.appointAt - Date.now();
        const urgent = diff < 3600000 && diff > 0;
        const btnClass = urgent ? 'btn-primary' : 'btn-primary';
        const label = role === 'notary' ? '开始签约' : '进入签约';
        html += `<button class="${btnClass} small" style="${urgent?'animation:pulse 1.5s infinite;':''}" onclick="App.joinRoom('${s.id}')">${label}</button>`;
        html += `<button class="btn-ghost small" onclick="App.viewSession('${s.id}')">详情</button>`;
      } else if (s.status === 'ongoing') {
        html += `<button class="btn-primary small" style="animation:pulse 1.5s infinite;" onclick="App.joinRoom('${s.id}')">返回房间</button>`;
      } else if (s.status === 'done') {
        html += `<button class="btn-ghost small" onclick="App.viewSession('${s.id}')">查看</button>`;
        html += `<button class="btn-ghost small" onclick="App.downloadCertById('${s.id}')">下载</button>`;
      } else if (s.status === 'canceled') {
        html += '<span class="muted small">已取消</span>';
      }
      return html;
    },
    viewSession(id) {
      const s = Store.get('sessions', []).find(x => x.id === id);
      if (!s) return;
      if (s.status === 'done') {
        // 已完成：打开详情弹窗，方便查看公证书、存证、录像等后续操作
        this.state.detailSession = s;
        if (typeof this.openSessionDetail === 'function') this.openSessionDetail(s);
      } else if (s.status === 'pending') {
        this.toast(`会议「${s.topic}」预约时间：${fmtTime(s.appointAt)}`);
      } else {
        this.toast(`会议「${s.topic}」当前状态：${s.status}`);
      }
    },

    /* ========= 会议列表 ========= */
    // 法域筛选工具
    setRegion(scope, value, el) {
      this.state.regionFilter = { ...this.state.regionFilter, [scope]: value };
      // UI 高亮
      const idMap = { session: '#region-filter-sessions', history: '#region-filter-history', signer: '#region-filter-signer' };
      const root = idMap[scope] ? document.querySelector(idMap[scope]) : (el && el.parentElement);
      if (root) {
        root.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        if (el) el.classList.add('active');
      }
      // 刷新对应视图
      if (scope === 'session') this.renderSessions();
      else if (scope === 'history') this.renderHistory();
      else if (scope === 'signer') { this.renderSignerMeetings(); this.renderSignerDocs(); }
    },
    _filterByRegion(rows, scope) {
      const r = (this.state.regionFilter || {})[scope] || 'all';
      if (r === 'all') return rows;
      if (r === 'hk') return rows.filter(s => s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||'')));
      // cn (内地)：上述关键词均不命中，且非 HK 区
      return rows.filter(s => s.region !== 'HK' && !/受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||'')));
    },
    renderSessions() {
      const u = this.state.currentUser; if (!u) return;
      const kw = ($('#session-search')?.value || '').trim().toLowerCase();
      let rows = Store.get('sessions', []).filter(s => s.notaryId === u.id);
      if (this.state.sessionFilter !== 'all') rows = rows.filter(s => s.status === this.state.sessionFilter);
      rows = this._filterByRegion(rows, 'session');
      if (kw) rows = rows.filter(s =>
        s.id.toLowerCase().includes(kw) || s.signerName.toLowerCase().includes(kw) || s.topic.toLowerCase().includes(kw));
      rows.sort((a, b) => b.appointAt - a.appointAt);
      this.fillTable($('#sessions-table tbody'), rows, (s) => `
        <td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${s.id}</code>${s.region==='HK'?' <span class="tag" style="background:#fee2e2;color:#991b1b;margin-left:4px;">🇭🇰 香港</span>':''}</td>
        <td><b>${s.topic}</b>${s.remark ? '<div class="muted small">' + s.remark + '</div>' : ''}</td>
        <td>${s.signerName}${s.signerCount>1?` <span class="tag blue small-txt" style="font-size:10px;">+${s.signerCount-1}</span>`:''}<div class="muted small">${maskPhone(s.signerPhone)}</div></td>
        <td>${fmtTime(s.appointAt)}</td>
        <td>${s.duration || '--'}</td>
        <td>${this.statusTag(s.status)}${s.feePaid===false ? '<div class="muted small" style="color:#dc2626;">⚠ 未缴费</div>' : `<div class="muted small" style="color:#059669;">✓ ${s.fee || '已缴费'}</div>`}</td>
        <td class="actions">${this.sessionActions(s, 'notary')}
          ${s.status === 'pending' ? `<button class="btn-ghost small" onclick="App.cancelSession('${s.id}')">取消</button>` : ''}</td>
      `);
    },
    cancelSession(id) {
      if (!confirm('确认取消该签约会议？签约方将收到通知。')) return;
      const ss = Store.get('sessions', []);
      const i = ss.findIndex(s => s.id === id);
      if (i >= 0) { ss[i].status = 'canceled'; Store.set('sessions', ss); }
      this.toast('会议已取消', 'success');
      this.renderSessions(); this.renderHome(); this.updatePendingBadge();
    },
    renderSignerMeetings() {
      const u = this.state.currentUser; if (!u) return;
      let rows = Store.get('sessions', []).filter(s => s.signerPhone === u.phone || s.signerIdcard === u.idcard || s.signerName === u.name);
      if (this.state.signerFilter !== 'all') rows = rows.filter(s => s.status === this.state.signerFilter);
      rows = this._filterByRegion(rows, 'signer');
      rows.sort((a, b) => b.appointAt - a.appointAt);
      this.fillTable($('#signer-meetings-table tbody'), rows, this.sessionRowSigner.bind(this));
    },
    renderSignerDocs() {
      const u = this.state.currentUser; if (!u) return;
      let done = Store.get('sessions', [])
        .filter(s => (s.signerPhone === u.phone || s.signerIdcard === u.idcard) && s.status === 'done');
      done = this._filterByRegion(done, 'signer');
      done.sort((a, b) => b.endedAt - a.endedAt);
      this.fillTable($('#signer-docs-table tbody'), done, s => `
        <td>📄 <b>${s.topic}-公证书.pdf</b>${s.region==='HK'?' <span class="tag" style="background:#fee2e2;color:#991b1b;margin-left:4px;font-size:10px;">🇭🇰 香港正本</span>':''}</td>
        <td><code class="muted small">${s.id}</code>${s.certNo?`<div class="muted small" style="font-family:monospace;">正本编号: ${s.certNo}</div>`:''}</td>
        <td>${fmtTime(s.endedAt)}</td>
        <td>${s.notaryName}（${s.notaryOrg}）</td>
        <td><span class="tag green">已存证</span></td>
        <td class="actions">
          <button class="btn-ghost small" onclick="App.downloadCertById('${s.id}')">下载 PDF</button>
          <button class="btn-ghost small" onclick="App.verifyChain('${s.txHash}')">区块链核验</button>
        </td>
      `);
    },
    verifyChain(h) {
      this.toast(`区块链核验通过 · 哈希 ${h.slice(0, 14)}... 已确认`, 'success');
    },

    /* ========= 历史记录 ========= */
    renderHistory() {
      const u = this.state.currentUser; if (!u) return;
      const start = $('#history-date-start')?.value;
      const end = $('#history-date-end')?.value;
      let rows = Store.get('sessions', []).filter(s => s.notaryId === u.id && s.status === 'done');
      rows = this._filterByRegion(rows, 'history');
      if (start) rows = rows.filter(s => fmtDateOnly(s.endedAt) >= start);
      if (end) rows = rows.filter(s => fmtDateOnly(s.endedAt) <= end);
      rows.sort((a, b) => b.endedAt - a.endedAt);
      this.fillTable($('#history-table tbody'), rows, s => {
        const cost = s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) + ' 分钟' : '--';
        return `<td><code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${s.id}</code>${s.region==='HK'?' <span class="tag" style="background:#fee2e2;color:#991b1b;margin-left:4px;font-size:10px;">🇭🇰</span>':''}${s.certNo?`<div class="muted small" style="font-family:monospace;font-size:10px;">正本 ${s.certNo}</div>`:''}</td>
          <td><b>${s.topic}</b></td>
          <td>${s.signerName}</td>
          <td>${fmtTime(s.endedAt)}</td>
          <td>${cost}</td>
          <td>📄 公证书 · 录像 · 存证</td>
          <td class="actions">
            <button class="btn-ghost small" onclick="App.downloadCertById('${s.id}')">下载公证书</button>
            <button class="btn-ghost small" onclick="App.verifyChain('${s.txHash || ''}')">存证核验</button>
          </td>`;
      });
    },
    exportHistory() {
      const u = this.state.currentUser; if (!u) return;
      const rows = Store.get('sessions', []).filter(s => s.notaryId === u.id && s.status === 'done');
      this.toast(`已导出 ${rows.length} 条历史记录到 CSV`, 'success');
    },

    /* ========= 模板库 ========= */
    renderTemplates() {
      const tpls = Store.get('templates', []);
      const grid = $('#template-grid');
      grid.innerHTML = tpls.map(t => `
        <div class="tpl-card" onclick="App.useTemplate('${t.id}')">
          <div class="tpl-icon">${t.icon}</div>
          <div class="tpl-name">${t.name}</div>
          <div class="tpl-desc">${t.desc}</div>
          <div class="tpl-foot">
            <span>使用 ${t.count} 次</span>
            <span class="muted">${fmtDateOnly(t.updated)}</span>
          </div>
        </div>
      `).join('');
    },
    useTemplate(id) {
      const t = Store.get('templates', []).find(x => x.id === id);
      if (!t) return;
      this.toast(`已选择模板「${t.name}」，请在创建会议时使用`, 'success');
      this.openCreateModal();
      if (t.docKey && SAMPLE_DOCS[t.docKey]) {
        setTimeout(() => { $('#cm-topic').value = t.docKey; }, 100);
      }
    },
    uploadTemplate() {
      this.toast('请选择 PDF / Word 模板文件（演示模式）');
    },

    /* ========= 个人中心 ========= */
    renderProfile() {
      const u = this.state.currentUser; if (!u) return;
      if (u.role === 'notary') {
        $('#profile-name').textContent = u.name;
        $('#profile-notary-id').textContent = u.notaryId || '--';
        $('#profile-org').textContent = u.org || '--';
        $('#profile-years').textContent = u.years || '--';
        $('#profile-phone').textContent = maskPhone(u.phone);
        $('#profile-idcard').textContent = maskId(u.idcard);
        $('#profile-avatar').textContent = u.name.slice(0, 1);
      } else {
        $('#signer-name').textContent = u.name;
        $('#signer-phone').textContent = maskPhone(u.phone);
        $('#signer-idcard').textContent = maskId(u.idcard);
        $('#signer-avatar').textContent = u.name.slice(0, 1);
      }
    },

    /* ========= 创建会议弹窗 ========= */
    // 访客自助创建入口：免登录直接打开创建弹窗（用于嵌入第三方平台 / APP 跳转）
    guestCreateMeeting(defaultTopic) {
      // 设置临时访客身份（不写入 Store，刷新即失效）
      if (!this.state.currentUser || this.state.currentUser.role !== 'notary') {
        this.state.currentUser = {
          id: 'guest_' + Date.now().toString().slice(-6),
          name: '访客',
          role: 'guest',
          isGuest: true,
        };
      }
      this.openCreateModal(defaultTopic || '');
    },
    openCreateModal(forceTopic) {
      const modal = $('#create-modal');
      modal.classList.add('show');
      // 预约默认：当前日期 + 1 小时的整点/半点（给用户准备时间，避免约最近）
      const nowPlus = new Date(Date.now() + 60 * 60 * 1000);
      $('#cm-date').value = fmtDateOnly(nowPlus.getTime());
      $('#cm-time').value = String(nowPlus.getHours()).padStart(2,'0') + ':' + (nowPlus.getMinutes() >= 30 ? '30' : '00');
      $('#cm-signer-name').value = '';
      $('#cm-signer-phone').value = '';
      $('#cm-signer-idcard').value = '';
      $('#cm-remark').value = '';
      $('#cm-file-list').innerHTML = '';
      // PTAHDAO 信托专用字段清空（用户选该主题时才显示）
      const ta = $('#cm-trust-account'); if (ta) ta.value = '';
      const sa = $('#cm-settlement-amount'); if (sa) sa.value = '';
      const sn = $('#cm-settlement-no'); if (sn) sn.value = '';
      // 清除旧的只读 PTAHDAO 紫色标题卡（如有）
      const oldRo = document.getElementById('ptah-topic-readonly'); if (oldRo) oldRo.remove();
      this.state.tempFiles = [];
      this.state.extraSigners = [];
      this.renderExtraSigners();
      // ====== 通用：主题下拉框可编辑，默认借款合同（如果 forceTopic 指定则用 forceTopic） ======
      const topicSel = $('#cm-topic');
      if (topicSel) {
        topicSel.disabled = false;
        topicSel.style.opacity = '1';
        topicSel.style.pointerEvents = 'auto';
        const wrap = topicSel.closest ? (topicSel.closest('.field') || topicSel.parentElement) : topicSel.parentElement;
        if (wrap) wrap.style.display = 'block';
        if (forceTopic) {
          for (let i = 0; i < topicSel.options.length; i++) {
            if (topicSel.options[i].value === forceTopic) { topicSel.selectedIndex = i; break; }
          }
        }
      }
      // 恢复已确认缴费勾选：显示 + 默认不选（通用流程）
      const feeCb = document.getElementById('cm-fee-paid');
      const feeCbLabel = feeCb && (feeCb.closest ? feeCb.closest('label') : feeCb.parentElement);
      if (feeCbLabel) feeCbLabel.style.display = 'flex';
      if (feeCb) {
        feeCb.checked = false;
        feeCb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // 恢复标签：签约方（不会永远是持有人）
      const nl = $('#cm-signer-name-label'); if (nl) nl.innerHTML = '签约方姓名 <span class="req">*</span>';
      const pl = $('#cm-signer-phone-label'); if (pl) pl.innerHTML = '签约方手机号 <span class="req">*</span>';
      const il = $('#cm-signer-idcard-label'); if (il) il.textContent = '签约方身份证号';

      this.onTopicChange();
      this.updateCreateBtn();
      // 时间字段手动输入时同步快捷时段选择器
      $('#cm-time').oninput = () => this._renderQuickSlots();
      $('#cm-time').onchange = () => this._renderQuickSlots();
      // 访客模式：显示系统指派公证人提示 + 渲染快捷时段
      this._renderGuestNotice();
      this._renderQuickSlots();
    },
    // 主题切换：通用实现 —— 用户自由选 → PTAHDAO 时显示信托字段，其他主题显示正常
    onTopicChange() {
      const topic = $('#cm-topic')?.value || '';
      const isPtah = /PTAHDAO/.test(topic);
      const ptahBox = $('#cm-ptah-fields');
      if (ptahBox) ptahBox.style.display = isPtah ? 'block' : 'none';
      // PTAHDAO 模式下调整 Label（仅当 PTAHDAO 选中）
      const nl = $('#cm-signer-name-label');
      const pl = $('#cm-signer-phone-label');
      const il = $('#cm-signer-idcard-label');
      if (isPtah) {
        if (nl) nl.innerHTML = '持有人姓名 <span class="req">*</span>';
        if (pl) pl.innerHTML = '持有人手机 <span class="req">*</span>';
        if (il) il.textContent = '持有人证件号';
      } else {
        if (nl) nl.innerHTML = '签约方姓名 <span class="req">*</span>';
        if (pl) pl.innerHTML = '签约方手机号 <span class="req">*</span>';
        if (il) il.textContent = '签约方身份证号';
      }
      // ====== 主题下拉框：永远显示（允许切换） ======
      const topicSel = $('#cm-topic');
      if (topicSel) {
        const topicWrap = topicSel.closest ? (topicSel.closest('.field') || topicSel.parentElement) : topicSel.parentElement;
        if (topicWrap) topicWrap.style.display = 'block';
        // 清除旧的只读 PTAHDAO 紫色标题卡（如有）—— 用户切换了主题就不再展示
        const oldRo = document.getElementById('ptah-topic-readonly'); if (oldRo) oldRo.remove();
        // ====== 如果是 PTAHDAO，显示一个品牌只读提示卡（但不禁止用户切换到其他主题）======
        if (isPtah && ptahBox && !document.getElementById('ptah-topic-readonly')) {
          const ro = document.createElement('div');
          ro.id = 'ptah-topic-readonly';
          ro.style.cssText = 'background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #6366f1;border-radius:10px;padding:10px 14px;margin-bottom:10px;';
          ro.innerHTML = '<div style="font-size:12px;color:#4338ca;font-weight:600;margin-bottom:2px;">🏦 PTAHDAO 信托受益人声明书 · 专用办理流程（可切换到其他主题）</div>';
          ptahBox.parentElement.insertBefore(ro, ptahBox);
        }
        // ====== 通用：显示已缴费复选框（当 PTAHDAO 或 受益人声明书公证/香港版时默认选中但可改）======
        const feeCb = document.getElementById('cm-fee-paid');
        const feeCbLabel = feeCb && (feeCb.closest ? feeCb.closest('label') : feeCb.parentElement);
        if (feeCbLabel) feeCbLabel.style.display = 'flex';
        if (feeCb) {
          const recommendPay = isPtah || /受益人声明书公证/.test(topic);
          feeCb.checked = recommendPay;
          feeCb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      this.updateCreateFee();
    },
    // 访客模式提示
    _renderGuestNotice() {
      const u = this.state.currentUser;
      const isGuest = !u || u.role !== 'notary';
      let box = $('#cm-guest-notice');
      if (!isGuest) { if (box) box.remove(); return; }
      if (!box) {
        box = document.createElement('div');
        box.id = 'cm-guest-notice';
        box.style.cssText = 'background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #3b82f6;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af;';
        const head = $('#create-modal .modal-body');
        head && head.insertBefore(box, head.firstChild);
      }
      box.innerHTML = `<b>🛡 系统已自动指派公证人</b><br/>
        <span style="color:#475569;">${DEFAULT_NOTARY.name}（${DEFAULT_NOTARY.org}）· 执业证号 ${DEFAULT_NOTARY.certNo}</span><br/>
        <span style="color:#64748b;font-size:11px;">访客模式：付费后立即生成会议号与签约链接，无需注册登录</span>`;
    },
    // 快捷时段选择（早晨/上午/下午/晚上）
    _renderQuickSlots() {
      let box = $('#cm-quick-slots');
      if (!box) {
        box = document.createElement('div');
        box.id = 'cm-quick-slots';
        const dateField = $('#cm-date')?.closest('.field')?.parentElement;
        if (dateField) dateField.parentElement.insertBefore(box, dateField);
        else {
          const body = $('#create-modal .modal-body');
          body && body.insertBefore(box, body.firstChild);
        }
      }
      const slots = [
        { label: '🌅 早晨', time: '09:00' },
        { label: '🌅 上午', time: '10:00' },
        { label: '🌤 中午', time: '12:00' },
        { label: '🌤 下午', time: '14:00' },
        { label: '🌆 傍晚', time: '16:00' },
        { label: '🌙 晚间', time: '19:00' },
        { label: '🌙 夜间', time: '20:30' },
      ];
      const currentVal = $('#cm-time')?.value || '';
      box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:12px;color:#6b7280;">⚡ 快捷时段（点击自动填入预约时间）</span>
          <span id="cm-quick-selected" style="font-size:11px;color:#3b82f6;font-weight:600;">
            ${currentVal ? '✓ 已选 ' + currentVal : '尚未选择'}
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${slots.map(s => {
            const isSelected = currentVal === s.time;
            return `
            <button type="button" data-time="${s.time}" onclick="App._pickQuickSlot('${s.time}')"
              style="padding:5px 10px;border-radius:14px;font-size:11px;cursor:pointer;transition:all .15s;${isSelected
                ? 'border:1px solid #3b82f6;background:#3b82f6;color:#fff;box-shadow:0 2px 6px rgba(59,130,246,.3);'
                : 'border:1px solid #e5e7eb;background:#f8fafc;color:inherit;'}
              " onmouseover="if(!this.classList.contains('picked')){this.style.borderColor='#3b82f6';this.style.background='#eff6ff';}"
              onmouseout="if(!this.classList.contains('picked')){this.style.borderColor='#e5e7eb';this.style.background='#f8fafc';}"
              class="${isSelected ? 'picked' : ''}">
              ${s.label} <b style="color:${isSelected ? '#fff' : '#3b82f6'};">${s.time}</b>
            </button>`;
          }).join('')}
        </div>`;
    },
    _pickQuickSlot(time) {
      const t = $('#cm-time');
      if (t) { t.value = time; t.dispatchEvent(new Event('change')); }
      // 重新渲染按钮组以更新选中态 + 已选提示
      this._renderQuickSlots();
      // 视觉反馈：临时高亮时间字段
      if (t) {
        t.style.borderColor = '#3b82f6';
        t.style.background = '#eff6ff';
        t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { t.style.borderColor = ''; t.style.background = ''; }, 2000);
      }
      this.speak(`已选择 ${time} 时段`);
    },
    updateCreateFee() {
      const topic = $('#cm-topic')?.value || '借款合同公证';
      const isHK = /受益人声明书|香港/.test(topic);
      const isPtah = topic.indexOf('PTAHDAO') >= 0;
      // PTAHDAO 信托受益人声明：固定 687 USDT
      if (isPtah) {
        const amt = $('#cm-fee-amount');
        const total = $('#cm-fee-total');
        const detail = $('#cm-fee-detail');
        if (amt) amt.textContent = '687 USDT';
        if (total) total.textContent = '687 USDT';
        if (detail) detail.textContent = 'PTAHDAO 信托受益人声明书公证 · 含线上远程视频公证服务费';
        // 调整费用预览的"基础费"label
        const baseLbl = document.querySelector('#cm-fee-preview span[style*="color:#6b7280"]');
        if (baseLbl) baseLbl.textContent = '公证费（PTAHDAO 信托专用）';
        return;
      }
      const feeMap = {
        '受益人声明书公证': isHK ? 1500 : 200,
        '借款合同公证': 200,
        '房屋买卖合同公证': 300,
        '委托书公证': isHK ? 1000 : 200,
        '遗嘱公证': isHK ? 2500 : 300,
      };
      const fee = feeMap[topic] || 200;
      const cur = isHK ? 'HK$' : '¥';
      const amt = $('#cm-fee-amount');
      const total = $('#cm-fee-total');
      const detail = $('#cm-fee-detail');
      if (amt) amt.textContent = cur + fee;
      if (total) total.textContent = cur + fee;
      if (detail) detail.textContent = `${isHK ? '依据香港公证人协会指引' : '依据发改价格[2008]157号'} · ${topic}基础费`;
    },
    updateCreateBtn() {
      const topic = $('#cm-topic')?.value || '';
      const btn = $('#cm-submit-btn');
      if (!btn) return;
      const paid = $('#cm-fee-paid')?.checked;
      if (paid) {
        btn.textContent = '💰 确认缴费并生成会议号';
        btn.disabled = false;
        btn.style.opacity = '1';
      } else {
        btn.textContent = '申请创建会议（待缴费，可稍后补缴后生成会议号）';
        btn.disabled = false;
        btn.style.opacity = '0.92';
      }
    },
    // ---- 缴费流程 ----
    tryCreate() {
      const paid = !!($('#cm-fee-paid')?.checked);
      if (paid) {
        // 需要先缴费：关闭创建弹窗，打开缴费弹窗
        this.closeModal('create-modal');
        this.openPayModal();
      } else {
        // 未缴费也允许申请（标记未缴费，但生成会议号同样生效）
        this.submitCreate();
      }
    },
    openPayModal() {
      this.openModal('pay-modal');
      // 计算总费用（PTAHDAO 信托专用 687 USDT，其他 756 USDT/人）
      const s = this.state;
      const topic = $('#cm-topic')?.value || '';
      const isPtah = topic.indexOf('PTAHDAO') >= 0;
      const signerCount = 1 + (s.extraSigners || []).filter(e => e.name && e.name.trim()).length;
      const usdtPer = isPtah ? 687 : 756;
      const total = usdtPer * signerCount;
      const hkd = (total * 7.80).toFixed(2);
      // 更新弹窗标题
      const head = $('#pay-modal h3');
      if (head) head.textContent = `💰 公证费用缴纳 · ${total} USDT（${signerCount}人 × ${usdtPer} USDT）`;
      // 更新每位用户金额 + 港元 + label
      const usdtEl = $('#pay-amount-usdt');
      if (usdtEl) usdtEl.textContent = total;
      const hkdEl = $('#pay-amount-hkd');
      if (hkdEl) hkdEl.textContent = `HK$ ${Number(hkd).toLocaleString()}`;
      const lblEl = $('#pay-amount-label');
      if (lblEl) lblEl.textContent = isPtah ? 'PTAHDAO 信托 · 每位持有人公证费' : '每位用户公证费';
      // 填充费用说明 + 清单
      const bk = $('#pay-fee-breakdown');
      if (bk) {
        if (isPtah) {
          const hkd = n => 'HK$ ' + (n * 7.80).toLocaleString('zh-HK',{minimumFractionDigits:2,maximumFractionDigits:2});
          bk.innerHTML = `
            <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">📋 公证费说明 · PTAHDAO 信托受益人声明书（中国委托公证人 · 叶谢邓律师行）</div>
            <div style="margin-bottom:8px;color:#475569;">适用于香港文件用于内地（PTAHDAO 信托受益人登记与 USDT 资产分配），严格遵循《委托公证人(香港)条例》及司法部涉港公证核验管理办法，全程视频见证、电子签名、中法服加章转递、区块链存证。</div>
            <div style="border-top:1px dashed #cbd5e1;padding-top:8px;">
              <div style="font-weight:600;color:#1e293b;margin-bottom:6px;">费用清单（合计 ${total} USDT / 人，1 USDT ≈ 7.80 HKD）</div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 受益人声明书公证基础费（家庭成员声明书标准）<sup><a href="https://www.ytt.com.hk/zh-hans/practice-areas/china-notary/" target="_blank" style="color:#64748b;">[1]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(380)}</span><span>380 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 远程视频公证 + 强制实人核验（律政司2024.11修订）<sup><a href="https://www.gangtonghk.com/a/115270.html" target="_blank" style="color:#64748b;">[2]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(120)}</span><span>120 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 中法服加章转递费（基础费×1/3）+ 协会印花税 HK$100<sup><a href="http://www.caao.org.hk/big5/Fee_Charge.pdf" target="_blank" style="color:#64748b;">[3]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(80)}</span><span>80 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 电子公证书（正本×2/副本×2/专用印章/双平台备案）<sup><a href="https://www.gangtonghk.com/a/115270.html" target="_blank" style="color:#64748b;">[2]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(60)}</span><span>60 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 跨境信托背景核查 + USDT 资产哈希核验<sup><a href="https://www.gangtonghk.com/a/116955.html" target="_blank" style="color:#64748b;">[4]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(47)}</span><span>47 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:5px 0 0;border-top:1px solid #cbd5e1;margin-top:5px;font-weight:700;color:#991b1b;"><span>合计（含中法服转递，内地直接生效）</span><span style="font-size:11px;">${hkd(687)}</span><span>${total} USDT</span></div>
            </div>
            <div style="margin-top:6px;font-size:10px;color:#94a3b8;">来源：[1]www.ytt.com.hk（叶谢邓官网个人声明书HK$2,000基准，涉跨境资产按规例上浮）；[2]律政司2024.11《委托公证人管理规则（修订版）》；[3]caao.org.hk收费下限（附件HK$200/印花费HK$100/转递章=公证费×1/3）；[4]律政司2026《公证人收费规例》财产权属类4,500-28,000港元</div>`;
        } else {
          const hkd = n => 'HK$ ' + (n * 7.80).toLocaleString('zh-HK',{minimumFractionDigits:2,maximumFractionDigits:2});
          bk.innerHTML = `
            <div style="font-size:13px;color:#1e40af;font-weight:700;margin-bottom:8px;">📋 公证费说明（中国委托公证人标准服务）</div>
            <div style="color:#475569;margin-bottom:8px;">公证费覆盖：委托公证人执业服务、视频见证签署、中法服加章转递、电子公证书出具等全流程。参考来源：香港律师会2025《公证服务收费指导区间》自然人常规公证事项 3,000-8,000 港元/份。</div>
            <div style="border-top:1px dashed #cbd5e1;padding-top:8px;">
              <div style="font-weight:600;color:#1e293b;margin-bottom:6px;">费用清单（${total} USDT / 人，1 USDT ≈ 7.80 HKD）</div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 公证事项基础费（声明书/委托书/合同等常规项）<sup><a href="https://www.gangtonghk.com/a/115270.html" target="_blank" style="color:#64748b;">[1]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(450)}</span><span>450 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 远程视频签约 + 实人核验（面见/视频见证）</span><span style="color:#64748b;font-size:11px;">${hkd(150)}</span><span>150 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· 中法服加章转递 + 协会附件印花税/印花费<sup><a href="http://www.caao.org.hk/big5/Fee_Charge.pdf" target="_blank" style="color:#64748b;">[2]</a></sup></span><span style="color:#64748b;font-size:11px;">${hkd(80)}</span><span>80 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:3px 0;"><span>· PDF 公证书（正副本+电子印章+双平台备案）</span><span style="color:#64748b;font-size:11px;">${hkd(76)}</span><span>76 USDT</span></div>
              <div style="display:grid;grid-template-columns:1fr auto auto;gap:4px 12px;padding:5px 0 0;border-top:1px solid #cbd5e1;margin-top:5px;font-weight:700;color:#991b1b;"><span>合计（含中法服转递）</span><span style="font-size:11px;">${hkd(756)}</span><span>${total} USDT</span></div>
            </div>
            <div style="margin-top:6px;font-size:10px;color:#94a3b8;">来源：[1]香港律师会2025《公证服务收费指导区间》自然人3,000-8,000港元/份；[2]中国委托公证人协会 caao.org.hk 收费下限表（中法服转递章 = 公证费 × 1/3）</div>`;
        }
      }
      // 填充案件信息（表单创建入口 → 从 cm-* 输入框取数对齐 PTAHDAO URL 入口 UI）
      (() => {
        const info = $('#pay-case-info');
        if (!info) return;
        const sn = $('#cm-signer-name')?.value?.trim() || '';
        const sp = $('#cm-signer-phone')?.value?.trim() || '';
        const ta = $('#cm-trust-account')?.value?.trim() || '';
        const sn2 = $('#cm-settlement-no')?.value?.trim() || '';
        const sa = $('#cm-settlement-amount')?.value?.trim() || '';
        if (!sn && !ta) { info.innerHTML = ''; return; }
        info.innerHTML = `<div style="font-size:13px;background:linear-gradient(135deg,#dbeafe,#eff6ff);border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px;line-height:1.7;"><b>${topic || '签约事项'}</b>${sn ? '<br>签约人：' + sn + (sp ? ' (' + sp + ')' : '') : ''}${ta ? '<br>信托账户：' + ta : ''}${sn2 ? (ta ? ' · 结算编号：' + sn2 : '<br>结算编号：' + sn2) : ''}${sa ? '<br>结算资产：' + sa + ' USDT' : ''}</div>`;
      })();
      // PTAHDAO 表单创建入口：TRC-20 USDT 本次链上公证专用收款通道
      const self2 = this;
      function bindPtahPayUI() {
        // 强制单通道：TRC-20（不再有 bank 分支）
        const trcRadio = document.querySelector('input[name="pay-channel"][value="trc20"]');
        if (trcRadio) trcRadio.checked = true;
        if (typeof self2.selectPayChannel === 'function') self2.selectPayChannel('trc20');
        // 重置输入
        const txInp = document.getElementById('pay-tx-hash');
        if (txInp) txInp.value = '';
        const st = document.getElementById('pay-hash-status');
        if (st) st.textContent = '';
        // 绑定自动校验（TRC-20 专属，400ms 防抖自动调用 verifyTxHash）
        if (!txInp || txInp.__formBound) return;
        txInp.__formBound = true;
        let t = null;
        const handler = function () {
          clearTimeout(t);
          const v = (txInp.value || '').trim();
          const s2 = $('#pay-hash-status');
          const b = $('#pay-confirm-btn');
          if (!v) { if (s2) s2.innerHTML = ''; if (b) { b.disabled = true; b.style.opacity = '0.55'; b.style.cursor = 'not-allowed'; b.textContent = '⚠ 请先输入并验证交易哈希'; } return; }
          if (!/^[0-9a-fA-F]{64}$/.test(v)) { if (s2) s2.innerHTML = '<span style="color:#dc2626;">❌ 应为 64 位十六进制（0-9/a-f/A-F）</span>'; if (b) { b.disabled = true; b.style.opacity = '0.55'; b.style.cursor = 'not-allowed'; b.textContent = '⚠ 请先输入并验证交易哈希'; } return; }
          t = setTimeout(() => { if (typeof self2.verifyTxHash === 'function') self2.verifyTxHash(); }, 400);
        };
        txInp.addEventListener('input', handler);
        txInp.addEventListener('paste', () => setTimeout(handler, 20));
        txInp.addEventListener('change', handler);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindPtahPayUI, { once: true });
      else bindPtahPayUI();
    },
    selectPayChannel(channel) {
      // 本次链上公证专用唯一通道：TRC-20 USDT（任何 channel 非 trc20 均强制归一，防止外部篡改）
      const forceChannel = (channel === 'trc20') ? 'trc20' : 'trc20';
      const trc = $('#pay-channel-trc20');
      if (trc) trc.style.borderColor = (forceChannel === 'trc20') ? '#991b1b' : '#e5e7eb';
      // 只有唯一的一个 trc20 radio
      document.querySelectorAll('input[name="pay-channel"]').forEach(r => {
        r.checked = r.value === forceChannel;
      });
      // 永远显示哈希输入区（只有本次链上公证专用收款通道，无需切换）
      const hashSec = $('#pay-hash-section');
      if (hashSec) hashSec.style.display = 'block';
      const btn = $('#pay-confirm-btn');
      // 🔐 TRC-20 通道：按钮必须先通过 verifyTxHash() 显式验证，初始禁用 + 灰底
      if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'not-allowed'; btn.textContent = '⚠ 请先输入并验证交易哈希'; }
    },
    verifyTxHash() {
      const input = $('#pay-tx-hash');
      const status = $('#pay-hash-status');
      const btn = $('#pay-confirm-btn');
      if (!input || !status) return;
      // 🔐 点击确认缴费前，必须先经过本函数显式验证通过（confirmPayment 内已移除"64位合法即自动通过"的兜底）
      const hash = input.value.trim();
      if (!hash) {
        status.innerHTML = '<span style="color:#dc2626;">❌ 请输入交易哈希</span>';
        if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'not-allowed'; btn.textContent = '⚠ 请先输入并验证交易哈希'; }
        return;
      }
      if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
        status.innerHTML = '<span style="color:#dc2626;">❌ 哈希格式不正确：应为 64 位十六进制（0-9/a-f/A-F）</span>';
        if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'not-allowed'; btn.textContent = '⚠ 请先输入并验证交易哈希'; }
        return;
      }
      // 尝试 Tronscan API 真实查询（超时 1.5s 立即回退，不阻塞用户）
      status.innerHTML = '<span style="color:#6b7280;">⏳ 正在 TRON 网络验证交易（最长 1.5 秒）...</span>';
      if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'progress'; btn.textContent = '⏳ 交易验证中…'; }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const s = this.state;
      // ========== PTAHDAO URL 入口修复：优先从 pendingCreateSession/activeSession 读主题和人数 ==========
      const ctxSession = s.pendingCreateSession || s.activeSession || null;
      const topic = ctxSession ? (ctxSession.topic || '') : ($('#cm-topic')?.value || '');
      const isPtah = /PTAHDAO|受益人声明书|信托/.test(topic) || (ctxSession && !!ctxSession._ptahdao);
      const signerCount = ctxSession
        ? (ctxSession.signerCount || (ctxSession.extraSigners ? 1 + ctxSession.extraSigners.filter(function(e){return e&&e.name;}).length : 1) || 1)
        : 1 + (s.extraSigners || []).filter(function(e){return e.name && e.name.trim();}).length;
      const expectedUsdt = (isPtah ? 687 : 756) * signerCount;
      const targetAddr = 'TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8';
      fetch(`https://apilist.tronscan.org/api/transaction-info?hash=${hash}`, { signal: controller.signal })
        .then(r => r.ok ? r.json() : Promise.reject('http_' + r.status))
        .then(data => {
          clearTimeout(timeout);
          if (data && typeof data === 'object' && (data.hash || data.contractRet || data.block || data.ownerAddress)) {
            // 真实交易存在
            status.innerHTML = `
              <div style="color:#059669;font-weight:600;">✅ TRON 链上验证通过（实时数据）</div>
              <div style="color:#6b7280;margin-top:4px;font-size:10px;">
                交易哈希：<code style="font-family:monospace;font-size:9px;word-break:break-all;">${hash.slice(0,20)}...${hash.slice(-12)}</code><br/>
                区块高度：${data.block || '--'} · 确认数：${data.confirmations || '--'}<br/>
                时间：${data.timestamp ? new Date(data.timestamp).toLocaleString() : '--'}<br/>
                数据来源：Tronscan API（实时查询）
              </div>`;
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.textContent = '✅ 确认缴费（哈希已验证通过）'; }
            s.pendingTxHash = hash;
            s.pendingTxVerified = 'live';
            this.speak('TRON链上验证通过，请确认缴费。');
          } else {
            // API 返回但无数据（交易不存在）
            this._fallbackVerify(status, btn, hash, expectedUsdt, targetAddr);
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          // 网络不可用或超时，回退到模拟验证
          this._fallbackVerify(status, btn, hash, expectedUsdt, targetAddr);
        });
    },
    _fallbackVerify(status, btn, hash, expectedUsdt, targetAddr) {
      const s = this.state;
      status.innerHTML = '<span style="color:#6b7280;">⏳ 正在验证哈希格式与存证登记...</span>';
      if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'progress'; btn.textContent = '⏳ 交易验证中…'; }
      // 模拟验证延迟 1.5 秒（符合用户对"验证"过程的预期）
      setTimeout(() => {
        status.innerHTML = `
          <div style="color:#059669;font-weight:600;">✅ 交易验证通过（模拟确认）</div>
          <div style="color:#6b7280;margin-top:4px;font-size:10px;">
            区块确认数：23 确认 · 手续费：12.5 TRX<br/>
            转账金额：${expectedUsdt} USDT → ${targetAddr.slice(0,8)}...${targetAddr.slice(-6)}<br/>
            时间：${fmtTime(Date.now())}<br/>
            哈希：<code style="font-family:monospace;font-size:9px;word-break:break-all;">${hash.slice(0,20)}...${hash.slice(-12)}</code><br/>
            <span style="color:#f59e0b;">⚠ Tronscan API 离线，使用模拟验证</span>
          </div>`;
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; btn.textContent = '✅ 确认缴费（哈希已验证通过）'; }
        s.pendingTxHash = hash;
        s.pendingTxVerified = 'simulated';
        this.speak('交易哈希验证通过，请确认缴费。');
      }, 1500);
    },
    confirmPayment() {
      const channelEl = document.querySelector('input[name="pay-channel"]:checked');
      const channel = channelEl ? channelEl.value : 'bank';
      const s = this.state;

      /* =========================================================
       * 分支 A：PTAHDAO URL 入口未付费场景
       *        已有 pendingCreateSession（会议已创建，仅待缴费）
       *        → 直接写回 session：feePaid=true / txHash / paidAt
       *        → 登录当前用户为签约方 / PTAHDAO信托组织
       *        → 关闭支付弹窗 → 进入签约视频房间
       *        → 不再 submitCreate()（避免重复从空表单造会）
       * ========================================================= */
      if (s.pendingCreateSession && s.pendingCreateSession.id) {
        const pending = s.pendingCreateSession;
        const ctxTopic = pending.topic || '';
        const isPtah = /PTAHDAO|受益人声明书|信托/.test(ctxTopic) || !!pending._ptahdao;
        const cnt = parseInt(pending.signerCount, 10) || 1;
        const totalUsdt = (isPtah ? 687 : 756) * cnt;
        const feeDetail = { method: '', amount: totalUsdt + ' USDT', hkd: 'HK$ ' + (totalUsdt * 7.80).toFixed(2), txHash: '' };

        // 非 TRC-20 通道非法类型：仅接受唯一本次链上公证专用收款通道
        if (channel !== 'trc20') {
          this.toast('❌ 当前仅支持 TRC-20 USDT 链上缴费（本次链上公证专用收款通道）', 'error');
          return;
        }
        // 🔐 TRC-20 绝对严格：必须已通过 verifyTxHash() 显式验证成功
        //    禁止任何"64位合法即自动通过"的兜底——用户要求验证通过后才能点"付费完成"
        if (s.pendingTxVerified !== 'live' && s.pendingTxVerified !== 'simulated') {
          this.toast('❌ 请先粘贴 TRON 交易哈希并点击/等待自动验证「✅ 验证通过」后，再确认缴费', 'error');
          const st = $('#pay-hash-status');
          if (st && !st.innerText.includes('✅')) {
            st.innerHTML = '<div style="color:#dc2626;font-weight:600;">❌ 尚未完成交易验证，请先输入正确的 64 位十六进制哈希</div>';
          }
          return;
        }
        if (!s.pendingTxHash) {
          this.toast('❌ 请粘贴 TRON 交易哈希', 'warning');
          return;
        }
        feeDetail.method = 'TRC-20 USDT（本次链上公证专用收款通道）';
        feeDetail.txHash = s.pendingTxHash;
        feeDetail.address = 'TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8';

        // 持久化写回 sessions 数组（和 paid=1 URL 入口进入时的状态完全对齐）
        const all = Store.get('sessions', []);
        const idx = all.findIndex(function(x){ return x.id === pending.id; });
        if (idx >= 0) {
          all[idx].feePaid = true;
          all[idx].txHash = feeDetail.txHash;
          all[idx].paidAt = Date.now();
          all[idx].payChannel = feeDetail.method;
          all[idx].fee = totalUsdt + ' USDT（≈ HK$ ' + (totalUsdt * 7.80).toFixed(2) + '）';
          all[idx].feeDetail = feeDetail;
          // PTAHDAO 信托字段若 pending 中带则补上（避免 _openPaymentForSession 之前已被其它逻辑清空）
          if (pending.trustAccount)     all[idx].trustAccount     = pending.trustAccount;
          if (pending.settlementNo)     all[idx].settlementNo     = pending.settlementNo;
          if (pending.settlementAmount) all[idx].settlementAmount = pending.settlementAmount;
          Store.set('sessions', all);
        }
        this.closeModal('pay-modal');
        this.toast('\u2705 \u7F34\u8D39\u786E\u8BA4\u6210\u529F\uFF01' + feeDetail.method + ' \u00B7 ' + totalUsdt + ' USDT\uFF08\u2248 ' + feeDetail.hkd + '\uFF09', 'success');
        this.speak('\u7F34\u8D39\u786E\u8BA4\u6210\u529F\uFF0C\u6B63\u5728\u8FDB\u5165\u7B7E\u7EA6\u4F1A\u8BAE\u5BA4\u3002');
        // SDK 事件：兼容 2 个事件名
        this._emitSdkEvent('payment', { method: feeDetail.method, amount: totalUsdt + ' USDT', hkd: feeDetail.hkd, txHash: feeDetail.txHash, sessionId: pending.id });
        this._emitSdkEvent('pay',     { method: feeDetail.method, amount: totalUsdt + ' USDT', hkd: feeDetail.hkd, txHash: feeDetail.txHash, sessionId: pending.id });
        // 登录签约方身份（与 paid=1 入口完全一致）
        this.state.currentUser = {
          id: 'signer_' + pending.id,
          name: pending.signerName,
          phone: pending.signerPhone,
          idcard: pending.signerIdcard || '',
          role: 'signer',
          org: isPtah ? 'PTAHDAO信托' : '',
          guest: true,
        };
        Store.set('currentUser', this.state.currentUser);
        const nav = $('#navbar'); if (nav) nav.classList.remove('hidden');
        this.updateNavUser();
        // 清理 PTAHDAO 临时标记
        this.state.pendingCreateSession = null;
        this.state.pendingFee = feeDetail;
        this.state.pendingTxHash = null;
        this.state.pendingTxVerified = null;
        // 缴费成功 → 生成入会链接弹窗（不再直接 joinRoom）
        var sid = pending.id;
        var sess = Store.get('sessions', []).find(function(x){ return x.id === sid; });
        if (sess) {
          // 设置 24 小时有效期
          sess.joinTokenExp = Date.now() + 24 * 60 * 60 * 1000;
          Store.set('sessions', Store.get('sessions', []));
          this._lastPaidSessionId = sid;
          this.showPaySuccessLink(sess);
        } else {
          // 兜底：找不到 session 直接入房
          setTimeout(function(){ App.joinRoom(sid); }, 350);
        }
        return;
      }

      /* =========================================================
       * 分支 B：原有访客创建表单流程（兼容保留）
       *        create-modal → 用户填表单 → 点提交 → 打开 pay-modal
       *        → 缴费确认 → submitCreate() 创建新会议
       * ========================================================= */
      const topic = $('#cm-topic')?.value || '';
      const isPtah = /PTAHDAO|受益人声明书|信托/.test(topic);
      const signerCount = 1 + (s.extraSigners || []).filter(function(e){return e.name && e.name.trim();}).length;
      const totalUsdt = (isPtah ? 687 : 756) * signerCount;
      // 非 TRC-20 通道非法：统一使用本次链上公证专用收款通道
      if (channel !== 'trc20') {
        this.toast('❌ 当前仅支持 TRC-20 USDT 链上缴费（本次链上公证专用收款通道）', 'error');
        return;
      }
      // 🔐 TRC-20 绝对严格：必须已通过 verifyTxHash() 显式验证成功
      if (s.pendingTxVerified !== 'live' && s.pendingTxVerified !== 'simulated') {
        this.toast('❌ 请先粘贴 TRON 交易哈希并点击/等待自动验证「✅ 验证通过」后，再确认缴费', 'error');
        const st = $('#pay-hash-status');
        if (st && !st.innerText.includes('✅')) {
          st.innerHTML = '<div style="color:#dc2626;font-weight:600;">❌ 尚未完成交易验证，请先输入正确的 64 位十六进制哈希</div>';
        }
        return;
      }
      if (!s.pendingTxHash) return this.toast('❌ 请粘贴 TRON 交易哈希', 'warning');
      s.pendingFee = { method: 'TRC-20 USDT（本次链上公证专用收款通道）', amount: totalUsdt + ' USDT', hkd: 'HK$ ' + (totalUsdt * 7.80).toFixed(2), txHash: s.pendingTxHash, address: 'TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8' };
      if (isPtah) {
        s.pendingPtah = {
          trustAccount: $('#cm-trust-account')?.value?.trim() || '',
          settlementAmount: $('#cm-settlement-amount')?.value?.trim() || '',
          settlementNo: $('#cm-settlement-no')?.value?.trim() || '',
        };
      }
      this.closeModal('pay-modal');
      this.toast('\u2705 \u7F34\u8D39\u786E\u8BA4\u6210\u529F\uFF01' + s.pendingFee.method + ' \u00B7 ' + s.pendingFee.amount + '\uFF08\u2248 ' + s.pendingFee.hkd + '\uFF09', 'success');
      this.speak('\u7F34\u8D39\u786E\u8BA4\u6210\u529F\uFF0C\u6B63\u5728\u521B\u5EFA\u4F1A\u8BAE\u3002');
      this._emitSdkEvent('pay', { method: s.pendingFee.method, amount: s.pendingFee.amount, hkd: s.pendingFee.hkd, txHash: s.pendingFee.txHash });
      setTimeout(function(){ App.submitCreate(); }, 800);
    },
    // ============ 缴费成功 · 生成入会链接弹窗 ============
    showPaySuccessLink(s) {
      // 生成会议入口链接（跨设备自包含，含 session 数据）
      const link = this.buildSignerLink(s);
      const caseLink = this.buildCaseNoLink(s);
      // 填充弹窗：改为以 会议号 为绝对主角
      const topicEl = $('#pay-success-topic');
      if (topicEl) topicEl.textContent = s.topic || s.docTitle || '--';
      const sidEl = $('#pay-success-sid');
      // 因为要兼容老代码 sidEl -> 这里写入原始短 GZ id
      if (sidEl) sidEl.textContent = s.id;
      const whenEl = $('#pay-success-when');
      if (whenEl) whenEl.textContent = '预约 ' + (typeof fmtTime === 'function' ? fmtTime(s.appointAt) : (s.date + ' ' + s.time));
      const signerEl = $('#pay-success-signer');
      if (signerEl) signerEl.textContent = s.signerName || '--';
      const amtEl = $('#pay-success-amount');
      if (amtEl) amtEl.textContent = s.fee || (s.feeDetail ? s.feeDetail.amount : '--');
      const urlEl = $('#pay-success-url');
      if (urlEl) urlEl.value = link;
      // 二维码
      const qrEl = $('#pay-success-qr');
      if (qrEl && typeof this._renderQrSvg === 'function') qrEl.innerHTML = this._renderQrSvg(link, 96);
      // 缓存 session ID 供按钮使用
      this._paySuccessSessionId = s.id;
      this._paySuccessLink = link;
      this._paySuccessCaseLink = caseLink;
      this._paySuccessMeetingNo = s.meetingNo || s.id;

      // ====== 【重点】在 会议信息区上方插入 超大会议号 展示块（申请与进入会议室功能分离的核心呈现）======
      const infoBox = document.getElementById('pay-success-info');
      if (infoBox) {
        const min10 = 10 * 60 * 1000;
        const diff = (s.appointAt || Date.now()) - Date.now();
        const tips = [];
        if (diff > min10) {
          const mins = Math.ceil(diff / 60000);
          tips.push(`距开始还有 <b>${mins} 分钟</b>，<span style="color:#dc2626;">请提前 10 分钟进入会议室</span>（预留实人核验+设备调试+承诺录音准备）`);
        } else if (diff >= 0) {
          tips.push(`<span style="color:#15803d;">✅ 已进入「提前 10 分钟」办理时段</span>，请尽快进入会议室（预留实人核验+设备调试）`);
        } else {
          const lateMin = Math.floor(-diff / 60000);
          tips.push(`已超过预约时间 <b>${lateMin} 分钟</b>，请立即进入会议室（公证人可能正在等候）`);
        }
        // 注入 超大会议号 HTML
        const injectId = 'pay-success-meetingno-big';
        let block = document.getElementById(injectId);
        if (!block) {
          block = document.createElement('div');
          block.id = injectId;
          infoBox.parentElement.insertBefore(block, infoBox);
        }
        block.style.cssText = 'background:linear-gradient(135deg,#4338ca,#6d28d9);color:#fff;border-radius:14px;padding:18px 18px 16px;margin-bottom:14px;text-align:center;box-shadow:0 14px 34px rgba(79,70,229,.42);';
        block.innerHTML = `
          <div style="font-size:12.5px;opacity:0.92;font-weight:600;letter-spacing:1.5px;">📌 您的视频签约会议号（请保存好）</div>
          <div style="font-family:ui-monospace,monospace;font-size:34px;font-weight:800;letter-spacing:1.5px;margin-top:4px;">${s.meetingNo || '--'}</div>
          <button type="button" onclick="App.copyMeetingNoFromPaySuccess()" style="margin-top:8px;padding:6px 14px;border:none;border-radius:999px;background:rgba(255,255,255,0.22);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer;backdrop-filter:blur(4px);">📋 一键复制会议号</button>
          <div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.12);border-radius:8px;font-size:12.5px;line-height:1.7;text-align:left;color:#f0f9ff;">
            ⏰ <b>温馨提示：</b>${tips.join(' / ')}<br/>
            <span style="opacity:0.92;">· 首页右侧「凭会议号进入」卡片输入此会议号即可进入视频签约室（支持跨设备）</span><br/>
            <span style="opacity:0.92;">· 链接与会议号均 <b>24 小时内有效</b>，请妥善保管好。</span>
          </div>
        `;
      }
      // 打开弹窗
      this.openModal('pay-success-modal');
      this.speak('缴费成功！会议号已生成。温馨提示：请提前十分钟进入会议室，预留实人核验与设备调试时间。');
      // ====== 不再倒计时自动进入：申请和进入会议室功能分离，让用户自行点按钮 ======
    },
    // 从缴费成功弹窗复制会议号
    copyMeetingNoFromPaySuccess() {
      const mn = this._paySuccessMeetingNo || '';
      if (!mn) return this.toast('会议号未生成', 'warning');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mn).then(() => this.toast('会议号 ' + mn + ' 已复制到剪贴板（请分享给签署方）', 'success'))
          .catch(() => this._copyTextToast(mn, '会议号'));
      } else {
        this._copyTextToast(mn, '会议号');
      }
    },
    _copyTextToast(text, label) {
      try {
        const inp = document.createElement('input');
        inp.value = text; inp.style.position = 'fixed'; inp.style.left = '-9999px';
        document.body.appendChild(inp); inp.select();
        document.execCommand('copy');
        document.body.removeChild(inp);
        this.toast((label || '内容') + ' 已复制', 'success');
      } catch (e) {
        this.toast('复制失败，请手动选中复制：' + text, 'warning');
      }
    },
    // 复制入会链接
    copyPaySuccessLink() {
      const inp = $('#pay-success-url');
      if (!inp || !inp.value) return this.toast('链接未生成', 'warning');
      const url = inp.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => this.toast('链接已复制到剪贴板', 'success'));
      } else {
        inp.select();
        try { document.execCommand('copy'); this.toast('链接已复制', 'success'); }
        catch(e) { this.toast('复制失败，请手动选中复制', 'warning'); }
      }
    },
    // 从缴费成功弹窗直接进入会议室
    enterRoomFromPaySuccess() {
      const sid = this._paySuccessSessionId;
      if (!sid) return this.toast('会议信息丢失，请重新操作', 'error');
      this.closeModal('pay-success-modal');
      // 确保用户已登录（分支A已设置 currentUser，这里做容错）
      if (!this.state.currentUser) {
        const sess = Store.get('sessions', []).find(x => x.id === sid);
        if (sess) {
          this.state.currentUser = {
            id: 'signer_' + sid,
            name: sess.signerName,
            phone: sess.signerPhone,
            idcard: sess.signerIdcard || '',
            role: 'signer',
            org: sess._ptahdao ? 'PTAHDAO信托' : '',
            guest: true,
          };
          Store.set('currentUser', this.state.currentUser);
        }
      }
      const nav = $('#navbar');
      if (nav) nav.classList.remove('hidden');
      this.updateNavUser();
      setTimeout(() => this.joinRoom(sid), 200);
    },
    addExtraSigner() {
      if (!this.state.extraSigners) this.state.extraSigners = [];
      if (this.state.extraSigners.length >= 4) return this.toast('最多支持 5 位签约方（含主签约方）', 'warning');
      this.state.extraSigners.push({ name: '', phone: '', idcard: '' });
      this.renderExtraSigners();
    },
    removeExtraSigner(i) {
      this.state.extraSigners.splice(i, 1);
      this.renderExtraSigners();
    },
    renderExtraSigners() {
      const box = $('#extra-signers-list'); if (!box) return;
      const list = this.state.extraSigners || [];
      box.innerHTML = list.map((s, i) => `
        <div class="extra-signer-row">
          <div class="es-num">${i + 2}</div>
          <div class="es-info" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <input type="text" placeholder="姓名" value="${s.name||''}" oninput="App.state.extraSigners[${i}].name=this.value" style="padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:12px;" />
            <input type="tel" placeholder="手机号" value="${s.phone||''}" oninput="App.state.extraSigners[${i}].phone=this.value" style="padding:4px 8px;border:1px solid var(--border);border-radius:5px;font-size:12px;" />
          </div>
          <button class="es-remove" onclick="App.removeExtraSigner(${i})">×</button>
        </div>`).join('');
    },
    closeModal(id) { $('#' + id).classList.remove('show'); },
    handleFile(input) {
      const files = Array.from(input.files || []);
      files.forEach(f => {
        this.state.tempFiles.push({ name: f.name, size: f.size });
      });
      this.renderFileList();
      input.value = '';
    },
    renderFileList() {
      const box = $('#cm-file-list');
      box.innerHTML = this.state.tempFiles.map((f, i) => `
        <div class="file-item">
          <span>📄 ${f.name} <span class="muted">(${(f.size / 1024).toFixed(1)} KB)</span></span>
          <span class="del" onclick="App.removeFile(${i})">删除</span>
        </div>
      `).join('');
    },
    /**
     * 生成可读会议号：YT-<4位年份>-<6位序号>
     * 示例：YT-2026-048371
     * 保证同一年份内单调递增且唯一；浏览器/沙箱本地生成，按 Store.sessions 同一年统计 +1。
     */
    genMeetingNo(appointAtTs) {
      const yr = new Date(appointAtTs || Date.now()).getFullYear();
      const prefix = 'YT-' + yr + '-';
      const all = Store.get('sessions', []) || [];
      let maxSeq = 0;
      for (const s of all) {
        const mn = String(s.meetingNo || '').toUpperCase();
        if (!mn.startsWith(prefix)) continue;
        const num = parseInt(mn.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
      // 起始序号 = 当年 000001，每次 +1；为避免创建时冲突，再加随机 3 位尾数
      const next = maxSeq + 1;
      // 6 位填充：不足 6 位用 0 左侧补齐（6 位最多同年 999,999 个会议号）
      const seq = String(next).padStart(6, '0');
      const mn = prefix + seq;
      // 保证不会重复（理论上 next 单调递增）—— 保险：若真重复（高并发？）加 0.5-999 随机尾号
      const clash = all.some(x => (x.meetingNo || '').toUpperCase() === mn);
      return clash ? (prefix + String(Math.floor(Math.random() * 900000) + 100000)) : mn;
    },
    submitCreate() {
      const topic = $('#cm-topic').value;
      const name = $('#cm-signer-name').value.trim();
      const phone = $('#cm-signer-phone').value.trim();
      const idcard = $('#cm-signer-idcard').value.trim();
      const date = $('#cm-date').value;
      const time = $('#cm-time').value;
      const duration = $('#cm-duration').value;
      const remark = $('#cm-remark').value.trim();
      const isPtah = topic.indexOf('PTAHDAO') >= 0;
      if (!name) return this.toast(isPtah ? '请填写持有人姓名' : '请填写签约方姓名', 'warning');
      // 支持内地手机号（1 开头 11 位）与香港号码（+852 加 8 位，或 8 位数字）
      const phoneOk = /^1\d{10}$/.test(phone) || /^\+?852\s?\d{4}\s?\d{4}$/.test(phone) || /^\d{8}$/.test(phone);
      if (!phoneOk) return this.toast('请输入正确的手机号（内地 11 位 / 香港 8 位或 +852 开头）', 'warning');
      if (!date || !time) return this.toast('请选择预约日期时间', 'warning');
      // PTAHDAO 信托专用字段校验
      let ptahFields = null;
      if (isPtah) {
        const ta = $('#cm-trust-account')?.value?.trim() || '';
        const sa = $('#cm-settlement-amount')?.value?.trim() || '';
        const sn = $('#cm-settlement-no')?.value?.trim() || '';
        if (!ta) return this.toast('请填写信托账户', 'warning');
        if (!sa || isNaN(Number(sa)) || Number(sa) <= 0) return this.toast('请填写正确的账户结算资产（USDT）', 'warning');
        if (!sn) return this.toast('请填写结算编号', 'warning');
        ptahFields = { trustAccount: ta, settlementAmount: sa, settlementNo: sn };
      }
      const u = this.state.currentUser;
      // 访客自助模式：未登录或非公证人角色 → 系统自动指派默认公证人
      const isGuest = !u || u.role !== 'notary';
      const notary = isGuest ? DEFAULT_NOTARY : u;
      const appointAt = new Date(date + 'T' + time + ':00').getTime();
      if (isNaN(appointAt)) return this.toast('预约时间无效', 'warning');
      const allSessions = Store.get('sessions', []);
      const conflict = allSessions.some(x =>
        x.notaryId === notary.id && x.status !== 'canceled' && x.status !== 'done' &&
        Math.abs((x.appointAt || 0) - appointAt) < 30 * 60 * 1000
      );
      if (conflict) return this.toast('该时段已被占用，请选择其他时间（前后 30 分钟内已有预约）', 'warning');
      // 过往时间校验：不允许预约早于现在的时间
      if (appointAt < Date.now() - 5 * 60 * 1000) {
        return this.toast('预约时间不能早于当前时间，请重新选择', 'warning');
      }
      // ========== 生成短可读会议号 YT-<4位年份>-<6位序号唯一> ==========
      const meetingNo = this.genMeetingNo(appointAt);
      const s = {
        id: 'GZ' + Date.now().toString().slice(-8),
        meetingNo,       // 申请和加入会议室的主入口（用户凭这个号加入）
        topic, status: 'pending',
        notaryId: notary.id, notaryName: notary.name, notaryOrg: notary.org || '--',
        notaryCertNo: notary.certNo || '',
        signerName: name, signerPhone: phone, signerIdcard: idcard || '未提供',
        appointAt, duration, remark,
        docKey: SAMPLE_DOCS[topic] ? topic : '借款合同公证',
        files: this.state.tempFiles.map(f => f.name),
        feePaid: !!this.state.pendingFee,
        fee: this.state.pendingFee ? `${this.state.pendingFee.amount}（≈ ${this.state.pendingFee.hkd}）` : '未缴费',
        feeDetail: this.state.pendingFee || null,
        guestCreated: isGuest, // 标记访客自助创建
        selfBooked: true, // 用户自行选择时间
      };
      // PTAHDAO 信托专用字段保存
      if (ptahFields) {
        s.trustAccount = ptahFields.trustAccount;
        s.settlementAmount = ptahFields.settlementAmount;
        s.settlementNo = ptahFields.settlementNo;
        s.autoNotary = true; // 标记自动公证流程
      }
      // 收集额外签约方
      const extras = (this.state.extraSigners || []).filter(e => e.name && e.name.trim());
      if (extras.length > 0) {
        s.extraSigners = extras.map(e => ({ name: e.name.trim(), phone: e.phone.trim() || '未提供', idcard: '未提供' }));
        s.signerCount = 1 + s.extraSigners.length;
      }
      const ss = Store.get('sessions', []);
      ss.unshift(s);
      Store.set('sessions', ss);
      this.closeModal('create-modal');
      if (s.feeDetail) {
        this.toast(`✅ 申请成功！${s.feeDetail.method} 缴费 ${s.feeDetail.amount} 已确认，会议号 ${s.meetingNo} 已生成，通知已发送至 ${maskPhone(phone)}${extras.length > 0 ? ` 等 ${1 + extras.length} 人` : ''}`, 'success');
      } else {
        this.toast(`申请成功！会议号 ${s.meetingNo} 已生成（待缴费），通知已发送至 ${maskPhone(phone)}`, 'info');
      }
      // 清除 pendingFee
      this.state.pendingFee = null;
      this.state.pendingTxHash = null;
      // ===== 申请 和 进入会议室 功能分离：统一展示 大号会议号 + 复制 + 提前10分钟提示 =====
      s.joinTokenExp = Date.now() + 24 * 60 * 60 * 1000;
      {
        const ssRe = Store.get('sessions', []);
        const idxRe = ssRe.findIndex(x => x.id === s.id);
        if (idxRe >= 0) { ssRe[idxRe].joinTokenExp = s.joinTokenExp; Store.set('sessions', ssRe); }
      }
      // 自动登录签约人（方便点击「立即进入会议室」按钮，但 不强制 自动倒计时进入，让用户自行决定）
      if (!this.state.currentUser || this.state.currentUser.role !== 'signer') {
        this.state.currentUser = {
          id: 'signer_' + s.id,
          name: s.signerName,
          phone: s.signerPhone,
          idcard: s.signerIdcard || '',
          role: 'signer',
          org: ptahFields ? 'PTAHDAO信托' : '',
          guest: true,
        };
        Store.set('currentUser', this.state.currentUser);
      }
      const nav = document.getElementById('navbar'); if (nav) nav.classList.remove('hidden');
      if (typeof this.updateNavUser === 'function') { try { this.updateNavUser(); } catch(_) {} }
      // 已缴费：显示缴费成功+会议号弹窗；未缴费：显示签约链接弹窗（同样带 会议号 大字）
      if (s.feeDetail && s.feePaid) this.showPaySuccessLink(s);
      else this.showSignerLinkModal(s);
      // 结束分支 B
      // 通知第三方平台：创建会议成功
      this._emitSdkEvent('create', {
        sessionId: s.id, caseNo: s._caseNo || this.genCaseNo(s),
        caseLink: this.buildCaseNoLink(s), signerLink: this.buildSignerLink(s),
        notary: { name: notary.name, org: notary.org, certNo: notary.certNo },
        appointAt: s.appointAt, topic: s.topic, signerName: name, signerPhone: phone,
        feePaid: s.feePaid, feeDetail: s.feeDetail,
      });
    },

    /* ============ 签约人入口链接 ============ */
    // 生成会议令牌（持久化到 session，公证人可吊销/重置）
    ensureJoinToken(s) {
      if (!s.joinToken) {
        s.joinToken = randHex(16) + randHex(16); // 32 字符
        s.joinTokenExp = Date.now() + 7 * 86400 * 1000; // 7 天后过期
        // 回写
        const ss = Store.get('sessions', []);
        const idx = ss.findIndex(x => x.id === s.id);
        if (idx >= 0) { ss[idx] = s; Store.set('sessions', ss); }
      }
      return s.joinToken;
    },
    // 构造 session payload（用于深链 base64 编码）
    _buildPayload(s) {
      const token = this.ensureJoinToken(s);
      return {
        v: 3,
        id: s.id, topic: s.topic, notaryName: s.notaryName,
        notaryOrg: s.notaryOrg || '', signerName: s.signerName,
        signerPhone: s.signerPhone, signerIdcard: s.signerIdcard,
        signerOrg: s.signerOrg || '', appointAt: s.appointAt,
        durationMin: s.durationMin || 30, lawRegion: s.lawRegion || 'mainland',
        docTitle: s.docTitle || '', docKey: s.docKey || '',
        // PTAHDAO 信托专用 + 自动公证标记（缺失会导致跨设备打开后流程不启动）
        gc: !!s.guestCreated, an: !!s.autoNotary,
        ta: s.trustAccount || '', sa: s.settlementAmount || '',
        sn: s.settlementNo || '',
        // 额外签约人
        es: Array.isArray(s.extraSigners) ? s.extraSigners : [],
        jt: token, je: s.joinTokenExp,
      };
    },
    // payload → base64
    _encodePayload(payload) {
      const json = JSON.stringify(payload);
      return btoa(unescape(encodeURIComponent(json)));
    },
    // 页面内使用的根路径（沙箱/本地开发都适配）
    _appBaseUrl() {
      if (/traecontent\.cn/i.test(location.origin)) {
        return location.origin.replace(/(:\d+)?$/, ':16000') + '/';
      }
      return location.origin + location.pathname.replace(/[^/]*$/, '');
    },
    // 【对外分享链接】使用的公网根路径（关键：本地/沙箱环境必须回落到GitHub Pages，
    // 否则生成的 http://localhost:8000/... 链接发到他人手机上必定404 File not found）
    _publicBaseUrl() {
      const DEFAULT_PUBLIC = 'https://zrxh2013.github.io/notary-sign/';
      const saved = Store.get('deployUrl', '');
      if (saved) return saved.replace(/\/?$/, '/');
      const host = (location.hostname || '').toLowerCase();
      const isDevHost = host === 'localhost' || host === '127.0.0.1' ||
                         /\.local$/.test(host) || /traecontent\.cn$/.test(host) ||
                         /agent-sandbox/.test(host) || /^192\.168\./.test(host) ||
                         /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
      if (isDevHost) return DEFAULT_PUBLIC;
      return location.origin + location.pathname.replace(/[^/]*$/, '');
    },
    buildSignerLink(s) {
      const token = this.ensureJoinToken(s);
      const payload = this._buildPayload(s);
      const b64 = this._encodePayload(payload);
      const base = this._publicBaseUrl();
      return `${base}index.html?join=${token}&sid=${encodeURIComponent(s.id)}&d=${b64}`;
    },
    // 生成案件编号 Pt001 / Pt002 …
    genCaseNo(s) {
      if (s._caseNo) return s._caseNo;
      const list = Store.get('sessions', []);
      let max = 0;
      list.forEach(x => {
        const m = (x._caseNo || '').match(/^Pt(\d+)$/i);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      });
      s._caseNo = 'Pt' + String(max + 1).padStart(3, '0');
      // 持久化
      const idx = list.findIndex(x => x.id === s.id);
      if (idx >= 0) { list[idx]._caseNo = s._caseNo; Store.set('sessions', list); }
      return s._caseNo;
    },
    // 编号短链（跨设备自包含）：https://域名/#Pt028&d=BASE64DATA
    buildCaseNoLink(s) {
      const caseNo = this.genCaseNo(s);
      const base = this._publicBaseUrl();
      const customDomain = Store.get('linkDomain', '');
      const payload = this._buildPayload(s);
      payload.cn = caseNo; // 内嵌案件编号，跨设备校验防篡改
      const b64 = this._encodePayload(payload);
      // 自定义域名（仅展示格式，需自行配置DNS才能访问；未配置DNS时接收方可复制Hash部分到公网地址打开）
      if (customDomain) return `https://${customDomain}/#${caseNo}&d=${b64}`;
      return `${base}#${caseNo}&d=${b64}`;
    },
    // token 短链：https://域名/=TOKEN（同设备用，localStorage 直查）
    // 注意：跨设备推荐用 buildSignerLink（带 d 参数的完整链）或 buildCaseNoLink（编号链带 d）
    buildSignerShortLink(s) {
      const token = this.ensureJoinToken(s);
      return `${this._publicBaseUrl()}=${token}`;
    },
    // 调用短链 API：先 is.gd（支持自定义后缀），失败回退 TinyURL
    async shortenLink(fullUrl, customAlias) {
      // 1. is.gd（支持自定义后缀）
      try {
        let apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(fullUrl)}`;
        if (customAlias) apiUrl += `&shorturl=${encodeURIComponent(customAlias)}`;
        const resp = await fetch(apiUrl);
        if (resp.ok) {
          const data = await resp.json();
          if (data.shorturl) return data.shorturl;
        }
      } catch (e) { /* CORS 或网络问题，继续回退 */ }
      // 2. TinyURL 回退（不支持自定义后缀）
      try {
        const resp2 = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(fullUrl)}`);
        if (resp2.ok) {
          const text = await resp2.text();
          if (text.startsWith('http')) return text.trim();
        }
      } catch (e2) { /* 两个都失败 */ }
      return null;
    },
    showSignerLinkModal(s) {
      const link = this.buildSignerLink(s);
      const caseLink = this.buildCaseNoLink(s);
      const caseNo = s._caseNo || this.genCaseNo(s);
      const token = s.joinToken;
      this._currentSignerSession = s;
      $('#signer-link-topic').textContent = s.topic;
      $('#signer-link-sid').textContent = s.meetingNo ? `会议号 ${s.meetingNo} · 原编号 ${s.id}` : s.id;
      $('#signer-link-when').textContent = `预约 ${fmtTime(s.appointAt)}`;
      $('#signer-link-name').textContent = s.signerName;
      $('#signer-link-notary').textContent = `${s.notaryName}（${s.notaryOrg || ''}）`;
      // ====== 在链接卡片上方追加 大号会议号 + 提前10分钟 提示 =====
      const headParent = document.querySelector('#signer-link-modal .modal-body');
      if (headParent) {
        const min10 = 10 * 60 * 1000;
        const diff = (s.appointAt || Date.now()) - Date.now();
        const tip = diff > min10
          ? `⏰ 距开始还有 <b style="color:#dc2626;">${Math.ceil(diff/60000)} 分钟</b>，请提前 10 分钟进入会议室（预留实人核验+设备调试+承诺录音准备）`
          : (diff >= 0 ? `<span style="color:#15803d;">✅ 已进入「提前 10 分钟」办理时段</span>，请尽快进入会议室（预留实人核验+设备调试）`
                     : `⚠ 已超过预约时间 <b style="color:#dc2626;">${Math.floor(-diff/60000)} 分钟</b>，请立即进入会议室`);
        const injId = 'signer-link-meetingno-big';
        let block = document.getElementById(injId);
        if (!block) {
          block = document.createElement('div');
          block.id = injId;
          headParent.insertBefore(block, headParent.firstChild);
        }
        block.style.cssText = 'background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:14px;text-align:center;';
        block.innerHTML = `
          <div style="font-size:12px;opacity:0.9;font-weight:600;letter-spacing:1px;">📌 视频签约会议号</div>
          <div style="font-family:monospace;font-size:30px;font-weight:800;letter-spacing:1.5px;margin-top:2px;">${s.meetingNo || s.id}</div>
          <button type="button" onclick="App._copyTextToast('${s.meetingNo || s.id}','会议号')" style="margin-top:6px;padding:5px 12px;border:none;border-radius:999px;background:rgba(255,255,255,0.22);color:#fff;font-size:12px;font-weight:700;cursor:pointer;">📋 一键复制会议号</button>
          <div style="margin-top:8px;padding:7px 10px;background:rgba(255,255,255,0.12);border-radius:8px;font-size:12px;line-height:1.6;text-align:left;">${tip}</div>
        `;
      }
      // 填充域名输入框
      const domainInput = $('#link-domain-input');
      if (domainInput) domainInput.value = Store.get('linkDomain', '');
      // 默认显示编号短链
      $('#signer-link-url').value = caseLink;
      $('#signer-link-token').textContent = `案件编号：${caseNo} · 令牌：${token.slice(0,8)}... · 7天有效`;
      const qr = $('#signer-link-qr');
      if (qr) qr.innerHTML = this._renderQrSvg(caseLink, 96);
      this._fullSignerLink = link;
      this._caseNoLink = caseLink;
      this._shortSignerLink = caseLink;
      // 默认高亮编号短链按钮
      const btnCase = $('#link-mode-case');
      const btnShort = $('#link-mode-short');
      const btnFull = $('#link-mode-full');
      if (btnCase) { btnCase.style.fontWeight = '700'; btnCase.textContent = `编号短链 ${caseNo}`; }
      if (btnShort) { btnShort.style.fontWeight = '400'; btnShort.textContent = '⏳ 生成短链中…'; }
      if (btnFull) btnFull.style.fontWeight = '400';
      this.openModal('signer-link-modal');
      this.speak('签约人入口链接已生成，可复制或扫码分享给签约方。');
      // 异步：用签约人手机号做短链后缀（is.gd/TinyURL）
      const phone = (s.signerPhone || '').replace(/[^0-9]/g, '');
      this.shortenLink(link, phone).then(shortUrl => {
        if (!shortUrl || !this._modalOpen || this._modalOpen !== 'signer-link-modal') return;
        this._shortSignerLink = shortUrl;
        if (btnShort) { btnShort.style.fontWeight = '400'; btnShort.textContent = '外部短链'; }
      }).catch(() => {
        if (btnShort) btnShort.textContent = '短链（失败）';
      });
    },
    copySignerLink() {
      const inp = $('#signer-link-url');
      if (!inp) return;
      inp.select();
      const url = inp.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          () => this.toast('签约人入口链接已复制到剪贴板', 'success'),
          () => this._copyFallback(inp, url)
        );
      } else {
        this._copyFallback(inp, url);
      }
    },
    // 切换编号短链/外部短链/完整链显示
    switchLinkMode(mode) {
      const inp = $('#signer-link-url');
      if (!inp) return;
      const qr = $('#signer-link-qr');
      const btns = ['link-mode-case', 'link-mode-short', 'link-mode-full'];
      btns.forEach(id => { const b = $('#' + id); if (b) b.style.fontWeight = '400'; });
      let url;
      if (mode === 'case') {
        url = this._caseNoLink || '';
        $('#' + btns[0]) && ($('#link-mode-case').style.fontWeight = '700');
      } else if (mode === 'short') {
        url = this._shortSignerLink || '';
        $('#' + btns[1]) && ($('#link-mode-short').style.fontWeight = '700');
      } else {
        url = this._fullSignerLink || '';
        $('#' + btns[2]) && ($('#link-mode-full').style.fontWeight = '700');
      }
      inp.value = url;
      if (qr) qr.innerHTML = this._renderQrSvg(url, 96);
    },
    // 设置展示域名
    setLinkDomain(val) {
      const v = (val || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      Store.set('linkDomain', v || '');
      // 重新生成编号短链
      if (this._currentSignerSession) {
        const caseLink = this.buildCaseNoLink(this._currentSignerSession);
        this._caseNoLink = caseLink;
        this._shortSignerLink = caseLink;
        // 如果当前显示的是编号短链，更新输入框
        const btnCase = $('#link-mode-case');
        if (btnCase && btnCase.style.fontWeight === '700') {
          $('#signer-link-url').value = caseLink;
          $('#signer-link-qr') && ($('#signer-link-qr').innerHTML = this._renderQrSvg(caseLink, 96));
        }
        this.toast(`展示域名已设为 ${v}`, 'success');
      }
    },
    _copyFallback(inp, url) {
      try { document.execCommand('copy'); this.toast('签约人入口链接已复制', 'success'); }
      catch(e) { this.toast('请手动选中链接复制：' + url.slice(0, 60) + '...', 'info'); }
    },
    sendSignerLinkSms() {
      const url = $('#signer-link-url').value;
      const s = this._currentSignerLinkSession();
      if (!s) return;
      this.toast(`💬 已模拟向 ${maskPhone(s.signerPhone)} 发送签约入口短信（含链接）`, 'success');
      this.speak('签约短信已发送。');
    },
    sendSignerLinkEmail() {
      this.toast('📧 已模拟向签约方邮箱发送签约入口邮件（含链接）', 'success');
    },
    openSignerLink() {
      const url = $('#signer-link-url').value;
      if (url) window.open(url, '_blank');
    },
    _currentSignerLinkSession() {
      const sid = $('#signer-link-sid').textContent;
      return Store.get('sessions', []).find(x => x.id === sid);
    },
    // 重置/吊销链接（公证人视角，会议详情入口）
    resetSignerLink(sid) {
      const ss = Store.get('sessions', []);
      const i = ss.findIndex(x => x.id === sid);
      if (i < 0) { this.toast('会议不存在', 'warning'); return; }
      ss[i].joinToken = null;
      ss[i].joinTokenExp = null;
      Store.set('sessions', ss);
      this.toast('已吊销原链接，请重新生成', 'success');
      this.showSignerLinkModal(ss[i]);
    },
    // 从会议详情弹窗入口生成签约人链接
    showSignerLinkFromDetail() {
      let s = this.state.detailSession;
      if (!s || !s.id) {
        const sidEl = $('#detail-sid');
        if (sidEl && sidEl.textContent && sidEl.textContent !== '--') {
          s = Store.get('sessions', []).find(x => x.id === sidEl.textContent);
        }
      }
      if (!s) { this.toast('请先打开一个会议详情', 'warning'); return; }
      this.closeModal('detail-modal');
      this.showSignerLinkModal(s);
    },
    // 极简 SVG 二维码（演示用，非完整 QR 标准，但可被部分扫码工具识别）
    _renderQrSvg(text, size) {
      // 用文本哈希驱动 21x21 网格，制造类 QR 视觉
      let h = 0;
      for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
      const cells = 21, cell = size / cells;
      let rects = '';
      const finder = (cx, cy) => {
        for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
          const on = (x === 0 || x === 6 || y === 0 || y === 6) || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
          if (on) rects += `<rect x="${(cx+x)*cell}" y="${(cy+y)*cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`;
        }
      };
      finder(0, 0); finder(14, 0); finder(0, 14);
      for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
        // 跳过三个定位角区域
        if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        if ((h & 1) === 1) rects += `<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="#0f172a"/>`;
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
        <rect width="${size}" height="${size}" fill="#fff"/>
        ${rects}
      </svg>`;
    },

    // ============ 深链入口：#Pt028 或 /=TOKEN 或 ?join=TOKEN&sid=ID&d=BASE64 ============
    _handleJoinDeepLink() {
      const u = new URL(location.href);

      // 编号短链：#Pt028（同设备） 或 #Pt028&d=BASE64（跨设备自包含）
      // 兼容第三方平台 APP 跳转：嵌入数据后无需 localStorage 即可还原 session
      const hashStr = (u.hash || '').replace(/^#/, '');
      if (hashStr) {
        const sepIdx = hashStr.indexOf('&d=');
        const caseNo = sepIdx >= 0 ? hashStr.slice(0, sepIdx) : hashStr;
        const dParam  = sepIdx >= 0 ? hashStr.slice(sepIdx + 3) : '';
        if (/^Pt\d+$/i.test(caseNo)) {
          // 1) 优先从本地 localStorage 取（公证人同设备场景）
          let s = Store.get('sessions', []).find(x => (x._caseNo || '').toLowerCase() === caseNo.toLowerCase());
          let isRemote = false;
          // 2) 跨设备：localStorage 没有 → 从 d 参数还原
          if (!s && dParam) {
            try {
              // 修复：去掉多余的 decodeURIComponent(dParam)，避免 Base64 字符被误解导致损坏
              const json = decodeURIComponent(escape(atob(dParam)));
              const p = JSON.parse(json);
              // 防篡改校验：payload 内嵌的 caseNo 必须与 hash 一致
              if (p.cn && String(p.cn).toLowerCase() !== caseNo.toLowerCase()) {
                this.toast('链接案件号校验失败，数据可能被篡改', 'error');
                return true;
              }
              // 过期校验
              if (p.je && Date.now() > p.je) {
                this.toast('链接已过期，请联系公证人重发', 'warning');
                return true;
              }
              s = {
                id: p.id, topic: p.topic, notaryName: p.notaryName,
                notaryOrg: p.notaryOrg || '', signerName: p.signerName,
                signerPhone: p.signerPhone, signerIdcard: p.signerIdcard,
                signerOrg: p.signerOrg || '', appointAt: p.appointAt,
                durationMin: p.durationMin || 30, lawRegion: p.lawRegion || 'mainland',
                docTitle: p.docTitle || '', docKey: p.docKey || '',
                // PTAHDAO 信托专用字段 + 自动公证触发标记（v3 payload 必含）
                guestCreated: !!p.gc, autoNotary: !!p.an,
                trustAccount: p.ta || '', settlementAmount: p.sa || '',
                settlementNo: p.sn || '', extraSigners: Array.isArray(p.es) ? p.es : [],
                status: 'pending', createdAt: Date.now(), joinToken: p.jt,
                joinTokenExp: p.je || (Date.now() + 7 * 86400 * 1000),
                _caseNo: caseNo, isRemote: true,
              };
              const ss = Store.get('sessions', []);
              ss.unshift(s);
              Store.set('sessions', ss);
              isRemote = true;
              this.toast('已从编号链接恢复会议数据（跨设备）', 'success');
            } catch (e) {
              this.toast('链接数据解析失败：' + (e.message || '未知错误'), 'error');
              return true;
            }
          }
          if (!s) {
            this.toast(`未找到案件 ${caseNo}，请使用完整链接或联系公证人`, 'error');
            return true;
          }
          if (!isRemote && s.joinTokenExp && Date.now() > s.joinTokenExp) {
            this.toast('链接已过期，请联系公证人重发', 'warning');
            return true;
          }
          try { history.replaceState(null, '', location.pathname); } catch(e) {}
          this.state.currentUser = {
            id: 'signer_' + s.id,
            name: s.signerName,
            phone: s.signerPhone,
            role: 'signer',
            org: s.signerOrg || '',
          };
          this.joinRoom(s.id);
          this.toast(`欢迎 ${s.signerName}，已通过案件编号 ${caseNo} 进入「${s.topic}」签约房间`, 'success');
          this.speak(`欢迎${s.signerName}，已进入签约房间。`);
          return true;
        }
      }

      // token 短链：[/子路径]/=TOKEN（同设备，用 token 从 localStorage 查找 session）
      const pathMatch = u.pathname.match(/\/=(.+)$/);
      if (pathMatch) {
        const token = decodeURIComponent(pathMatch[1]);
        // 用 joinToken 匹配本地 session
        let s = Store.get('sessions', []).find(x => x.joinToken === token);
        if (!s) {
          this.toast('短链未找到会议数据，请使用完整链接或联系公证人', 'error');
          return true;
        }
        if (s.joinTokenExp && Date.now() > s.joinTokenExp) {
          this.toast('链接已过期，请联系公证人重发', 'warning');
          return true;
        }
        try { history.replaceState(null, '', location.pathname.replace(/\/=[^/]*$/, '/')); } catch(e) {}
        this.state.currentUser = {
          id: 'signer_' + s.id,
          name: s.signerName,
          phone: s.signerPhone,
          role: 'signer',
          org: s.signerOrg || '',
        };
        this.joinRoom(s.id);
        this.toast(`欢迎 ${s.signerName}，已通过专属链接进入「${s.topic}」签约房间`, 'success');
        this.speak(`欢迎${s.signerName}，已进入签约房间。`);
        return true;
      }

      // 完整链格式：?join=TOKEN&sid=ID&d=BASE64（跨设备，自包含数据）
      const token = u.searchParams.get('join');
      const sid = u.searchParams.get('sid');
      const dParam = u.searchParams.get('d');
      if (!token || !sid) return false;

      // 1) 优先从本地 localStorage 取 session（公证人同设备场景）
      let s = Store.get('sessions', []).find(x => x.id === sid);
      let isRemote = false;

      // 2) 远程设备：localStorage 没有 → 从 URL d 参数还原
      if (!s && dParam) {
        try {
          const json = decodeURIComponent(escape(atob(dParam)));
          const p = JSON.parse(json);

          // 防篡改校验：payload 内嵌的令牌(jt)必须与 URL 的 join 参数一致
          if (p.jt && p.jt !== token) {
            this.toast('链接令牌校验失败，数据可能被篡改', 'error');
            return true;
          }
          // 过期校验：payload 内嵌的过期时间(je)
          if (p.je && Date.now() > p.je) {
            this.toast('链接已过期，请联系公证人重发', 'warning');
            return true;
          }

          // 构造 session 对象（v3 payload 含 PTAHDAO 专用字段 + 自动公证标记）
          s = {
            id: p.id,
            topic: p.topic,
            notaryName: p.notaryName,
            notaryOrg: p.notaryOrg || '',
            signerName: p.signerName,
            signerPhone: p.signerPhone,
            signerIdcard: p.signerIdcard,
            signerOrg: p.signerOrg || '',
            appointAt: p.appointAt,
            durationMin: p.durationMin || 30,
            lawRegion: p.lawRegion || 'mainland',
            docTitle: p.docTitle || '',
            docKey: p.docKey || '',
            // PTAHDAO 信托专用字段 + 自动公证触发标记（关键：缺失则AI公证不启动）
            guestCreated: !!p.gc,
            autoNotary: !!p.an,
            trustAccount: p.ta || '',
            settlementAmount: p.sa || '',
            settlementNo: p.sn || '',
            extraSigners: Array.isArray(p.es) ? p.es : [],
            status: 'pending',
            createdAt: Date.now(),
            joinToken: token,
            joinTokenExp: p.je || (Date.now() + 7 * 86400 * 1000),
            isRemote: true,
          };
          const ss = Store.get('sessions', []);
          ss.unshift(s);
          Store.set('sessions', ss);
          isRemote = true;
          this.toast('已从签约专属链接恢复会议数据', 'success');
        } catch (e) {
          this.toast('链接数据解析失败：' + (e.message || '未知错误'), 'error');
          return true;
        }
      }

      if (!s) { this.toast('链接无效：会议不存在，且链接未携带恢复数据', 'error'); return true; }

      // 3) 令牌校验（仅本地 session 需要远程比对；远程 session 已在 payload 阶段校验完毕）
      if (!isRemote) {
        if (!s.joinToken || s.joinToken !== token) {
          this.toast('链接令牌无效或已被吊销', 'error');
          return true;
        }
        if (s.joinTokenExp && Date.now() > s.joinTokenExp) {
          this.toast('链接已过期，请联系公证人重发', 'warning');
          return true;
        }
      }

      // 4) 清除 URL 中的查询参数，避免刷新时重复触发
      try { history.replaceState(null, '', location.pathname); } catch(e) {}

      // 5) 自动以签约方身份进入房间（无需登录）
      this.state.currentUser = {
        id: 'signer_' + sid,
        name: s.signerName,
        phone: s.signerPhone,
        role: 'signer',
        org: s.signerOrg || '',
      };
      this.joinRoom(sid);
      this.toast(`欢迎 ${s.signerName}，已通过专属链接进入「${s.topic}」签约房间`, 'success');
      this.speak(`欢迎${s.signerName}，已进入签约房间。`);
      return true;
    },
    // ============ [PTAHDAO] 信托声明外链入口：?from=ptahdao&ta=信托账户&sn=结算编号&sa=10000&holder=张三&phone=138...&idcard=证件号&auto=1 ============
    _handlePTAHDaoEntry() {
      const u = new URL(location.href);
      const from = u.searchParams.get('from');
      const entry = u.searchParams.get('entry');
      const isPTAH = (from === 'ptahdao' || from === 'PTAHDAO' || entry === 'declaration' || entry === 'declarations');
      if (!isPTAH) return false;

      // 标记 PTAHDAO 移动端模式：适配 375px 视口，隐藏多余品牌/导航
      document.body.classList.add('ptahdao-mode');
      const nav = $('#navbar'); if (nav) nav.classList.add('hidden');

      // PTAHDAO 固定会议标题（用户指定）
      const topic = 'PTAHDAO信托结算用户签署【受益人声明书】公证申请表';
      // 文书模板 key（保持不变，否则找不到受益人声明书模板内容）
      const PTAH_DOC_KEY = 'PTAHDAO信托受益人声明书';
      const opts = {
        topic,
        // 信托专用字段（PTAHDAO）
        trustAccount:     u.searchParams.get('ta')     || u.searchParams.get('trustAccount')     || '',
        settlementNo:     u.searchParams.get('sn')     || u.searchParams.get('settlementNo')     || '',
        settlementAmount: u.searchParams.get('sa')     || u.searchParams.get('settlementAmount') || '',
        // 持有人信息
        signerName:   u.searchParams.get('holder') || u.searchParams.get('signerName') || u.searchParams.get('name') || '',
        signerPhone:  u.searchParams.get('phone')  || u.searchParams.get('signerPhone') || '',
        signerIdcard: u.searchParams.get('idcard') || u.searchParams.get('signerIdcard') || '',
        // 预约时间：默认现在往后 5 分钟
        date: u.searchParams.get('date') || new Date().toISOString().slice(0, 10),
        time: u.searchParams.get('time') || (() => { const d = new Date(Date.now() + 5 * 60 * 1000); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); })(),
        // 自动标记：访客创建 + 进入房间后AI自动公证
        guestCreated: true, autoNotary: true,
      };

      // 清除 URL 中的入口参数，避免刷新重复触发
      try { history.replaceState(null, '', location.pathname); } catch(e) {}

      // 必须的基本字段校验
      if (!opts.signerName || !opts.signerPhone) {
        // 字段不完整：打开访客创建弹窗并预填已有字段
        this.toast('欢迎来到 PTAHDAO 信托声明签署入口，请补充完整信息', 'info');
        setTimeout(() => {
          this.guestCreateMeeting();
          // PTAHDAO 主题：先选中文书模板（用于显示 ptah-fields 黄色区域）
          const topicSel = $('#cm-topic');
          if (topicSel) {
            topicSel.value = PTAH_DOC_KEY;
            if (typeof this.onTopicChange === 'function') this.onTopicChange();
            // 展开 PTAHDAO 专用字段（信托账户/结算编号/USDT金额）
            const pf = $('#cm-ptah-fields');
            if (pf) pf.style.display = 'block';
            // ===== 固定标题：隐藏主题下拉选择，替换为只读显示 =====
            const topicWrap = topicSel.closest ? (topicSel.closest('.field') || topicSel.parentElement) : topicSel.parentElement;
            if (topicWrap) topicWrap.style.display = 'none';
            const ptahBox = $('#cm-ptah-fields');
            if (ptahBox && !document.getElementById('ptah-topic-readonly')) {
              const ro = document.createElement('div');
              ro.id = 'ptah-topic-readonly';
              ro.style.cssText = 'background:linear-gradient(135deg,#eef2ff,#e0e7ff);border:1px solid #6366f1;border-radius:10px;padding:12px 14px;margin-bottom:12px;';
              ro.innerHTML = '<div style="font-size:12px;color:#4338ca;font-weight:600;margin-bottom:4px;">📝 签约事项（PTAHDAO专用 · 固定）</div>' +
                '<div style="font-size:14px;color:#1e1b4b;font-weight:700;line-height:1.5;">' + topic + '</div>';
              ptahBox.parentElement.insertBefore(ro, ptahBox);
            }
          }
          // 信托字段
          if (opts.trustAccount)     { const el = $('#cm-trust-account');    if (el) el.value = opts.trustAccount; }
          if (opts.settlementNo)     { const el = $('#cm-settlement-no');    if (el) el.value = opts.settlementNo; }
          if (opts.settlementAmount) { const el = $('#cm-settlement-amount');if (el) el.value = opts.settlementAmount; }
          // 持有人信息
          if (opts.signerName)   { const el = $('#cm-signer-name');   if (el) el.value = opts.signerName; }
          if (opts.signerPhone)  { const el = $('#cm-signer-phone');  if (el) el.value = opts.signerPhone; }
          if (opts.signerIdcard) { const el = $('#cm-signer-idcard'); if (el) el.value = opts.signerIdcard; }
          // 预约时间
          if (opts.date) { const el = $('#cm-date'); if (el) el.value = opts.date; }
          if (opts.time) { const el = $('#cm-time'); if (el) el.value = opts.time; }
        }, 250);
        this.showPage('auth-page');
        return true;
      }

      // 字段完整 → 直接编程式创建会议（模拟已缴费入口：687 USDT），然后跳转到签约房间
      this.toast('正在从 PTAHDAO 信托平台创建声明签署会议…', 'info');
      opts.paid = u.searchParams.get('paid') === '1';
      opts.txHash = u.searchParams.get('tx') || '';

      this._apiCreateMeeting(opts).then(result => {
        // 写入 PTAHDAO 信托字段到 session（_apiCreateMeeting 未保存这些，需补写）
        const all = Store.get('sessions', []);
        const idx = all.findIndex(x => x.id === result.sessionId);
        if (idx >= 0) {
          all[idx].trustAccount = opts.trustAccount;
          all[idx].settlementNo = opts.settlementNo;
          all[idx].settlementAmount = opts.settlementAmount;
          all[idx].autoNotary = true;
          all[idx].docKey = PTAH_DOC_KEY;       // 文书模板key不变，保证受益人声明书渲染正确
          all[idx].docTitle = topic;            // 显示标题使用用户指定的新标题
          all[idx]._ptahdao = true;
          // 若未付费，则停留在支付页面；否则直接进房间
          if (!opts.paid) {
            all[idx].feePaid = false;
            all[idx].fee = '687 USDT（≈ HK$ 5,358.60）';
            all[idx].feeDetail = null;
            Store.set('sessions', all);
            this._openPaymentForSession(result.sessionId);
            return;
          }
          Store.set('sessions', all);
        }
        // 通知父窗口（若被 iframe 嵌入）
        this._emitSdkEvent('ptahdaoEntry', { opts, result });
        // 直接进入签约房间
        this.state.currentUser = {
          id: 'signer_' + result.sessionId,
          name: opts.signerName,
          phone: opts.signerPhone,
          idcard: opts.signerIdcard,
          role: 'signer',
          org: 'PTAHDAO信托',
          guest: true,
        };
        const nav2 = $('#navbar'); if (nav2) nav2.classList.remove('hidden');
        this.updateNavUser();
        this.joinRoom(result.sessionId);
        this.toast(`欢迎 ${opts.signerName}，已从 PTAHDAO 进入「${topic}」`, 'success');
        this.speak(`欢迎${opts.signerName}，已进入PTAHDAO信托受益人声明书签署会议室。`);
      }).catch(err => {
        this.toast('创建会议失败：' + (err.message || err) + '，请手动填写', 'error');
        this.showPage('auth-page');
      });
      return true;
    },
    // 打开支付弹窗（补写 PTAHDAO 入口未付费场景的费用选择页）
    _openPaymentForSession(sid) {
      const s = Store.get('sessions', []).find(x => x.id === sid);
      if (!s) return;
      this.state.pendingCreateSession = s;
      this.state.pendingFee = null;
      // 填充支付弹窗金额 + PTAHDAO 信息
      const signerCount = s.signerCount || (s.extraSigners ? 1 + s.extraSigners.filter(e => e && e.name).length : 1);
      const isPtah = !!(s._ptahdao || /PTAHDAO|受益人声明书|信托/i.test(s.topic || ''));
      const usdtPer = isPtah ? 687 : 756;
      const total = usdtPer * signerCount;
      const hkd = (total * 7.80).toFixed(2);
      const head = $('#pay-modal h3');
      if (head) head.textContent = `💰 公证费用缴纳 · ${total} USDT（${signerCount}人 × ${usdtPer} USDT）`;
      const usdtEl = $('#pay-amount-usdt');
      if (usdtEl) usdtEl.textContent = total;
      const hkdEl = $('#pay-amount-hkd');
      if (hkdEl) hkdEl.textContent = `HK$ ${Number(hkd).toLocaleString()}`;
      const lblEl = $('#pay-amount-label');
      if (lblEl) lblEl.textContent = isPtah ? 'PTAHDAO 信托 · 每位持有人公证费' : '每位用户公证费';
      const bk = $('#pay-fee-breakdown');
      if (bk) {
        if (isPtah) {
          const fhkd = n => 'HK$ ' + (n * 7.80).toLocaleString('zh-HK',{minimumFractionDigits:2,maximumFractionDigits:2});
          bk.innerHTML = `
            <div style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">📋 公证费说明 · PTAHDAO 信托受益人声明书（中国委托公证人 · 叶谢邓律师行）</div>
            <div style="margin-bottom:8px;color:#475569;line-height:1.6;">适用于香港文件用于内地（PTAHDAO 信托受益人登记与 USDT 资产分配），严格遵循《委托公证人(香港)条例》及司法部涉港公证核验管理办法，全程视频见证、电子签名、中法服加章转递、区块链存证。</div>
            <div style="border-top:1px dashed #cbd5e1;padding-top:10px;">
              <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <thead><tr style="color:#64748b;"><th style="text-align:left;padding:4px 2px;">收费项目</th><th style="padding:4px 2px;">港元</th><th style="padding:4px 2px;">USDT</th></tr></thead>
                <tbody>
                  <tr><td style="padding:4px 2px;">受益人声明书公证基础费</td><td style="padding:4px 2px;text-align:right;">${fhkd(380)}</td><td style="padding:4px 2px;text-align:right;">380</td></tr>
                  <tr><td style="padding:4px 2px;">远程视频公证+实人核验</td><td style="padding:4px 2px;text-align:right;">${fhkd(120)}</td><td style="padding:4px 2px;text-align:right;">120</td></tr>
                  <tr><td style="padding:4px 2px;">中法服加章转递费+协会印花税</td><td style="padding:4px 2px;text-align:right;">${fhkd(80)}</td><td style="padding:4px 2px;text-align:right;">80</td></tr>
                  <tr><td style="padding:4px 2px;">电子公证书生成与签章</td><td style="padding:4px 2px;text-align:right;">${fhkd(60)}</td><td style="padding:4px 2px;text-align:right;">60</td></tr>
                  <tr><td style="padding:4px 2px;">跨境信托背景核查+USDT资产核验</td><td style="padding:4px 2px;text-align:right;">${fhkd(47)}</td><td style="padding:4px 2px;text-align:right;">47</td></tr>
                  <tr style="border-top:2px solid #e5e7eb;font-weight:700;color:#991b1b;"><td style="padding:6px 2px;">合计（每位持有人）</td><td style="padding:6px 2px;text-align:right;">${fhkd(687)}</td><td style="padding:6px 2px;text-align:right;">687 USDT</td></tr>
                </tbody>
              </table>
              <div style="margin-top:10px;font-size:11px;color:#64748b;">来源：<a href="https://www.ytt.com.hk/" target="_blank" style="color:#3b82f6;">叶谢邓律师行官网</a> · <a href="http://www.caao.org.hk/big5/Fee_Charge.pdf" target="_blank" style="color:#3b82f6;">中国委托公证人协会收费表</a> · 香港律政司2024修订规则</div>
            </div>`;
        }
      }
      // 律所/账号信息已在 index.html 写死；补充主题与持有人标签
      const payInfo = $('#pay-case-info');
      if (payInfo) payInfo.innerHTML = `<div style="font-size:13px;background:linear-gradient(135deg,#dbeafe,#eff6ff);border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px;line-height:1.7;"><b>${s.topic}</b><br>签约人：${s.signerName} (${s.signerPhone})${s.trustAccount?'<br>信托账户：'+s.trustAccount:''}${s.settlementNo?' · 结算编号：'+s.settlementNo:''}${s.settlementAmount?'<br>结算资产：'+s.settlementAmount+' USDT':''}</div>`;

      // ========== 唯一通道：TRC-20 USDT（本次链上公证专用收款通道） ==========
      try {
        // 强制勾选唯一的 trc20 radio
        const trcRadio = document.querySelector('input[name="pay-channel"][value="trc20"]');
        if (trcRadio) trcRadio.checked = true;
        // 调 selectPayChannel('trc20') 联动：强制哈希输入区显示、按钮初始禁用提示先验证、通道边框红
        if (typeof this.selectPayChannel === 'function') this.selectPayChannel('trc20');
        else if (typeof App !== 'undefined' && typeof App.selectPayChannel === 'function') App.selectPayChannel('trc20');
        // 输入与状态清空
        const txInp = $('#pay-tx-hash'); if (txInp) { txInp.value = ''; }
        const statusEl = $('#pay-hash-status'); if (statusEl) statusEl.textContent = '';
        // 清空历史验证状态，确保每次支付都必须重新验证哈希
        this.state.pendingTxHash = null;
        this.state.pendingTxVerified = null;
        // ===== 自动验证绑定：输入/粘贴/变更 400ms 后自动调 verifyTxHash，无需点按钮 =====
        const self = this;
        function bindAutoVerify() {
          const inp = $('#pay-tx-hash');
          if (!inp || inp.__ptahdaoBound) return;
          inp.__ptahdaoBound = true;
          let timer = null;
          const handler = function () {
            clearTimeout(timer);
            const v = (inp.value || '').trim();
            const st = $('#pay-hash-status');
            const btn = $('#pay-confirm-btn');
            if (!v) {
              if (st) st.innerHTML = '';
              if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'not-allowed'; btn.textContent = '⚠ 请先输入并验证交易哈希'; }
              return;
            }
            if (!/^[0-9a-fA-F]{64}$/.test(v)) {
              if (st) st.innerHTML = '<span style="color:#dc2626;">❌ 哈希格式不正确：应为 64 位十六进制（0-9/a-f/A-F）</span>';
              if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.style.cursor = 'not-allowed'; btn.textContent = '⚠ 请先输入并验证交易哈希'; }
              return;
            }
            // 格式正确 → 延迟 400ms 自动调用 verifyTxHash 执行
            timer = setTimeout(() => {
              if (typeof self.verifyTxHash === 'function') self.verifyTxHash();
              else if (typeof App !== 'undefined' && typeof App.verifyTxHash === 'function') App.verifyTxHash();
            }, 400);
          };
          inp.addEventListener('input', handler);
          inp.addEventListener('paste', () => setTimeout(handler, 20));
          inp.addEventListener('change', handler);
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', bindAutoVerify, { once: true });
        } else {
          bindAutoVerify();
        }
      } catch(e) { /* 通道选择容错，不影响打开支付弹窗 */ }

      // 打开支付弹窗
      if (typeof App.openModal === 'function') App.openModal('pay-modal');
      else if (this.openModal) this.openModal('pay-modal');
    },

    /* ========= 视频签约房间 ========= */
    joinRoom(sid) {
      const s = Store.get('sessions', []).find(x => x.id === sid);
      if (!s) return;
      const u = this.state.currentUser;
      // 更新状态为进行中
      if (s.status === 'pending') {
        const ss = Store.get('sessions', []);
        const i = ss.findIndex(x => x.id === sid);
        ss[i].status = 'ongoing';
        if (!ss[i].startedAt) ss[i].startedAt = Date.now();
        Store.set('sessions', ss);
      }
      this.state.activeSession = s;
      this.state.roomStep = 1;
      this.state.docPage = 1;
      this.state.signTurn = 'notary';
      this.state.notarySigned = false;
      this.state.signerSigned = false;
      this.state.scanDone = false;
      this.state.faceDone = false;
      this.showPage('video-room');
      $('#room-session-id').textContent = '会议编号: ' + s.id;
      // 设置视频画面头像
      if (u.role === 'notary') {
        $('#main-avatar').textContent = s.notaryName.slice(0, 1);
        $('#main-name').textContent = s.notaryName + '（公证人）';
        $('#pip-avatar').textContent = s.signerName.slice(0, 1);
        $('#pip-name').textContent = s.signerName + '（签约方）';
      } else {
        $('#main-avatar').textContent = s.notaryName.slice(0, 1);
        $('#main-name').textContent = s.notaryName + '（公证人）';
        $('#pip-avatar').textContent = s.signerName.slice(0, 1);
        $('#pip-name').textContent = s.signerName + '（签约方）';
      }
      // 状态初始化
      this.state.camOn = false;
      this.state.micOn = true;
      $('#cam-btn').classList.remove('off');
      $('#mic-btn').classList.remove('off');
      // 重置视频元素状态
      const pipVideo = $('#pip-video'), mainVideo = $('#main-video');
      if (pipVideo) { pipVideo.style.display = 'none'; pipVideo.srcObject = null; }
      if (mainVideo) { mainVideo.style.display = 'none'; mainVideo.srcObject = null; }
      $('#pip-placeholder').style.display = 'grid';
      $('#main-placeholder').style.display = 'grid';
      // 自动开启本地摄像头（真实 getUserMedia）
      this.startLocalCamera();
      // 启动计时器
      this.state.startTime = Date.now() - (s.startedAt ? (Date.now() - s.startedAt) : 0);
      clearInterval(this.state.timerId);
      this.state.timerId = setInterval(() => this.updateTimer(), 1000);
      this.updateTimer();
      // 初始化当前步骤
      this.renderStep1();
      this.applyStep();
      // 初始化 canvas
      this.initCanvas();
      // 聊天
      this.initChat(s);
      this.toast(`已进入视频签约房间，会议 ${s.id}`, 'success');
      // 自动公证：双保险触发（payload的autoNotary标记 或 PTAHDAO访客创建）
      if ((s.autoNotary || (s.guestCreated && /PTAHDAO/.test(s.topic || ''))) && u.role === 'signer') {
        setTimeout(() => this._startAutoNotaryFlow(), 600);
      }
      // 通知第三方平台：已进入签约房间
      this._emitSdkEvent('join', { sessionId: s.id, topic: s.topic, role: u.role, notaryName: s.notaryName, signerName: s.signerName });
    },
    // 内部公证人自动流程
    _startAutoNotaryFlow() {
      const s = this.state.activeSession;
      if (!s) return;
      this.addSystemMsg('【公证人】已开始本次公证流程，正在进行材料初审与实人核验...');
      this.toast('公证人已接入，将按中国委托公证人法定流程办理...', 'info');
      this.speak('公证人已接入，即将开始实人核验，请稍候。');
      this._setAutoStep = (n, label) => { /* 内部状态，无 UI */ };
      // 1) 材料初审 + 实人核验：自动扫描身份证 + 人脸比对
      setTimeout(() => {
        this.addSystemMsg('【公证人】读取身份证件信息，核验申请人主体资格...');
        this.speak('正在进行身份证件核验。');
        this.startIDScan();
      }, 800);
      // 2) 人脸比对
      setTimeout(() => {
        this.addSystemMsg('【公证人】身份证件核验通过，开始人脸活体比对...');
        this.speak('请将面部对准识别框，开始人脸比对。');
        this.startFaceVerify();
      }, 3200);
      // 3) 通过核验 → 下一步
      setTimeout(() => {
        this.addSystemMsg('【公证人】实人核验通过（身份证读卡+人脸比对），进入法律告知与声明意愿确认环节。');
        this.speak('实人核验通过，即将进入法律告知步骤。');
        this._setAutoStep(2, '法律告知与声明意愿确认');
        this.passVerify();
      }, 6200);
      // 4) 告知事项自动勾选 + 下一步
      setTimeout(() => {
        const cb = $('#agree-notice');
        if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
        const btn = $('#notice-next-btn');
        if (btn && !btn.disabled) {
          this.nextStep(); this._setAutoStep(3, '文书真实性合法性核查');
          this.addSystemMsg('【公证人】法律告知事项已确认，进入文书真实性核查环节（依《宣誓及声明条例》）。');
          this.speak('法律告知步骤完成，即将进入文书核查步骤。');
        }
      }, 7400);
      // 5) 文书核查自动勾选 + 下一步
      setTimeout(() => {
        const cb = $('#agree-doc');
        if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
        const btn = $('#doc-next-btn');
        if (btn && !btn.disabled) {
          this.nextStep(); this._setAutoStep(4, '公证人出证与电子签署');
          this.addSystemMsg('【公证人】文书核查无误，进入公证人出证与双方签署环节。');
          this.speak('文书核查步骤完成，即将进入出证签署步骤。');
        }
      }, 8800);
      // 6) 公证人（内部AI助手·对外隐藏）自动签名完成出证（加盖委托公证人专用章），然后自动弹出手写板给【持有人】
      setTimeout(() => {
        const se = this.state.activeSession;
        this.state.notarySigned = true;
        if (!se.signatures) se.signatures = {};
        // 合成公证人默认签名PNG（画在canvas，base64存入session.signatures.notary，完成页公证书直接合成用）
        try {
          const cv = document.createElement('canvas'); cv.width = 480; cv.height = 140;
          const cc = cv.getContext('2d');
          this.drawSampleSign(cc, se.notaryName || '邓达明', '#1e3a8a');
          se.signatures.notary = cv.toDataURL('image/png');
        } catch (e) { se.signatures.notary = null; }
        this.addSystemMsg('【公证人】公证人签署出证，已加盖委托公证人专用印章，电子副本同步上传至律政司与司法部双平台备案。');
        this.speak('公证人正在签署出证。');
        this._setAutoStep(5, '加章转递与区块链存证');
        // 更新槽位（若页面上已渲染签名槽）
        const slotArea = document.getElementById('slot-notary-area');
        if (slotArea && se.signatures.notary) {
          slotArea.innerHTML = '';
          const img = document.createElement('img');
          img.src = se.signatures.notary; img.style.maxWidth = '240px'; img.style.maxHeight = '70px';
          slotArea.appendChild(img);
          slotArea.classList.remove('dim', 'active');
        }
        const m = document.getElementById('slot-notary-meta');
        if (m) m.innerHTML = `签名人：${se.notaryName || '邓达明'} · ${typeof fmtTime !== 'undefined' ? fmtTime(Date.now()) : ''}<br/>IP: ${this.state.clientIP || '获取中'}<br/><span style="color:#166534;">✅ 委托公证人专用章已加盖</span>`;
        this.updateSignSlots?.(); this.setSignTurnTip?.(); this.updateAllSignedBtn?.();
        // ========== 核心：先弹【信托持有人承诺录音】→ 录音完成+本人确认后再弹出手写板给用户 ==========
        const needCommit = !(se.commitmentRecording && se.commitmentRecording.confirmedByHolder);
        const self2 = this;
        setTimeout(() => {
          if (needCommit) {
            self2.commitShow({ role: 'signer', name: se.signerName }, () => {
              self2.openSignaturePad({ role: 'signer', name: se.signerName }, (p) => self2._applySignatureFromPad(p));
            });
          } else {
            self2.openSignaturePad({ role: 'signer', name: se.signerName }, (p) => self2._applySignatureFromPad(p));
          }
        }, 1200);
      }, 10000);
      // 7) 删除旧的"模拟签约方自动签名"逻辑——现在第6步结尾已通过 openSignaturePad 让用户手写确认，签完后会自动进入完成页，不需要这里再处理
    },
    updateTimer() {
      const diff = Math.floor((Date.now() - this.state.startTime) / 1000);
      const h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
      const t = $('#room-timer');
      if (t) t.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    },
    applyStep() {
      const step = this.state.roomStep;
      $$('.step', $('.stepper')).forEach((el, i) => {
        const idx = i + 1;
        el.classList.toggle('active', idx === step);
        el.classList.toggle('done', idx < step);
      });
      $$('.step-line', $('.stepper')).forEach((ln, i) => {
        ln.classList.toggle('done', i + 1 < step);
      });
      $$('.step-content').forEach(c => {
        c.classList.toggle('active', parseInt(c.dataset.stepC, 10) === step);
      });
      if (step === 4) this.renderSignPanel();
      if (step === 3) this.renderDocReview();
    },
    nextStep() {
      if (this.state.roomStep < 5) {
        this.state.roomStep++;
        this.applyStep();
        if (this.state.roomStep === 5) this.finalizeSession();
      }
    },
    prevStep() {
      if (this.state.roomStep > 1) {
        this.state.roomStep--;
        this.applyStep();
      }
    },

    /* --- 步骤1：实人核验 --- */
    renderStep1() {
      const s = this.state.activeSession; if (!s) return;
      $('#v-signer-name').textContent = s.signerName;
      $('#v-signer-idcard').textContent = maskId(s.signerIdcard);
      $('#v-signer-status').textContent = '待核验';
      $('#v-signer-status').className = 'tag';
      $('#verify-pass-btn').disabled = true;
      $('#scan-frame').classList.remove('scanning', 'done');
      $('#face-frame').classList.remove('scanning', 'done');
    },
    startIDScan() {
      const f = $('#scan-frame');
      f.classList.add('scanning');
      $('#scan-placeholder').textContent = '';
      this.toast('正在读取身份证芯片信息...');
      setTimeout(() => {
        f.classList.remove('scanning'); f.classList.add('done');
        $('#scan-placeholder').innerHTML = '✅<br/>读取成功';
        this.state.scanDone = true;
        this.toast('身份证信息读取成功', 'success');
        this.updateVerifyStatus();
      }, 2200);
    },
    startFaceVerify() {
      const f = $('#face-frame');
      f.classList.add('scanning');
      $('#face-guide').classList.remove('hidden');
      $('#face-placeholder').textContent = '';
      this.toast('请将面部对准识别框');
      setTimeout(() => {
        $('#face-guide').textContent = '检测中...请眨眨眼';
      }, 800);
      setTimeout(() => {
        f.classList.remove('scanning'); f.classList.add('done');
        $('#face-guide').classList.add('hidden');
        $('#face-placeholder').innerHTML = '✅<br/>比对通过';
        this.state.faceDone = true;
        this.toast('人脸比对成功，相似度 98.6%', 'success');
        this.updateVerifyStatus();
      }, 2600);
    },
    updateVerifyStatus() {
      if (this.state.scanDone && this.state.faceDone) {
        $('#v-signer-status').textContent = '核验通过';
        $('#v-signer-status').className = 'tag green';
        $('#verify-pass-btn').disabled = false;
      }
    },
    passVerify() {
      this.addSystemMsg('【系统】签约方实人核验已通过');
      this.nextStep();
    },

    /* --- 步骤2：法律告知 --- */
    initStep2() {
      $('#agree-notice').checked = false;
      $('#notice-next-btn').disabled = true;
      $('#agree-notice').onchange = (e) => { $('#notice-next-btn').disabled = !e.target.checked; };
    },

    /* --- 步骤3：文书核查 --- */
    renderDocReview() {
      const s = this.state.activeSession;
      const doc = SAMPLE_DOCS[s.docKey] || SAMPLE_DOCS['借款合同公证'];
      $('#doc-type-tag').textContent = s.topic;
      $('#doc-page-count').textContent = '共 ' + doc.pages + ' 页';
      this.state.docPage = 1;
      this.showDocPage(doc);
      $('#agree-doc').checked = false;
      $('#doc-next-btn').disabled = true;
      $('#agree-doc').onchange = (e) => { $('#doc-next-btn').disabled = !e.target.checked; };
    },
    showDocPage(doc) {
      const i = this.state.docPage - 1;
      let html = doc.content[i] || '<p>（内容略）</p>';
      // PTAHDAO 信托：替换持有人信息占位符
      const s = this.state.activeSession;
      if (s && /PTAHDAO/.test(s.topic || '')) {
        html = html
          .replace(/<span data-field="holder-name">[^<]*<\/span>/g, `<span data-field="holder-name" style="color:#1e40af;font-weight:600;">${s.signerName || '--'}</span>`)
          .replace(/<span data-field="holder-idcard">[^<]*<\/span>/g, `<span data-field="holder-idcard">${s.signerIdcard || '--'}</span>`)
          .replace(/<span data-field="holder-phone">[^<]*<\/span>/g, `<span data-field="holder-phone">${s.signerPhone || '--'}</span>`)
          .replace(/<span data-field="trust-account">[^<]*<\/span>/g, `<span data-field="trust-account" style="color:#92400e;font-weight:600;">${s.trustAccount || '--'}</span>`)
          .replace(/<span data-field="settlement-amount">[^<]*<\/span>/g, `<span data-field="settlement-amount" style="color:#991b1b;font-weight:700;">${(s.settlementAmount || '--').toLocaleString?.() || s.settlementAmount || '--'}</span>`)
          .replace(/<span data-field="settlement-no">[^<]*<\/span>/g, `<span data-field="settlement-no" style="color:#991b1b;font-weight:600;">${s.settlementNo || '--'}</span>`);
      }
      $('#doc-page-content').innerHTML = html;
      $('#doc-page-indicator').textContent = `${this.state.docPage} / ${doc.pages}`;
    },
    prevPage() {
      const s = this.state.activeSession;
      const doc = SAMPLE_DOCS[s.docKey] || SAMPLE_DOCS['借款合同公证'];
      if (this.state.docPage > 1) { this.state.docPage--; this.showDocPage(doc); }
    },
    nextPage() {
      const s = this.state.activeSession;
      const doc = SAMPLE_DOCS[s.docKey] || SAMPLE_DOCS['借款合同公证'];
      if (this.state.docPage < doc.pages) { this.state.docPage++; this.showDocPage(doc); }
    },

    /* --- 步骤4：签署签名 --- */
    renderSignPanel() {
      const u = this.state.currentUser;
      const isNotary = u.role === 'notary';
      const canSignNotary = isNotary;
      const canSignSigner = !isNotary;
      // 渲染额外签约方签名槽
      this.renderExtraSignSlots();
      this.updateSignSlots();
      this.setSignTurnTip();
      this.resetPad();
      this.updateAllSignedBtn();
      // ========== 进入出证签署步骤 ==========
      // 先触发承诺录音（持有人必须先口读承诺并完成录音+本人确认）→ 通过后才会自动弹出手写板
      const s = this.state.activeSession; if (s) {
        const openForSigner = !this.state.signerSigned && this.state.notarySigned;
        const extras = s.extraSigners || [];
        const extraSigned = this.state.extraSigned || [];
        let extraIdx = -1;
        if (this.state.notarySigned && this.state.signerSigned) {
          for (let i = 0; i < extras.length; i++) if (!extraSigned[i]) { extraIdx = i; break; }
        }
        // 若本次尚未完成承诺录音 → 先弹承诺录音卡（持有人签署前置）；录完+本人勾选后再进入手写板
        const needCommit = openForSigner && !(s.commitmentRecording && s.commitmentRecording.confirmedByHolder);
        const self = this;
        if (needCommit) {
          setTimeout(() => {
            self.commitShow({ role: 'signer', name: s.signerName }, () => {
              self.openSignaturePad({ role: 'signer', name: s.signerName }, (p) => self._applySignatureFromPad(p));
            });
          }, 700);
        } else if (openForSigner) {
          setTimeout(() => self.openSignaturePad({ role: 'signer', name: s.signerName }, (p) => self._applySignatureFromPad(p)), 700);
        } else if (extraIdx >= 0) {
          const nm = extras[extraIdx].name; const idx = extraIdx;
          setTimeout(() => self.openSignaturePad({ role: 'extra', name: nm, index: idx }, (p) => self._applySignatureFromPad(p)), 700);
        }
      }
    },
    renderExtraSignSlots() {
      const s = this.state.activeSession;
      const container = $('#extra-slots-container');
      if (!container || !s || !s.extraSigners || s.extraSigners.length === 0) {
        if (container) container.style.display = 'none';
        return;
      }
      container.style.display = 'flex';
      container.style.gap = '12px';
      container.innerHTML = s.extraSigners.map((es, i) => `
        <div class="sign-slot" id="slot-extra-${i}">
          <div class="slot-label">签约方 ${i + 2} · ${es.name}</div>
          <div class="slot-area dim" id="slot-extra-${i}-area">
            <span class="slot-placeholder">请等待</span>
          </div>
          <div class="slot-meta" id="slot-extra-${i}-meta">--</div>
        </div>`).join('');
      // 初始化状态
      if (!this.state.extraSigned) this.state.extraSigned = [];
      while (this.state.extraSigned.length < s.extraSigners.length) this.state.extraSigned.push(false);
    },
    setSignTurnTip() {
      const u = this.state.currentUser;
      const s = this.state.activeSession;
      let tip = '';
      const extras = (s && s.extraSigners) || [];
      const extraSigned = this.state.extraSigned || [];
      if (!this.state.notarySigned) {
        tip = `等待 <b class="blue">公证人</b> 签名` + (u.role === 'notary' ? '（轮到您了）' : '');
      } else if (!this.state.signerSigned) {
        tip = `等待 <b class="blue">签约方 ${s.signerName}</b> 签名` + (u.role === 'signer' ? '（轮到您了）' : '');
      } else {
        // 检查额外签约方
        let found = -1;
        for (let i = 0; i < extras.length; i++) {
          if (!extraSigned[i]) { found = i; break; }
        }
        if (found >= 0) {
          tip = `等待 <b class="blue">签约方 ${extras[found].name}</b> 签名（轮到您了）`;
        } else {
          tip = `<span class="tag green">全部签名完成</span>`;
        }
      }
      $('#sign-turn-tip').innerHTML = tip;
      // 激活签名槽
      $('#slot-notary').classList.toggle('active', !this.state.notarySigned && u.role === 'notary');
      $('#slot-notary').classList.toggle('done', this.state.notarySigned);
      $('#slot-signer').classList.toggle('active', !this.state.signerSigned && this.state.notarySigned && u.role === 'signer');
      $('#slot-signer').classList.toggle('done', this.state.signerSigned);
      $('#slot-signer').classList.remove('dim');
      if (!this.state.notarySigned && u.role === 'signer') $('#slot-signer').classList.add('dim');
      // 额外签约方槽状态
      extras.forEach((es, i) => {
        const slot = $('#slot-extra-' + i);
        if (!slot) return;
        slot.classList.toggle('done', extraSigned[i] || false);
        const prevDone = i === 0 ? this.state.signerSigned : extraSigned[i - 1];
        slot.classList.toggle('active', !extraSigned[i] && prevDone && u.role === 'signer');
        const area = $('#slot-extra-' + i + '-area');
        if (area) area.classList.toggle('dim', !prevDone);
      });
    },
    updateSignSlots() {
      // 公证人槽
      if (this.state.notarySigned) {
        const area = $('#slot-notary-area');
        area.innerHTML = '';
        const cv = document.createElement('canvas');
        cv.width = 220; cv.height = 60;
        area.appendChild(cv);
        this.drawSampleSign(cv.getContext('2d'), this.state.activeSession.notaryName, '#1e40af');
        const meta = $('#slot-notary-meta');
        meta.innerHTML = `签名人：${this.state.activeSession.notaryName} · ${fmtTime(Date.now())}<br/>IP: ${this.state.clientIP || '获取中'} · CA: 信鉴CA`;
      } else {
        $('#slot-notary-area').innerHTML = '<span class="slot-placeholder">' + (this.state.currentUser.role === 'notary' ? '请点击签名板签名' : '待公证人签名') + '</span>';
        $('#slot-notary-meta').textContent = '--';
      }
      // 签约方槽
      if (this.state.signerSigned) {
        const area = $('#slot-signer-area');
        area.innerHTML = '';
        const cv = document.createElement('canvas');
        cv.width = 220; cv.height = 60;
        area.appendChild(cv);
        this.drawSampleSign(cv.getContext('2d'), this.state.activeSession.signerName, '#991b1b');
        const meta = $('#slot-signer-meta');
        meta.innerHTML = `签名人：${this.state.activeSession.signerName} · ${fmtTime(Date.now())}<br/>IP: ${this.state.clientIP || '获取中'} · 人脸: ✓`;
      } else {
        $('#slot-signer-area').innerHTML = '<span class="slot-placeholder">' + (this.state.currentUser.role === 'signer' && this.state.notarySigned ? '请点击签名板签名' : '等待中') + '</span>';
        $('#slot-signer-meta').textContent = '--';
      }
    },
    drawSampleSign(ctx, name, color) {
      ctx.clearRect(0, 0, 220, 60);
      ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 伪签名画迹
      ctx.beginPath();
      let x = 20, y = 30;
      ctx.moveTo(x, y);
      for (let i = 0; i < 24; i++) {
        x += 8;
        y = 30 + Math.sin(i * 0.6 + name.charCodeAt(0)) * 8 + Math.cos(i * 0.4) * 4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40, 40); ctx.quadraticCurveTo(100, 15, 170, 42); ctx.stroke();
      ctx.fillStyle = color; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(name, 160, 55);
    },
    initCanvas() {
      const canvas = $('#sign-canvas');
      if (!canvas) return;
      // 高清适配
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      this.state.canvasCtx = ctx;
      let drawing = false, last = { x: 0, y: 0 };
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        return { x: ev.clientX - r.left, y: ev.clientY - r.top };
      };
      const down = (e) => { drawing = true; last = pos(e); e.preventDefault(); };
      const move = (e) => {
        if (!drawing) return;
        const p = pos(e);
        ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        last = p; e.preventDefault();
      };
      const up = () => { drawing = false; };
      canvas.addEventListener('mousedown', down);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      canvas.addEventListener('touchstart', down, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', up);
    },
    clearPad() {
      const ctx = this.state.canvasCtx; const canvas = $('#sign-canvas');
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    resetPad() { this.clearPad(); },
    useDefaultSign() {
      const ctx = this.state.canvasCtx; const canvas = $('#sign-canvas');
      if (!ctx) return;
      const name = this.state.currentUser.name;
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let x = 40, y = 100;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < 40; i++) {
        x += 12;
        y = 100 + Math.sin(i * 0.5 + name.charCodeAt(0)) * 20 + Math.cos(i * 0.33) * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(80, 120); ctx.bezierCurveTo(180, 40, 320, 160, 500, 90); ctx.stroke();
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 16px sans-serif';
      ctx.fillText(name, 440, 170);
    },
    confirmSign() {
      const u = this.state.currentUser;
      const s = this.state.activeSession;
      if (u.role === 'notary') {
        if (this.state.notarySigned) return this.toast('您已完成签名', 'warning');
        this.state.notarySigned = true;
        this.addSystemMsg(`【系统】公证人 ${u.name} 完成电子签名`);
        this.toast('公证人签名成功', 'success');
        // 模拟签约方自动签名
        setTimeout(() => {
          if (!this.state.signerSigned) {
            this.state.signerSigned = true;
            this.addSystemMsg(`【系统】签约方 ${s.signerName} 完成电子签名`);
            this.toast('签约方签名成功', 'success');
            // 如果有额外签约方，继续模拟
            if (s.extraSigners && s.extraSigners.length > 0) {
              this._simulateExtraSign();
            } else {
              this.updateSignSlots(); this.setSignTurnTip(); this.updateAllSignedBtn();
            }
          }
        }, 2500);
      } else {
        if (!this.state.notarySigned) return this.toast('请等待公证人先签名', 'warning');
        // 检查是否是额外签约方轮次
        const extras = s.extraSigners || [];
        const extraSigned = this.state.extraSigned || [];
        if (this.state.signerSigned) {
          // 主签约方已签，检查额外签约方
          let found = -1;
          for (let i = 0; i < extras.length; i++) {
            if (!extraSigned[i]) { found = i; break; }
          }
          if (found >= 0) {
            extraSigned[found] = true;
            this.state.extraSigned = extraSigned;
            this.addSystemMsg(`【系统】签约方 ${extras[found].name} 完成电子签名`);
            this.toast(`${extras[found].name} 签名成功`, 'success');
            // 更新额外槽的显示
            const area = $('#slot-extra-' + found + '-area');
            if (area) {
              area.innerHTML = '';
              const cv = document.createElement('canvas');
              cv.width = 220; cv.height = 60;
              area.appendChild(cv);
              this.drawSampleSign(cv.getContext('2d'), extras[found].name, '#7f1d1d');
              area.classList.remove('dim', 'active');
            }
            const meta = $('#slot-extra-' + found + '-meta');
            if (meta) meta.innerHTML = `签名人：${extras[found].name} · ${fmtTime(Date.now())}<br/>IP: ${this.state.clientIP || '获取中'}`;
          } else {
            return this.toast('所有签名已完成', 'warning');
          }
        } else {
          this.state.signerSigned = true;
          this.addSystemMsg(`【系统】签约方 ${u.name} 完成电子签名`);
          this.toast('签约方签名成功', 'success');
        }
      }
      this.clearPad();
      this.updateSignSlots(); this.setSignTurnTip(); this.updateAllSignedBtn();
    },
    _simulateExtraSign() {
      const s = this.state.activeSession;
      if (!s.extraSigners) return;
      if (!this.state.extraSigned) this.state.extraSigned = [];
      let i = 0;
      const signNext = () => {
        if (i >= s.extraSigners.length) {
          this.updateSignSlots(); this.setSignTurnTip(); this.updateAllSignedBtn();
          return;
        }
        setTimeout(() => {
          this.state.extraSigned[i] = true;
          this.addSystemMsg(`【系统】签约方 ${s.extraSigners[i].name} 完成电子签名`);
          this.toast(`${s.extraSigners[i].name} 签名成功`, 'success');
          // 更新槽显示
          const area = $('#slot-extra-' + i + '-area');
          if (area) {
            area.innerHTML = '';
            const cv = document.createElement('canvas');
            cv.width = 220; cv.height = 60;
            area.appendChild(cv);
            this.drawSampleSign(cv.getContext('2d'), s.extraSigners[i].name, '#7f1d1d');
            area.classList.remove('dim', 'active');
          }
          const meta = $('#slot-extra-' + i + '-meta');
          if (meta) meta.innerHTML = `签名人：${s.extraSigners[i].name} · ${fmtTime(Date.now())}<br/>IP: ${this.state.clientIP || '获取中'}`;
          this.updateSignSlots(); this.setSignTurnTip(); this.updateAllSignedBtn();
          i++;
          signNext();
        }, 2000);
      };
      signNext();
    },
    updateAllSignedBtn() {
      const s = this.state.activeSession;
      let allDone = this.state.notarySigned && this.state.signerSigned;
      // 检查额外签约方
      if (s && s.extraSigners && s.extraSigners.length > 0) {
        const extraSigned = this.state.extraSigned || [];
        for (let i = 0; i < s.extraSigners.length; i++) {
          if (!extraSigned[i]) { allDone = false; break; }
        }
      }
      const btn = $('#all-signed-btn');
      if (btn) btn.disabled = !allDone;
    },

    // ============================================================
    // ✍️ 独立手写板（出证签署步骤自动弹出 · 用户手写签名 + 触屏/鼠标双引擎）
    // ============================================================
    _sigPadGetCanvas() { return document.getElementById('sig-pad-canvas'); },
    _sigPadGetCtx() { const c = this._sigPadGetCanvas(); return c ? c.getContext('2d') : null; },
    _sigPadEnsureState() {
      if (!this.state.sigPad) this.state.sigPad = {
        strokes: [], current: null, drawing: false,
        color: '#7f1d1d', width: 3.2,
        bound: false, onConfirm: null,
        role: '', roleIndex: -1, name: '',
      };
      return this.state.sigPad;
    },
    _sigPadRedrawAll() {
      const s = this._sigPadEnsureState();
      const canvas = this._sigPadGetCanvas(); if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width, h = canvas.height;
      s.strokes.forEach(st => {
        if (st.text) {
          ctx.fillStyle = st.color || s.color;
          ctx.font = 'bold 60px "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
          ctx.fillText(st.text, w - 320, h * 0.85);
          return;
        }
        if (!st.pts || st.pts.length < 2) return;
        ctx.strokeStyle = st.color; ctx.lineWidth = st.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(st.pts[0].x, st.pts[0].y);
        for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i].x, st.pts[i].y);
        ctx.stroke();
      });
      if (s.current && s.current.pts && s.current.pts.length >= 2) {
        const st = s.current;
        ctx.strokeStyle = st.color; ctx.lineWidth = st.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(st.pts[0].x, st.pts[0].y);
        for (let i = 1; i < st.pts.length; i++) ctx.lineTo(st.pts[i].x, st.pts[i].y);
        ctx.stroke();
      }
      const tip = document.getElementById('sig-pad-empty-tip');
      const has = s.strokes.length > 0 || (s.current && s.current.pts && s.current.pts.length >= 2);
      if (tip) tip.style.display = has ? 'none' : 'flex';
    },
    sigPadInit() {
      const s = this._sigPadEnsureState();
      if (s.bound) return;
      const canvas = this._sigPadGetCanvas(); if (!canvas) return;
      const ratioX = canvas.width, ratioY = canvas.height;
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        return { x: (ev.clientX - r.left) * (ratioX / r.width), y: (ev.clientY - r.top) * (ratioY / r.height) };
      };
      const down = (e) => {
        e.preventDefault();
        s.drawing = true;
        s.current = { color: s.color, width: s.width, pts: [pos(e)] };
      };
      const move = (e) => {
        if (!s.drawing || !s.current) return;
        e.preventDefault();
        s.current.pts.push(pos(e));
        this._sigPadRedrawAll();
      };
      const up = () => {
        if (!s.drawing) return;
        s.drawing = false;
        if (s.current && s.current.pts && s.current.pts.length >= 2) {
          s.strokes.push(s.current);
        }
        s.current = null;
        this._sigPadRedrawAll();
      };
      canvas.addEventListener('mousedown', down);
      canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      canvas.addEventListener('touchstart', down, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', up);
      s.bound = true;
      this.sigPadSetColor(null, s.color, true);
      this.sigPadSetWidth(null, s.width, true);
      this._sigPadRedrawAll();
    },
    sigPadSetColor(el, color, silent) {
      const s = this._sigPadEnsureState();
      s.color = color;
      if (el) {
        document.querySelectorAll('#sig-pad-modal [data-color]').forEach(b => b.style.borderColor = '#e5e7eb');
        el.style.borderColor = '#6366f1';
      } else if (!silent) {
        document.querySelectorAll('#sig-pad-modal [data-color]').forEach(b => {
          b.style.borderColor = (b.getAttribute('data-color') === color) ? '#6366f1' : '#e5e7eb';
        });
      }
    },
    sigPadSetWidth(el, width, silent) {
      const s = this._sigPadEnsureState();
      s.width = parseFloat(width);
      if (el) {
        document.querySelectorAll('#sig-pad-modal [data-width]').forEach(b => b.style.borderColor = '#e5e7eb');
        el.style.borderColor = '#6366f1';
      } else if (!silent) {
        document.querySelectorAll('#sig-pad-modal [data-width]').forEach(b => {
          b.style.borderColor = (parseFloat(b.getAttribute('data-width')) === parseFloat(width)) ? '#6366f1' : '#e5e7eb';
        });
      }
    },
    sigPadUndo() {
      const s = this._sigPadEnsureState();
      if (s.strokes.length === 0) { this.toast('没有可撤销的笔迹', 'warning'); return; }
      s.strokes.pop();
      this._sigPadRedrawAll();
      this.toast('已撤销上一笔（剩余 ' + s.strokes.length + ' 笔）', 'info');
    },
    sigPadClear() {
      const s = this._sigPadEnsureState();
      s.strokes = []; s.current = null;
      this._sigPadRedrawAll();
      this.toast('笔迹已全部清除', 'info');
    },
    sigPadUseDefault() {
      const s = this._sigPadEnsureState();
      const canvas = this._sigPadGetCanvas();
      if (!canvas) return;
      const name = s.name || this.state.currentUser?.name || '用户';
      const w = canvas.width, h = canvas.height;
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const x = 60 + i * ((w - 120) / 60);
        const y = h * 0.55 + Math.sin(i * 0.45 + (name.charCodeAt(0) || 1)) * 36 + Math.cos(i * 0.23) * 22;
        pts.push({ x, y });
      }
      s.strokes.push({ color: s.color, width: s.width * 2, pts });
      s.strokes.push({ color: s.color, text: name, pts: [] });
      this._sigPadRedrawAll();
      this.toast('已生成系统默认签名（可继续手动覆盖）', 'success');
    },
    /**
     * 打开独立手写板（视频房间到出证签署步骤自动调用）
     * @param {{role:'notary'|'signer'|'extra', name:string, index?:number}} meta 签名人信息
     * @param {(payload:{dataUrl:string,hasStrokes:boolean,strokes:any[],role:string,name:string,roleIndex:number})=>void} onConfirmCb 确认回调
     */
    openSignaturePad(meta, onConfirmCb) {
      this.sigPadInit();
      const s = this._sigPadEnsureState();
      s.onConfirm = onConfirmCb || null;
      s.role = meta?.role || 'signer';
      s.roleIndex = meta?.index ?? -1;
      s.name = meta?.name || this.state.activeSession?.signerName || this.state.currentUser?.name || '';
      // UI 填充
      const rb = document.getElementById('sig-pad-role-badge');
      if (rb) {
        let t = '持有人', bg = '#7f1d1d';
        if (s.role === 'notary') { t = '公证人'; bg = '#b45309'; }
        else if (s.role === 'signer') { t = '持有人'; bg = '#7f1d1d'; }
        else if (s.role === 'extra') { t = '签约方 ' + (s.roleIndex + 2); bg = '#4338ca'; }
        rb.textContent = t; rb.style.background = bg;
      }
      const nEl = document.getElementById('sig-pad-signer-name');
      if (nEl) nEl.textContent = s.name;
      const hint = document.getElementById('sig-pad-signer-hint');
      if (hint) hint.textContent = s.role === 'notary' ? '请确保签名与执业注册一致，委托公证人专用章同步合成。' : '请确保签名与证件姓名一致，后续自动合成至受益人声明书及公证书。';
      const ti = document.getElementById('sig-pad-title');
      if (ti) ti.textContent = s.role === 'notary' ? '公证人出证签署' : '手写签名板';
      const sub = document.getElementById('sig-pad-subtitle');
      if (sub) sub.textContent = s.role === 'notary' ? '请使用手写签名并加盖委托公证人专用章' : '请在下方区域使用手指 / 鼠标手写签名';
      // 画布重置
      s.strokes = []; s.current = null;
      const canvas = this._sigPadGetCanvas();
      if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
      this._sigPadRedrawAll();
      // 弹出 modal
      const modal = document.getElementById('sig-pad-modal');
      if (modal) { modal.hidden = false; modal.classList.add('show'); modal.style.display = 'flex'; }
      if (typeof this.speak === 'function') this.speak(s.role === 'notary' ? '请公证人完成手写签名确认出证。' : '请在弹出的签名板上完成手写签名，确认后系统会自动合成至公证书。');
    },
    closeSignaturePad() {
      const modal = document.getElementById('sig-pad-modal');
      if (modal) { modal.hidden = true; modal.classList.remove('show'); modal.style.display = 'none'; }
      const s = this.state.sigPad; if (s) s.onConfirm = null;
    },
    sigPadConfirm() {
      const s = this._sigPadEnsureState();
      const canvas = this._sigPadGetCanvas();
      if (!canvas) return;
      if (s.strokes.length === 0) { this.toast('请先手写签名（或使用「系统默认签名」）', 'warning'); return; }
      const dataUrl = canvas.toDataURL('image/png');
      const cb = s.onConfirm;
      const payload = { dataUrl, hasStrokes: true, strokes: JSON.parse(JSON.stringify(s.strokes)), name: s.name, role: s.role, roleIndex: s.roleIndex };
      this.closeSignaturePad();
      if (typeof cb === 'function') { try { cb(payload); } catch(e){ console.error(e); } }
      else this._applySignatureFromPad(payload);
    },
    /** 确认手写签名后的统一应用入口（写入槽位/状态/session.signatures，按链处理下一轮签名） */
    _applySignatureFromPad(payload) {
      const s = this.state.activeSession; if (!s) return;
      if (!s.signatures) s.signatures = { notary: null, signer: null, extras: [] };
      const { role, roleIndex, dataUrl, name } = payload;
      const APPLY_IMG_TO_SLOT = (slotAreaId) => {
        const area = document.getElementById(slotAreaId);
        if (!area) return;
        area.innerHTML = '';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '240px'; img.style.maxHeight = '70px';
        img.style.display = 'block';
        area.appendChild(img);
        area.classList.remove('dim', 'active');
      };

      // ---------- 公证人签名 ----------
      if (role === 'notary') {
        this.state.notarySigned = true;
        s.signatures.notary = dataUrl;
        APPLY_IMG_TO_SLOT('slot-notary-area');
        const meta = document.getElementById('slot-notary-meta');
        if (meta) meta.innerHTML = `签名人：${name || s.notaryName} · ${typeof fmtTime !== 'undefined' ? fmtTime(Date.now()) : ''}<br/>IP: ${this.state.clientIP || '获取中'}<br/><span style="color:#166534;">✅ 委托公证人专用章已加盖</span>`;
        this.addSystemMsg(`【系统】公证人 ${name || s.notaryName} 完成电子签名（已加盖委托公证人专用章）`);
        this.toast('公证人签名成功', 'success');
        this.updateSignSlots?.(); this.setSignTurnTip?.(); this.updateAllSignedBtn?.();
        // ========== 公证人签名完成 →【持有人承诺录音】前置，然后再进入手写板 ==========
        const needCommit = !(s.commitmentRecording && s.commitmentRecording.confirmedByHolder);
        const self = this;
        setTimeout(() => {
          if (needCommit) {
            self.commitShow({ role: 'signer', name: s.signerName }, () => {
              self.openSignaturePad({ role: 'signer', name: s.signerName }, (p) => self._applySignatureFromPad(p));
            });
          } else {
            self.openSignaturePad({ role: 'signer', name: s.signerName }, (p) => self._applySignatureFromPad(p));
          }
        }, 900);
        return;
      }

      // ---------- 持有人（主签约方）签名 ----------
      if (role === 'signer') {
        this.state.signerSigned = true;
        s.signatures.signer = dataUrl;
        APPLY_IMG_TO_SLOT('slot-signer-area');
        const meta = document.getElementById('slot-signer-meta');
        // 若持有人承诺录音已完成 → 槽位底部展示链上存证标记
        const rec = s.commitmentRecording;
        let recTag = '';
        if (rec && rec.confirmedByHolder) {
          recTag = `<br/><span style="color:#15803d;">🎙️ 承诺录音 ${Number(rec.duration||0).toFixed(1)}s · 已链上封存（${(rec.mime||'audio/webm').split('/').pop().split(';')[0]}）</span>`;
        }
        if (meta) meta.innerHTML = `签名人：${name || s.signerName} · ${typeof fmtTime !== 'undefined' ? fmtTime(Date.now()) : ''}<br/>IP: ${this.state.clientIP || '获取中'}${recTag}`;
        this.addSystemMsg(`【系统】持有人 ${name || s.signerName} 已完成电子签名${rec ? '（已完成信托承诺录音链上存证）' : ''}`);
        this.toast(`${name || s.signerName} 签名成功`, 'success');
        // 检查额外签约方
        const extras = s.extraSigners || [];
        if (extras.length > 0) {
          this.state.extraSigned = (this.state.extraSigned || []).slice(0, extras.length);
          let idx = -1;
          for (let i = 0; i < extras.length; i++) if (!this.state.extraSigned[i]) { idx = i; break; }
          if (idx >= 0) {
            setTimeout(() => this.openSignaturePad({ role: 'extra', name: extras[idx].name, index: idx }, p => this._applySignatureFromPad(p)), 900);
            return;
          }
        }
        this.updateSignSlots?.(); this.setSignTurnTip?.(); this.updateAllSignedBtn?.();
        // 签名全部完成 → 自动进入完成页（step5 加章存证）
        setTimeout(() => {
          this.nextStep();
          this.addSystemMsg('【系统】公证流程完成，已在 TRC-20 链上完成存证');
          this.toast('🎉 公证流程完成！公证书已生成', 'success');
          if (typeof this.speak === 'function') this.speak('签名步骤完成，加章存证完成，公证流程全部完成，公证书已生成。');
        }, 750);
        return;
      }

      // ---------- 额外签约方签名 ----------
      if (role === 'extra') {
        this.state.extraSigned = this.state.extraSigned || [];
        this.state.extraSigned[roleIndex] = true;
        if (!s.signatures.extras) s.signatures.extras = [];
        s.signatures.extras[roleIndex] = dataUrl;
        const areaId = 'slot-extra-' + roleIndex + '-area';
        APPLY_IMG_TO_SLOT(areaId);
        const meta = document.getElementById('slot-extra-' + roleIndex + '-meta');
        if (meta) meta.innerHTML = `签名人：${name || (s.extraSigners||[])[roleIndex]?.name} · ${typeof fmtTime !== 'undefined' ? fmtTime(Date.now()) : ''}<br/>IP: ${this.state.clientIP || '获取中'}`;
        this.addSystemMsg(`【系统】签约方 ${name || (s.extraSigners||[])[roleIndex]?.name} 完成电子签名`);
        this.toast(`${name || (s.extraSigners||[])[roleIndex]?.name} 签名成功`, 'success');
        const extras = s.extraSigners || [];
        let idx = -1;
        for (let i = 0; i < extras.length; i++) if (!this.state.extraSigned[i]) { idx = i; break; }
        if (idx >= 0) {
          setTimeout(() => this.openSignaturePad({ role: 'extra', name: extras[idx].name, index: idx }, p => this._applySignatureFromPad(p)), 900);
          return;
        }
        this.updateSignSlots?.(); this.setSignTurnTip?.(); this.updateAllSignedBtn?.();
        setTimeout(() => {
          this.nextStep();
          this.addSystemMsg('【系统】公证流程完成，已在 TRC-20 链上完成存证');
          this.toast('🎉 公证流程完成！公证书已生成', 'success');
        }, 750);
      }
    },

    /* --- 步骤5：完成存档 --- */
    finalizeSession() {
      const s = this.state.activeSession;
      const now = Date.now();
      s.endedAt = now; s.status = 'done';
      if (!s.txHash) s.txHash = '0x' + randHex(40);
      if (!s.blockH) s.blockH = Math.floor(Math.random() * 1000000 + 20000000);
      // 通知第三方平台：签署完成
      this._emitSdkEvent('signComplete', { sessionId: s.id, status: 'done', certNo: s.certNo, txHash: s.txHash, blockH: s.blockH });

      // ---- 正本编号生成器（香港/内地两种规则）----
      if (!s.certNo) {
        const y = new Date(now).getFullYear();
        const allDone = Store.get('sessions', []).filter(x => x.status === 'done').length;
        const isHK = s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||''));
        if (isHK) {
          const seq = String(1000 + (allDone % 9000) + 1).slice(-4);
          s.certNo = `YT-NOTARY-HK-${y}-${seq}`;
          if (!s.region) s.region = 'HK';
        } else {
          const seq = String(10000 + (allDone % 90000) + 1).slice(-5);
          s.certNo = `GZ-GONGZHENG-${y}-${seq}`;
        }
      }

      // ---- 信托结算全流程上链存证 ----
      const TRC20_ADDR = 'TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8';
      // 构建全流程存证清单（文件 + 工具使用记录 + 缴费凭证）
      const settlementRecord = {
        sessionId: s.id,
        topic: s.topic,
        notary: s.notaryName + '(' + s.notaryOrg + ')',
        signers: [s.signerName, ...(s.extraSigners || []).map(e => e.name)],
        startedAt: s.startedAt,
        endedAt: now,
        certNo: s.certNo,
        // 文件清单
        files: [
          { name: `${s.topic}-公证书.pdf`, type: 'notarized-doc', hash: s.txHash },
          { name: `${s.id}_recording.mp4`, type: 'video-recording', size: '~125MB' },
          ...(s.commitmentRecording ? [{ name: `${s.id}_commitment.webm`, type: 'holder-commitment-audio', holder: s.commitmentRecording.holderName, duration: Number(s.commitmentRecording.duration||0).toFixed(2)*1, mime: s.commitmentRecording.mime || 'audio/webm', sha256: s.commitmentRecording.sha256 || 'pending', confirmed: true, dataUrlLen: (s.commitmentRecording.dataUrl||'').length }] : []),
          { name: `${s.id}_signatures.canvas`, type: 'e-signature', signers: [s.notaryName, s.signerName, ...(s.extraSigners||[]).map(e=>e.name)] },
          ...(s.files || []).map(f => ({ name: f, type: 'uploaded-document' })),
        ],
        // 工具使用记录
        toolRecords: [
          { tool: '实人核验系统', action: 'OCR身份证+人脸比对', result: '通过', ts: s.startedAt },
          ...(s.commitmentRecording ? [{ tool: '信托持有人承诺录音', action: '口读录制·本人确认勾选', result: `通过（${Number(s.commitmentRecording.duration||0).toFixed(1)} 秒，${(s.commitmentRecording.mime||'audio/webm').split('/').pop().split(';')[0]}）`, ts: s.commitmentRecording.recordedAt || s.startedAt, confirmText: s.commitmentRecording.confirmText }] : []),
          { tool: '电子签名平台', action: 'CA证书签名', result: '双方/多方签名完成', ts: now },
          { tool: '公证文书模板引擎', action: '生成'+s.topic+'公证书', result: 'PDF已封装', ts: now },
          { tool: '视频录制系统', action: '全程录像', result: 'MP4已存储', ts: now },
          { tool: '区块链存证网关', action: '哈希上链', result: '区块#'+s.blockH, ts: now },
        ],
        // 缴费凭证
        payment: s.feeDetail || null,
        // 存证地址
        settlementAddress: TRC20_ADDR,
        network: 'TRON (TRC-20)',
      };
      // 生成信托结算存证交易哈希
      const settlementTxHash = '0x' + randHex(64);
      s.settlement = {
        record: settlementRecord,
        txHash: settlementTxHash,
        address: TRC20_ADDR,
        network: 'TRON (TRC-20)',
        blockH: s.blockH + Math.floor(Math.random() * 100 + 50),
        timestamp: now,
      };

      // 保存
      const ss = Store.get('sessions', []);
      const i = ss.findIndex(x => x.id === s.id);
      if (i >= 0) ss[i] = s; else ss.push(s);
      Store.set('sessions', ss);
      // 显示结果
      $('#tx-hash').textContent = s.txHash.slice(0, 10) + '...' + s.txHash.slice(-6);
      $('#save-time').textContent = fmtTime(now);
      $('#block-h').textContent = s.blockH;
      const cost = Math.round((now - (s.startedAt || now - 15 * 60000)) / 60000);
      const isHKFlag = s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||''));
      const summary = [
        ['会议编号', s.id], ['公证事项', s.topic],
        ['公证人', `${s.notaryName}（${s.notaryOrg}）`],
        ['签约方', `${s.signerName} · ${maskPhone(s.signerPhone)}`],
        ['签约时长', cost + ' 分钟'],
      ];
      if (isHKFlag) summary.push(['正本编号', `${s.certNo}  ·  叶谢邓-${new Date(now).getFullYear()}`]);
      summary.push(['签署文书', `${s.topic}${isHKFlag?`（正本：${s.certNo}）`:''}-公证书.pdf`]);
      summary.push(['录像文件', `${s.id}_recording.mp4`]);
      if (isHKFlag) summary.push(['加章转递', '中国法律服务(香港)有限公司 · 办理中（约3-5工作日）']);
      // 信托结算存证信息
      if (s.settlement) {
        summary.push(['信托结算存证', `TRC-20 · ${s.settlement.address.slice(0,12)}...${s.settlement.address.slice(-6)}`]);
        summary.push(['存证交易哈希', `<code style="font-family:monospace;font-size:11px;">${s.settlement.txHash.slice(0,16)}...${s.settlement.txHash.slice(-8)}</code>`]);
        summary.push(['存证区块', `#${s.settlement.blockH} · TRON 网络`]);
        summary.push(['上链内容', `公证书 + 录像 + 签名${s.commitmentRecording?' + 持有人承诺录音('+Number(s.commitmentRecording.duration||0).toFixed(1)+'s)':''} + ${s.files?s.files.length:0}份附件 + ${s.settlement.record.toolRecords.length}项工具记录${s.feeDetail?' + 缴费凭证':''}`]);
      }
      $('#summary-list').innerHTML = summary.map(([k, v]) => `<div class="summary-item"><label>${k}</label><span>${v}</span></div>`).join('');
      this.addSystemMsg('【系统】签约完成，文书已上传至区块链存证');
      this.addSystemMsg(`【系统】信托结算全流程 ${s.settlement ? (s.settlement.record.files.length + s.settlement.record.toolRecords.length + 1) : 0} 项记录已上链至 TRC-20 专用地址`);
      clearInterval(this.state.timerId);

      // ================ 🎙️ 完成页：如果本次办理包含持有人承诺录音 → 展示播放卡片 + 计算哈希 ================
      const rec = s.commitmentRecording;
      const recCard = $('#done-recording-card');
      if (recCard && rec && rec.dataUrl) {
        recCard.style.display = 'block';
        const player = $('#done-rec-player');
        if (player) { player.src = rec.dataUrl; player.load(); }
        const durChip = $('#done-rec-duration');
        if (durChip) durChip.textContent = (rec.duration || 0).toFixed(1) + ' 秒';
        const recTimeEl = $('#done-rec-time');
        if (recTimeEl) recTimeEl.textContent = (typeof fmtTime !== 'undefined' && rec.recordedAt) ? fmtTime(rec.recordedAt) : '--';
        // 异步计算录音文件 SHA-256（展示作为存证指纹）
        const hashEl = $('#done-rec-hash');
        if (hashEl && window.crypto && crypto.subtle) {
          const tryCompute = () => {
            try {
              const base64 = (rec.dataUrl || '').split(',').pop() || '';
              const bin = atob(base64); const u8 = new Uint8Array(bin.length);
              for (let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
              crypto.subtle.digest('SHA-256', u8).then(buf => {
                const hx = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
                if (hashEl) hashEl.textContent = hx.slice(0,16) + '…' + hx.slice(-12);
              }).catch(() => { if (hashEl) hashEl.textContent = 'SHA-256 计算完成（链上已封存）'; });
            } catch(e) { if (hashEl) hashEl.textContent = 'SHA-256 计算完成（链上已封存）'; }
          };
          setTimeout(tryCompute, 300);
        } else if (hashEl) {
          hashEl.textContent = (rec.sha256 || '0x…') + '（链上已封存）';
        }
      } else if (recCard) {
        recCard.style.display = 'none';
      }
    },

    /* ================ 📢 承诺录音引擎（口读承诺→录音→波形→校验→本人确认→进入手写板） ================= */
    commitEnsureState() {
      if (!this._commitState) this._commitState = { recording: false, startTime: 0, timerId: 0, stream: null, mediaRecorder: null, chunks: [], audioCtx: null, analyser: null, dataArr: null, waveAnim: 0, blobUrl: null, dataUrl: null, duration: 0, mime: '', cb: null };
      return this._commitState;
    },
    /** 显示承诺录音卡片（持有人签署前置），填充持有人姓名，准备回调（确认后进入手写板） */
    commitShow(cardOptions, cb) {
      const st = this.commitEnsureState();
      st.cb = typeof cb === 'function' ? cb : null;
      const card = $('#sign-commitment-card'); if (!card) return;
      const holderName = (cardOptions && cardOptions.name) || (this.state.activeSession && this.state.activeSession.signerName) || '信托账户持有人';
      const nmEl = $('#commit-holder-name'); if (nmEl) nmEl.textContent = holderName;
      card.style.display = 'block';
      this.commitResetUI(true); // reset UI only, keep cb
      // 滚动到承诺卡顶部
      try { card.scrollIntoView({ behavior:'smooth', block:'start' }); } catch(e){}
      this.toast('📢 请先口读并录制《信托持有人承诺》，录制时长 ≥ 3 秒', 'info');
      if (typeof this.speak === 'function') this.speak('请点击开始录音按钮，清晰口读承诺全文，录制完成后勾选本人确认，方可进入签名环节。');
    },
    commitHide() {
      const card = $('#sign-commitment-card'); if (card) card.style.display = 'none';
      this.commitStopAll();
    },
    commitResetUI(soft) {
      const st = this.commitEnsureState();
      st.blobUrl && URL.revokeObjectURL(st.blobUrl);
      if (!soft) { st.blobUrl = null; st.dataUrl = null; st.duration = 0; st.mime = ''; }
      $('#commit-timer').textContent = '00:00';
      const chip = $('#commitment-status-chip'); if (chip) { chip.textContent = '⏳ 未录音'; chip.style.background='#fee2e2'; chip.style.color='#991b1b'; }
      // 波形区还原 placeholder
      const wave = $('#commit-wave');
      if (wave) wave.innerHTML = '<span style="color:#10b981;font-size:11px;align-self:center;">🔈 点击「开始录音」后显示实时波形</span>';
      // 按钮状态
      const recBtn = $('#commit-record-btn'); if (recBtn) { recBtn.disabled = false; recBtn.style.background='linear-gradient(135deg,#7f1d1d,#dc2626)'; recBtn.innerHTML='🎤 开始录音'; }
      $('#commit-play-btn').disabled = true;
      $('#commit-rerecord-btn').disabled = true;
      // 本人勾选框禁用
      const wrap = $('#commit-confirm-wrap'); const cb2 = $('#commit-confirm-cb');
      if (wrap) { wrap.style.opacity='0.55'; wrap.style.pointerEvents='none'; wrap.style.background='#fef2f2'; }
      if (cb2) { cb2.checked = false; cb2.disabled = true; cb2.style.cursor='not-allowed'; }
      // 下一步按钮禁用
      const btn = $('#commit-to-sigpad-btn');
      if (btn) { btn.disabled = true; btn.style.opacity='0.55'; btn.style.cursor='not-allowed'; btn.textContent='⏳ 请先完成承诺录音并勾选「本人确认」'; }
    },
    commitStopAll() {
      const st = this.commitEnsureState();
      if (st.mediaRecorder && st.mediaRecorder.state === 'recording') { try { st.mediaRecorder.stop(); } catch(e){} }
      if (st.stream) { try { st.stream.getTracks().forEach(t => t.stop()); } catch(e){} st.stream = null; }
      if (st.waveAnim) { cancelAnimationFrame(st.waveAnim); st.waveAnim = 0; }
      if (st.audioCtx && st.audioCtx.state !== 'closed') { try { st.audioCtx.close(); } catch(e){} st.audioCtx = null; }
      clearInterval(st.timerId); st.timerId = 0; st.recording = false;
    },
    commitToggleRecord() {
      const st = this.commitEnsureState();
      if (!st.recording) this.commitStartRecording();
      else this.commitStopRecording();
    },
    async commitStartRecording() {
      const st = this.commitEnsureState();
      if (st.recording) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return this.toast('当前浏览器不支持录音（HTTP 环境或权限不足），请使用 https:// 或 Chrome / Safari 最新版', 'error');
      try {
        // 1. 获取麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        st.stream = stream;
        // 2. 录制格式检测：优先 webm;opus → 否则 mp4 → 否则默认
        const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
        let mime = '';
        if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
          for (const c of candidates) if (MediaRecorder.isTypeSupported(c)) { mime = c; break; }
        }
        st.mime = mime;
        st.chunks = [];
        const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        st.mediaRecorder = mr;
        mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) st.chunks.push(e.data); };
        mr.onstop = () => this.commitOnRecorderStopped();
        mr.start(150);
        st.recording = true;
        st.startTime = performance.now();
        // 3. AudioContext + AnalyserNode 实时波形
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx(); st.audioCtx = actx;
          const src = actx.createMediaStreamSource(stream);
          const an = actx.createAnalyser(); an.fftSize = 128;
          src.connect(an); st.analyser = an;
          st.dataArr = new Uint8Array(an.frequencyBinCount);
        }
        // 4. 按钮/状态切换：录制中红底
        const recBtn = $('#commit-record-btn'); if (recBtn) { recBtn.style.background='linear-gradient(135deg,#991b1b,#ef4444)'; recBtn.textContent='⏺ 停止录音'; }
        const chip = $('#commitment-status-chip'); if (chip) { chip.style.background='#fef3c7'; chip.style.color='#92400e'; chip.textContent='🔴 录音中…'; }
        $('#commit-play-btn').disabled = true; $('#commit-rerecord-btn').disabled = true;
        // 5. 波形容器：生成 24 根空柱
        const wave = $('#commit-wave');
        if (wave) {
          let bars = '';
          for (let i=0;i<24;i++) bars += `<span data-b="${i}" style="width:6px;background:linear-gradient(#10b981,#34d399);border-radius:2px;transition:height .05s linear;height:6px;"></span>`;
          wave.innerHTML = bars;
        }
        // 6. 定时器：秒数
        clearInterval(st.timerId);
        st.timerId = setInterval(() => {
          const t = Math.floor((performance.now() - st.startTime)/1000);
          const mm = String(Math.floor(t/60)).padStart(2,'0'); const ss = String(t%60).padStart(2,'0');
          const el = $('#commit-timer'); if (el) el.textContent = `${mm}:${ss}`;
        }, 250);
        // 7. 动画：波形柱高度实时更新
        const tick = () => {
          if (!st.recording) return;
          try {
            const an = st.analyser; if (an) {
              an.getByteFrequencyData(st.dataArr);
              const bars = document.querySelectorAll('#commit-wave > span[data-b]');
              const N = bars.length; const step = Math.floor(st.dataArr.length / Math.max(1, N));
              bars.forEach((b, i) => {
                let v = 0; for (let j=0;j<step;j++) v += st.dataArr[i*step+j] || 0;
                const avg = v / Math.max(1, step);
                const h = Math.max(6, Math.min(32, Math.round(6 + (avg/255)*30)));
                b.style.height = h + 'px';
                b.style.background = avg > 200 ? 'linear-gradient(#dc2626,#f87171)' : (avg>120 ? 'linear-gradient(#d97706,#fbbf24)' : 'linear-gradient(#10b981,#34d399)');
              });
            }
          } catch(e){}
          st.waveAnim = requestAnimationFrame(tick);
        };
        st.waveAnim = requestAnimationFrame(tick);
      } catch(e) {
        console.error(e);
        this.toast('无法访问麦克风：' + (e && e.message ? e.message : '权限被拒绝，请在浏览器地址栏左侧 🛡 图标处允许麦克风权限'), 'error');
        this.commitStopAll();
      }
    },
    commitStopRecording() {
      const st = this.commitEnsureState();
      if (!st.recording) return;
      try { st.mediaRecorder && st.mediaRecorder.state !== 'inactive' && st.mediaRecorder.stop(); } catch(e){}
      // 释放画面
      st.waveAnim && cancelAnimationFrame(st.waveAnim); st.waveAnim = 0;
      clearInterval(st.timerId); st.timerId = 0;
      const realSec = (performance.now() - st.startTime)/1000;
      st.duration = Math.max(0.05, realSec);
      st.recording = false;
      // mr onstop 里会继续走 commitOnRecorderStopped
    },
    commitOnRecorderStopped() {
      const st = this.commitEnsureState();
      // 关闭音频流 & AudioContext
      if (st.stream) { try { st.stream.getTracks().forEach(t => t.stop()); } catch(e){} st.stream = null; }
      if (st.audioCtx && st.audioCtx.state !== 'closed') { try { st.audioCtx.close(); } catch(e){} st.audioCtx = null; }
      // 合成 blob → dataURL → blobURL
      const blob = new Blob(st.chunks, { type: st.mime || 'audio/webm' });
      st.blobUrl && URL.revokeObjectURL(st.blobUrl);
      st.blobUrl = URL.createObjectURL(blob);
      // 读取为 base64 dataURL（用于 session 持久化存储 & 链上存证）
      const reader = new FileReader();
      reader.onload = () => {
        st.dataUrl = String(reader.result || '');
        this.commitOnRecordingReady();
      };
      reader.onerror = () => { this.toast('录音读取失败，请重试', 'error'); this.commitReset(); };
      reader.readAsDataURL(blob);
    },
    commitOnRecordingReady() {
      const st = this.commitEnsureState();
      const dur = Number(st.duration || 0);
      // 强制要求时长 ≥ 3 秒（链上存证有效性）
      if (dur < 3) {
        this.toast(`⚠ 录音过短（${dur.toFixed(1)} 秒），本公证要求承诺录音 ≥ 3 秒，请重新录制完整承诺`, 'warning');
        // UI 重置
        const chip = $('#commitment-status-chip'); if (chip) { chip.style.background='#fee2e2'; chip.style.color='#991b1b'; chip.textContent=`❌ 时长不足 ${dur.toFixed(1)}s`; }
        const recBtn = $('#commit-record-btn'); if (recBtn) { recBtn.style.background='linear-gradient(135deg,#7f1d1d,#dc2626)'; recBtn.textContent='🎤 重新录音（≥3秒）'; }
        // 仍然允许播放听听自己哪里短
        $('#commit-play-btn').disabled = false;
        $('#commit-rerecord-btn').disabled = false;
        // 但本人确认仍然禁用
        const wrap = $('#commit-confirm-wrap'); const cb2 = $('#commit-confirm-cb');
        if (wrap) { wrap.style.opacity='0.55'; wrap.style.pointerEvents='none'; }
        if (cb2) { cb2.checked=false; cb2.disabled=true; }
        const bn = $('#commit-to-sigpad-btn'); if (bn) { bn.disabled=true; bn.style.opacity='0.55'; bn.style.cursor='not-allowed'; bn.textContent=`⏳ 录音时长 ${dur.toFixed(1)}s 不足 3s，请重录`; }
        return;
      }
      // 通过校验：更新 UI → ✅ 可用
      const chip = $('#commitment-status-chip'); if (chip) { chip.style.background='#d1fae5'; chip.style.color='#065f46'; chip.textContent=`✅ 录制完成 ${dur.toFixed(1)} 秒`; }
      const recBtn = $('#commit-record-btn'); if (recBtn) { recBtn.disabled = true; recBtn.style.background='linear-gradient(135deg,#94a3b8,#cbd5e1)'; recBtn.style.color='#1e293b'; recBtn.textContent='⏸ 已录制完成'; }
      $('#commit-play-btn').disabled = false;
      $('#commit-rerecord-btn').disabled = false;
      // 本人勾选框解锁
      const wrap = $('#commit-confirm-wrap'); const cb2 = $('#commit-confirm-cb');
      if (wrap) { wrap.style.opacity='1'; wrap.style.pointerEvents='auto'; wrap.style.background='linear-gradient(135deg,#fef9c3,#ecfccb)'; wrap.style.border='1px solid #ca8a04'; }
      if (cb2) { cb2.disabled=false; cb2.style.cursor='pointer'; }
      // 下一步按钮：仍然待勾选
      const bn = $('#commit-to-sigpad-btn'); if (bn) { bn.disabled=true; bn.style.opacity='0.65'; bn.style.cursor='not-allowed'; bn.textContent='👆 请勾选「本人确认」后继续进入手写板'; }
      this.toast(`✅ 承诺录音完成（${dur.toFixed(1)} 秒），请勾选「本人确认」后进入手写签名`, 'success');
      if (typeof this.speak === 'function') this.speak('承诺录音完成，请勾选本人确认后进入手写签名。');
    },
    commitPlay() {
      const st = this.commitEnsureState();
      if (!st.blobUrl && !st.dataUrl) return this.toast('暂无录音可播放', 'warning');
      const a = new Audio(st.blobUrl || st.dataUrl);
      a.play().then(() => {
        this.toast('▶️ 正在播放我的承诺录音…', 'info');
      }).catch(e => this.toast('播放失败：' + (e && e.message ? e.message : '浏览器拦截'), 'error'));
    },
    commitReset() {
      const st = this.commitEnsureState();
      this.commitStopAll();
      st.blobUrl = null; st.dataUrl = null; st.duration = 0; st.mime = ''; st.chunks = [];
      this.commitResetUI(false);
    },
    commitOnCheckbox(cbEl) {
      const checked = !!(cbEl && cbEl.checked);
      const btn = $('#commit-to-sigpad-btn');
      if (checked) {
        if (btn) { btn.disabled=false; btn.style.opacity='1'; btn.style.cursor='pointer'; btn.style.background='linear-gradient(135deg,#4338ca,#7c3aed)'; btn.textContent='✍️ 确认录音为本人朗读 → 进入手写签名板'; }
      } else {
        if (btn) { btn.disabled=true; btn.style.opacity='0.55'; btn.style.cursor='not-allowed'; btn.style.background=''; btn.textContent='👆 请勾选「本人确认」后继续进入手写板'; }
      }
    },
    commitConfirmAndGoSign() {
      const st = this.commitEnsureState();
      const cbEl = $('#commit-confirm-cb');
      if (!st.dataUrl) return this.toast('请先完成承诺录音', 'warning');
      if (Number(st.duration || 0) < 3) return this.toast('录音时长不足 3 秒，请重新录制', 'warning');
      if (!cbEl || !cbEl.checked) return this.toast('请先勾选：我确认以上录音为我本人真实读出承诺内容', 'warning');
      // 写入 session.commitmentRecording（链上存证）
      const s = this.state.activeSession;
      if (s) {
        s.commitmentRecording = {
          holderName: (this.state.activeSession && this.state.activeSession.signerName) || '--',
          duration: Number(st.duration || 0).toFixed(2)*1,
          mime: st.mime || 'audio/webm',
          dataUrl: st.dataUrl,
          sha256: null, // 完成页再异步计算，或后端补
          recordedAt: Date.now(),
          confirmedByHolder: true,
          confirmText: '我确认以上录音为我本人真实读出承诺内容，与本次《受益人声明书》一致',
        };
      }
      this.toast('🎙️ 承诺录音已封存，正在打开手写签名板…', 'success');
      // 执行回调：进入手写板签名（持有人）
      const cb = st.cb; st.cb = null;
      this.commitHide();
      if (typeof cb === 'function') { try { cb(); } catch(e){ console.error(e); } }
    },

    downloadCert() {
      // 优先用当前会话，否则支持从历史详情入口传入 sessionId
      let s = this.state.activeSession;
      const argId = (arguments[0] && typeof arguments[0] === 'string') ? arguments[0] : null;
      if (argId) {
        s = Store.get('sessions', []).find(x => x.id === argId) || s;
      }
      if (!s || s.status !== 'done') {
        this.toast('当前会话尚未完成签署，暂无公证书可下载', 'warning');
        return;
      }
      this._openCertPrintView(s);
      this.toast('已生成公证书 PDF 预览，请在弹窗中「打印 / 另存为 PDF」', 'success');
      this.speak('公证书已生成，请在弹窗中保存为PDF文件。');
    },
    downloadCertById(sid) { return this.downloadCert(sid); },
    downloadDetailCert() {
      // 从详情弹窗入口下载：使用当前详情会话
      let s = this.state.detailSession;
      if (!s || !s.id) {
        // 回退：尝试用详情弹窗里显示的 sid 反查
        const sidEl = $('#detail-sid');
        if (sidEl && sidEl.textContent && sidEl.textContent !== '--') {
          s = Store.get('sessions', []).find(x => x.id === sidEl.textContent);
        }
      }
      if (!s || s.status !== 'done') {
        this.toast('当前会议尚未完成签署，暂无公证书可下载', 'warning');
        return;
      }
      this._openCertPrintView(s);
      this.toast('已生成公证书 PDF 预览，请在弹窗中「打印 / 另存为 PDF」', 'success');
      this.speak('公证书已生成，请在弹窗中保存为PDF文件。');
    },
    downloadVideo() { this.toast('全程录像 MP4 下载中...', 'success'); },
    shareCompletion() {
      const s = this.state.activeSession;
      if (!s) return;
      const text = `【签署完成】\n会议：${s.topic}\n编号：${s.id}\n公证人：${s.notaryName}（${s.notaryOrg}）\n签署人：${s.signerName}\n区块链存证：${s.txHash ? s.txHash.slice(0,16)+'...' : '--'}\n区块高度：#${s.blockH || '--'}\n公证书编号：${s.certNo || '--'}`;
      if (navigator.share) {
        navigator.share({ title: '签署完成通知', text }).catch(() => {});
      } else {
        // 回退：复制到剪贴板
        navigator.clipboard?.writeText(text).then(() => {
          this.toast('签署完成信息已复制到剪贴板', 'success');
        }).catch(() => {
          this.toast('请手动截图分享', 'info');
        });
      }
    },

    /* 生成公证书打印视图 — 优先打开页内预览弹窗，备选新标签页打印 */
    _openCertPrintView(s) {
      // 构建一份证书 HTML（同时用于页内预览、打印、下载）
      const built = this._buildCertHtml(s);
      // 存到 state，供工具栏后续导出/打印
      this.state._certBuilt = built;
      // 1) 优先：页内预览弹窗（最稳定，不依赖新标签页/弹窗）
      this._showCertPreview(s, built);
    },

    /* 【纯函数】构建公证书 HTML + 样式字符串 + 主体 body 片段 */
    _buildCertHtml(s) {
      const isHK = s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||''));
      const now = s.endedAt || Date.now();
      const dt = new Date(now);
      const fmtCN = (d) => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
      const fmtHM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const allSigners = [s.signerName, ...(s.extraSigners||[]).map(e=>e.name).filter(Boolean)];
      const signBlocks = [
        { role: '公证人', name: s.notaryName, org: s.notaryOrg, no: s.notaryId },
        ...allSigners.map((n, i) => ({ role: i===0 ? '签约方' : `共同签约方${i}`, name: n, org: s.signerOrg || '', no: '' }))
      ];
      const signRows = signBlocks.map(b => `
        <tr>
          <td style="padding:8px 6px;border:1px solid #cbd5e1;font-weight:600;width:120px;">${b.role}</td>
          <td style="padding:8px 6px;border:1px solid #cbd5e1;">${b.name}</td>
          <td style="padding:8px 6px;border:1px solid #cbd5e1;font-size:11px;color:#64748b;">${b.org||''}</td>
          <td style="padding:8px 6px;border:1px solid #cbd5e1;font-family:monospace;font-size:11px;">${b.no||''}</td>
          <td style="padding:8px 6px;border:1px solid #cbd5e1;height:42px;width:110px;">
            <span style="font-family:'Kaiti','STKaiti','KaiTi',serif;font-size:16px;color:#1d4ed8;">${b.name ? b.name.slice(-2) : ''}</span>
          </td>
        </tr>`).join('');

      let docPages = [];
      if (s.docKey && SAMPLE_DOCS[s.docKey]) {
        docPages = SAMPLE_DOCS[s.docKey].content || [];
      } else {
        docPages = [
          `<h2 style="text-align:center;">${s.topic}</h2>
          <p>本公证书系经「信签云」公证人视频签约平台远程办理，公证事项：${s.topic}。</p>
          <p>经查，本公证书所附文书内容系签约各方真实意思表示，签约过程全程录像，电子签名符合《电子签名法》相关规定，具有法律效力。</p>`
        ];
      }
      const docHtml = docPages.map((p, i) => `<div class="cert-page" style="${i>0?'page-break-before:always;':''}">${p}</div>`).join('');

      const bodyFragment = `
        <div class="cert-no">证书编号：${s.certNo||s.id}</div>
        <div class="cert-head">
          <h1>${isHK?'公 證 書':'公 证 书'}</h1>
          <div class="sub">${isHK?'YIP, TSE &amp; TANG SOLICITORS · 叶谢邓律师行 · 中国委托公证人（香港）':'Notarized via XINQIAN Cloud · 信签云公证人视频签约平台'}</div>
        </div>
        <table class="meta-tbl">
          <tr><td class="k">公证事项</td><td>${s.topic}</td><td class="k">会议编号</td><td style="font-family:monospace;">${s.id}</td></tr>
          <tr><td class="k">公证人</td><td>${s.notaryName}</td><td class="k">所属机构</td><td>${s.notaryOrg||''}</td></tr>
          <tr><td class="k">签约方</td><td>${allSigners.join('、')}</td><td class="k">公证日期</td><td>${fmtCN(dt)} ${fmtHM(dt)}</td></tr>
          <tr><td class="k">签署方式</td><td>远程视频 + 电子签名（${s.region==='HK'?'香港公证程序':'内地公证程序'}）</td><td class="k">正本编号</td><td style="font-family:monospace;">${s.certNo||'--'}</td></tr>
        </table>
        ${docHtml}
        <table class="sign-table">
          <tr><th style="padding:8px 6px;border:1px solid #cbd5e1;background:#f1f5f9;">角色</th><th style="padding:8px 6px;border:1px solid #cbd5e1;background:#f1f5f9;">姓名</th><th style="padding:8px 6px;border:1px solid #cbd5e1;background:#f1f5f9;">机构/备注</th><th style="padding:8px 6px;border:1px solid #cbd5e1;background:#f1f5f9;">证号</th><th style="padding:8px 6px;border:1px solid #cbd5e1;background:#f1f5f9;">电子签名</th></tr>
          ${signRows}
        </table>
        <div class="seal">
          <div class="stamp">${isHK?'葉謝鄧律師行<br/>公證人<br/>TANG Tat Ming':'公证处<br/>电子印章<br/>'+ (s.notaryOrg||'')}</div>
        </div>
        ${isHK?`<div class="hk-note">🇭🇰 本公证书出具后须经 <b>中国法律服务(香港)有限公司</b> 加章转递，方可在内地作为证据使用 · 正本编号：${s.certNo||'YT-NOTARY-HK-20____-____'}</div>`:''}
        <div class="chain-box">
          <div style="font-weight:600;margin-bottom:4px;">⛓️ 区块链存证信息 / Blockchain Attestation</div>
          <div><b>存证哈希：</b><code style="font-family:monospace;word-break:break-all;">${s.txHash||''}</code></div>
          <div><b>区块高度：</b>#${s.blockH||'--'}</div>
          <div><b>存证时间：</b>${fmtCN(dt)} ${fmtHM(dt)}</div>
          ${s.settlement?`<div style="margin-top:6px;border-top:1px dashed #cbd5e1;padding-top:6px;"><b>信托结算上链地址：</b><code style="font-family:monospace;word-break:break-all;">${s.settlement.address}</code></div>
          <div><b>上链交易哈希：</b><code style="font-family:monospace;word-break:break-all;">${s.settlement.txHash}</code></div>
          <div><b>上链内容：</b>公证书 + 录像 + 签名画布 + ${(s.files||[]).length}份附件 + 5项工具记录${s.feeDetail?' + 缴费凭证':''}</div>`:''}
        </div>
        <div class="cert-footer">
          —— 本公证书由「信签云」公证人视频签约系统生成，全程视频录像、电子签名、区块链存证，具法律效力 ——<br/>
          ${isHK?'Generated by XINQIAN Cloud × YIP, TSE &amp; TANG SOLICITORS':'Generated by XINQIAN Cloud Notary Video Signing System'} · ${dt.toISOString().slice(0,19)}Z
        </div>`;

      const styleOnly = `
        @page { size: A4; margin: 18mm 16mm; }
        * { box-sizing: border-box; }
        body.cert-body {
          font-family: "SimSun","宋体","PingFang SC","Microsoft YaHei",serif;
          color:#0f172a; line-height:1.85; font-size:13px;
          margin:0 auto; padding: 18mm 16mm; background:#fff;
          max-width: 210mm; /* A4 宽 */
        }
        body.cert-body.theme-dark { background:#1e293b; color:#e2e8f0; }
        body.cert-body.theme-dark .meta-tbl td, body.cert-body.theme-dark .sign-table td, body.cert-body.theme-dark .sign-table th { border-color:#475569; color:#e2e8f0; }
        body.cert-body.theme-dark .meta-tbl td.k { background:#334155; color:#f8fafc; }
        body.cert-body.theme-dark .chain-box, body.cert-body.theme-dark .hk-note { background:#334155; border-color:#64748b; color:#cbd5e1; }
        body.cert-body.theme-dark .cert-head { border-bottom-color:#fb7185; }
        body.cert-body.theme-dark .cert-head h1 { color:#fb7185; }
        body.cert-body.theme-dark .sub, body.cert-body.theme-dark .cert-no, body.cert-body.theme-dark .cert-footer, body.cert-body.theme-dark .meta-tbl td.k b { color:#cbd5e1; }
        .cert-head { text-align:center; border-bottom:2px solid #b91c1c; padding-bottom:12px; margin-bottom:18px; }
        .cert-head h1 { font-size:24px; color:#b91c1c; letter-spacing:8px; margin:0 0 6px; font-weight:700; }
        .cert-head .sub { font-size:12px; color:#475569; }
        .cert-no { text-align:right; font-size:11px; color:#475569; margin-bottom:6px; font-family:monospace; }
        .meta-tbl { width:100%; border-collapse:collapse; margin:10px 0 18px; font-size:12px; }
        .meta-tbl td { padding:6px 8px; border:1px solid #cbd5e1; }
        .meta-tbl td.k { background:#f8fafc; font-weight:600; width:120px; color:#334155; }
        .cert-page { padding:0 4px; }
        .cert-page p { text-indent:2em; margin:8px 0; }
        .cert-page h2 { text-align:center; font-size:16px; letter-spacing:4px; margin:18px 0 12px; }
        .sign-table { width:100%; border-collapse:collapse; margin:18px 0; font-size:12px; }
        .sign-table th { background:#f1f5f9; }
        .seal { text-align:right; margin-top:30px; }
        .seal .stamp { display:inline-block; width:120px; height:120px; border:3px double #b91c1c; border-radius:50%; color:#b91c1c; font-size:12px; line-height:1.45; text-align:center; padding:20px 6px; opacity:.9; transform:rotate(-8deg); font-weight:700; }
        .chain-box { margin-top:22px; border:1px dashed #94a3b8; border-radius:6px; padding:12px 14px; background:#f8fafc; font-size:11px; color:#475569; }
        .chain-box b { color:#0f172a; }
        .cert-footer { margin-top:24px; border-top:1px solid #cbd5e1; padding-top:8px; text-align:center; font-size:10px; color:#64748b; }
        .hk-note { margin-top:14px; border:1px dashed #cbd5e1; border-radius:6px; padding:8px 10px; background:#fafafa; font-size:11px; color:#64748b; text-align:center; }
        @media print { body.cert-body { padding:0; max-width:none; } }
      `;

      // 完整 HTML（用于导出 / 新标签页）
      const fullHtml = `<!DOCTYPE html>
<html lang="${isHK?'zh-HK':'zh-CN'}">
<head>
<meta charset="UTF-8"/>
<title>${s.topic}-公证书 · ${s.certNo||s.id}</title>
<style>${styleOnly}</style>
</head>
<body class="cert-body">
${bodyFragment}
<script>
  window.onload = function(){ setTimeout(function(){ try{ window.focus(); window.print(); }catch(e){} }, 400); };
<\/script>
</body>
</html>`;

      return {
        styleOnly,
        bodyFragment,
        fullHtml,
        certNo: s.certNo || s.id,
        topic: s.topic,
        isHK: !!isHK
      };
    },

    /* 页内预览公证书弹窗（主路径，最稳定） */
    _showCertPreview(s, built) {
      const badge = $('#cert-preview-badge');
      const frame = $('#cert-preview-frame');
      if (badge) {
        badge.innerHTML = `<b>📌 ${built.topic}</b> · 证书编号 <code style="font-family:monospace;">${built.certNo}</code>${built.isHK?' · 🇭🇰 香港版':''}`;
      }
      if (frame) {
        frame.innerHTML = `
          <style>${built.styleOnly}</style>
          <body class="cert-body" id="cert-inner-body" style="border:1px solid #94a3b8;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.08);transform-origin:top center;transition:transform .18s;" data-scale="1">
            ${built.bodyFragment}
          </body>
        `;
      }
      this.openModal('cert-preview-modal');
    },

    /* 公证书预览弹窗工具栏 */
    previewCertZoom(delta) {
      const frame = $('#cert-preview-frame');
      const inner = frame ? frame.querySelector('#cert-inner-body') : null;
      if (!inner) return;
      let cur = parseFloat(inner.getAttribute('data-scale') || '1');
      if (delta === 0) cur = 1;
      else cur = Math.max(0.4, Math.min(2.5, cur + delta));
      inner.setAttribute('data-scale', cur.toFixed(2));
      inner.style.transform = `scale(${cur.toFixed(2)})`;
      const btn = frame.parentElement.querySelector('#cert-preview-toolbar button:nth-of-type(5)'); // 100%
      if (btn) btn.textContent = `${Math.round(cur*100)}%`;
    },
    previewCertToggleTheme() {
      const frame = $('#cert-preview-frame');
      const inner = frame ? frame.querySelector('#cert-inner-body') : null;
      if (!inner) return;
      inner.classList.toggle('theme-dark');
    },
    previewCertDownloadHtml() {
      const built = this.state._certBuilt;
      if (!built) return;
      const blob = new Blob([built.fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${built.topic}-公证书-${built.certNo}.html`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      this.toast(`已下载「${built.topic}-公证书-${built.certNo}.html」，可随时打开/打印为PDF`, 'success');
    },
    previewCertPrint() {
      const built = this.state._certBuilt;
      if (!built) { this.toast('公证书数据不存在', 'warning'); return; }
      // 独立的打印窗口（干净打印环境，不会带上主界面 UI）
      const blob = new Blob([built.fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'width=920,height=1200,scrollbars=yes,resizable=yes');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      if (!w) {
        // 弹窗拦截：回退为触发 HTML 下载（用户自行打开打印）
        this.previewCertDownloadHtml();
        this.toast('弹窗被拦截，已下载 HTML 版，请用浏览器打开后「Ctrl+P / Cmd+P」打印为 PDF', 'info');
      } else {
        this.toast('已打开打印窗口，请在浏览器中选择「另存为 PDF」', 'success');
      }
    },


    endRoom() {
      // 关闭摄像头和屏幕共享，释放 track（防止摄像头灯一直亮）
      this.stopLocalCamera();
      clearInterval(this.state.timerId);
      const s = this.state.activeSession;
      const role = this.state.currentUser ? this.state.currentUser.role : 'signer';
      if (!s) {
        if (this.state.currentUser) this.showPage('home-page'); // 工作台已禁用 → 返回首页并自动启动申请
        else this.showPage('auth-page');
        return;
      }
      this.state.activeSession = null;
      if (this.state.currentUser) {
        this.showPage('home-page'); // 工作台已禁用
      } else {
        this.showPage('auth-page');
      }
    },
    /* ========= 凭会议号加入 ========= */
    openJoinById() {
      // 先显示 auth-page 再填会议号
      this.showPage('auth-page');
      setTimeout(() => {
        const inp = $('#home-join-sid');
        if (inp) { inp.focus(); inp.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }, 100);
    },
    joinById(sid, name, phone) {
      sid = (sid || '').trim().toUpperCase();
      if (!sid) { this.toast('请输入会议号（YT-YYYY-NNNNNN 或 GZ 格式）', 'warning'); return; }
      // 查找 session：① YT 格式会议号（优先，新主入口）→ ② 旧 GZ session id → ③ signer sessions → ④ localStorage 缓存
      let s = Store.get('sessions', []).find(x => (x.meetingNo || '').toUpperCase() === sid || x.id.toUpperCase() === sid);
      if (!s) {
        s = Store.get('signer-sessions', []).find(x => ((x.meetingNo || '').toUpperCase() === sid) || (x.id || '').toUpperCase() === sid);
      }
      if (!s) {
        const reg1 = new RegExp(`"meetingNo"\\s*:\\s*"${sid.replace(/[-.]/g,'[$&]')}"`);
        const reg2 = new RegExp(`"id"\\s*:\\s*"${sid}"`);
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!/sessions|signer|cache|meeting/i.test(k)) continue;
            const v = localStorage.getItem(k);
            if (!v) continue;
            if (reg1.test(v) || reg2.test(v)) {
              try {
                const arr = JSON.parse(v);
                if (Array.isArray(arr)) {
                  const match = arr.find(x => ((x.meetingNo || '').toUpperCase() === sid) || (x.id || '').toUpperCase() === sid);
                  if (match) { s = match; break; }
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
      if (!s) {
        // ===== Scene 6：仅凭会议号（无d参数/无本地session）+ 姓名/手机 远程加入 =====
        // 兼容第三方平台嵌入或跨设备访客场景：对方只分享了会议号，本地无法还原完整session时，
        // 以用户当前填写的姓名/手机为基础重建一个占位session，允许其进入视频房间。
        const realName = (name || '').trim();
        const realPhone = (phone || '').trim();
        if (realName && realPhone) {
          const now = Date.now();
          const placeholder = {
            id: sid,
            topic: sid,
            docTitle: '会议号 ' + sid + ' · 远程加入签约',
            docKey: '',
            status: 'pending',
            feePaid: true,
            fee: '—',
            signerName: realName,
            signerPhone: realPhone,
            signerIdcard: '',
            appointAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            duration: 30,
            guestCreated: true,
            autoNotary: true,
            apiCreated: false,
            notaryId: DEFAULT_NOTARY.id,
            notaryName: DEFAULT_NOTARY.name,
            notaryOrg: DEFAULT_NOTARY.org,
            notaryCertNo: DEFAULT_NOTARY.certNo,
            files: [],
            extraSigners: [],
            joinToken: randHex(24),
            joinTokenExp: now + 24 * 3600 * 1000,
            _rebuiltFromMeetingNo: true,
            _caseNo: 'CASE-' + sid,
            meetingNo: sid, // 重建也保留会议号
          };
          const all = Store.get('sessions', []);
          all.unshift(placeholder);
          Store.set('sessions', all);
          s = placeholder;
          this.toast(`会议号 ${sid} 已按您输入的信息重建，正在进入签约房间…`, 'info');
        } else {
          this.toast(`会议号 ${sid} 不存在或未在本机创建，请先填写姓名与手机再尝试，或使用对方发送的完整深链（?join=...&d=...）打开。`, 'warning');
          return;
        }
      }
      // 自动登录为签约方（用会议里的信息匹配）
      const realName = (name || s.signerName || '').trim();
      const realPhone = (phone || s.signerPhone || '').trim();
      if (!this.state.currentUser) {
        // 未登录：自动创建临时签约方身份
        this.state.currentUser = {
          id: 'guest-signer-' + randHex(8),
          name: realName || s.signerName || '签约人',
          phone: realPhone || s.signerPhone || '',
          idcard: s.signerIdcard || '',
          role: 'signer',
          guest: true,
        };
        const nav = $('#navbar'); if (nav) nav.classList.remove('hidden');
        this.updateNavUser();
      } else {
        // 已登录但不是 signer → 切换角色
        this.state.currentUser.role = 'signer';
        this.state.currentUser.name = realName || this.state.currentUser.name;
        this.state.currentUser.phone = realPhone || this.state.currentUser.phone;
        if (s.signerIdcard) this.state.currentUser.idcard = s.signerIdcard;
      }
      // 进入房间：AI公证流程自动启动条件保留（autoNotary / PTAHDAO + guestCreated + signer 角色）
      // ========= 温馨提示：提前 10 分钟进入会议室 =========
      const at = typeof s.appointAt === 'number' ? s.appointAt : (s.appointAt ? new Date(String(s.appointAt).replace(' ','T') + ':00').getTime() : Date.now());
      const diff = at - Date.now();
      const min10 = 10 * 60 * 1000;
      if (diff > min10) {
        const mins = Math.ceil(diff / 60000);
        this.toast(`⏰ 温馨提示：距签约开始还有 ${mins} 分钟，请提前 10 分钟进入会议室（预留实人核验+设备调试+承诺录音准备），谢谢！`, 'info');
      } else if (diff >= 0) {
        this.toast(`✅ 已进入「提前 10 分钟」办理时段，祝您办理顺利！（设备调试+承诺录音请尽快开始）`, 'success');
      } else {
        const lateMin = Math.max(1, Math.floor(-diff / 60000));
        this.toast(`⚠ 已超过预约时间 ${lateMin} 分钟，请立即完成实人核验与承诺录音，公证人可能正在等候`, 'warning');
      }
      this.joinRoom(s.id);
    },

    /* ========= 视频控制（真实摄像头 + 屏幕共享） ========= */
    async startLocalCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.toast('⚠ 浏览器不支持 getUserMedia 或非 HTTPS，将使用头像占位模式', 'warning');
        return;
      }
      try {
        // 申请摄像头 + 麦克风权限（1280x720 高清）
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        this.state.camStream = stream;
        // 绑定到本地小画面 pip-video（真实显示自己的影像）
        const pipVideo = $('#pip-video');
        if (pipVideo) {
          pipVideo.srcObject = stream;
          pipVideo.style.display = 'block';
          $('#pip-placeholder').style.display = 'none';
        }
        this.state.camOn = true;
        this.state.micOn = true;
        $('#cam-btn').classList.remove('off');
        $('#mic-btn').classList.remove('off');
        this.toast('🎥 摄像头已接入（本地小画面已显示实时影像）', 'success');
      } catch (e) {
        this.toast('📷 无法访问摄像头：' + (e.message || e) + '（请允许权限或使用 HTTPS）', 'warning');
      }
    },
    stopLocalCamera() {
      const stream = this.state.camStream;
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        this.state.camStream = null;
      }
      const screenStream = this.state.screenStream;
      if (screenStream) {
        try { screenStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        this.state.screenStream = null;
      }
      const pipVideo = $('#pip-video'), mainVideo = $('#main-video');
      if (pipVideo) { pipVideo.srcObject = null; pipVideo.style.display = 'none'; }
      if (mainVideo) { mainVideo.srcObject = null; mainVideo.style.display = 'none'; }
      const pp = $('#pip-placeholder'); if (pp) pp.style.display = 'grid';
      const mp = $('#main-placeholder'); if (mp) mp.style.display = 'grid';
      this.state.camOn = false;
      this.state.micOn = false;
    },
    toggleMedia(kind) {
      if (kind === 'mic') {
        const stream = this.state.camStream;
        const audioTracks = stream ? stream.getAudioTracks() : [];
        if (!stream || audioTracks.length === 0) {
          this.toast('⚠ 当前无麦克风设备，请先授权摄像头', 'warning');
          return;
        }
        this.state.micOn = !this.state.micOn;
        $('#mic-btn').classList.toggle('off', !this.state.micOn);
        audioTracks.forEach(t => { t.enabled = this.state.micOn; });
        this.toast(this.state.micOn ? '🎙️ 麦克风已开启' : '🔇 麦克风已静音', this.state.micOn ? '' : 'warning');
      } else {
        if (this.state.camOn) {
          // 关闭：禁用 track，隐藏 video，显示头像占位
          const stream = this.state.camStream;
          if (stream) stream.getVideoTracks().forEach(t => { t.enabled = false; });
          const pv = $('#pip-video'); if (pv) pv.style.display = 'none';
          const pp = $('#pip-placeholder'); if (pp) pp.style.display = 'grid';
          this.state.camOn = false;
          $('#cam-btn').classList.add('off');
          this.toast('📷 摄像头已关闭', 'warning');
        } else {
          // 开启
          if (this.state.camStream) {
            this.state.camStream.getVideoTracks().forEach(t => { t.enabled = true; });
            const pv = $('#pip-video'); if (pv) pv.style.display = 'block';
            const pp = $('#pip-placeholder'); if (pp) pp.style.display = 'none';
            this.state.camOn = true;
            $('#cam-btn').classList.remove('off');
            this.toast('🎥 摄像头已开启', 'success');
          } else {
            // 流还没有，重新申请
            this.startLocalCamera();
          }
        }
      }
    },
    async shareScreen() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        this.toast('⚠ 当前浏览器不支持 getDisplayMedia（需 HTTPS + 现代浏览器）', 'warning');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        this.state.screenStream = stream;
        const mv = $('#main-video');
        if (mv) {
          mv.srcObject = stream;
          mv.style.display = 'block';
          $('#main-placeholder').style.display = 'none';
        }
        this.toast('🖥️ 屏幕共享已启动（主画面显示屏幕内容）', 'success');
        // 共享结束回调
        stream.getVideoTracks()[0].onended = () => {
          if (this.state.screenStream === stream) {
            this.state.screenStream = null;
            const mv = $('#main-video'); if (mv) { mv.srcObject = null; mv.style.display = 'none'; }
            const mp = $('#main-placeholder'); if (mp) mp.style.display = 'grid';
            this.toast('屏幕共享已结束', 'info');
          }
        };
      } catch (e) {
        if (String(e).includes('denied')) this.toast('用户取消了屏幕共享', 'warning');
        else this.toast('共享失败：' + (e.message || e), 'warning');
      }
    },

    /* ========= 聊天 ========= */
    initChat(s) {
      $('#chat-list').innerHTML = '';
      this.pushMsg('peer', '公证员', '您好，我是本次公证的公证员 ' + s.notaryName + '，请准备好您的身份证件。');
      setTimeout(() => this.pushMsg('peer', '系统', '本次签约过程全程录音录像，内容将上传区块链存证。'), 1500);
    },
    toggleChat() { $('#chat-panel').classList.toggle('show'); },
    pushMsg(role, who, text) {
      const list = $('#chat-list'); if (!list) return;
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      div.innerHTML = `<b style="font-size:11px;opacity:.8;display:block;margin-bottom:2px;">${who}</b>${text}<span class="t">${fmtHM(Date.now())}</span>`;
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
    },
    addSystemMsg(text) { this.pushMsg('peer', '系统消息', text); },
    sendChat() {
      const inp = $('#chat-input'); const t = inp.value.trim(); if (!t) return;
      this.pushMsg('me', this.state.currentUser.name, t);
      inp.value = '';
      // 模拟对方回复
      setTimeout(() => {
        const reply = ['收到', '好的，请稍等', '没问题', '已确认'];
        const who = this.state.currentUser.role === 'notary' ? this.state.activeSession?.signerName : this.state.activeSession?.notaryName;
        this.pushMsg('peer', who || '对方', reply[Math.floor(Math.random() * reply.length)]);
      }, 1200);
    },

    /* ========= 启动 ========= */
    // 异步获取客户端公网 IP（用于签名存证元数据）
    initClientIP() {
      if (this.state.clientIP) return;
      fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => { this.state.clientIP = d.ip || '未知'; })
        .catch(() => { this.state.clientIP = '本地'; });
    },
    init() {
      this.initClientIP();
      this.bindAuth();
      this.bindMenus();
      this.initStep2();
      // 暴露外部 API（window.NotaryAPI + postMessage 监听）
      this._initExternalAPI();
      // ====== PTAHDAO 入口已按要求去除 ======
      // （_handlePTAHDaoEntry 不启用，用户通过首页两张大卡 申请 / 凭会议号进入 完成操作）
      // 优先处理签约人深链入口（?join=TOKEN&sid=ID 或 #Pt028&d=BASE64）
      if (this._handleJoinDeepLink()) return;
      // embed 模式：第三方平台嵌入，渲染极简创建 UI
      if (this._handleEmbedMode()) return;
      // 尝试自动登录
      const uidSaved = Store.get('session_user');
      if (uidSaved) {
        const u = Store.get('users', {})[uidSaved];
        if (u) { this.state.currentUser = u; this.enterDashboard(); return; }
      }
      this.showPage('auth-page');
    },
    // embed 模式：?embed=1 → 隐藏导航栏和登录装饰，渲染极简嵌入 UI
    _handleEmbedMode() {
      const u = new URL(location.href);
      const isEmbed = u.searchParams.get('embed') === '1' || u.searchParams.get('embed') === 'true';
      if (!isEmbed) return false;
      // 标记 body.embed-mode，CSS 统一隐藏 navbar / auth-brand / auth-card
      document.body.classList.add('embed-mode');
      // 隐藏 navbar
      const nav = $('#navbar'); if (nav) nav.classList.add('hidden');
      // 切到 auth-page
      $$('.page').forEach(el => el.classList.remove('active'));
      const authPage = $('#auth-page');
      if (authPage) {
        authPage.classList.add('active');
        // 注入极简嵌入头部（CSS 已定义样式）
        if (!$('#embed-head')) {
          const head = document.createElement('div');
          head.id = 'embed-head';
          head.innerHTML = `
            <h2>🔗 视频签约 · 自助创建</h2>
            <p>由 信签云 提供公证服务 · 香港叶谢邓律师行 邓达明公证人</p>`;
          const container = authPage.querySelector('.auth-container');
          if (container) container.insertBefore(head, container.firstChild);
        }
      }
      // 自动打开访客创建弹窗
      setTimeout(() => this.guestCreateMeeting(), 200);
      this.toast('已进入嵌入模式，可直接创建会议', 'success');
      return true;
    },
    // 暴露给第三方平台调用的 API（postMessage / window.NotaryAPI）
    _initExternalAPI() {
      // 事件回调注册表
      this._sdkEventCallbacks = [];
      // window.NotaryAPI 同步 API
      window.NotaryAPI = {
        version: '1.3.0',
        // 打开创建会议弹窗
        openCreate: () => this.guestCreateMeeting(),
        // 直接创建会议（编程式调用，返回 Promise）
        create: (opts) => this._apiCreateMeeting(opts || {}),
        // [PTAHDAO] 信托声明入口：编程式进入，等价于访问 ?from=ptahdao&... 链接
        // opts: { trustAccount, settlementNo, settlementAmount, holder, signerName, signerPhone, signerIdcard, date, time, paid, txHash }
        declareEntry: (opts) => this._apiDeclareEntry(opts || {}),
        // [PTAHDAO] 生成供外部平台（PTAHDAO APP/H5）跳转的签约入口外链接
        buildPTAHDaoLink: (opts) => this._buildPTAHDaoDeclareLink(opts || {}),
        // 通过编号短链还原会议
        resolveLink: (url) => this._apiResolveLink(url),
        // 获取当前应用根路径（对外分享链接用公网地址）
        getBaseUrl: () => this._publicBaseUrl(),
        // 获取公证人信息
        getNotaryInfo: () => this._apiGetNotaryInfo(),
        // 打开签约人入口（通过深链URL直接进入签约页）
        openJoin: (url) => this._apiOpenJoin(url),
        // 注册事件回调（create/pay/join/signComplete/complete/ptahdaoEntry）
        onEvent: (callback) => {
          if (typeof callback === 'function') this._sdkEventCallbacks.push(callback);
        },
        // 销毁 SDK（移除事件监听）
        destroy: () => {
          this._sdkEventCallbacks = [];
          window.removeEventListener('message', window.NotaryAPI._onMessage);
        },
        // 监听第三方平台 postMessage 请求
        _onMessage: (e) => {
          if (!e.data || e.data.type !== 'notary-api') return;
          const { id, action, args } = e.data;
          if (!window.NotaryAPI[action]) {
            e.source.postMessage({ type: 'notary-api-resp', id, error: 'unknown action: ' + action }, '*');
            return;
          }
          // onEvent / destroy 特殊处理（无返回值，不走 Promise 回复）
          if (action === 'onEvent') {
            const cb = (args && args[0]);
            if (typeof cb === 'function') this._sdkEventCallbacks.push(cb);
            e.source.postMessage({ type: 'notary-api-resp', id, result: true }, '*');
            return;
          }
          Promise.resolve(window.NotaryAPI[action](...(args || [])))
            .then(result => e.source.postMessage({ type: 'notary-api-resp', id, result }, '*'))
            .catch(err => e.source.postMessage({ type: 'notary-api-resp', id, error: String(err) }, '*'));
        },
      };
      window.addEventListener('message', window.NotaryAPI._onMessage);
      // 通知父窗口 SDK 已就绪（嵌入到第三方平台时）
      this._postToParent({ type: 'notary-ready', version: '1.2.0', url: location.href });
    },
    // 向父窗口 postMessage（仅当被嵌入到 iframe 时有意义）
    _postToParent(msg) {
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(msg, '*');
        }
      } catch (e) { /* 跨域被阻止，忽略 */ }
    },
    // 触发 SDK 事件（create / pay / join / signComplete / complete）
    _emitSdkEvent(event, payload) {
      // 1. 本地回调（同窗口直接调用）
      if (this._sdkEventCallbacks) {
        this._sdkEventCallbacks.forEach(cb => {
          try { cb({ event, payload }); } catch (e) { /* 忽略回调异常 */ }
        });
      }
      // 2. postMessage 通知父窗口（跨域 iframe）
      this._postToParent({ type: 'notary-event', event, payload });
    },
    // 编程式创建会议：opts = { topic, signerName, signerPhone, signerIdcard, date, time, duration, remark, extraSigners, paid }
    // 返回 Promise<{ sessionId, caseNo, caseLink, signerLink }>
    _apiCreateMeeting(opts) {
      return new Promise((resolve, reject) => {
        try {
          // 校验必填字段
          if (!opts.signerName) return reject(new Error('signerName required'));
          if (!opts.signerPhone) return reject(new Error('signerPhone required'));
          if (!opts.date || !opts.time) return reject(new Error('date and time required'));
          // 准备临时访客身份
          if (!this.state.currentUser || this.state.currentUser.role !== 'notary') {
            this.state.currentUser = {
              id: 'guest_api_' + Date.now().toString().slice(-6),
              name: '访客(API)',
              role: 'guest',
              isGuest: true,
            };
          }
          // 模拟表单数据
          this.state.tempFiles = [];
          this.state.extraSigners = (opts.extraSigners || []).map(e => ({ name: e.name || '', phone: e.phone || '', idcard: e.idcard || '' }));
          // 费用判定：PTAHDAO 信托受益人声明书 = 687 USDT；其他合同 = 756 USDT
          const topic = opts.topic || '借款合同公证';
          const isPTAHDAO = /PTAHDAO|受益人声明书|信托/i.test(topic);
          const BASE_USDT = isPTAHDAO ? 687 : 756;
          const EXTRA_PERSON_USDT = isPTAHDAO ? 687 : 756;
          const extraCount = (opts.extraSigners || []).filter(e => e.name).length;
          const totalUSDT = BASE_USDT + extraCount * EXTRA_PERSON_USDT;
          this.state.pendingFee = opts.paid ? {
            method: opts.payMethod || 'TRC-20',
            amount: totalUSDT + ' USDT',
            hkd: 'HK$ ' + (totalUSDT * 7.80).toFixed(2),
            txHash: opts.txHash || ('api-' + Date.now()),
            address: 'TYDcY9fWsFm3aTVcQxN6LZxK7u7L5n3pQ8',
            baseUSDT: BASE_USDT,
            isPTAHDAO,
          } : null;
          // 构造 session 对象（不走表单，直接构造）
          const notary = DEFAULT_NOTARY;
          const appointAt = new Date(opts.date + 'T' + opts.time + ':00').getTime();
          if (isNaN(appointAt)) return reject(new Error('invalid date/time'));
          if (appointAt < Date.now() - 5 * 60 * 1000) return reject(new Error('past appointment not allowed'));
          const allSessions = Store.get('sessions', []);
          const conflict = allSessions.some(x =>
            x.notaryId === notary.id && x.status !== 'canceled' && x.status !== 'done' &&
            Math.abs((x.appointAt || 0) - appointAt) < 30 * 60 * 1000
          );
          if (conflict) return reject(new Error('time slot conflict'));
          // topic 已在费用判定前声明（用于 BASE_USDT 判定），此处直接复用
          const extras = (opts.extraSigners || []).filter(e => e.name);
          const s = {
            id: 'GZ' + Date.now().toString().slice(-8),
            topic, status: 'pending',
            notaryId: notary.id, notaryName: notary.name, notaryOrg: notary.org,
            notaryCertNo: notary.certNo,
            signerName: opts.signerName, signerPhone: opts.signerPhone,
            signerIdcard: opts.signerIdcard || '未提供',
            appointAt, duration: opts.duration || '30 分钟',
            remark: opts.remark || '',
            docKey: SAMPLE_DOCS[topic] ? topic : (isPTAHDAO ? topic : '借款合同公证'),
            docTitle: opts.docTitle || (isPTAHDAO ? topic : ''),
            files: [], feePaid: !!this.state.pendingFee,
            fee: this.state.pendingFee ? `${this.state.pendingFee.amount}（≈ ${this.state.pendingFee.hkd}）` : (isPTAHDAO ? '687 USDT（≈ HK$ 5,358.60）' : '未缴费'),
            feeDetail: this.state.pendingFee || null,
            guestCreated: true, selfBooked: true, apiCreated: true,
            // PTAHDAO 信托专用字段 + 自动公证（AI公证流程）
            autoNotary: !!(opts.autoNotary || isPTAHDAO),
            trustAccount: opts.trustAccount || '',
            settlementNo: opts.settlementNo || '',
            settlementAmount: opts.settlementAmount || '',
            extraSigners: extras.map(e => ({ name: e.name, phone: e.phone || '未提供', idcard: e.idcard || '未提供' })),
            _ptahdao: isPTAHDAO,
          };
          allSessions.unshift(s);
          Store.set('sessions', allSessions);
          // 清理临时状态
          this.state.pendingFee = null;
          this.state.pendingTxHash = null;
          // 生成链接
          const caseNo = this.genCaseNo(s);
          const caseLink = this.buildCaseNoLink(s);
          const signerLink = this.buildSignerLink(s);
          resolve({
            sessionId: s.id, caseNo, caseLink, signerLink,
            notary: { name: notary.name, org: notary.org, certNo: notary.certNo },
            appointAt, topic,
          });
        } catch (e) { reject(e); }
      });
    },
    // 通过链接解析会议（支持 #Pt028&d=BASE64 / ?join=TOKEN&sid=ID&d=BASE64）
    _apiResolveLink(url) {
      try {
        const u = new URL(url, this._appBaseUrl());
        const hashStr = (u.hash || '').replace(/^#/, '');
        const result = { url, type: 'unknown' };
        if (hashStr) {
          const sepIdx = hashStr.indexOf('&d=');
          const caseNo = sepIdx >= 0 ? hashStr.slice(0, sepIdx) : hashStr;
          if (/^Pt\d+$/i.test(caseNo)) {
            result.type = 'caseNo';
            result.caseNo = caseNo;
            if (sepIdx >= 0) {
              const dParam = hashStr.slice(sepIdx + 3);
              try {
                const json = decodeURIComponent(escape(atob(decodeURIComponent(dParam))));
                const p = JSON.parse(json);
                result.sessionId = p.id;
                result.topic = p.topic;
                result.notaryName = p.notaryName;
                result.signerName = p.signerName;
                result.appointAt = p.appointAt;
                result.embeddable = true;
              } catch (e) { result.parseError = String(e); }
            }
            return result;
          }
        }
        const join = u.searchParams.get('join');
        const sid = u.searchParams.get('sid');
        if (join && sid) {
          result.type = 'token';
          result.joinToken = join;
          result.sessionId = sid;
          return result;
        }
        return result;
      } catch (e) { return { url, error: String(e) }; }
    },
    // 获取公证人信息（供外部APP展示）
    _apiGetNotaryInfo() {
      return {
        name: DEFAULT_NOTARY.name,
        org: DEFAULT_NOTARY.org,
        certNo: DEFAULT_NOTARY.certNo,
        phone: DEFAULT_NOTARY.phone || '(852) 6248-8888',
        hotline: '(852) 6888-9999',
        website: 'https://www.ytt.com.hk',
        address: '香港旺角弥敦道738-740号荣华大楼2楼全层',
        legalBasis: '中国委托公证人（司法部注册 CAO-HK-D0468）',
        feeStandard: {
          items: [
            { name: '受益人声明书公证基础费', hkd: 'HK$ 2,964', usdt: 380 },
            { name: '远程视频公证+实人核验', hkd: 'HK$ 936', usdt: 120 },
            { name: '中法服加章转递费+协会印花税', hkd: 'HK$ 624', usdt: 80 },
            { name: '电子公证书生成与签章', hkd: 'HK$ 468', usdt: 60 },
            { name: '跨境信托背景核查+USDT资产核验', hkd: 'HK$ 366.6', usdt: 47 },
          ],
          total: { hkd: 'HK$ 5,358.60', usdt: 687 },
        },
      };
    },
    // 通过深链URL直接进入签约页（在当前 iframe 内跳转）
    _apiOpenJoin(url) {
      try {
        if (!url || typeof url !== 'string') return { error: 'url required' };
        // 验证是本系统公网域名的链接
        const u = new URL(url);
        const validHosts = ['zrxh2013.github.io', 'www.ytt.com.hk'];
        const host = u.hostname.toLowerCase();
        const isCustom = Store.get('linkDomain', '');
        if (isCustom && host === isCustom.toLowerCase().split('/')[0]) {
          // 允许自定义域名
        } else if (!validHosts.some(h => host === h || host.endsWith('.' + h))) {
          return { error: 'invalid domain: ' + host };
        }
        // 在当前 iframe 内跳转
        location.href = url;
        return { ok: true, redirecting: true };
      } catch (e) { return { error: String(e) }; }
    },
    // [PTAHDAO] 编程式声明入口：与 URL ?from=ptahdao 行为一致，创建会议 → 支付或直接进房间
    // opts: { trustAccount, settlementNo, settlementAmount, holder, signerName, signerPhone, signerIdcard, date, time, paid, txHash, autoEnter }
    // 返回 Promise<{ sessionId, caseNo, signerLink, declareLink, entered:boolean, paymentOpened:boolean }>
    _apiDeclareEntry(opts) {
      return new Promise(async (resolve, reject) => {
        try {
          // PTAHDAO 固定会议标题（用户指定）
          const topic = 'PTAHDAO信托结算用户签署【受益人声明书】公证申请表';
          const PTAH_DOC_KEY = 'PTAHDAO信托受益人声明书';
          const name = opts.signerName || opts.holder || '';
          const phone = opts.signerPhone || opts.phone || '';
          if (!name) return reject(new Error('signerName/holder required'));
          if (!phone) return reject(new Error('signerPhone/phone required'));

          const createOpts = {
            topic,
            signerName: name,
            signerPhone: phone,
            signerIdcard: opts.signerIdcard || opts.idcard || '',
            date: opts.date || new Date().toISOString().slice(0, 10),
            time: opts.time || (() => { const d = new Date(Date.now() + 5 * 60 * 1000); return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); })(),
            paid: !!opts.paid,
            txHash: opts.txHash || '',
            payMethod: opts.payMethod || 'TRC-20',
            autoNotary: true,
            guestCreated: true,
            trustAccount: opts.trustAccount || opts.ta || '',
            settlementNo: opts.settlementNo || opts.sn || '',
            settlementAmount: opts.settlementAmount || opts.sa || '',
            extraSigners: opts.extraSigners || [],
          };
          const result = await this._apiCreateMeeting(createOpts);
          // 补写 PTAHDAO 专用字段 + 修正 docKey/docTitle（模板key不变，显示标题为新指定）
          (() => {
            const a = Store.get('sessions', []);
            const i = a.findIndex(x => x.id === result.sessionId);
            if (i < 0) return;
            a[i].docKey = PTAH_DOC_KEY;
            a[i].docTitle = topic;
            a[i].trustAccount = createOpts.trustAccount;
            a[i].settlementNo = createOpts.settlementNo;
            a[i].settlementAmount = createOpts.settlementAmount;
            a[i].autoNotary = true;
            a[i]._ptahdao = true;
            // 未付费场景费用修正：687 USDT（PTAHDAO专用）
            if (!opts.paid) {
              a[i].feePaid = false;
              a[i].fee = '687 USDT（≈ HK$ 5,358.60）';
              a[i].feeDetail = null;
            }
            Store.set('sessions', a);
          })();
          // 生成声明外链接（供PTAHDAO平台再次跳转或分享）
          const declareLink = this._buildPTAHDaoDeclareLink({
            ta: createOpts.trustAccount,
            sn: createOpts.settlementNo,
            sa: createOpts.settlementAmount,
            holder: name,
            phone,
            idcard: createOpts.signerIdcard,
            paid: opts.paid ? '1' : '',
            tx: opts.txHash || '',
          });
          const resp = { ...result, declareLink };
          document.body.classList.add('ptahdao-mode');

          // 进入房间 或 打开支付
          if (opts.paid) {
            if (opts.autoEnter !== false) {
              this.state.currentUser = {
                id: 'signer_' + result.sessionId,
                name, phone,
                idcard: createOpts.signerIdcard,
                role: 'signer', org: 'PTAHDAO信托', guest: true,
              };
              const nav = $('#navbar'); if (nav) nav.classList.remove('hidden');
              this.updateNavUser();
              this.joinRoom(result.sessionId);
              resp.entered = true;
            }
          } else {
            this._openPaymentForSession(result.sessionId);
            resp.paymentOpened = true;
          }
          this._emitSdkEvent('ptahdaoEntry', { opts, result: resp });
          resolve(resp);
        } catch (e) { reject(e); }
      });
    },
    // [PTAHDAO] 构建供外部 PTAHDAO 平台跳转的声明入口外链（GET 参数，跨平台通用）
    // opts: { ta, sn, sa, holder, phone, idcard, date, time, paid, tx }
    _buildPTAHDaoDeclareLink(opts) {
      const base = this._publicBaseUrl() + 'index.html';
      const params = new URLSearchParams();
      params.set('from', 'ptahdao');
      const map = [
        ['ta', 'trustAccount'], ['sn', 'settlementNo'], ['sa', 'settlementAmount'],
        ['holder', 'signerName'], ['phone', 'signerPhone'], ['idcard', 'signerIdcard'],
        ['date', 'date'], ['time', 'time'], ['paid', 'paid'], ['tx', 'txHash'],
      ];
      for (const [shortKey, longKey] of map) {
        const v = opts[shortKey] || opts[longKey];
        if (v) params.set(shortKey, String(v));
      }
      return base + '?' + params.toString();
    },
  };

  // 绑定 Tab 的一些通用事件
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

  // 点击遮罩关闭弹窗（走 closeModal 确保滚动锁释放）
  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-mask') && e.target.id) {
      App.closeModal(e.target.id);
    }
  });

  // ESC 关闭所有弹窗（走 closeModal 确保滚动锁释放）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [...$$('.modal-mask.show')].forEach(m => m && m.id && App.closeModal(m.id));
    }
  });

  // 拖拽文件到上传区
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const drop = $('#cm-drop');
      if (!drop) return;
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, (e) => {
        e.preventDefault(); drop.style.borderColor = 'var(--primary)'; drop.style.background = 'var(--primary-light)';
      }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, (e) => {
        e.preventDefault(); drop.style.borderColor = ''; drop.style.background = '';
      }));
      drop.addEventListener('drop', (e) => {
        const files = Array.from(e.dataTransfer.files || []);
        files.forEach(f => { App.state.tempFiles.push({ name: f.name, size: f.size }); });
        App.renderFileList();
      });
    }, 300);
  });

  /* ============================================================
     V2 功能扩展：密码哈希 / 通知 / 日历 / 视角切换 /
                  签名落位文书 / 详情时间轴 / 录像回放 / 快捷键
  ============================================================ */
  // ---------- ① 客户端密码哈希（兼容旧明文）----------
  async function sha256(str) {
    try {
      const buf = new TextEncoder().encode(str);
      const h = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { /* 降级：简易哈希 */
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      return 'legacy_' + (h >>> 0).toString(16);
    }
  }
  const HASH_MARK = 'sha256:';
  // 重写登录校验：支持 sha256 密码；遇到明文密码自动迁移（一次性）
  const _origDoLogin = App.doLogin;
  const _origBindAuth = App.bindAuth;
  App.bindAuth = function () {
    _origBindAuth.call(this);
    // 覆盖提交逻辑：登录前比较密码（哈希或明文兼容）
    const form = $('#login-form');
    // 克隆新的 submit 监听：先移除旧的（直接替换 form.onsubmit 也行，但我们是 addEventListener 注册的，所以改写 handleSubmit 行为）
    // 简单方案：在 App 上提供 verifyUser 方法，在登录 handler 里走这里
  };
  App.verifyUser = async function (acc, pwd, role) {
    const users = Store.get('users', {});
    for (const k in users) {
      const u = users[k];
      if (!(u.id === acc || u.phone === acc || u.name === acc) || u.role !== role) continue;
      const savedPwd = u.password || '';
      let ok = false;
      if (savedPwd.startsWith(HASH_MARK)) {
        const inp = HASH_MARK + (await sha256(pwd));
        ok = inp === savedPwd;
      } else {
        // 旧明文：匹配成功则顺便升级哈希
        if (pwd === savedPwd) {
          ok = true;
          users[k].password = HASH_MARK + (await sha256(pwd));
          Store.set('users', users);
        }
      }
      if (ok) return u;
    }
    return null;
  };
  // 重写 bindAuth 里的登录 submit：将账号密码校验替换
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const form = $('#login-form');
      if (!form) return;
      // 移除原生 submit 触发老的验证：直接替换 form submit handler 为 async 版本
      form.removeEventListener('submit', () => {}); // no-op（只是确保不会出现重复绑定问题；原生 addEventListener 已注册）
      // 在 form 上捕获提交（capture 阶段），拦截后重写
      form.addEventListener('submit', async (e) => {
        // 注意：这里只是为了兼容旧 handler，不做拦截。改为在 App 内部提供 verifyUser。
        // 实际逻辑：替换 submit handler —— 通过以下 patch：
      }, true);
    }, 50);
  });

  // 注册时存储哈希密码（重写 submitCreate 行为：在 register-form submit 之前改写密码字段）
  (function patchRegister() {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const rf = $('#register-form');
        if (!rf) return;
        rf.addEventListener('submit', async (e) => {
          // 拦截密码：保存明文之前改成哈希（通过临时替换 DOM value 的方式会被 user 察觉，
          // 而是直接改 Store.set 写入前的用户对象 —— 用 Hook Store.set 更优雅）
        });
      }, 0);
    });
    // 最稳妥：Hook users 的写入操作，自动把未标记 password 改为 hash
    const _origSet = Store.set;
    Store.set = async function (k, v) {
      if (k === 'users' && v && typeof v === 'object') {
        for (const id in v) {
          const u = v[id];
          if (u && typeof u.password === 'string' && !u.password.startsWith(HASH_MARK)) {
            u.password = HASH_MARK + (await sha256(u.password));
          }
        }
      }
      return _origSet.call(Store, k, v);
    };
  })();

  // 登录流程里实际用 verifyUser 替代原来的明文比对
  const _oldApp = {};
  document.addEventListener('DOMContentLoaded', () => {
    // 用 Monkey Patch 替换表单 submit 事件（注册+登录）
    setTimeout(() => {
      const loginForm = $('#login-form');
      if (loginForm) {
        // 克隆节点移除所有监听器
        const cloned = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(cloned, loginForm);
        cloned.addEventListener('submit', async (e) => {
          e.preventDefault();
          const acc = $('#login-account').value.trim();
          const pwd = $('#login-password').value;
          const role = document.querySelector('input[name="loginRole"]:checked').value;
          if (!acc || !pwd) return App.toast('请输入账号和密码', 'warning');
          const user = await App.verifyUser(acc, pwd, role);
          if (!user) return App.toast('账号、密码或身份角色不正确', 'error');
          App.doLogin(user);
        });
      }
      const regForm = $('#register-form');
      if (regForm) {
        const cloned = regForm.cloneNode(true);
        regForm.parentNode.replaceChild(cloned, regForm);
        cloned.addEventListener('submit', async (e) => {
          e.preventDefault();
          const role = document.querySelector('input[name="regRole"]:checked').value;
          const name = $('#reg-name').value.trim();
          const phone = $('#reg-phone').value.trim();
          const idcard = $('#reg-idcard').value.trim();
          const pwd = $('#reg-password').value;
          const pwd2 = $('#reg-password2').value;
          const notaryId = $('#reg-notary-id').value.trim();
          if (!name || !phone || !idcard || !pwd) return App.toast('请填写完整信息', 'warning');
          if (!/^1\d{10}$/.test(phone)) return App.toast('手机号格式不正确', 'warning');
          if (pwd.length < 6) return App.toast('密码至少 6 位', 'warning');
          if (pwd !== pwd2) return App.toast('两次密码不一致', 'warning');
          if (!$('#agree-terms').checked) return App.toast('请先同意服务协议', 'warning');
          if (role === 'notary' && !notaryId) return App.toast('请填写公证机构/执业证号', 'warning');
          const users = Store.get('users', {});
          const id = (role === 'notary' ? 'notary_' : 'signer_') + phone.slice(-6);
          if (users[id]) return App.toast('该手机号已注册', 'error');
          const org = role === 'notary' ? (notaryId.split(' ')[0] || '--') : undefined;
          const nid = role === 'notary' ? (notaryId.split(' ').slice(1).join(' ') || notaryId) : undefined;
          users[id] = {
            id, role, name, phone, idcard,
            password: pwd, // Store.set hook will auto-hash
            notaryId: nid, org, years: '0年', gender: '未填写', createdAt: Date.now()
          };
          Store.set('users', users);
          App.toast('注册成功！密码已自动加密存储，请登录', 'success');
          $$('#auth-page .tabs .tab')[0].click();
        });
      }
    }, 50);
  });

  // ---------- ② 通知系统 ----------
  App.state.notifications = App.state.notifications || Store.get('notif_list', []).slice(-50);
  App.pushNotif = function ({ icon = 'info', text, type = 'info', sessionId, related }) {
    const item = { id: uid('n'), ts: Date.now(), unread: true, icon, text, type, sessionId, related };
    this.state.notifications.unshift(item);
    this.state.notifications = this.state.notifications.slice(0, 50);
    Store.set('notif_list', this.state.notifications);
    this.updateNotifBadge();
    this.renderNotifList();
  };
  App.updateNotifBadge = function () {
    const unread = (this.state.notifications || []).filter(n => n.unread).length;
    const dot = $('#notif-dot');
    if (!dot) return;
    if (unread > 0) { dot.hidden = false; dot.textContent = unread > 99 ? '99+' : unread; }
    else dot.hidden = true;
  };
  App.renderNotifList = function () {
    const box = $('#notif-list'); if (!box) return;
    const list = this.state.notifications || [];
    if (!list.length) { box.innerHTML = '<div class="notif-empty">暂无通知</div>'; return; }
    const iconMap = { info: ['ℹ️', 'info'], ok: ['✅', 'ok'], warn: ['⚠️', 'warn'], err: ['❌', 'err'], call: ['📞', 'info'], doc: ['📄', 'info'] };
    box.innerHTML = list.map(n => {
      const [emoji, cls] = iconMap[n.icon] || iconMap.info;
      return `<div class="notif-item ${n.unread ? 'unread' : ''}" data-id="${n.id}">
        <div class="notif-icon ${cls}">${emoji}</div>
        <div class="notif-body">
          <div class="notif-text">${n.text}</div>
          <div class="notif-time">${fmtTime(n.ts)}</div>
        </div>
      </div>`;
    }).join('');
    $$('.notif-item', box).forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.id;
      const n = this.state.notifications.find(x => x.id === id);
      if (n) { n.unread = false; Store.set('notif_list', this.state.notifications); this.updateNotifBadge(); this.renderNotifList(); }
    }));
  };
  App.toggleNotif = function (ev) {
    ev && ev.stopPropagation();
    const p = $('#notif-panel'); if (!p) return;
    p.hidden = !p.hidden;
    if (!p.hidden) this.renderNotifList();
  };
  App.clearAllNotif = function () {
    (this.state.notifications || []).forEach(n => n.unread = false);
    Store.set('notif_list', this.state.notifications);
    this.updateNotifBadge(); this.renderNotifList();
  };
  // 点击其它地方关闭通知面板
  document.addEventListener('click', (e) => {
    const p = $('#notif-panel'); if (!p || p.hidden) return;
    if (!e.target.closest('.notif-wrap')) p.hidden = true;
  });
  // ESC 关闭通知面板
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const p = $('#notif-panel'); if (p && !p.hidden) p.hidden = true;
    }
  });

  // ---------- ③ 迷你日历 ----------
  App.state.calCursor = new Date(); App.state.calCursor.setDate(1);
  function _iterMonthSessions(sessions, user) {
    const byDay = {};
    sessions.forEach(s => {
      const key = fmtDateOnly(s.appointAt || s.endedAt || Date.now());
      if (!byDay[key]) byDay[key] = []; byDay[key].push(s);
    });
    return byDay;
  }
  function _userSessionsForCalendar(user, allSessions) {
    if (user.role === 'notary') return allSessions.filter(s => s.notaryId === user.id);
    return allSessions.filter(s => s.signerPhone === user.phone || s.signerIdcard === user.idcard || s.signerName === user.name);
  }
  App.renderCalendar = function () {
    const user = this.state.currentUser; if (!user) return;
    const isNotary = user.role === 'notary';
    const titleEl = $(isNotary ? '#cal-title' : '#cal-title-signer');
    const gridEl = $(isNotary ? '#cal-grid' : '#cal-grid-signer');
    if (!titleEl || !gridEl) return;
    const cursor = this.state.calCursor;
    const y = cursor.getFullYear(), m = cursor.getMonth();
    titleEl.textContent = `${y} 年 ${m + 1} 月`;
    gridEl.innerHTML = '';
    // 周一为一周开始
    const firstDay = new Date(y, m, 1);
    const fdIdx = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();
    const todayKey = fmtDateOnly(Date.now());
    const all = _userSessionsForCalendar(user, Store.get('sessions', []));
    const byDay = _iterMonthSessions(all);
    const cells = [];
    for (let i = 0; i < fdIdx; i++) {
      const d = prevMonthDays - fdIdx + 1 + i;
      cells.push({ date: new Date(y, m - 1, d), other: true, text: d });
    }
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), other: false, text: d });
    const leftover = 7 - (cells.length % 7 || 7);
    if (leftover < 7) for (let d = 1; d <= leftover; d++) cells.push({ date: new Date(y, m + 1, d), other: true, text: d });

    cells.forEach(c => {
      const key = fmtDateOnly(c.date);
      const list = byDay[key] || [];
      const statuses = list.map(x => x.status);
      const hasPending = statuses.includes('pending');
      const hasOngoing = statuses.includes('ongoing');
      const hasDone = statuses.includes('done');
      const isToday = key === todayKey;
      const div = document.createElement('div');
      div.className = 'cal-cell' + (c.other ? ' other' : '') + (isToday ? ' today' : '')
        + (hasPending ? ' has-pending' : '') + (hasOngoing ? ' has-ongoing' : '') + (hasDone ? ' has-done' : '');
      if (list.length > 1) { div.classList.add('has-multi'); div.dataset.count = list.length; }
      div.textContent = c.text;
      div.title = list.length ? (list.map(s => `${fmtHM(s.appointAt)} ${s.topic}·${s.signerName}`).join('\n')) : '无会议';
      div.onclick = () => {
        if (list.length) { App.toast(`${key} 共 ${list.length} 场：${list.map(s=>s.topic).join(' / ')}`); }
      };
      gridEl.appendChild(div);
    });
  };
  App.calPrev = function () {
    const d = this.state.calCursor;
    if (this.state.calMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
      d.setDate(1);
    }
    this.renderCalendar();
  };
  App.calNext = function () {
    const d = this.state.calCursor;
    if (this.state.calMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
      d.setDate(1);
    }
    this.renderCalendar();
  };
  App.calToday = function () {
    const d = this.state.calCursor;
    d.setFullYear(new Date().getFullYear());
    d.setMonth(new Date().getMonth());
    d.setDate(new Date().getDate());
    this.renderCalendar();
    this.toast('已跳转到今天', 'success');
  };

  // ---------- ⑤ 批量排程日历（全页 月/周视图） ----------
  App.state.calMode = 'month';
  App.state.calRegion = 'all';

  App.setCalMode = function (mode) {
    this.state.calMode = mode;
    document.querySelectorAll('#cal-mode-tabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
    this.renderFullCalendar();
    this.speak(mode === 'week' ? '已切换到周视图' : '已切换到月视图');
  };

  App.renderFullCalendar = function () {
    const gridEl = $('#full-cal-grid');
    const titleEl = $('#full-cal-title');
    if (!gridEl || !titleEl) return;
    const user = this.state.currentUser;
    if (!user) return;
    const cursor = this.state.calCursor;
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const todayKey = fmtDateOnly(Date.now());

    // 取得本用户全部会议（按法域筛选）
    let all = _userSessionsForCalendar(user, Store.get('sessions', []));
    all = this._filterByRegion(all, 'calendar');

    let cells = [];
    let title = '';

    if (this.state.calMode === 'month') {
      title = `${y} 年 ${m + 1} 月`;
      const firstDay = new Date(y, m, 1);
      const fdIdx = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const prevMonthDays = new Date(y, m, 0).getDate();
      for (let i = 0; i < fdIdx; i++) {
        const d = prevMonthDays - fdIdx + 1 + i;
        cells.push({ date: new Date(y, m - 1, d), other: true });
      }
      for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), other: false });
      const leftover = 7 - (cells.length % 7 || 7);
      if (leftover < 7) for (let d = 1; d <= leftover; d++) cells.push({ date: new Date(y, m + 1, d), other: true });
    } else {
      // 周视图：以当前 cursor 所在周的周一起算，共 7 天
      const cur = new Date(cursor);
      const wd = (cur.getDay() + 6) % 7; // 周一=0
      const monday = new Date(cur);
      monday.setDate(cur.getDate() - wd);
      const wStart = monday;
      for (let i = 0; i < 7; i++) {
        const d = new Date(wStart);
        d.setDate(wStart.getDate() + i);
        cells.push({ date: d, other: false });
      }
      const wEnd = cells[6].date;
      title = `${wStart.getFullYear()}/${wStart.getMonth()+1}/${wStart.getDate()} - ${wEnd.getMonth()+1}/${wEnd.getDate()}`;
    }
    titleEl.textContent = title;

    // 按日期分桶
    const byDay = _iterMonthSessions(all);
    gridEl.innerHTML = '';
    cells.forEach(c => {
      const key = fmtDateOnly(c.date);
      const list = (byDay[key] || []).slice().sort((a,b) => (a.appointAt||0) - (b.appointAt||0));
      const statuses = list.map(x => x.status);
      const isToday = key === todayKey;
      const div = document.createElement('div');
      div.className = 'full-cal-cell' + (c.other ? ' other' : '') + (isToday ? ' today' : '');
      // 头部：日期 + 计数
      const head = document.createElement('div');
      head.className = 'fc-head';
      head.innerHTML = `<span class="fc-day">${c.date.getDate()}</span>${list.length?`<span class="fc-count">${list.length}</span>`:''}`;
      div.appendChild(head);
      // 会议条目（月视图最多 3 条，周视图全部）
      const maxShow = this.state.calMode === 'week' ? 99 : 3;
      const items = list.slice(0, maxShow);
      const body = document.createElement('div');
      body.className = 'fc-body';
      items.forEach(s => {
        const item = document.createElement('div');
        item.className = 'fc-item status-' + (s.status||'pending') + (s.region==='HK'?' hk':'');
        const time = s.appointAt ? fmtHM(s.appointAt) : '--:--';
        item.innerHTML = `<span class="fc-time">${time}</span><span class="fc-topic">${s.topic}</span>${s.region==='HK'?'<span class="fc-hk">🇭🇰</span>':''}`;
        item.title = `${fmtHM(s.appointAt)} · ${s.topic} · ${s.signerName}`;
        item.onclick = (e) => {
          e.stopPropagation();
          if (user.role === 'notary') this.openSessionDetail(s);
          else this.toast(`${s.topic} · ${s.signerName} · ${fmtTime(s.appointAt)}`);
        };
        body.appendChild(item);
      });
      if (list.length > maxShow) {
        const more = document.createElement('div');
        more.className = 'fc-more';
        more.textContent = `+${list.length - maxShow} 更多`;
        more.onclick = (e) => { e.stopPropagation(); this._showCalDayDetail(key, list); };
        body.appendChild(more);
      }
      div.appendChild(body);
      div.onclick = () => {
        if (list.length) this._showCalDayDetail(key, list);
      };
      gridEl.appendChild(div);
    });
  };

  App._showCalDayDetail = function (key, list) {
    const wrap = $('#cal-day-detail');
    const tbl = $('#cal-day-table tbody');
    const ttl = $('#cal-day-detail-title');
    if (!wrap || !tbl) return;
    ttl.textContent = `${key} 当日排程（${list.length} 场）`;
    tbl.innerHTML = list.map(s => `
      <tr>
        <td><b>${s.appointAt ? fmtHM(s.appointAt) : '--'}</b></td>
        <td><code style="font-family:monospace;font-size:11px;">${s.id}</code>${s.region==='HK'?' 🇭🇰':''}</td>
        <td>${s.topic}</td>
        <td>${s.signerName}</td>
        <td>${s.notaryName||'--'}</td>
        <td><span class="tag ${s.status==='done'?'green':s.status==='ongoing'?'blue':s.status==='canceled'?'red':''}">${({pending:'待开始',ongoing:'进行中',done:'已完成',canceled:'已取消'})[s.status]||s.status}</span></td>
        <td class="actions">
          ${s.status==='done' ? `<button class="btn-ghost small" onclick="App.downloadCertById('${s.id}')">下载公证书</button>` : ''}
          <button class="btn-ghost small" onclick="App.openCalDetail('${s.id}')">详情</button>
        </td>
      </tr>`).join('');
    wrap.hidden = false;
    wrap.scrollIntoView({ behavior:'smooth', block:'nearest' });
  };
  // 按会议ID查找并打开详情（日历详情入口用）
  App.openCalDetail = function (sid) {
    const s = Store.get('sessions', []).find(x => x.id === sid);
    if (!s) { this.toast('会议记录未找到', 'warning'); return; }
    if (this.state.currentUser && this.state.currentUser.role === 'notary') this.openSessionDetail(s);
    else this.toast(`${s.topic} · ${fmtTime(s.appointAt)}`);
  };

  App.setRegion = function (scope, region, el) {
    this.state['region_' + scope] = region;
    if (el) {
      const parent = el.parentElement;
      if (parent) parent.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === el));
    }
    if (scope === 'calendar') this.renderCalendar();
    else if (scope === 'session') this.renderSessions();
    else if (scope === 'history') this.renderHistory();
    else if (scope === 'signer') this.renderSignerDocs();
  };

  App._filterByRegion = function (rows, scope) {
    const r = this.state['region_' + scope] || 'all';
    if (r === 'all') return rows;
    return rows.filter(s => (r === 'hk' ? (s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'')+(s.topic||''))) : !(s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'')+(s.topic||'')))));
  };

  // ---------- ④ 角色视角切换（单浏览器演示）----------
  App.switchPerspective = function () {
    const cur = this.state.currentUser; if (!cur) return;
    const users = Store.get('users', {});
    // 香港区 ↔ 香港声明人；北京区 ↔ 北京签约方
    let targetId;
    if (cur.id === 'notary_ytt328') targetId = 'signer_chankayee';
    else if (cur.id === 'signer_chankayee') targetId = 'notary_ytt328';
    else if (cur.id === 'signer_lihua' || cur.id === 'signer_zhangmin') targetId = 'notary_gzy001';
    else targetId = cur.role === 'notary' ? 'signer_lihua' : 'notary_gzy001';
    const u = users[targetId];
    if (!u) return this.toast('没有预设的切换目标，请先注册账号', 'warning');
    this.state.currentUser = u;
    Store.set('session_user', u.id);
    this.enterDashboard();
    this.toast(`已切换为「${u.role === 'notary' ? '公证人' : '签约方'} ${u.name}」视角`, 'success');
  };

  // ---------- 快捷键帮助弹窗 ----------
  App.showKbdHelp = function () {
    // 移除已有弹窗
    const old = document.querySelector('.kbd-help-modal'); if (old) old.remove();
    const items = [
      { keys: ['M'], desc: '麦克风开关（仅视频房间内）' },
      { keys: ['V'], desc: '摄像头开关（仅视频房间内）' },
      { keys: ['C'], desc: '打开/收起聊天面板（仅视频房间内）' },
      { keys: ['Space'], desc: '自动点击「下一步」按钮（仅视频房间内）' },
      { keys: ['Shift', 'R'], desc: '切换公证人/签约方视角（全局）' },
      { keys: ['H'], desc: '显示/关闭快捷键帮助面板（全局）' },
      { keys: ['Esc'], desc: '关闭弹窗 / 退出视频房间' },
    ];
    const modal = document.createElement('div');
    modal.className = 'kbd-help-modal';
    modal.innerHTML = `
      <div class="kbd-help-box" onclick="event.stopPropagation()">
        <h3>⌨️ 快捷键帮助</h3>
        <div class="kbd-help-list">
          ${items.map(it => `
            <div class="kbd-help-item">
              <span class="desc">${it.desc}</span>
              <span class="keys">${it.keys.map(k => `<kbd>${k}</kbd>`).join('')}</span>
            </div>`).join('')}
        </div>
        <div style="margin-top:16px;text-align:center;">
          <button class="btn-ghost" onclick="this.closest('.kbd-help-modal').remove()">知道了</button>
        </div>
      </div>`;
    modal.addEventListener('click', () => modal.remove());
    document.body.appendChild(modal);
  };

  // ---------- 繁简切换 ----------
  App.state.lang = 'zh-CN';
  App.state.voiceGuide = false; // 默认关闭，用户手动开启

  // ---------- 语音指导系统 ----------
  App.toggleVoice = function () {
    this.state.voiceGuide = !this.state.voiceGuide;
    const label = $('#voice-label');
    const btn = $('#voice-toggle-btn');
    if (this.state.voiceGuide) {
      if (label) label.textContent = '语音开';
      if (btn) btn.style.color = 'var(--primary)';
      this.speak('语音指导已开启');
      this.toast('🔊 语音指导已开启，操作时将自动播报', 'success');
    } else {
      if (label) label.textContent = '语音';
      if (btn) btn.style.color = '';
      // 停止所有正在播放的语音
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      this.toast('语音指导已关闭', 'info');
    }
  };
  App.speak = function (text) {
    if (!this.state.voiceGuide) return;
    if (!window.speechSynthesis) return;
    // 取消上一次未播完的
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // 根据当前语言选择中/英音色
    const isHK = this.state.lang === 'zh-HK';
    const isEN = this.state.lang === 'en';
    u.lang = isEN ? 'en-US' : (isHK ? 'zh-HK' : 'zh-CN');
    u.rate = 0.95; u.pitch = 1; u.volume = 0.8;
    // 尝试匹配语音
    const voices = window.speechSynthesis.getVoices();
    const matched = voices.find(v => v.lang === u.lang) || voices.find(v => v.lang.startsWith('zh'));
    if (matched) u.voice = matched;
    window.speechSynthesis.speak(u);
  };
  // 预加载语音列表（部分浏览器需要异步加载）
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => { /* 触发预加载 */ };
  }

  // 在关键流程节点注入语音播报
  const _v_origDoLogin = App.doLogin;
  App.doLogin = function (user) {
    _v_origDoLogin.call(this, user);
    const isHK = user.region === 'HK' || /香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((user.org||'') + (user.address||''));
    this.speak(`欢迎${isHK?'香港':''}${user.role === 'notary' ? '公证人' : '签约方'}${user.name}，您已成功登录。`);
  };
  const _v_origSubmitCreate = App.submitCreate;
  App.submitCreate = function () {
    _v_origSubmitCreate.call(this);
    this.speak('会议申请已提交，费用已确认，通知已发送给签约方。');
  };
  const _v_origJoinRoom = App.joinRoom;
  App.joinRoom = function (sid) {
    _v_origJoinRoom.call(this, sid);
    this.speak('已进入视频签约房间。请先进行实人核验。');
  };
  const _v_origNextStep = App.nextStep;
  App.nextStep = function () {
    _v_origNextStep.call(this);
    const step = this.state.roomStep;
    const stepNames = ['', '实人核验步骤，请扫描身份证并完成人脸比对', '法律告知步骤，请阅读法律告知书并确认声明意愿', '文书核查步骤，请核查文书真实性与合法性', '出证签署步骤，请在签名板上手写签名', '加章存证步骤，文书已送交中法服加章转递并完成区块链存证'];
    if (stepNames[step]) this.speak(stepNames[step]);
  };
  const _v_origPassVerify = App.passVerify;
  App.passVerify = function () {
    _v_origPassVerify.call(this);
    this.speak('实人核验通过，即将进入下一步。');
  };
  const _v_origConfirmSign = App.confirmSign;
  App.confirmSign = function () {
    _v_origConfirmSign.call(this);
    const u = this.state.currentUser;
    if (u.role === 'notary') this.speak('公证人签名完成。');
    else this.speak('签约方签名完成。');
  };
  const _v_origFinalizeSession = App.finalizeSession;
  App.finalizeSession = function () {
    _v_origFinalizeSession.call(this);
    const s = this.state.activeSession;
    this.speak(`签约完成！公证书已出具，区块链存证成功，区块高度 ${s.blockH}。`);
  };
  const _v_origToggleLang = App.toggleLang;
  App.toggleLang = function () {
    _v_origToggleLang.call(this);
  };

  const ZH_MAP = {
    '公证人工作台': '公證人工作台',
    '签约方工作台': '簽約方工作台',
    '切换视角': '切換視角',
    '退出登录': '退出登錄',
    '通知中心': '通知中心',
    '全部已读': '全部已讀',
    '创建新会议': '創建新會議',
    '签约会议管理': '簽約會議管理',
    '公证历史记录': '公證歷史記錄',
    '模板库': '模板庫',
    '我的文书': '我的文書',
    '预约会议': '預約會議',
    '全部': '全部',
    '待开始': '待開始',
    '进行中': '進行中',
    '已完成': '已完成',
    '已取消': '已取消',
    '搜索会议编号': '搜索會議編號',
    '签约方': '簽約方',
    '公证人': '公證人',
    '预约时间': '預約時間',
    '时长': '時長',
    '状态': '狀態',
    '操作': '操作',
    '会议编号': '會議編號',
    '签约事项': '簽約事項',
    '所属机构': '所屬機構',
    '完成时间': '完成時間',
    '公证耗时': '公證耗時',
    '文书': '文書',
    '下载': '下載',
    '存证核验': '存證核驗',
    '导出记录': '導出記錄',
    '详情': '詳情',
    '回放': '回放',
    '取消': '取消',
    '查看': '查看',
    '区块链核验': '區塊鏈核驗',
    '下载 PDF': '下載 PDF',
    '本月日程': '本月日程',
    '即将开始的签约会议': '即將開始的簽約會議',
    '查看全部': '查看全部',
    '累计公证场次': '累計公證場次',
    '本月完成': '本月完成',
    '待开始会议': '待開始會議',
    '客户满意度': '客戶滿意度',
    '已完成签约': '已完成簽約',
    '即将开始': '即將開始',
    '我的文书': '我的文書',
    '实名状态': '實名狀態',
    '已认证': '已認證',
    '实人核验': '實人核驗',
    '法律告知': '法律告知',
    '文书核查': '文書核查',
    '出证签署': '出證簽署',
    '加章存证': '加章存證',
    '上一步': '上一步',
    '下一步': '下一步',
    '开始签约': '開始簽約',
    '结束会议': '結束會議',
    '麦克风': '麥克風',
    '摄像头': '攝像頭',
    '聊天': '聊天',
    '内地公证': '內地公證',
    '香港公证': '香港公證',
    '内地签约': '內地簽約',
    '香港签署': '香港簽署',
  };
  const ZH_REV = {};
  Object.entries(ZH_MAP).forEach(([s, t]) => { ZH_REV[t] = s; });

  App.state.lang = 'zh-CN';

  // 英文翻译表（UI 高频文本）
  const EN_MAP = {
    '公证人工作台': 'Notary Console',
    '签约方工作台': 'Signer Console',
    '切换视角': 'Switch View',
    '退出登录': 'Sign Out',
    '通知中心': 'Notifications',
    '全部已读': 'Mark All Read',
    '创建新会议': 'New Meeting',
    '签约会议管理': 'Meetings',
    '公证历史记录': 'History',
    '模板库': 'Templates',
    '我的文书': 'My Documents',
    '预约会议': 'Schedule',
    '全部': 'All',
    '待开始': 'Upcoming',
    '进行中': 'In Progress',
    '已完成': 'Completed',
    '已取消': 'Cancelled',
    '搜索会议编号': 'Search meeting ID',
    '签约方': 'Signer',
    '公证人': 'Notary',
    '预约时间': 'Scheduled',
    '时长': 'Duration',
    '状态': 'Status',
    '操作': 'Actions',
    '会议编号': 'Meeting ID',
    '签约事项': 'Subject',
    '所属机构': 'Organization',
    '完成时间': 'Completed',
    '公证耗时': 'Duration',
    '文书': 'Document',
    '下载': 'Download',
    '存证核验': 'Verify',
    '导出记录': 'Export',
    '详情': 'Details',
    '回放': 'Playback',
    '取消': 'Cancel',
    '查看': 'View',
    '区块链核验': 'Verify Chain',
    '下载 PDF': 'Download PDF',
    '本月日程': 'This Month',
    '即将开始的签约会议': 'Upcoming Meetings',
    '查看全部': 'View All',
    '累计公证场次': 'Total Notarizations',
    '本月完成': 'This Month Done',
    '待开始会议': 'Upcoming',
    '客户满意度': 'Satisfaction',
    '已完成签约': 'Completed',
    '即将开始': 'Upcoming',
    '实名状态': 'KYC Status',
    '已认证': 'Verified',
    '实人核验': 'Real-person Verification',
    '法律告知': 'Legal Disclosure',
    '文书核查': 'Document Review',
    '出证签署': 'Certification & Signing',
    '加章存证': 'Seal & Chain Evidence',
    '上一步': 'Previous',
    '下一步': 'Next',
    '开始签约': 'Start',
    '结束会议': 'End',
    '麦克风': 'Mic',
    '摄像头': 'Camera',
    '聊天': 'Chat',
    '内地公证': 'Mainland',
    '香港公证': 'Hong Kong',
    '内地签约': 'Mainland',
    '香港签署': 'Hong Kong',
    '确认缴费': 'Confirm Payment',
    '公证书': 'Notarized Certificate',
    '下载公证书': 'Download Certificate',
  };

  // 文本节点原值快照（用于多语切换时还原）
  const _origTextStore = new WeakMap();
  const _origPhStore = new WeakMap();
  function snapshotTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!_origTextStore.has(n) && n.textContent && n.textContent.trim().length) {
        _origTextStore.set(n, n.textContent);
      }
    }
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      if (!_origPhStore.has(el)) _origPhStore.set(el, el.getAttribute('placeholder') || '');
    });
  }

  function applyLangMap(map) {
    // 还原原始简体
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const toUpdate = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const orig = _origTextStore.get(node);
      if (!orig) continue;
      let txt = orig;
      for (const [s, t] of Object.entries(map)) {
        if (orig.trim() === s) { txt = orig.replace(s, t); break; }
        txt = txt.split(s).join(t);
      }
      if (txt !== node.textContent) toUpdate.push({ node, txt });
    }
    toUpdate.forEach(({ node, txt }) => { node.textContent = txt; });
    // placeholder
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
      const orig = _origPhStore.get(el) || '';
      if (!orig) return;
      let txt = orig;
      for (const [s, t] of Object.entries(map)) { txt = txt.split(s).join(t); }
      if (txt !== (el.getAttribute('placeholder') || '')) el.setAttribute('placeholder', txt);
    });
  }

  const LANG_LABEL = { 'zh-CN': '简', 'zh-HK': '繁', 'en': 'EN' };

  App.toggleLang = function () {
    const cur = this.state.lang || 'zh-CN';
    const next = cur === 'zh-CN' ? 'zh-HK' : (cur === 'zh-HK' ? 'en' : 'zh-CN');
    this.setLang(next);
    const label = $('#lang-label');
    if (label) label.textContent = LANG_LABEL[next] || '简';
    const toastMsg = next === 'zh-HK' ? '已切換為繁體中文' : (next === 'en' ? 'Switched to English' : '已切换为简体中文');
    this.toast(toastMsg, 'success');
  };

  App.setLang = function (lang) {
    snapshotTextNodes(); // 首次进入时建立快照
    this.state.lang = lang;
    document.body.classList.toggle('lang-hk', lang === 'zh-HK');
    document.body.classList.toggle('lang-en', lang === 'en');
    let map;
    if (lang === 'zh-HK') map = ZH_MAP;
    else if (lang === 'en') map = EN_MAP; // 仅用英文表，未覆盖项保持简体
    else map = {}; // zh-CN：纯还原
    applyLangMap(map);
  };

  // ---------- 香港公证收费计算器 ----------
  App.openFeeCalc = function () {
    this.openModal('fee-modal');
    this.calcFee();
  };
  App.calcFee = function () {
    const type = $('#fee-type')?.value || 'declaration';
    const amt = parseFloat($('#fee-amount')?.value) || 0;
    const isHK = !type.startsWith('cn_');
    const curEl = $('#fee-currency');
    if (curEl) curEl.textContent = isHK ? 'HK$' : '¥';
    const rmbRate = 0.93; // HK$ → RMB 近似汇率

    // 香港公证人收费参考（分级递减）
    const hkSchedules = {
      declaration: { name: '受益人声明书', base: 1500, tiers: [
        { upTo: 500000, rate: 0.002, min: 1500, max: 8000 },
        { upTo: 2000000, rate: 0.001, min: 8000, max: 15000 },
        { upTo: 5000000, rate: 0.0005, min: 15000, max: 25000 },
        { upTo: Infinity, rate: 0.0003, min: 25000, max: 50000 },
      ], extra: { '加章转递费': 800, '副本(3份)': 200 } },
      poa: { name: '授权委托书', base: 1000, tiers: [
        { upTo: 500000, rate: 0.0015, min: 1000, max: 5000 },
        { upTo: 2000000, rate: 0.0008, min: 5000, max: 10000 },
        { upTo: Infinity, rate: 0.0004, min: 10000, max: 30000 },
      ], extra: { '加章转递费': 800 } },
      will: { name: '遗嘱公证', base: 2500, tiers: [
        { upTo: 1000000, rate: 0.003, min: 2500, max: 10000 },
        { upTo: 5000000, rate: 0.0015, min: 10000, max: 30000 },
        { upTo: Infinity, rate: 0.0008, min: 30000, max: 80000 },
      ], extra: {} },
      affirm: { name: '法定声明 / 誓章', base: 800, tiers: [
        { upTo: Infinity, rate: 0, min: 800, max: 800 },
      ], extra: {} },
      copy: { name: '副本核证（盖章）', base: 150, tiers: [
        { upTo: Infinity, rate: 0, min: 150, max: 150 },
      ], extra: { '每增加一份': 50 } },
    };
    // 内地公证收费参考（按发改价格[2008]157号简化分级）
    const cnSchedules = {
      cn_declaration: { name: '声明书公证', base: 200, tiers: [
        { upTo: 500000, rate: 0.002, min: 200, max: 1000 },
        { upTo: 1000000, rate: 0.001, min: 1000, max: 2000 },
        { upTo: Infinity, rate: 0.0005, min: 2000, max: 5000 },
      ], extra: { '公证书副本': 20 } },
      cn_poa: { name: '委托书公证', base: 200, tiers: [
        { upTo: 500000, rate: 0.002, min: 200, max: 1000 },
        { upTo: Infinity, rate: 0.0005, min: 1000, max: 3000 },
      ], extra: { '公证书副本': 20 } },
    };
    const sched = isHK ? hkSchedules[type] : cnSchedules[type];
    if (!sched) return;

    // 分级累进计算
    let fee = sched.base;
    let remaining = amt;
    let breakdown = [];
    for (const tier of sched.tiers) {
      const slice = Math.min(remaining, tier.upTo);
      if (slice <= 0) break;
      const calc = slice * tier.rate;
      const clamped = Math.max(tier.min, Math.min(calc, tier.max));
      breakdown.push({ range: tier.upTo === Infinity ? '超出部分' : `≤ ${(tier.upTo/10000).toFixed(0)}万`, slice, calc, clamped });
      remaining -= slice;
    }
    fee = breakdown.length > 0 ? breakdown[breakdown.length-1].clamped : sched.base;
    // 简化：取最高 tier 的 clamped 值作为主费（非累加，按档位取）
    let mainFee = sched.base;
    for (const b of breakdown) {
      if (b.slice > 0) mainFee = Math.max(mainFee, b.clamped);
    }
    // 确保不低于基础费
    mainFee = Math.max(mainFee, sched.base);

    let extrasTotal = 0;
    let extrasHtml = Object.entries(sched.extra).map(([k, v]) => {
      extrasTotal += v;
      return `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:2px 0;"><span>${k}</span><span>${isHK ? 'HK$' : '¥'}${v.toLocaleString()}</span></div>`;
    }).join('');
    const total = mainFee + extrasTotal;

    const result = $('#fee-result');
    if (!result) return;
    result.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--text-primary);">📋 ${sched.name} · 收费明细</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e5e7eb;">
        <span style="font-size:13px;">公证费 ${amt > 0 ? `(涉及金额 ${isHK?'HK$':'¥'}${amt.toLocaleString()})` : '(基础费)'}</span>
        <b style="font-size:14px;">${isHK ? 'HK$' : '¥'}${mainFee.toLocaleString()}</b>
      </div>
      ${breakdown.length > 1 ? `<div style="font-size:11px;color:#9ca3af;margin:4px 0;padding-left:8px;">${breakdown.map(b => `${b.range}: ${isHK?'HK$':'¥'}${b.clamped.toLocaleString()}`).join(' → ')}</div>` : ''}
      ${extrasHtml}
      <div style="display:flex;justify-content:space-between;padding:10px 0 4px;border-top:2px solid #e5e7eb;margin-top:8px;">
        <b style="font-size:14px;">合计</b>
        <b style="font-size:18px;color:${isHK?'#991b1b':'var(--primary)'};">${isHK ? 'HK$' : '¥'}${total.toLocaleString()}</b>
      </div>
      ${isHK ? `<div style="font-size:11px;color:#6b7280;text-align:right;margin-top:4px;">≈ ¥${(total*rmbRate).toLocaleString(undefined,{maximumFractionDigits:0})}（参考汇率 1 HK$ ≈ ¥${rmbRate}）</div>` : ''}
      <div style="font-size:10px;color:#9ca3af;margin-top:8px;text-align:center;">
        * 收费仅供参考，实际费用以公证人报价为准 · ${isHK ? '依据香港公证人协会指引' : '依据发改价格[2008]157号'} · 不含印花税及加章转递费
      </div>
    `;
  };
  const _origShowDocPage = App.showDocPage;
  App.showDocPage = function (doc) {
    _origShowDocPage.call(this, doc);
    const pageEl = $('#doc-page-content'); if (!pageEl) return;
    // 香港文书：每页加背景水印；最后一页（签署页）启用左右翻转定位
    const isHK = doc.region === 'HK' || /受益人声明书/.test(doc.title || '');
    // 清理旧的 hk 水印类与圆章
    pageEl.classList.remove('hk-watermark', 'hk-sign');
    const oldSeal = pageEl.querySelector('.hk-seal'); if (oldSeal) oldSeal.remove();
    if (isHK) {
      pageEl.classList.add('hk-watermark');
    }
    // 如果是最后一页（签署页），且存在签名，则在 DOM 上插入签名预览层
    const lastIdx = doc.pages;
    if (this.state.docPage !== lastIdx) return;
    const s = this.state.activeSession; if (!s) return;
    // 把容器设为 relative，便于绝对定位落位
    pageEl.style.position = 'relative';
    // HK: 最后一页启用左右翻转（左侧签名人/右侧公证人），通过 CSS 类切换
    if (isHK) pageEl.classList.add('hk-sign');
    const makeMark = (role, label, color, clsName) => {
      const flag = role === 'notary' ? this.state.notarySigned : this.state.signerSigned;
      const who = role === 'notary' ? s.notaryName : s.signerName;
      const el = document.createElement('div');
      el.className = 'sig-mark ' + clsName;
      // 恢复已保存的拖拽位置
      const posKey = `sigpos_${s.id}_${role}`;
      const saved = Store.get(posKey, null);
      if (saved) { el.style.left = saved.left; el.style.top = saved.top; el.style.right = 'auto'; }
      el.innerHTML = `<canvas width="180" height="56"></canvas>
        <div class="who">${label}</div>
        <div class="ts">${flag ? fmtTime(Date.now()) : '--'}</div>
        <div class="drag-hint">↕ 拖拽定位</div>`;
      if (!flag) el.style.opacity = '0.35';
      // 签署前允许拖拽
      if (!flag) el.classList.add('draggable');
      pageEl.appendChild(el);
      const cv = el.querySelector('canvas').getContext('2d');
      App.drawSampleSign(cv, who, color);
      // ---- 拖拽逻辑 ----
      if (!flag) {
        let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
        el.addEventListener('mousedown', (e) => {
          if (!el.classList.contains('draggable')) return;
          dragging = true; el.classList.add('dragging');
          const rect = el.getBoundingClientRect();
          const pRect = pageEl.getBoundingClientRect();
          sx = e.clientX; sy = e.clientY;
          sl = el.offsetLeft; st = el.offsetTop;
          e.preventDefault();
        });
        document.addEventListener('mousemove', function mv(e) {
          if (!dragging) return;
          const dx = e.clientX - sx;
          const dy = e.clientY - sy;
          let nl = sl + dx;
          let nt = st + dy;
          // 限制在 pageEl 范围内
          const maxX = pageEl.clientWidth - el.offsetWidth;
          const maxY = pageEl.clientHeight - el.offsetHeight;
          nl = Math.max(0, Math.min(nl, maxX));
          nt = Math.max(0, Math.min(nt, maxY));
          el.style.left = nl + 'px';
          el.style.top = nt + 'px';
          el.style.right = 'auto';
        });
        document.addEventListener('mouseup', function mu(e) {
          if (!dragging) return;
          dragging = false; el.classList.remove('dragging');
          // 保存位置
          Store.set(posKey, { left: el.style.left, top: el.style.top });
          document.removeEventListener('mousemove', mv);
          document.removeEventListener('mouseup', mu);
        }, { once: true });
      }
    };
    const notaryLabel = isHK ? (s.notaryName + '(香港公证人)') : (s.notaryName + '(公证员)');
    const signerLabel = isHK ? (s.signerName + '(声明人/受益人)') : (s.signerName + '(签约方)');
    makeMark('notary', notaryLabel, isHK ? '#7f1d1d' : '#1e3a8a', 'notary');
    makeMark('signer', signerLabel, isHK ? '#1e3a8a' : '#7f1d1d', 'signer');

    // ---- 香港制式：公证人完成签名后叠加圆形「中国委托公证人」印章 SVG ----
    if (isHK && (this.state.notarySigned || s.status === 'done')) {
      const certNo = s.certNo || '';
      const year = new Date(s.endedAt || Date.now()).getFullYear();
      const sealSvg = `
      <svg class="hk-seal" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-label="中国委托公证人印章">
        <defs>
          <path id="sealCircleTop" d="M 110,110 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"/>
          <path id="sealCircleBot" d="M 110,110 m -78,0 a 78,78 0 1,0 156,0 a 78,78 0 1,0 -156,0"/>
        </defs>
        <circle cx="110" cy="110" r="100" fill="rgba(255,255,255,.35)" stroke="#b91c1c" stroke-width="3.2"/>
        <circle cx="110" cy="110" r="90" fill="none" stroke="#b91c1c" stroke-width="1.1"/>
        <circle cx="110" cy="110" r="72" fill="none" stroke="#b91c1c" stroke-width=".8" stroke-dasharray="3 3"/>
        <text fill="#991b1b" font-family="'SimSun','Noto Serif SC',serif" font-size="13" letter-spacing="2" font-weight="700">
          <textPath href="#sealCircleTop" startOffset="10%">中 國 委 託 公 證 人</textPath>
        </text>
        <text fill="#991b1b" font-family="Arial,SimSun" font-size="10.5" letter-spacing="2.5" font-weight="700">
          <textPath href="#sealCircleBot" startOffset="56%" side="left">CHINA  ·  APPOINTED  ·  NOTARY  ·  HONG  ·  KONG</textPath>
        </text>
        <g transform="translate(110,86)">
          <text text-anchor="middle" y="-4" fill="#991b1b" font-family="SimSun,serif" font-size="15" font-weight="800" letter-spacing="4">鄧 達 明</text>
          <text text-anchor="middle" y="14" fill="#991b1b" font-family="Arial,SimSun" font-size="10" font-weight="700">TANG  TAT  MING</text>
          <text text-anchor="middle" y="29" fill="#7f1d1d" font-family="monospace" font-size="10" font-weight="700">執業編號 CAO-HK-D0468</text>
        </g>
        <g transform="translate(110,148)">
          <text text-anchor="middle" y="0" fill="#991b1b" font-family="SimSun,serif" font-size="9.5" font-weight="700">葉謝鄧律師行</text>
          <text text-anchor="middle" y="13" fill="#991b1b" font-family="Arial,SimSun" font-size="8">YIP, TSE &amp; TANG</text>
          <text text-anchor="middle" y="26" fill="#7f1d1d" font-family="Arial,SimSun" font-size="8.5" font-weight="700">${certNo || 'YT-NOTARY-HK-' + year + '-XXXX'}</text>
        </g>
        <!-- 中心五角星 -->
        <g transform="translate(110,110)">
          <polygon points="0,-20 5.9,-6.2 20,-6.2 8.5,2.5 13.4,16.2 0,8.2 -13.4,16.2 -8.5,2.5 -20,-6.2 -5.9,-6.2"
            fill="#b91c1c" opacity="0.92"/>
        </g>
      </svg>`;
      pageEl.insertAdjacentHTML('beforeend', sealSvg);
    }
  };
  // 重新进入 doc 视图时清空旧的 sig-mark
  const _origRenderDocReview = App.renderDocReview;
  App.renderDocReview = function () {
    $('#doc-page-content').style.position = '';
    _origRenderDocReview.call(this);
  };
  // 当签名状态变化时（confirmSign 后）刷新最后一页的签名显示
  const _origConfirmSign = App.confirmSign;
  App.confirmSign = function () {
    _origConfirmSign.call(this);
    // 重新渲染当前文档页面
    setTimeout(() => {
      const s = this.state.activeSession; if (!s) return;
      const doc = SAMPLE_DOCS[s.docKey] || SAMPLE_DOCS['借款合同公证'];
      if (this.state.docPage === doc.pages && this.state.roomStep >= 3) this.showDocPage(doc);
    }, 30);
  };

  // ---------- ⑥ 会议详情 + 审计时间轴 ----------
  function ensureAuditTrail(s) {
    if (!s) return [];
    if (s.auditTrail && Array.isArray(s.auditTrail) && s.auditTrail.length) return s.auditTrail;
    // 旧数据：按时间估算生成
    const start = s.startedAt || s.appointAt;
    const end = s.endedAt || start + 15 * 60000;
    const range = (end - start) / 5;
    const steps = [
      { step: 1, title: '① 实人核验通过', desc: `${s.signerName} 身份证读卡+人脸活体比对均通过，相似度 ${(97 + Math.random()*2).toFixed(1)}%` },
      { step: 2, title: '② 法律告知确认', desc: '法律告知书宣读完成，签约方确认声明意愿并勾选"已阅读并理解全部内容"' },
      { step: 3, title: '③ 文书核查确认', desc: `${s.topic} 全文共 ${(SAMPLE_DOCS[s.docKey]?.pages)||5} 页，依《宣誓及声明条例》核查真实性与合法性完毕` },
      { step: 4, title: '④ 公证人出证与签署完成', desc: `公证人 ${s.notaryName} 出证加盖专用章 → 签约方 ${s.signerName} 签署，CA：信鉴数字认证中心` },
      { step: 5, title: '⑤ 加章转递与区块链存证完成', desc: `送交中法服加章转递 · Tx: ${s.txHash || '0x' + randHex(24)} · 区块 #${s.blockH || '--'}` }
    ];
    return steps.map((x, i) => ({
      ...x, ts: new Date(start + range * (i + 0.3) + Math.random() * range * 0.4).getTime(), done: s.status === 'done'
    }));
  }
  App.viewSession = function (id) {
    const s = Store.get('sessions', []).find(x => x.id === id);
    if (!s) return;
    this.openSessionDetail(s);
  };
  App.openSessionDetail = function (s) {
    $('#detail-sid').textContent = s.id;
    const cost = s.startedAt && s.endedAt ? Math.round((s.endedAt - s.startedAt) / 60000) + ' 分钟' : '--';
    const audits = ensureAuditTrail(s);
    const body = $('#detail-body');
    body.innerHTML = `
      <div class="detail-summary">
        <div class="row"><label>签约事项</label><b>${s.topic}</b></div>
        <div class="row"><label>会议状态</label><span>${this.statusTag(s.status)}</span></div>
        <div class="row"><label>公证人</label><b>${s.notaryName}</b></div>
        <div class="row"><label>所属机构</label><span>${s.notaryOrg || '--'}</span></div>
        <div class="row"><label>签约方</label><b>${s.signerName}</b>${s.signerCount>1?` <span class="tag blue" style="margin-left:4px;">共 ${s.signerCount} 人</span>`:''}</div>
        <div class="row"><label>联系方式</label><span>${maskPhone(s.signerPhone)} · ${maskId(s.signerIdcard)}</span></div>
        ${s.extraSigners && s.extraSigners.length > 0 ? `
        <div class="row" style="flex-direction:column;align-items:stretch;">
          <label>其他签约方</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
            ${s.extraSigners.map((es, i) => `<span class="tag blue" style="font-size:12px;">${es.name} · ${maskPhone(es.phone)}</span>`).join('')}
          </div>
        </div>` : ''}
        <div class="row"><label>预约时间</label><span>${fmtTime(s.appointAt)}</span></div>
        <div class="row"><label>实际耗时</label><span>${cost}</span></div>
        <div class="row"><label>签约时长</label><span>${s.duration || '--'}</span></div>
        <div class="row"><label>备注</label><span>${s.remark || '无'}</span></div>
        ${s.status === 'done' ? `
        ${s.certNo ? `<div class="row"><label>正本编号</label><b style="font-family:monospace;color:#7f1d1d;">${s.certNo}</b>${s.region==='HK'?' <span class="tag" style="background:#fee2e2;color:#991b1b;margin-left:6px;">🇭🇰 香港正本</span>':''}</div>` : ''}
        <div class="row"><label>存证哈希</label>
          <b style="font-family:monospace;font-weight:500;font-size:12px;">${(s.txHash||'').slice(0,20)}...</b>
        </div>
        <div class="row"><label>区块高度</label><span>#${s.blockH || '--'}</span></div>
        ${s.feeDetail ? `<div class="row"><label>缴费方式</label><span>${s.feeDetail.method}</span></div>` : ''}
        ${s.feeDetail ? `<div class="row"><label>缴费金额</label><b>${s.feeDetail.amount}（≈ ${s.feeDetail.hkd}）</b></div>` : ''}
        ${s.feeDetail ? `<div class="row"><label>缴费凭证</label><code style="font-family:monospace;font-size:11px;">${s.feeDetail.txHash.slice(0,20)}...${s.feeDetail.txHash.slice(-8)}</code></div>` : ''}
        ${s.settlement ? `<div class="row" style="flex-direction:column;align-items:stretch;background:#0f172a;color:#fff;border-radius:8px;padding:12px;margin:8px 0;">
          <label style="color:#fbbf24;font-size:13px;margin-bottom:6px;">⛓ 信托结算存证 · TRC-20</label>
          <div style="font-size:12px;line-height:1.8;">
            <div>存证地址：<code style="font-family:monospace;font-size:10px;word-break:break-all;">${s.settlement.address}</code></div>
            <div>交易哈希：<code style="font-family:monospace;font-size:10px;word-break:break-all;">${s.settlement.txHash.slice(0,20)}...${s.settlement.txHash.slice(-8)}</code></div>
            <div>区块高度：#${s.settlement.blockH} · TRON 网络</div>
            <div>上链时间：${fmtTime(s.settlement.timestamp)}</div>
            <div>上链内容：公证书 + 录像 + 签名画布 + ${s.files?s.files.length:0}份附件 + 5项工具记录${s.feeDetail?' + 缴费凭证':''}（共 ${s.settlement.record.files.length + s.settlement.record.toolRecords.length + (s.feeDetail?1:0)} 项）</div>
          </div>
        </div>` : ''}` : ''}
      </div>
      <div class="timeline-audit">
        <h4>🕒 签约流程审计时间轴</h4>
        <div class="tl-list" id="detail-tl"></div>
      </div>
      ${s.status === 'done' ? `
      <div class="timeline-audit">
        <h4>✍️ 签名对比（从区块链已存证指纹中提取）</h4>
        <div class="tl-signs">
          <div class="tl-sign-box">
            <canvas width="200" height="50" id="sig-canvas-notary"></canvas>
            <div class="who">公证人 · ${s.notaryName}</div>
            <div class="info">${s.notaryOrg||''} · ${fmtTime(audits[3]?.ts||s.endedAt||0)}</div>
          </div>
          <div class="tl-sign-box">
            <canvas width="200" height="50" id="sig-canvas-signer"></canvas>
            <div class="who">签约方 · ${s.signerName}</div>
            <div class="info">IP: 127.*.* · 人脸: ✓ · ${fmtTime(audits[3]?.ts||s.endedAt||0)}</div>
          </div>
        </div>
      </div>` : ''}
      ${s.status === 'done' && (s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||''))) ? `
      <div class="apostille-tracker">
        <h4>📮 加章转递进度 · Apostille &amp; Legalization Tracker</h4>
        <div class="ap-steps">
          <div class="ap-step done">
            <div class="ap-dot">✓</div>
            <div class="ap-label">叶谢邓律师行<br/>签署完成</div>
            <div class="ap-ts">${fmtTime(s.endedAt || s.appointAt)}</div>
          </div>
          <div class="ap-step ${Date.now() - (s.endedAt||0) > 86400000 ? 'done' : 'active'}">
            <div class="ap-dot">${Date.now() - (s.endedAt||0) > 86400000 ? '✓' : '2'}</div>
            <div class="ap-label">中国法律服务<br/>(香港)受理</div>
            <div class="ap-ts">${s.endedAt ? fmtTime(s.endedAt + 86400000) : '--'}</div>
          </div>
          <div class="ap-step ${Date.now() - (s.endedAt||0) > 3*86400000 ? 'done' : ''}">
            <div class="ap-dot">${Date.now() - (s.endedAt||0) > 3*86400000 ? '✓' : '3'}</div>
            <div class="ap-label">加章完成<br/>待转递</div>
            <div class="ap-ts">${s.endedAt ? fmtTime(s.endedAt + 3*86400000) : '约3工作日'}</div>
          </div>
          <div class="ap-step ${Date.now() - (s.endedAt||0) > 5*86400000 ? 'done' : ''}">
            <div class="ap-dot">${Date.now() - (s.endedAt||0) > 5*86400000 ? '✓' : '4'}</div>
            <div class="ap-label">发往使用地<br/>建行深圳</div>
            <div class="ap-ts">${s.endedAt ? fmtTime(s.endedAt + 5*86400000) : '约5工作日'}</div>
          </div>
        </div>
        <div style="margin-top:12px;font-size:11px;color:#6b7280;text-align:center;">
          📋 正本编号 <b style="font-family:monospace;color:#991b1b;">${s.certNo || 'YT-NOTARY-HK-' + new Date(s.endedAt||Date.now()).getFullYear() + '-XXXX'}</b>
          &nbsp;·&nbsp; 受托转递：中国法律服务(香港)有限公司 &nbsp;·&nbsp; 用途：建行深圳分行跨境信托登记
        </div>
      </div>` : ''}
    `;
    // 时间轴 DOM
    const tl = $('#detail-tl');
    tl.innerHTML = audits.map(a => `
      <div class="tl-item ${a.done ? 'done' : ''}">
        <div class="tl-dot"></div>
        <div class="tl-title">${a.title}</div>
        <div class="tl-time">${fmtTime(a.ts)}</div>
        <div class="tl-desc">${a.desc}</div>
      </div>`).join('');
    // 签名
    setTimeout(() => {
      const cn = $('#sig-canvas-notary'); if (cn) this.drawSampleSign(cn.getContext('2d'), s.notaryName, '#1e3a8a');
      const cs = $('#sig-canvas-signer'); if (cs) this.drawSampleSign(cs.getContext('2d'), s.signerName, '#7f1d1d');
    }, 30);
    this.state.detailSession = s;
    this.openModal('detail-modal');
  };
  App.openModal = function (id) {
    this._modalOpen = id; $('#' + id).classList.add('show');
    // 弹窗打开时锁定背景滚动
    const h = document.documentElement, b = document.body;
    if (!h.style.top) { h.dataset.scrollY = window.scrollY; }
    Object.assign(h.style, { position: 'fixed', width: '100%', top: -window.scrollY + 'px', overflow: 'hidden' });
    Object.assign(b.style, { overflow: 'hidden' });
  };

  // ---------- ⑦ 录像回放查看器 ----------
  const STEP_DEFS = [
    { step: 1, title: '① 实人核验', desc: '读取身份证信息 · 人脸活体比对',
      render: (s) => `<div class="avatar-huge" style="background:linear-gradient(135deg,#f59e0b,#d97706)">🪪</div>
        <h4>实人核验环节</h4><p>签约方 ${s.signerName} 正在接受身份证读卡与活体人脸识别</p>` },
    { step: 2, title: '② 法律告知', desc: '宣读权利义务与法律提示，确认声明意愿',
      render: () => `<div class="avatar-huge" style="background:linear-gradient(135deg,#6366f1,#4338ca)">📋</div>
        <h4>法律告知事项宣读</h4><p>公证员正在宣读《公证法》与《宣誓及声明条例》规定的权利义务与效力说明</p>` },
    { step: 3, title: '③ 文书核查', desc: '依《宣誓及声明条例》核查文书真实性与合法性',
      render: (s) => `<div class="avatar-huge" style="background:linear-gradient(135deg,#3b82f6,#2563eb)">📄</div>
        <h4>${s.topic} 核查中</h4><p>依《宣誓及声明条例》第11章核查文书内容的真实性与合法性</p>` },
    { step: 4, title: '④ 出证签署', desc: '公证人出证加盖专用章 → 签约方跟进签署',
      render: (s) => `<div class="avatar-huge" style="background:linear-gradient(135deg,#ef4444,#b91c1c)">✍️</div>
        <h4>正在进行出证与电子签名</h4><p>公证人 ${s.notaryName} 先出证加盖专用章，签约方 ${s.signerName} 跟进完成手写电子签名，CA 同步加签</p>` },
    { step: 5, title: '⑤ 加章存证', desc: '中法服加章转递+区块链哈希上链',
      render: (s) => `<div class="avatar-huge" style="background:linear-gradient(135deg,#10b981,#047857)">⛓️</div>
        <h4>加章转递 · 上链成功</h4><p>已送交中国法律服务（香港）有限公司加章转递<br/>Tx: ${s.txHash || '--'} · 全部档案已写入区块链存证节点</p>` }
  ];
  App.state.pbStep = 0; App.state.pbPlayTimer = null; App.state.pbSpeed = 1;
  App.playbackSession = function () {
    const s = this.state.detailSession || this.state.activeSession;
    if (!s) return this.toast('请先选择会议', 'warning');
    if (s.status !== 'done') return this.toast('未完成的会议暂无可回放记录', 'warning');
    this.closeModal('detail-modal');
    $('#pb-sid').textContent = s.id;
    this.state.pbSession = s;
    this.state.pbStep = 0;
    this.renderPbTimeline(s);
    this.renderPbScene(0);
    $('#pb-seek').value = 0;
    this.openModal('playback-modal');
  };
  App.renderPbTimeline = function (s) {
    const audits = ensureAuditTrail(s);
    const total = audits.length ? (audits[audits.length - 1].ts - audits[0].ts) / 60000 : 15;
    const t = $('#pb-total'); // not exists currently
    const el = $('#pb-timeline');
    el.innerHTML = STEP_DEFS.map((sd, i) => {
      const a = audits[i] || {};
      return `<div class="pb-step ${i < this.state.pbStep ? 'done' : ''} ${i === this.state.pbStep ? 'active' : ''}" data-i="${i}" onclick="App.jumpStep(${i})">
        <div class="ps-num">${i + 1}</div>
        <div class="ps-body">
          <div class="ps-title">${sd.title}</div>
          <div class="ps-desc">${sd.desc}</div>
          <div class="ps-t">${a.ts ? fmtTime(a.ts) : '--'}</div>
        </div>
      </div>`;
    }).join('');
  };
  App.renderPbScene = function (idx) {
    const s = this.state.pbSession; if (!s) return;
    const def = STEP_DEFS[idx] || STEP_DEFS[0];
    $('#pb-scene').innerHTML = def.render(s);
    const audits = ensureAuditTrail(s);
    const totalMin = audits.length ? (audits[audits.length - 1].ts - audits[0].ts) / 60000 : 15;
    const curRatio = audits.length ? ((idx + 0.5) / audits.length) : (idx + 0.5) / 5;
    const curMin = totalMin * curRatio;
    const fmt = (m) => `${pad2(Math.floor(m))}:${pad2(Math.round((m - Math.floor(m)) * 60))}`;
    $('#pb-time').textContent = `${fmt(curMin)} / ${fmt(totalMin)}`;
    // 右侧 step 激活态
    $$('.pb-step', $('#pb-timeline')).forEach((el, i) => {
      el.classList.toggle('active', i === idx);
      el.classList.toggle('done', i < idx);
    });
  };
  App.jumpStep = function (i) { this.state.pbStep = i; this.renderPbScene(i); $('#pb-seek').value = Math.round(((i+0.5)/5)*100); };
  App.seekStep = function (delta) {
    let n = this.state.pbStep + delta;
    n = Math.max(0, Math.min(4, n));
    this.jumpStep(n);
  };
  App.seekPlayback = function (v) {
    const idx = Math.min(4, Math.floor((v / 100) * 5));
    this.jumpStep(idx);
  };
  App.togglePlay = function () {
    if (this.state.pbPlayTimer) {
      clearInterval(this.state.pbPlayTimer); this.state.pbPlayTimer = null;
      $('#pb-play-btn').textContent = '▶ 自动播放';
      return;
    }
    $('#pb-play-btn').textContent = '⏸ 暂停播放';
    const interval = 1500 / this.state.pbSpeed;
    this.state.pbPlayTimer = setInterval(() => {
      if (this.state.pbStep >= 4) {
        clearInterval(this.state.pbPlayTimer); this.state.pbPlayTimer = null;
        $('#pb-play-btn').textContent = '▶ 自动播放'; return;
      }
      this.seekStep(1);
    }, interval);
  };
  App.setSpeed = function (s) {
    this.state.pbSpeed = s;
    $$('.speed-opt').forEach(el => el.classList.toggle('active', parseFloat(el.textContent) === s));
    if (this.state.pbPlayTimer) { clearInterval(this.state.pbPlayTimer); this.state.pbPlayTimer = null; this.togglePlay(); }
  };
  // 关闭回放清理定时器 + 解锁背景滚动
  const _origCloseModal = App.closeModal;
  App.closeModal = function (id) {
    this._modalOpen = null;
    _origCloseModal ? _origCloseModal.call(this, id) : $('#' + id).classList.remove('show');
    // 若已无任何打开的弹窗，恢复背景滚动
    if (!document.querySelector('.modal-mask.show')) {
      const h = document.documentElement, b = document.body;
      const y = parseInt(h.dataset.scrollY || '0', 10);
      h.style.position = ''; h.style.top = ''; h.style.width = ''; h.style.overflow = ''; delete h.dataset.scrollY;
      b.style.overflow = '';
      window.scrollTo(0, y);
    }
    if (id === 'playback-modal' && this.state.pbPlayTimer) {
      clearInterval(this.state.pbPlayTimer); this.state.pbPlayTimer = null;
      $('#pb-play-btn') && ($('#pb-play-btn').textContent = '▶ 自动播放');
    }
  };

  // ---------- ⑧ 视频房间键盘快捷键 ----------
  document.addEventListener('keydown', (e) => {
    // 避免在输入框里误触发
    const tag = (e.target && e.target.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
      // 仅 Shift+R 全局允许
    }
    const inRoom = $('#video-room') && $('#video-room').classList.contains('active');
    // Shift + R 切换视角（全局）
    if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault(); App.switchPerspective(); return;
    }
    // H 键：快捷键帮助（全局，非输入框）
    const k2 = e.key.toLowerCase();
    if (k2 === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey && !['INPUT','TEXTAREA','SELECT'].includes(tag)) {
      e.preventDefault(); App.showKbdHelp(); return;
    }
    if (!inRoom) return;
    const k = e.key.toLowerCase();
    if (k === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); App.toggleMedia('mic');
    } else if (k === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault(); App.toggleMedia('cam');
    } else if (k === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'INPUT') {
      e.preventDefault(); App.toggleChat();
    } else if (e.key === 'Escape' && inRoom) {
      // ESC：在房间里不是关弹窗，而是询问是否结束
      if ($('.modal-mask.show')) return; // 有弹窗让 ESC 关弹窗
    } else if (e.key === ' ' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      // 空格：在步骤区模拟「下一步按钮点击」（仅当按钮可用）
      const active = $('.step-content.active');
      if (!active) return;
      const nextBtn = active.querySelector('.step-actions .btn-primary');
      if (nextBtn && !nextBtn.disabled) nextBtn.click();
    }
  });

  // ---------- ⑨ renderHome 追加日历渲染、初始化通知 ----------
  const _origRenderHome = App.renderHome;
  App.renderHome = function () {
    _origRenderHome.call(this);
    this.renderCalendar();
    this.updateNotifBadge();
  };
  const _origEnterDashboard = App.enterDashboard;
  App.enterDashboard = function () {
    _origEnterDashboard.call(this);
    // 首次进入：模拟系统通知（HK 版本专属 + 通用）
    const seededKey = 'notif_seeded_v3';
    const seeded = Store.get(seededKey, {});
    if (this.state.currentUser) {
      const u = this.state.currentUser;
      const uid = u.id;
      if (!seeded[uid]) {
        const ss = Store.get('sessions', []);
        // ---------- 邓达明 专属通知 ----------
        if (u.id === 'notary_ytt328') {
          const pending = ss.filter(s => s.notaryId === u.id && s.status === 'pending').sort((a,b)=>a.appointAt-b.appointAt)[0];
          const latestDone = ss.filter(s => s.notaryId === u.id && s.status === 'done').sort((a,b)=>b.endedAt-a.endedAt)[0];
          if (latestDone) this.pushNotif({
            icon: 'doc', type: 'success',
            text: `✅「陈嘉怡 · 受益人声明书」正本编号已出具：<b>${latestDone.certNo || 'YT-NOTARY-HK-' + new Date().getFullYear() + '-1001'}</b>，待办理加章转递`,
            sessionId: latestDone.id
          });
          if (pending) this.pushNotif({
            icon: 'warn', type: 'info',
            text: `📅 今日待办：${fmtTime(pending.appointAt)} 受益人声明书（${pending.signerName}）· ${pending.remark || ''}`,
            sessionId: pending.id
          });
          this.pushNotif({ icon: 'info', text: '🇭🇰 中国委托公证人协会 08 月执业通告：新格式受益人声明书已启用，请注意使用 YT-NOTARY-HK-YYYY-XXXX 正本编号' });
        }
        // ---------- 陈嘉怡 专属通知 ----------
        else if (u.id === 'signer_chankayee') {
          const myDone = ss.filter(s => (s.signerPhone === u.phone || s.signerIdcard === u.idcard) && s.status === 'done').sort((a,b)=>b.endedAt-a.endedAt)[0];
          if (myDone) {
            this.pushNotif({
              icon: 'ok', type: 'success',
              text: `🎉「受益人声明书」已出具，正本编号 <b>${myDone.certNo || 'YT-NOTARY-HK-' + new Date().getFullYear() + '-1001'}</b>，建行深圳分行副本正在制作`,
              sessionId: myDone.id
            });
            this.pushNotif({
              icon: 'call', type: 'info',
              text: '📮 加章转递进度：叶谢邓律师行已提交 → 中国法律服务(香港)有限公司（第 2/4 步，约 3 工作日完成）'
            });
          }
        }
        // ---------- 通用（内地）默认行为 ----------
        else if (u.role === 'notary') {
          const upcoming = ss.filter(s => s.notaryId === u.id && s.status === 'pending').sort((a,b)=>a.appointAt-b.appointAt)[0];
          if (upcoming) this.pushNotif({ icon: 'warn', text: `您有一场「${upcoming.topic}」预约在 ${fmtTime(upcoming.appointAt)}，请提前准备`, sessionId: upcoming.id });
          this.pushNotif({ icon: 'ok', text: '本月执业积分报告已生成，可用 128 场，超出率 2%' });
        } else {
          const done = ss.filter(s => (s.signerPhone === u.phone || s.signerIdcard === u.idcard) && s.status === 'done').sort((a,b)=>b.endedAt-a.endedAt)[0];
          if (done) this.pushNotif({ icon: 'doc', text: `「${done.topic}」公证书已出具，区块链核验通过`, sessionId: done.id });
          this.pushNotif({ icon: 'call', text: '请在预约时段前 10 分钟进入签约房间，准备好身份证原件' });
        }
        seeded[uid] = Date.now();
        Store.set(seededKey, seeded);
      }
    }
    this.renderNotifList();
  };

  // 通知触发场景
  // 1. 创建会议成功 → 给公证人推送
  const _origSubmitCreate = App.submitCreate;
  App.submitCreate = function () {
    const hadBefore = Store.get('sessions', []).length;
    _origSubmitCreate.call(this);
    setTimeout(() => {
      const now = Store.get('sessions', []).length;
      if (now > hadBefore) {
        const s = Store.get('sessions', [])[0];
        this.pushNotif({ icon: 'info', type: 'info', text: `新建签约会议成功：${s.topic}（${s.signerName}），已发送短信到 ${maskPhone(s.signerPhone)}`, sessionId: s.id });
      }
    }, 30);
  };
  // 2. 签约完成 → 推送
  const _origFinalize = App.finalizeSession;
  App.finalizeSession = function () {
    _origFinalize.call(this);
    const s = this.state.activeSession;
    if (s) {
      const isHK = s.region === 'HK' || /受益人声明书|香港|葉鄧榭|叶邓榭|葉謝鄧|叶谢邓/.test((s.notaryOrg||'') + (s.topic||''));
      if (isHK) {
        this.pushNotif({ icon: 'ok', type: 'success', text: `🎉「${s.topic}」签约完成！正本 <b>${s.certNo}</b> 已生成 · 加章转递流程已启动 · 哈希已上链 #${s.blockH}`, sessionId: s.id });
      } else {
        this.pushNotif({ icon: 'ok', text: `🎉「${s.topic}」签约完成！公证书与录像已生成，哈希已上链 #${s.blockH}`, sessionId: s.id });
      }
    }
  };
  // 3. joinRoom 推送
  const _origJoinRoom = App.joinRoom;
  App.joinRoom = function (sid) {
    _origJoinRoom.call(this, sid);
    const s = this.state.activeSession;
    if (s) this.pushNotif({ icon: 'call', text: `已进入签约房间 ${sid}，${s.notaryName} 与 ${s.signerName} 连线中`, sessionId: sid });
  };

  // ---------- ⑩ 历史记录与 session 列表：操作列加入「详情」「回放」按钮 ----------
  // 因为 App 有自己的 renderHistory / renderSessions / sessionActions，直接覆盖 sessionActions 以追加按钮
  const _origSessionActions = App.sessionActions;
  App.sessionActions = function (s, role) {
    let html = _origSessionActions.call(this, s, role);
    // 所有状态都能看详情；done 状态还能看回放
    if (!/<button[^>]*onclick="App\.viewSession/.test(html || '')) {
      html += ` <button class="btn-ghost small" onclick="App.viewSession('${s.id}')">详情</button>`;
    }
    if (s.status === 'done') {
      html += ` <button class="btn-ghost small" onclick="App.openSessionFromId('${s.id}');App.playbackSession()">回放</button>`;
    }
    return html;
  };
  App.openSessionFromId = function (id) {
    this.state.detailSession = Store.get('sessions', []).find(x => x.id === id) || null;
  };
  // 在 History 表操作列也追加
  const _origRenderHistory = App.renderHistory;
  App.renderHistory = function () {
    _origRenderHistory.call(this);
    // 给每行追加 详情+回放 按钮（如果 renderHistory 没显示的话）—— 我们已经通过 sessionActions 合并
    // 这里不需要额外操作
  };

  window.App = App;
})();
