/**
 * 部署 NotaryEvidenceRegistry 合约到 TRON Nile 测试网
 *
 * Nile 测试网：
 *   - 全节点: https://nile.tronstack.com
 *   - Solidity 节点: https://api.nileex.com
 *   - 水龙头: https://nileex.io/join/getJoin (免费领取测试 TRX)
 *   - 浏览器: https://nile.tronscan.org
 *
 * 用法:
 *   node scripts/deploy-contract.js <PRIVATE_KEY>
 *
 * 如不传私钥，使用默认测试私钥（仅 Nile 测试网，无真实价值）
 */
const fs = require('fs');
const path = require('path');
const { TronWeb } = require('tronweb');

const CONTRACT_JSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'contracts', 'NotaryEvidenceRegistry.json'), 'utf8')
);

// Nile 测试网全节点
const NILE_FULL_NODE = 'https://nile.tronstack.com';
const NILE_SOLIDITY  = 'https://api.nileex.com';
const NILE_EVENT     = 'https://event.nileex.com';

// 默认测试私钥（仅 Nile 测试网用，无真实价值）
const DEFAULT_PK = 'da146374a7534f9fc1a3aef7c4fa84e0a97a2e4f0c1f0f8a0b1f0c2d3e4f5a6b';

async function main() {
  const privateKey = process.argv[2] || DEFAULT_PK;
  const address = TronWeb.address.fromPrivateKey(privateKey);

  console.log('═══════════════════════════════════════════════');
  console.log('  NotaryEvidenceRegistry — Deploy to TRON Nile');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Deployer: ${address}`);
  console.log(`  Network:  Nile Testnet`);
  console.log(`  Full:     ${NILE_FULL_NODE}`);
  console.log('');

  const tw = new TronWeb({
    fullNode: NILE_FULL_NODE,
    solidityNode: NILE_SOLIDITY,
    eventServer: NILE_EVENT,
    privateKey: privateKey
  });

  // 检查余额
  const balance = await tw.trx.getBalance(address);
  console.log(`  Balance:  ${balance / 1e6} TRX`);
  if (balance === 0) {
    console.log('\n  ⚠ 余额为 0，请先到 https://nileex.io/join/getJoin 领取测试 TRX');
    console.log('  或手动转入测试 TRX 到上述地址\n');
  }

  // 部署合约
  console.log('\n  ⏳ Deploying contract...');
  const tx = await tw.transaction.createSmartContract({
    abi: CONTRACT_JSON.abi,
    bytecode: CONTRACT_JSON.bytecode,
    feeLimit: 100 * 1e6,  // 100 TRX
    userFeePercentage: 30,
    originEnergyLimit: 10000000
  }, address, { privateKey: privateKey });

  const result = await tw.trx.sendRawTransaction(tx);

  if (result.code) {
    console.log('  ❌ 部署失败:', result.code, result.message || '');
    process.exit(1);
  }

  // 等待确认
  console.log('  ⏳ 等待区块确认...');
  await new Promise(r => setTimeout(r, 5000));

  // 查询合约地址
  const txInfo = await tw.trx.getTransactionInfo(result.txid);
  const contractAddress = txInfo.contractAddress
    ? TronWeb.address.fromHex(txInfo.contractAddress)
    : null;

  if (!contractAddress) {
    console.log('  ⚠ 交易已广播但合约地址尚未确认，请稍后查询');
    console.log(`  TxID: ${result.txid}`);
    console.log(`  浏览器: https://nile.tronscan.org/#/transaction/${result.txid}`);
    process.exit(0);
  }

  console.log('\n  ═══════════════════════════════════════');
  console.log('  ✅ 合约部署成功！');
  console.log('  ═══════════════════════════════════════');
  console.log(`  合约地址:   ${contractAddress}`);
  console.log(`  部署交易:   ${result.txid}`);
  console.log(`  浏览器:     https://nile.tronscan.org/#/contract/${contractAddress}`);
  console.log('');

  // 验证合约可调用
  const instance = await tw.contract(CONTRACT_JSON.abi, contractAddress);
  const owner = await instance.owner().call();
  console.log(`  Owner:      ${TronWeb.address.fromHex(owner)}`);
  console.log('  ✅ 合约调用验证通过');

  // 输出到环境配置文件
  const configPath = path.join(__dirname, '..', 'contracts', 'deployed-config.json');
  const config = {
    network: 'nile',
    chainId: 2494,
    contractAddress: contractAddress,
    deployTxHash: result.txid,
    deployer: address,
    deployedAt: new Date().toISOString(),
    fullNode: NILE_FULL_NODE,
    solidityNode: NILE_SOLIDITY,
    eventServer: NILE_EVENT,
    explorer: 'https://nile.tronscan.org',
    mainnetReady: false
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n  📝 配置已写入: ${configPath}`);

  return { contractAddress, txid: result.txid };
}

main().catch(err => {
  console.error('\n❌ 部署出错:', err.message || err);
  process.exit(1);
});
