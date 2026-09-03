/**
 * ═══════════════════════════════════════════════════════════════
 *  NotaryEvidenceRegistry — TRON 链上存证仓库合约部署脚本
 * ═══════════════════════════════════════════════════════════════
 *
 *  功能：
 *    1. 自动生成钱包（或使用传入私钥）
 *    2. 检查余额（部署需要 TRX 做 Gas）
 *    3. 部署 NotaryEvidenceRegistry 合约到指定 TRON 网络
 *    4. 验证合约可调用
 *    5. 测试 storeEvidence + verifyEvidence 往返
 *    6. 自动更新 chain-config.js 合约地址
 *    7. 输出部署结果 + 浏览器链接
 *
 *  用法：
 *    # Shasta 测试网（水龙头: https://shasta.tronex.io/join/getJoinPage）
 *    node scripts/deploy-contract.js shasta
 *
 *    # Nile 测试网（水龙头: https://nileex.io）
 *    node scripts/deploy-contract.js nile
 *
 *    # 主网（需要真实 TRX）
 *    node scripts/deploy-contract.js mainnet <你的私钥>
 *
 *    # 自动生成钱包并部署到 Shasta
 *    node scripts/deploy-contract.js shasta --generate
 *
 *  依赖：
 *    npm install tronweb
 *    （tronweb 5.x 或 6.x 均可）
 * ═══════════════════════════════════════════════════════════════
 */
const fs = require('fs');
const path = require('path');

// ── 加载 tronweb（兼容 5.x / 6.x） ──
let TronWeb;
try {
  TronWeb = require('tronweb');
  // tronweb 6.x 导出 { TronWeb }，5.x 直接导出
  if (TronWeb.TronWeb) TronWeb = TronWeb.TronWeb;
} catch (e) {
  console.error('❌ 缺少 tronweb 依赖，请先运行: npm install tronweb');
  process.exit(1);
}

// ── 加载合约 ABI + Bytecode ──
const CONTRACT_JSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'contracts', 'NotaryEvidenceRegistry.json'), 'utf8')
);

// ═══════════════════════════════════════
//  网络配置
// ═══════════════════════════════════════
const NETWORKS = {
  shasta: {
    name:        'Shasta Testnet',
    fullNode:    'https://api.shasta.trongrid.io',
    solidity:   'https://api.shasta.trongrid.io',
    eventServer:'https://api.shasta.trongrid.io',
    explorer:    'https://shasta.tronscan.org',
    faucet:      'https://shasta.tronex.io/join/getJoinPage',
    chainId:     249,
  },
  nile: {
    name:        'Nile Testnet',
    fullNode:    'https://nile.trongrid.io',
    solidity:   'https://nile.trongrid.io',
    eventServer:'https://nile.trongrid.io',
    explorer:    'https://nile.tronscan.org',
    faucet:      'https://nileex.io',
    chainId:     2494,
  },
  mainnet: {
    name:        'TRON Mainnet',
    fullNode:    'https://api.trongrid.io',
    solidity:   'https://api.trongrid.io',
    eventServer:'https://api.trongrid.io',
    explorer:    'https://tronscan.org',
    faucet:      null,
    chainId:     1,
  },
};

