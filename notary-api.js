/*!
 * NotarySDK v1.0.0
 * 信签云 · 视频签约 SDK
 * 供第三方平台 / APP 嵌入调用，支持自助创建会议、付费、时间选择
 *
 * 用法 1：iframe 嵌入（推荐）
 *   <script src="https://your-domain/notary-api.js"></script>
 *   <script>
 *     const sdk = new NotarySDK({ appUrl: 'https://your-domain/index.html' });
 *     // 渲染一个内嵌 iframe（自动带 ?embed=1）
 *     sdk.mount('#container', { mode: 'embed', topic: '借款合同公证' });
 *     // 编程式创建会议（无 UI 介入）
 *     sdk.create({
 *       signerName: '李四', signerPhone: '13800138000',
 *       date: '2026-09-10', time: '14:00',
 *       paid: true, payMethod: 'TRC-20', txHash: '0x...'
 *     }).then(r => console.log('会议号:', r.caseNo, '链接:', r.caseLink));
 *   </script>
 *
 * 用法 2：window.open 跳转（适合 APP WebView）
 *   const win = NotarySDK.open('https://your-domain/index.html?embed=1');
 *   // APP 通过 WebView 监听 onNotaryEvent 回调
 *
 * 用法 3：URL 直接跳转（深链）
 *   window.location = NotarySDK.buildUrl('https://your-domain/index.html', {
 *     embed: 1, topic: '受益人声明书公证'
 *   });
 */
