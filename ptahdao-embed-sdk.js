/**
 * PtahDao Notary Embed SDK
 * --------------------------------------------------------------------
 * 用途：PTAHDAO APP / H5 端通过 WebView 内嵌公证系统（notary-sign）时，
 *       使用 AES-256-GCM 加密 + postMessage 通道安全传递持有人信息，
 *       避免明文 URL 暴露持有人姓名/手机号/证件号等敏感字段。
 *
 * 接收端（notary-sign app.js）：
 *   - 通过 origin 白名单校验请求来源
 *   - 通过共享密钥（双方约定，32 字节 base64）解密 AES-GCM payload
 *   - 解密后调用 declareEntry，自动创建会议 → 进入房间 / 打开支付
 *
 * 安全设计：
 *   1. AES-256-GCM 加密 payload（IV 12B + 密文 + 16B GCM tag）
 *   2. 共享密钥不上链、不随消息传输（仅双方持有）
 *   3. postMessage targetOrigin 锁定 notary-sign 真实 origin
 *   4. 接收端 origin 白名单反向校验
 *   5. 防重放：payload.ts 时间戳（10 分钟内有效）
 *
 * 版本：1.4.0
 * 作者：Yip Tse & Tang Solicitors / Notary Sign
 * --------------------------------------------------------------------
 */