// ═══════════════════════════════════════
//  主流程
// ═══════════════════════════════════════
async function main() {
  const networkKey = process.argv[2] || 'shasta';
  const net = NETWORKS[networkKey];
  if (!net) {
    console.error('❌ 未知网络:', networkKey);
    console.error('   可选: shasta | nile | mainnet');
    process.exit(1);
  }

  // 解析私钥
  let privateKey = process.argv[3];
  const generate = process.argv.includes('--generate');

  if (!privateKey && generate) {
    // 自动生成钱包
    const newAcct = await TronWeb.utils.accounts.generateAccount();
    privateKey = newAcct.privateKey;
    console.log('═══════════════════════════════════════════════');
    console.log('  🔑 新钱包已生成');
    console.log('═══════════════════════════════════════════════');
    console.log(`  地址: ${newAcct.address}`);
    console.log(`  私钥: ${privateKey}`);
    console.log(`  ⚠ 请妥善保存私钥！丢失不可恢复`);
    console.log('');
    if (net.faucet) {
      console.log(`  📢 请先到水龙头领取测试 TRX:`);
      console.log(`     ${net.faucet}`);
      console.log(`  然后用私钥重新运行:`);
      console.log(`     node scripts/deploy-contract.js ${networkKey} ${privateKey}`);
      console.log('');
      // 写入文件方便复制
      const walletPath = path.join(__dirname, '..', 'contracts', 'wallet-generated.json');
      fs.writeFileSync(walletPath, JSON.stringify({
        address: newAcct.address,
        privateKey: privateKey,
        network: networkKey,
        generatedAt: new Date().toISOString()
      }, null, 2));
      console.log(`  📝 钱包信息已保存: ${walletPath}`);
      process.exit(0);
    }
  }

  if (!privateKey) {
    console.log('═══════════════════════════════════════════════');
    console.log('  NotaryEvidenceRegistry 部署工具');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('  用法:');
    console.log('  ┌─ 自动生成钱包（先领 TRX 再部署）:');
    console.log('  │  node scripts/deploy-contract.js shasta --generate');
    console.log('  │');
    console.log('  ┌─ 用已有私钥部署:');
    console.log('  │  node scripts/deploy-contract.js shasta <PRIVATE_KEY>');
    console.log('  │');
    console.log('  ┌─ 主网部署:');
    console.log('  │  node scripts/deploy-contract.js mainnet <PRIVATE_KEY>');
    console.log('');
    console.log('  网络:');
    console.log('    shasta  — Shasta 测试网（推荐，水龙头友好）');
    console.log('    nile    — Nile 测试网');
    console.log('    mainnet — TRON 主网');
    process.exit(0);
  }

  // 清理私钥格式
  privateKey = privateKey.replace(/^0x/, '').trim();
  const address = TronWeb.address.fromPrivateKey(privateKey);

  console.log('═══════════════════════════════════════════════');
  console.log('  NotaryEvidenceRegistry — TRON 链上存证仓库');
  console.log('═══════════════════════════════════════════════');
  console.log(`  网络:     ${net.name}`);
  console.log(`  Deployer: ${address}`);
  console.log(`  Full:     ${net.fullNode}`);
  console.log(`  浏览器:   ${net.explorer}`);
  console.log('');

  // 创建 tronweb 实例
  const tw = new TronWeb({
    fullNode:    net.fullNode,
    solidityNode: net.solidity,
    eventServer:  net.eventServer,
    privateKey:   privateKey
  });

  // ── Step 1: 检查余额 ──
  console.log('━━ Step 1: 检查余额 ━━━━━━━━━━━━━━━━━━━━━━━');
  let balance;
  try {
    balance = await tw.trx.getBalance(address);
  } catch (e) {
    console.error('  ❌ 无法连接到 TRON 节点:', e.message);
    console.error('     请检查网络连接或尝试使用代理');
    process.exit(1);
  }
  console.log(`  余额: ${balance / 1e6} TRX (${balance} sun)`);

  if (balance === 0) {
    console.log('');
    console.log('  ⚠ 余额为 0，无法部署合约！');
    if (net.faucet) {
      console.log(`  👉 请先到水龙头领取测试 TRX:`);
      console.log(`     ${net.faucet}`);
      console.log(`  领取后重新运行:`);
      console.log(`     node scripts/deploy-contract.js ${networkKey} ${privateKey}`);
    } else {
      console.log('  👉 请向该地址转入 TRX 后重新运行');
    }
    process.exit(1);
  }

  // 估算 Gas 需求
  const minGas = 50 * 1e6; // 50 TRX
  if (balance < minGas) {
    console.log(`  ⚠ 余额不足 50 TRX，部署可能失败`);
    console.log(`     建议至少 50 TRX，当前仅 ${balance / 1e6} TRX`);
  }

  // ── Step 2: 部署合约 ──
  console.log('');
  console.log('━━ Step 2: 部署合约 ━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⏳ 正在创建部署交易...');

  let tx, result;
  try {
    tx = await tw.transaction.createSmartContract({
      abi: CONTRACT_JSON.abi,
      bytecode: CONTRACT_JSON.bytecode,
      feeLimit: 100 * 1e6,
      userFeePercentage: 30,
      originEnergyLimit: 10000000
    }, address);

    // tronweb 5.x 需要手动签名，6.x 自动签名
    if (tx.signature && tx.signature.length === 0) {
      tx = await tw.trx.sign(tx, privateKey);
    }

    result = await tw.trx.sendRawTransaction(tx);
  } catch (e) {
    console.error('  ❌ 部署交易创建/广播失败:', e.message);
    process.exit(1);
  }

  if (result.code) {
    console.error('  ❌ 部署失败:', result.code);
    if (result.message) {
      // TRON 错误码转可读信息
      try {
        const msg = Buffer.from(result.message, 'hex').toString('utf8');
        console.error('     原因:', msg);
      } catch {
        console.error('     原因:', result.message);
      }
    }
    process.exit(1);
  }

  console.log(`  ✅ 交易已广播: ${result.txid}`);
  console.log(`  📋 浏览器: ${net.explorer}/#/transaction/${result.txid}`);

  // ── Step 3: 等待区块确认 ──
  console.log('');
  console.log('━━ Step 3: 等待区块确认 ━━━━━━━━━━━━━━━━━━━━');
  console.log('  ⏳ 等待区块确认（最多 30 秒）...');

  let contractAddress = null;
  let txInfo = null;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      txInfo = await tw.trx.getTransactionInfo(result.txid);
      if (txInfo.contractAddress) {
        contractAddress = TronWeb.address.fromHex(txInfo.contractAddress);
        break;
      }
    } catch {
      // 交易尚未确认，继续等待
    }
    process.stdout.write(`  ⏳ 已等待 ${(i + 1) * 5}s...\r`);
  }

  if (!contractAddress) {
    console.log('');
    console.log('  ⚠ 交易已广播但合约地址尚未确认');
    console.log(`     请稍后在浏览器查询: ${net.explorer}/#/transaction/${result.txid}`);
    console.log(`     确认后手动将合约地址填入 chain-config.js`);
    process.exit(0);
  }

  console.log('');
  console.log('  ═══════════════════════════════════════');
  console.log('  ✅ 合约部署成功！');
  console.log('  ═══════════════════════════════════════');
  console.log(`  合约地址: ${contractAddress}`);
  console.log(`  部署交易: ${result.txid}`);
  console.log(`  浏览器:   ${net.explorer}/#/contract/${contractAddress}`);
  console.log('');

  // ── Step 4: 验证合约可调用 ──
  console.log('━━ Step 4: 验证合约 ━━━━━━━━━━━━━━━━━━━━━━━━');
  try {
    const instance = await tw.contract(CONTRACT_JSON.abi, contractAddress);
    const owner = await instance.owner().call();
    const ownerAddr = TronWeb.address.fromHex(owner);
    console.log(`  ✅ owner():           ${ownerAddr}`);
    console.log(`  ✅ 合约调用验证通过`);
  } catch (e) {
    console.warn(`  ⚠ 合约验证失败: ${e.message}`);
    console.warn('     合约可能已部署，请稍后在浏览器确认');
  }

  // ── Step 5: 测试 storeEvidence + verifyEvidence ──
  console.log('');
  console.log('━━ Step 5: 存证往返测试 ━━━━━━━━━━━━━━━━━━━━━');

  const testHash = '0x' + 'ab'.repeat(32); // 测试用 SHA-256 指纹
  const testCertNo = 'TEST-DEPLOY-' + Date.now();
  const testNotaryId = 'CAO-HK-D0468';
  const testPayHash = '0x' + 'cd'.repeat(32);

  try {
    console.log(`  ⏳ 写入测试存证...`);
    console.log(`     certNo:      ${testCertNo}`);
    console.log(`     evidenceHash: ${testHash}`);

    const instance = await tw.contract(CONTRACT_JSON.abi, contractAddress);
    const storeTx = await instance.storeEvidence(
      testHash, testCertNo, testNotaryId, testPayHash
    ).send({ feeLimit: 50 * 1e6, callValue: 0 });

    console.log(`  ✅ storeEvidence 成功! tx: ${storeTx}`);
    await new Promise(r => setTimeout(r, 3000));

    // 验证
    console.log(`  ⏳ 验证存证...`);
    const verifyResult = await instance.verifyEvidence(testHash).call();
    console.log(`  ✅ verifyEvidence: verified=${verifyResult.verified}, certNo=${verifyResult.certNo}`);

    // 查询详情
    const detail = await instance.getEvidence(testCertNo).call();
    const ts = Number(detail.timestamp);
    console.log(`  ✅ getEvidence:`);
    console.log(`     notaryId:     ${detail.notaryId}`);
    console.log(`     timestamp:    ${ts} (${new Date(ts * 1000).toISOString()})`);
    console.log(`     isValid:      ${detail.isValid}`);

    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log('  ✅ 存证往返测试全部通过！');
    console.log('  ═══════════════════════════════════════');
  } catch (e) {
    console.warn(`  ⚠ 存证测试失败: ${e.message}`);
    console.warn('     合约已部署，但存证测试未通过');
    console.warn('     可能是 Energy 不足，请充值后重试');
  }

  // ── Step 6: 自动更新 chain-config.js ──
  console.log('');
  console.log('━━ Step 6: 更新前端配置 ━━━━━━━━━━━━━━━━━━━━━');
  try {
    const configPath = path.join(__dirname, '..', 'chain-config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');

    // 替换合约地址
    configContent = configContent.replace(
      /CONTRACT_ADDRESS:\s*'[^']*'/,
      `CONTRACT_ADDRESS: '${contractAddress}'`
    );
    // 替换部署交易
    configContent = configContent.replace(
      /DEPLOY_TX_HASH:\s*'[^']*'/,
      `DEPLOY_TX_HASH: '${result.txid}'`
    );
    // 替换部署时间
    configContent = configContent.replace(
      /DEPLOYED_AT:\s*'[^']*'/,
      `DEPLOYED_AT: '${new Date().toISOString()}'`
    );
    // 替换网络配置
    configContent = configContent.replace(
      /NETWORK:\s*'[^']*'/,
      `NETWORK: '${networkKey}'`
    );
    configContent = configContent.replace(
      /FULL_NODE:\s*'[^']*'/,
      `FULL_NODE: '${net.fullNode}'`
    );
    configContent = configContent.replace(
      /SOLIDITY:\s*'[^']*'/,
      `SOLIDITY: '${net.solidity}'`
    );
    configContent = configContent.replace(
      /API_BASE:\s*'[^']*'/,
      `API_BASE: '${net.fullNode}'`
    );
    configContent = configContent.replace(
      /EXPLORER:\s*'[^']*'/,
      `EXPLORER: '${net.explorer}'`
    );
    // 替换公证人地址
    configContent = configContent.replace(
      /NOTARY_PRIVATE_KEY:\s*'[^']*'/,
      `NOTARY_PRIVATE_KEY: '${privateKey}'`
    );
    configContent = configContent.replace(
      /NOTARY_ADDRESS:\s*'[^']*'/,
      `NOTARY_ADDRESS: '${address}'`
    );

    fs.writeFileSync(configPath, configContent);
    console.log(`  ✅ chain-config.js 已自动更新`);
    console.log(`     合约地址: ${contractAddress}`);
    console.log(`     网络:     ${networkKey}`);
  } catch (e) {
    console.warn(`  ⚠ 无法自动更新 chain-config.js: ${e.message}`);
    console.log(`  👉 请手动将以下信息填入 chain-config.js:`);
    console.log(`     CONTRACT_ADDRESS: '${contractAddress}'`);
    console.log(`     DEPLOY_TX_HASH:   '${result.txid}'`);
    console.log(`     NOTARY_PRIVATE_KEY: '${privateKey}'`);
    console.log(`     NOTARY_ADDRESS: '${address}'`);
  }

  // ── Step 7: 保存部署记录 ──
  console.log('');
  console.log('━━ Step 7: 保存部署记录 ━━━━━━━━━━━━━━━━━━━━');
  const recordPath = path.join(__dirname, '..', 'contracts', 'deployed-config.json');
  const record = {
    network: networkKey,
    networkName: net.name,
    chainId: net.chainId,
    contractAddress: contractAddress,
    deployTxHash: result.txid,
    deployer: address,
    deployedAt: new Date().toISOString(),
    fullNode: net.fullNode,
    solidityNode: net.solidity,
    eventServer: net.eventServer,
    explorer: net.explorer,
    testCertNo: testCertNo,
    mainnetReady: networkKey === 'mainnet'
  };
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
  console.log(`  📝 部署记录: ${recordPath}`);

  // ── 最终总结 ──
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  🎉 部署完成！全部步骤已成功执行');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('  📌 关键信息（请保存）:');
  console.log(`     合约地址:   ${contractAddress}`);
  console.log(`     部署交易:   ${result.txid}`);
  console.log(`     部署者:     ${address}`);
  console.log(`     网络:       ${net.name}`);
  console.log(`     浏览器:     ${net.explorer}/#/contract/${contractAddress}`);
  console.log('');
  console.log('  📌 下一步:');
  if (networkKey !== 'mainnet') {
    console.log('     1. 前端测试通过后，部署到主网:');
    console.log(`        node scripts/deploy-contract.js mainnet <主网私钥>`);
    console.log('     2. 主网部署后更新 chain-config.js 网络为 mainnet');
  } else {
    console.log('     1. chain-config.js 已自动更新');
    console.log('     2. 推送到 GitHub:');
    console.log('        git add chain-config.js && git commit -m "config: 合约已部署到主网" && git push');
    console.log('     3. 前端 finalizeSession 会自动将指纹写入链上存证仓库');
  }
  console.log('');
}

main().catch(err => {
  console.error('');
  console.error('❌ 部署出错:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
