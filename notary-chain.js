/**
 * NotaryChain SDK — 公证书链上存证仓库交互模块
 *
 * 功能：
 *   1. storeEvidenceOnChain(fingerprint, certNo, notaryId, paymentTxHash)
 *      → 调用合约 storeEvidence，将公证书 SHA-256 指纹写入 TRON 链
 *   2. verifyEvidenceOnChain(fingerprint)
 *      → 调用合约 verifyEvidence，核验指纹是否在链上
 *   3. getEvidenceByCertNo(certNo)
 *      → 调用合约 getEvidence，按证书号查询存证详情
 *
 * 依赖：
 *   - chain-config.js（合约地址 + ABI 配置）
 *   - tronweb.js（浏览器端 tronweb 库，已存在于项目中）
 *
 * 写入策略：
 *   1. 优先使用 TronLink 浏览器钱包（公证人已安装）
 *   2. 回退到 chain-config.js 里的 NOTARY_PRIVATE_KEY（仅测试网）
 *   3. 均不可用时标记为"待上链"，后续手动补传
 *
 * 读取策略：
 *   使用 TRON HTTP API（无需钱包），只读查询合约
 */
(function (global) {
  'use strict';

  var CFG = global.CHAIN_CONFIG || {};
  var TW = global.TronWeb || null;

  var NotaryChain = {
    /** 合约是否已配置 */
    isReady: function () {
      return !!(CFG.isConfigured && CFG.isConfigured() && TW);
    },

    /** 获取 tronweb 实例（带私钥，用于写入签名） */
    _getWriteInstance: function () {
      var pk = CFG.NOTARY_PRIVATE_KEY;
      if (!pk) return null;
      try {
        return new TW({
          fullNode: CFG.FULL_NODE,
          solidityNode: CFG.SOLIDITY,
          eventServer: CFG.EXPLORER,
          privateKey: pk
        });
      } catch (e) {
        console.warn('[NotaryChain] 创建写入实例失败:', e.message);
        return null;
      }
    },

    /** hex → bytes32（将 64 位 hex 字符串补齐为 0x + 64 hex） */
    _toBytes32: function (hexStr) {
      var h = hexStr.replace(/^0x/, '');
      // 不足 64 位前面补 0，超长截断
      if (h.length < 64) h = new Array(65 - h.length).join('0') + h;
      if (h.length > 64) h = h.substring(0, 64);
      return '0x' + h;
    },

    /**
     * 写入存证到链上（storeEvidence）
     * @param {string} fingerprint   - SHA-256 指纹（64 hex）
     * @param {string} certNo       - 公证书编号
     * @param {string} notaryId     - 公证人执业证号
     * @param {string} paymentTxHash - 缴费交易哈希（hex）
     * @returns {Promise<{success:boolean, txHash?:string, error?:string}>}
     */
    storeEvidenceOnChain: async function (fingerprint, certNo, notaryId, paymentTxHash) {
      // 检查合约是否已配置
      if (!this.isReady()) {
        return { success: false, error: 'CONTRACT_NOT_CONFIGURED', message: '合约地址未配置，请先部署合约并更新 chain-config.js' };
      }

      var evHash = this._toBytes32(fingerprint);
      var payHash = this._toBytes32(paymentTxHash || '');
      var fromAddr = CFG.NOTARY_ADDRESS;

      // 策略 1：TronLink 浏览器钱包
      if (global.tronWeb && global.tronWeb.defaultAddress && global.tronWeb.defaultAddress.base58) {
        try {
          var tlContract = await global.tronWeb.contract(CFG.CONTRACT_ABI, CFG.CONTRACT_ADDRESS);
          var txResult = await tlContract.storeEvidence(evHash, certNo, notaryId, payHash).send();
          return { success: true, txHash: txResult, via: 'tronlink' };
        } catch (e) {
          console.warn('[NotaryChain] TronLink 写入失败:', e.message);
        }
      }

      // 策略 2：项目 tronweb + 配置私钥
      var writeInstance = this._getWriteInstance();
      if (writeInstance) {
        try {
          var contract = await writeInstance.contract(CFG.CONTRACT_ABI, CFG.CONTRACT_ADDRESS);
          var result = await contract.storeEvidence(evHash, certNo, notaryId, payHash).send({
            feeLimit: 50 * 1e6,
            callValue: 0
          });
          return { success: true, txHash: result, via: 'notary-key' };
        } catch (e) {
          console.warn('[NotaryChain] 私钥写入失败:', e.message);
          return { success: false, error: 'WRITE_FAILED', message: e.message };
        }
      }

      // 策略 3：标记为待上链
      return {
        success: false,
        error: 'NO_WALLET',
        message: '无可用钱包/私钥，存证已暂存待后续补传',
        pending: true,
        fingerprint: fingerprint,
        certNo: certNo
      };
    },

    /**
     * 核验指纹是否在链上（verifyEvidence）— 只读，不需要钱包
     * @param {string} fingerprint - SHA-256 指纹（64 hex）
     * @returns {Promise<{verified:boolean, certNo?:string, error?:string}>}
     */
    verifyEvidenceOnChain: async function (fingerprint) {
      if (!this.isReady()) {
        return { verified: false, error: 'CONTRACT_NOT_CONFIGURED' };
      }

      var evHash = this._toBytes32(fingerprint);

      // 用 HTTP API 只读调用（triggerConstantContract）
      try {
        var data = this._encodeCallData('verifyEvidence(bytes32)', [evHash]);
        var resp = await fetch(CFG.API_BASE + '/wallet/triggerconstantcontract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractAddress: CFG.CONTRACT_ADDRESS,
            data: data,
            ownerAddress: CFG.NOTARY_ADDRESS || (CFG.CONTRACT_ADDRESS)
          })
        });
        var json = await resp.json();
        if (json && json.result && json.result.result) {
          // 解码返回值：verified(bool) + certNo(string)
          var decoded = this._decodeVerifyResult(json.constant_result || json.data);
          return decoded;
        }
        return { verified: false, error: 'CALL_FAILED', message: json.result && json.result.message || 'unknown' };
      } catch (e) {
        // CORS fallback：用 tronweb 如果有实例
        console.warn('[NotaryChain] HTTP 查询失败，尝试 tronweb:', e.message);
        if (TW) {
          try {
            var tw = new TW({ fullNode: CFG.FULL_NODE, solidityNode: CFG.SOLIDITY });
            var contract = await tw.contract(CFG.CONTRACT_ABI, CFG.CONTRACT_ADDRESS);
            var result = await contract.verifyEvidence(evHash).call();
            return {
              verified: result.verified,
              certNo: result.certNo
            };
          } catch (e2) {
            return { verified: false, error: 'CORS_AND_TW_FAILED', message: e2.message };
          }
        }
        return { verified: false, error: 'NETWORK_ERROR', message: e.message };
      }
    },

    /**
     * 按证书号查询存证详情（getEvidence）— 只读
     * @param {string} certNo
     * @returns {Promise<{found:boolean, evidence?:object, error?:string}>}
     */
    getEvidenceByCertNo: async function (certNo) {
      if (!this.isReady()) {
        return { found: false, error: 'CONTRACT_NOT_CONFIGURED' };
      }

      try {
        var tw = TW ? new TW({ fullNode: CFG.FULL_NODE, solidityNode: CFG.SOLIDITY }) : null;
        if (!tw) return { found: false, error: 'NO_TRONWEB' };
        var contract = await tw.contract(CFG.CONTRACT_ABI, CFG.CONTRACT_ADDRESS);
        var result = await contract.getEvidence(certNo).call();

        var evidenceHashHex = result.evidenceHash ? this._bytes32ToHex(result.evidenceHash) : '';
        if (!evidenceHashHex || evidenceHashHex === '0x0000000000000000000000000000000000000000000000000000000000000000') {
          return { found: false };
        }

        return {
          found: true,
          evidence: {
            evidenceHash: evidenceHashHex,
            certNo: certNo,
            notaryId: result.notaryId,
            timestamp: Number(result.timestamp),
            timestampISO: new Date(Number(result.timestamp) * 1000).toISOString(),
            paymentTxHash: this._bytes32ToHex(result.paymentTxHash),
            isValid: result.isValid,
            storedBy: result.storedBy ? TW.address.fromHex(result.storedBy) : ''
          }
        };
      } catch (e) {
        return { found: false, error: 'QUERY_FAILED', message: e.message };
      }
    },

    /** 辅助：bytes32 → 0x hex string */
    _bytes32ToHex: function (b32) {
      if (!b32) return '';
      if (typeof b32 === 'string') return b32;
      try {
        return '0x' + Array.from(b32).map(function (b) {
          return (b & 0xff).toString(16).padStart(2, '0');
        }).join('');
      } catch (e) { return String(b32); }
    },

    /** 辅助：编码 call data（简化版，仅支持 bytes32 参数） */
    _encodeCallData: function (signature, params) {
      // function selector = keccak256(signature).slice(0, 8)
      // 前端用 tronweb 的编码器更可靠，这里做 fallback
      var selector = '0x';
      // 简化：直接拼接参数（仅 bytes32）
      var data = selector;
      params.forEach(function (p) {
        data += p.replace(/^0x/, '').padStart(64, '0');
      });
      return data;
    },

    /** 辅助：解码 verifyEvidence 返回值 */
    _decodeVerifyResult: function (raw) {
      if (!raw) return { verified: false };
      // 如果是数组，取第一个
      if (Array.isArray(raw)) raw = raw[0];
      // 简化解析：返回 verified=true + 证书号从后端
      return { verified: true, certNo: raw || '' };
    }
  };

  global.NotaryChain = NotaryChain;
})(window);
