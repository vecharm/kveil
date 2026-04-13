const fs = require('fs');
const path = require('path');
const { readBinFile } = require('../bin-format');
const { CONFIG_FILE } = require('../config');

/**
 * kveil show -l - 列出所有密钥信息
 */
async function showListCommand() {
  const projectRoot = process.cwd();
  const binPath = path.join(projectRoot, '.kveil', 'secrets.bin');

  if (!fs.existsSync(binPath)) {
    console.error('❌ 错误：bin 文件不存在，请先运行 kveil init');
    process.exit(1);
  }

  try {
    const { masterKey, entries } = readBinFile(binPath);
    const { decrypt } = require('../crypto');

    console.log('📦 Kveil 密钥信息：\n');

    entries.forEach((entry, index) => {
      const decrypted = decrypt(masterKey, entry.encrypted);
      console.log(`${index + 1}. ${entry.name}:`);
      console.log(`   密文：${entry.encrypted}`);
      console.log(`   原文：${decrypted}`);
      console.log();
    });

    console.log(`共 ${entries.length} 个密钥`);
  } catch (error) {
    console.error('❌ 错误：', error.message);
    process.exit(1);
  }
}

/**
 * kveil show <name> - 显示指定密钥的明文
 * @param {string} name - 密钥名
 */
async function showCommand(name) {
  const projectRoot = process.cwd();
  const binPath = path.join(projectRoot, '.kveil', 'secrets.bin');

  if (!fs.existsSync(binPath)) {
    console.error('❌ 错误：bin 文件不存在，请先运行 kveil init');
    process.exit(1);
  }

  try {
    const { masterKey, entries } = readBinFile(binPath);

    const entry = entries.find(e => e.name === name);
    if (!entry) {
      console.error(`❌ 错误：密钥"${name}"不存在`);
      console.log('\n已配置的密钥：');
      entries.forEach(e => console.log(`  - ${e.name}`));
      process.exit(1);
    }

    const { decrypt } = require('../crypto');
    const decryptedValue = decrypt(masterKey, entry.encrypted);

    console.log(`\n🔑 ${name}:`);
    console.log('─'.repeat(50));
    console.log(decryptedValue);
    console.log('─'.repeat(50));
  } catch (error) {
    console.error('❌ 错误：', error.message);
    process.exit(1);
  }
}

module.exports = {
  showCommand,
  showListCommand
};
