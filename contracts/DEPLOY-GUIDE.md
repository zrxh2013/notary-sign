# NotaryEvidenceRegistry 合约部署指南

## 概述

本文档指导如何将 `NotaryEvidenceRegistry` 智能合约部署到 TRON 区块链，建立公证书链上存证仓库。

部署后，每次公证完成时系统会自动将 SHA-256 指纹写入合约，扫码核验时可从链上直接验证。

## 前置条件

```bash
# 安装依赖（已完成）
npm install tronweb@6.0.0 solc@0.8.20
```

## 步骤 1：编译合约（已完成）

```bash
node scripts/compile-contract.js
```

输出：`contracts/NotaryEvidenceRegistry.json`（ABI + Bytecode）

## 步骤 2：部署到 Nile 测试网

### 2.1 获取测试私钥

1. 访问 https://nileex.io/join/getJoin
2. 填写邮箱获取 Nile 测试网钱包
3. 记录私钥和地址
4. 领取测试 TRX（水龙头）

### 2.2 运行部署脚本

```bash
# 在本地有 TRON 网络访问的机器上执行
node scripts/deploy-contract.js <你的Nile测试私钥>
```

输出示例：
```
✅ 合约部署成功！
  合约地址:   TXYZ1234...
  部署交易:   abc123...
  浏览器:     https://nile.tronscan.org/#/contract/TXYZ1234...
```

### 2.3 验证合约

```bash
# 查看合约
open https://nile.tronscan.org/#/contract/<合约地址>
```

## 步骤 3：更新前端配置

编辑 `chain-config.js`，填入部署结果：

```javascript
window.CHAIN_CONFIG = {
  NETWORK: 'nile',
  FULL_NODE:  'https://nile.tronstack.org',
  SOLIDITY:   'https://api.nileex.org',
  API_BASE:   'https://api.nileex.org',
  EXPLORER:   'https://nile.tronscan.org',

  // 填入部署结果
  CONTRACT_ADDRESS: 'TXYZ1234...',      // ← 替换
  DEPLOY_TX_HASH:   'abc123...',        // ← 替换
  DEPLOYED_AT:      '2026-09-03T...',

  // 公证人钱包（部署者同一密钥）
  NOTARY_PRIVATE_KEY: 'da14...',         // ← 替换（仅测试网）
  NOTARY_ADDRESS:     'TBaA8J...',       // ← 替换
  // ...其余不变
};
```

## 步骤 4：验证前端集成

```bash
# 启动本地 server
python3 -m http.server 8765

# 打开浏览器
open http://localhost:8765/index.html

# 完成一次完整公证流程
# 完成页应显示 "✅ 已上链存证" + 合约交易哈希

# 扫码核验
open http://localhost:8765/verify.html?fp=<指纹>&tx=<交易哈希>&cn=<证书号>
# 应显示 "✅ 链上存证仓库核验通过！"
```

## 步骤 5：部署到 TRON 主网

### 5.1 准备主网钱包

1. 创建专用的公证人 TRON 主网钱包
2. 充值约 500 TRX（约 $50）用于 Gas
3. 记录私钥（仅公证人掌握）

### 5.2 修改配置为主网

```javascript
window.CHAIN_CONFIG = {
  NETWORK: 'mainnet',
  FULL_NODE:  'https://api.trongrid.io',
  SOLIDITY:   'https://api.trongrid.io',
  API_BASE:   'https://api.trongrid.io',
  EXPLORER:   'https://tronscan.io',

  CONTRACT_ADDRESS: '<主网合约地址>',
  NOTARY_PRIVATE_KEY: '<公证人主网私钥>',
  NOTARY_ADDRESS:     '<公证人主网地址>',
  // ...
};
```

### 5.3 部署到主网

```bash
node scripts/deploy-contract.js <公证人主网私钥>
```

## 安全建议

| 项目 | 测试网（Nile） | 主网 |
|---|---|---|
| 私钥 | 可用默认测试密钥 | 必须公证人专用，不可公开 |
| 写入方式 | 前端直签 | **建议改为后端 API 签名** |
| Gas 来源 | 水龙头免费 | 需充值 TRX |
| 合约地址 | 可重复部署 | 一次部署永久使用 |

## 合约功能说明

| 方法 | 权限 | 用途 |
|---|---|---|
| `storeEvidence` | 公证人 | 写入公证书 SHA-256 指纹 |
| `getEvidence(certNo)` | 公开 | 按证书号查询存证详情 |
| `verifyEvidence(hash)` | 公开 | 核验指纹是否在链上 |
| `getCertNoByHash(hash)` | 公开 | 按指纹反查证书号 |
| `revokeEvidence(certNo)` | 公证人 | 撤销存证（证书作废时） |
| `authorizeNotary(addr)` | Owner | 授权新公证人 |
| `owner()` | 公开 | 查看合约所有者 |

## 文件清单

```
contracts/
├── NotaryEvidenceRegistry.sol      # 合约源码
├── NotaryEvidenceRegistry.json     # 编译后 ABI + Bytecode
├── deployed-config.json           # 部署后自动生成
└── DEPLOY-GUIDE.md                # 本文档

scripts/
├── compile-contract.js             # 编译脚本
└── deploy-contract.js             # 部署脚本

前端集成：
├── chain-config.js                 # 合约配置（地址+ABI+密钥）
├── notary-chain.js                 # SDK（storeEvidence/verifyEvidence/getEvidence）
├── app.js                          # finalizeSession 自动上链
└── verify.html                     # 扫码自动调用合约核验
```
