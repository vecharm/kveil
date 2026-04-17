const path = require('path');
const { removeKeyFromBin } = require('../bin-format');
const { removeKeyFromConfig, hasKeyInConfig } = require('../config');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil remove <name> 命令
 * 删除密钥
 */
function removeCommand(name, options = {}) {
  const cwd = process.cwd();
  const configDir = path.join(cwd, DEFAULT_CONFIG_DIR);
  const binPath = path.join(configDir, 'secrets.bin');
  const configPath = path.join(configDir, 'config.yaml');

  try {
    // 检查是否已初始化
    if (!pathExists(binPath)) {
      console.error('❌ 项目未初始化，请先运行：kveil init');
      process.exit(1);
    }

    // 检查密钥是否存在于 bin 文件中
    const { entries } = require('../bin-format').readBinFile(binPath);
    const existsInBin = entries.some(e => e.name === name);
    
    if (!existsInBin) {
      console.error(`❌ 密钥"${name}"不存在`);
      process.exit(1);
    }

    // 从 bin 文件中删除密钥
    removeKeyFromBin(binPath, name);
    console.log(`✅ 已从 secrets.bin 中删除：${name}`);

    // 从配置文件中删除（如果已声明）
    if (hasKeyInConfig(configPath, name)) {
      removeKeyFromConfig(configPath, name);
      console.log(`   已从 config.yaml 中移除声明`);
    }

    console.log('');
    console.log('下一步:');
    console.log('   kveil list                   # 查看剩余密钥');
    console.log('   kveil add <name> <value>     # 添加新密钥');

  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    process.exit(1);
  }
}

// 简单的路径存在检查（避免循环依赖）
function pathExists(p) {
  try {
    const fs = require('fs');
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

module.exports = { removeCommand };
