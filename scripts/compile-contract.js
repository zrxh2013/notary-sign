/**
 * 编译 NotaryEvidenceRegistry.sol → 生成 ABI + Bytecode JSON
 * 输出文件: contracts/NotaryEvidenceRegistry.json
 */
const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.join(__dirname, '..', 'contracts', 'NotaryEvidenceRegistry.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'NotaryEvidenceRegistry.sol': { content: source }
  },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    optimizer: { enabled: true, runs: 200 }
  }
};

console.log('Compiling NotaryEvidenceRegistry.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  const hasError = output.errors.some(e => e.severity === 'error');
  output.errors.forEach(e => console.log(`[${e.severity}] ${e.message}`));
  if (hasError) process.exit(1);
}

const contract = output.contracts['NotaryEvidenceRegistry.sol']['NotaryEvidenceRegistry'];
const result = {
  contractName: 'NotaryEvidenceRegistry',
  abi: contract.abi,
  bytecode: '0x' + contract.evm.bytecode.object
};

const outPath = path.join(__dirname, '..', 'contracts', 'NotaryEvidenceRegistry.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`\n✅ Compilation successful`);
console.log(`   ABI functions: ${contract.abi.filter(a => a.type === 'function').length}`);
console.log(`   Bytecode size: ${contract.evm.bytecode.object.length / 2} bytes`);
console.log(`   Output: ${outPath}`);