(function (global) {
  'use strict';

  // ============== 配置 ==============
  const DEFAULT_NOTARY_URL = 'https://zrxh2013.github.io/notary-sign/';
  // 默认共享密钥（base64，32 字节）；生产环境必须替换为 PTAHDAO 与公证系统双方约定的真实密钥
  // 当前密钥为强随机生成（32B），仅供开发/测试；上线前请与 PTAHDAO 方重新协商并替换
  const DEFAULT_SHARED_KEY_B64 = 'HqDTT07JMilo7zkQ0SA2Xt8+B0ndEkma+JhHgtjMSXQ=';

  // ============== 工具函数 ==============
  // base64 字符串 → Uint8Array
  function b64ToU8(b64) {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  // Uint8Array → base64 字符串
  function u8ToB64(u8) {
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }
  // UTF-8 字符串 → Uint8Array
  function strToU8(str) {
    return new TextEncoder('utf-8').encode(str);
  }
  // 生成 12 字节随机 IV（AES-GCM 推荐 IV 长度）
  function genIv() {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    return iv;
  }

  // ============== AES-256-GCM 加密 ==============
  /**
   * 使用共享密钥加密 payload 对象
   * @param {object} plainObj - 待加密的明文对象
   * @param {string} [keyB64] - 共享密钥 base64（32 字节）
   * @returns {Promise<{iv: string, cipher: string}>} - base64 编码的 iv + 密文
   */
  async function encryptPayload(plainObj, keyB64) {
    if (!global.crypto || !crypto.subtle) {
      throw new Error('Web Crypto API not available in this environment');
    }
    const keyRaw = b64ToU8(keyB64 || DEFAULT_SHARED_KEY_B64);
    if (keyRaw.length !== 32) {
      throw new Error('shared key must be 32 bytes (AES-256), got ' + keyRaw.length);
    }
    // 自动注入时间戳（防重放）
    const objWithTs = { ts: Date.now(), ...plainObj };
    const plain = JSON.stringify(objWithTs);
    const iv = genIv();
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyRaw, { name: 'AES-GCM' }, false, ['encrypt']
    );
    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv }, cryptoKey, strToU8(plain)
    );
    return {
      iv: u8ToB64(iv),
      cipher: u8ToB64(new Uint8Array(cipherBuf)),
    };
  }

  // ============== PTAHDAO Notary SDK 主类 ==============
  class PtahDaoNotarySDK {
    /**
     * @param {object} opts - 配置
     * @param {string} [opts.notaryUrl] - 公证系统部署 URL（默认 GitHub Pages）
     * @param {string} [opts.sharedKeyB64] - 共享密钥 base64
     * @param {HTMLIFrameElement} [opts.iframe] - 已存在的 iframe 元素
     * @param {number} [opts.readyTimeout] - 等待 notary-ready 超时（默认 8000ms）
     * @param {number} [opts.respTimeout] - 等待 API 响应超时（默认 30000ms）
     * @param {function} [opts.onLog] - 日志回调 (level, msg, data)
     */
    constructor(opts) {
      const cfg = opts || {};
      this.notaryUrl = (cfg.notaryUrl || DEFAULT_NOTARY_URL).replace(/\/$/, '') + '/';
      this.sharedKeyB64 = cfg.sharedKeyB64 || DEFAULT_SHARED_KEY_B64;
      this.readyTimeout = cfg.readyTimeout || 8000;
      this.respTimeout = cfg.respTimeout || 30000;
      this.onLog = cfg.onLog || ((level, msg, data) => console[level]('[PtahDaoSDK]', msg, data || ''));
      this._iframe = cfg.iframe || null;
      this._ready = false;
      this._pending = new Map(); // id → { resolve, reject, timer }
      this._eventHandlers = [];
      this._onMessage = this._onMessage.bind(this);
      window.addEventListener('message', this._onMessage);
    }

    /**
     * 创建/复用 iframe 并加载公证系统
     * @param {HTMLIFrameElement|string} container - iframe 元素或容器 DOM id
     * @returns {Promise<HTMLIFrameElement>}
     */
    async mount(container) {
      let iframe = container;
      if (typeof container === 'string') {
        iframe = document.getElementById(container);
      }
      if (!iframe || iframe.tagName !== 'IFRAME') {
        throw new Error('mount: container must be an iframe element or DOM id');
      }
      this._iframe = iframe;
      iframe.setAttribute('src', this.notaryUrl + 'index.html');
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; autoplay; encrypted-media');
      iframe.setAttribute('allowfullscreen', '');
      // 等待 notary-ready
      await this._waitForReady();
      return iframe;
    }

    /**
     * 加密并调用 declareEntrySecure：进入公证声明签署流程
     * @param {object} opts - 持有人信息
     *   { trustAccount, settlementNo, settlementAmount,
     *     holder, signerName, signerPhone, signerIdcard,
     *     date, time, paid, txHash }
     * @returns {Promise<object>} - { sessionId, caseNo, declareLink, entered, paymentOpened, secure }
     */
    async declareEntrySecure(opts) {
      if (!this._ready || !this._iframe || !this._iframe.contentWindow) {
        throw new Error('SDK not ready, call mount() first');
      }
      if (!opts || typeof opts !== 'object') {
        throw new Error('opts object required');
      }
      // 必填校验
      const name = opts.signerName || opts.holder;
      const phone = opts.signerPhone || opts.phone;
      if (!name) throw new Error('signerName/holder required');
      if (!phone) throw new Error('signerPhone/phone required');

      // 加密 payload
      const payload = await encryptPayload(opts, this.sharedKeyB64);
      this.onLog('info', 'payload encrypted', { ivLen: 12, cipherLen: payload.cipher.length });

      // 通过 postMessage 调用 declareEntrySecure
      return this._call('declareEntrySecure', [payload]);
    }

    /**
     * 注册事件回调
     * @param {function} cb - callback(eventType, payload)
     */
    onEvent(cb) {
      if (typeof cb === 'function') this._eventHandlers.push(cb);
    }

    /**
     * 销毁 SDK：移除 message 监听
     */
    destroy() {
      window.removeEventListener('message', this._onMessage);
      this._pending.forEach(p => clearTimeout(p.timer));
      this._pending.clear();
      this._eventHandlers = [];
    }

    // ============== 内部方法 ==============

    _waitForReady() {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          if (this._ready) return resolve();
          if (Date.now() - start > this.readyTimeout) {
            return reject(new Error('notary-ready timeout (' + this.readyTimeout + 'ms)'));
          }
          setTimeout(check, 100);
        };
        check();
      });
    }

    _call(action, args) {
      return new Promise((resolve, reject) => {
        const id = 'r' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const timer = setTimeout(() => {
          if (this._pending.has(id)) {
            this._pending.delete(id);
            reject(new Error('response timeout for action: ' + action));
          }
        }, this.respTimeout);
        this._pending.set(id, { resolve, reject, timer });
        // targetOrigin 锁定为 notary 真实 origin
        const targetOrigin = (this.notaryUrl.match(/^https?:\/\/[^/]+/) || ['*'])[0];
        this._iframe.contentWindow.postMessage(
          { type: 'notary-api', id, action, args: args || [] },
          targetOrigin
        );
        this.onLog('info', 'postMessage sent', { action, id, targetOrigin });
      });
    }

    _onMessage(e) {
      // 1. origin 校验
      const expectedOrigin = (this.notaryUrl.match(/^https?:\/\/[^/]+/) || [])[0];
      if (expectedOrigin && e.origin !== expectedOrigin) {
        // 忽略其他来源消息
        return;
      }
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      // 2. notary-ready 通知
      if (data.type === 'notary-ready') {
        this._ready = true;
        this.onLog('info', 'notary-ready received', { version: data.version, url: data.url });
        return;
      }

      // 3. SDK 事件（ptahdaoEntry / complete / pay 等）
      if (data.type === 'notary-event') {
        this._eventHandlers.forEach(cb => {
          try { cb(data.event, data.payload); } catch (_) {}
        });
        return;
      }

      // 4. API 响应
      if (data.type === 'notary-api-resp' && data.id) {
        const p = this._pending.get(data.id);
        if (!p) return;
        clearTimeout(p.timer);
        this._pending.delete(data.id);
        if (data.error) {
          this.onLog('warn', 'API error', { id: data.id, error: data.error });
          p.reject(new Error(data.error));
        } else {
          this.onLog('info', 'API success', { id: data.id });
          p.resolve(data.result);
        }
      }
    }
  }

  // ============== 导出 ==============
  // 浏览器/H5 环境：window.PtahDaoNotarySDK + PtahDaoNotarySDK.encryptPayload
  // Node 环境：module.exports
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PtahDaoNotarySDK, encryptPayload, DEFAULT_NOTARY_URL, DEFAULT_SHARED_KEY_B64 };
  } else {
    global.PtahDaoNotarySDK = PtahDaoNotarySDK;
    global.PtahDaoNotarySDK.encryptPayload = encryptPayload;
    global.PtahDaoNotarySDK.DEFAULT_NOTARY_URL = DEFAULT_NOTARY_URL;
    global.PtahDaoNotarySDK.DEFAULT_SHARED_KEY_B64 = DEFAULT_SHARED_KEY_B64;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
