const path = require('path');
const { getAllDeclaredKeys } = require('../config');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil list 命令
 * 列出所有已配置的密钥名
 */
function listCommand() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, DEFAULT_CONFIG_DIR, 'config.yaml');

  try {
    const keys = getAllDeclaredKeys(configPath);

    if (keys.length === 0) {
      console.log('📭 暂无已配置的密钥');
      console.log('');
      console.log('使用 kveil add <密钥名> <密钥值> 添加密钥');
      return;
    }

    console.log('🔑 已配置的密钥:');
    console.log('');
    for (const key of keys) {
      console.log(`   • ${key}`);
    }
    console.log('');
    console.log(`共 ${keys.length} 个密钥`);

  } catch (error) {
    console.error('❌ 读取失败:', error.message);
    process.exit(1);
  }
}

module.exports = { listCommand };