(function (root) {
  'use strict';

  const VERSION = '1.0.0';
  const DEFAULT_TIMEOUT = 30000;

  // 工具：生成唯一 id
  const genId = () => 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // 工具：URL 拼接
  function buildUrl(base, params) {
    const u = new URL(base, location.href);
    Object.keys(params || {}).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) u.searchParams.set(k, params[k]);
    });
    return u.toString();
  }

  /**
   * NotarySDK 类
   * @param {Object} opts
   * @param {string} opts.appUrl 信签云应用入口（必填，如 https://zrxh2013.github.io/index.html）
   * @param {number} opts.timeout 默认 30 秒
   */
  class NotarySDK {
    constructor(opts = {}) {
      if (!opts.appUrl) throw new Error('NotarySDK: appUrl is required');
      this.appUrl = opts.appUrl;
      this.timeout = opts.timeout || DEFAULT_TIMEOUT;
      this._iframe = null;
      this._ready = false;
      this._pending = new Map(); // id -> {resolve, reject, timer}
      this._listeners = {}; // event -> [cb]
      this._onMessage = this._onMessage.bind(this);
      window.addEventListener('message', this._onMessage);
    }

    /**
     * 挂载 iframe 到容器
     * @param {string|HTMLElement} container 选择器或 DOM
     * @param {Object} opts { mode: 'embed'|'create', topic, width, height }
     */
    mount(container, opts = {}) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) throw new Error('NotarySDK: container not found');
      const url = buildUrl(this.appUrl, {
        embed: 1,
        topic: opts.topic || '',
      });
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.width = opts.width || '100%';
      iframe.style.height = opts.height || '720px';
      iframe.style.border = '1px solid #e5e7eb';
      iframe.style.borderRadius = '10px';
      iframe.allow = 'camera; microphone; fullscreen';
      iframe.setAttribute('allowfullscreen', '');
      el.innerHTML = '';
      el.appendChild(iframe);
      this._iframe = iframe;
      return iframe;
    }

    /**
     * 卸载 iframe
     */
    unmount() {
      if (this._iframe && this._iframe.parentNode) {
        this._iframe.parentNode.removeChild(this._iframe);
      }
      this._iframe = null;
      this._ready = false;
    }

    /**
     * 打开新窗口（适合 APP WebView）
     * @param {Object} params { embed, topic, join, sid, d }
     * @returns {Window}
     */
    openWindow(params = {}) {
      const url = buildUrl(this.appUrl, Object.assign({ embed: 1 }, params));
      return window.open(url, '_blank', 'width=1024,height=720');
    }

    /**
     * 直接打开创建会议弹窗（通过 iframe 通信）
     */
    openCreate() {
      return this._call('openCreate', []);
    }

    /**
     * 编程式创建会议
     * @param {Object} opts
     *   - topic         公证事项（默认 '借款合同公证'）
     *   - signerName    签约方姓名（必填）
     *   - signerPhone   签约方手机号（必填）
     *   - signerIdcard  身份证号
     *   - date          预约日期 YYYY-MM-DD（必填）
     *   - time          预约时间 HH:mm（必填）
     *   - duration      时长（默认 '30 分钟'）
     *   - remark        备注
     *   - extraSigners  额外签约方 [{ name, phone, idcard }]
     *   - paid          是否已缴费（默认 true）
     *   - payMethod     缴费方式 'TRC-20' | 'HSBC 对公账户'
     *   - txHash        TRC-20 交易哈希（payMethod=TRC-20 时必填）
     * @returns {Promise<{sessionId, caseNo, caseLink, signerLink, notary, appointAt, topic}>}
     */
    create(opts = {}) {
      return this._call('create', [opts]);
    }

    /**
     * 解析链接，返回会议元数据
     * @param {string} url
     * @returns {Promise<{type, caseNo?, sessionId?, topic?, notaryName?, signerName?, appointAt?}>}
     */
    resolveLink(url) {
      return this._call('resolveLink', [url]);
    }

    /**
     * 获取应用根 URL（用于生成跳转链接）
     */
    getBaseUrl() {
      return this._call('getBaseUrl', []);
    }

    /**
     * 监听事件
     * @param {string} event  'ready' | 'create' | 'error' | 'close'
     * @param {Function} cb
     */
    on(event, cb) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(cb);
      return this;
    }

    off(event, cb) {
      const list = this._listeners[event];
      if (!list) return this;
      const idx = list.indexOf(cb);
      if (idx >= 0) list.splice(idx, 1);
      return this;
    }

    _emit(event, payload) {
      (this._listeners[event] || []).forEach(cb => {
        try { cb(payload); } catch (e) { console.warn('[NotarySDK] listener error:', e); }
      });
    }

    /**
     * 内部：向 iframe 发送 postMessage 请求
     */
    _call(action, args) {
      return new Promise((resolve, reject) => {
        if (!this._iframe || !this._iframe.contentWindow) {
          // 未挂载 iframe：通过新窗口打开 + 监听回调
          this.openWindow({ embed: 1 });
          return reject(new Error('NotarySDK: iframe not mounted. Call mount() first, or use openWindow() for APP WebView.'));
        }
        const id = genId();
        const timer = setTimeout(() => {
          this._pending.delete(id);
          reject(new Error('NotarySDK: request timeout (' + this.timeout + 'ms) for ' + action));
        }, this.timeout);
        this._pending.set(id, { resolve, reject, timer });
        this._iframe.contentWindow.postMessage({
          type: 'notary-api',
          id, action, args,
        }, '*');
      });
    }

    _onMessage(e) {
      if (!e.data) return;
      // 应用就绪通知
      if (e.data.type === 'notary-ready') {
        this._ready = true;
        this._emit('ready', e.data);
        return;
      }
      // 创建会议事件（弹窗内用户操作）
      if (e.data.type === 'notary-event') {
        this._emit(e.data.event, e.data.payload);
        return;
      }
      // API 响应
      if (e.data.type === 'notary-api-resp') {
        const { id, result, error } = e.data;
        const pending = this._pending.get(id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this._pending.delete(id);
        if (error) pending.reject(new Error(error));
        else pending.resolve(result);
      }
    }

    /**
     * 销毁 SDK（移除监听）
     */
    destroy() {
      window.removeEventListener('message', this._onMessage);
      this.unmount();
      this._pending.clear();
      this._listeners = {};
    }
  }

  // 静态方法
  NotarySDK.VERSION = VERSION;

  /**
   * 静态：构建应用 URL（用于深链跳转）
   * @param {string} appUrl 应用入口
   * @param {Object} params { embed, topic, join, sid, d, caseNo }
   */
  NotarySDK.buildUrl = function (appUrl, params = {}) {
    return buildUrl(appUrl, params);
  };

  /**
   * 静态：通过 caseNo 构建跨设备短链
   * @param {string} appUrl 应用入口
   * @param {string} caseNo 案件编号 Pt028
   * @param {string} b64 base64 payload
   */
  NotarySDK.buildCaseNoUrl = function (appUrl, caseNo, b64) {
    return `${appUrl.replace(/index\.html.*$/, '')}#${caseNo}&d=${b64}`;
  };

  /**
   * 静态：便捷打开（无需实例化）
   */
  NotarySDK.open = function (appUrl, params = {}) {
    const url = buildUrl(appUrl, Object.assign({ embed: 1 }, params));
    return window.open(url, '_blank', 'width=1024,height=720');
  };

  // 暴露到全局
  root.NotarySDK = NotarySDK;
  if (typeof module !== 'undefined' && module.exports) module.exports = NotarySDK;
})(typeof window !== 'undefined' ? window : this);
