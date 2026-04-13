const path = require('path');
const { getKeyFromBin } = require('../bin-format');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil get <name> 命令
 * 获取解密的密钥值（调试用）
 */
function getCommand(name) {
  const cwd = process.cwd();
  const binPath = path.join(cwd, DEFAULT_CONFIG_DIR, 'secrets.bin');

  try {
    const value = getKeyFromBin(binPath, name);
    console.log(value);

  } catch (error) {
    console.error('❌ 获取失败:', error.message);
    process.exit(1);
  }
}

module.exports = { getCommand };
