/**
 * NotaryEvidenceRegistry 合约配置
 *
 * 部署后替换下方地址即可：
 *   1. 本地运行 node scripts/deploy-contract.js <PRIVATE_KEY>
 *   2. 将输出的合约地址填入 CONTRACT_ADDRESS
 *   3. 将输出的 TxID 填入 DEPLOY_TX_HASH
 *
 * 测试网 → 主网切换时改 NETWORK + API_BASE + EXPLORER 即可
 */
window.CHAIN_CONFIG = {
  // ====== 网络 ======
  // Nile 测试网 → 部署测试
  // Mainnet 主网 → 正式上链
  NETWORK: 'nile',
  FULL_NODE:  'https://nile.tronstack.org',
  SOLIDITY:   'https://api.nileex.org',
  API_BASE:   'https://api.nileex.org',
  EXPLORER:   'https://nile.tronscan.org',

  // ====== 合约地址（部署后替换） ======
  CONTRACT_ADDRESS: '',           // 部署后填入，如 'TXYZ...'
  DEPLOY_TX_HASH:   '',           // 部署交易哈希
  DEPLOYED_AT:      '',           // 部署时间 ISO

  // ====== 公证人钱包（用于 storeEvidence 写入签名） ======
  // ⚠️ 仅用于 Nile 测试网。主网部署后应改为后端 API 签名。
  NOTARY_PRIVATE_KEY: '',        // 公证人私钥（部署者同一密钥）
  NOTARY_ADDRESS:     '',         // 公证人地址

  // ====== 合约 ABI（只读方法用于前端查询） ======
  CONTRACT_ABI: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [{"name":"notary","type":"address"}],
      "name": "authorizeNotary",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name":"notary","type":"address"}],
      "name": "revokeNotary",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"name":"evidenceHash","type":"bytes32"},
        {"name":"certNo","type":"string"},
        {"name":"notaryId","type":"string"},
        {"name":"paymentTxHash","type":"bytes32"}
      ],
      "name": "storeEvidence",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name":"certNo","type":"string"}],
      "name": "getEvidence",
      "outputs": [
        {"name":"evidenceHash","type":"bytes32"},
        {"name":"notaryId","type":"string"},
        {"name":"timestamp","type":"uint256"},
        {"name":"paymentTxHash","type":"bytes32"},
        {"name":"isValid","type":"bool"},
        {"name":"storedBy","type":"address"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name":"evidenceHash","type":"bytes32"}],
      "name": "getCertNoByHash",
      "outputs": [{"name":"certNo","type":"string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name":"evidenceHash","type":"bytes32"}],
      "name": "verifyEvidence",
      "outputs": [
        {"name":"verified","type":"bool"},
        {"name":"certNo","type":"string"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name":"certNo","type":"string"}],
      "name": "revokeEvidence",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name":"certNo","type":"string"}],
      "name": "evidenceExists",
      "outputs": [{"name":"","type":"bool"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{"name":"","type":"address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name":"","type":"address"}],
      "name": "authorizedNotaries",
      "outputs": [{"name":"","type":"bool"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],

  // ====== 状态标志 ======
  isConfigured: function() {
    return !!(this.CONTRACT_ADDRESS && this.CONTRACT_ADDRESS.length > 10);
  }
};
