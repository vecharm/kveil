const path = require('path');
const { addKeyToBin } = require('../bin-format');
const { addKeyToConfig, hasKeyInConfig } = require('../config');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil add <name> <value> 命令
 * 添加密钥
 */
function addCommand(name, value, options = {}) {
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

    // 添加密钥到 bin 文件
    addKeyToBin(binPath, name, value);
    console.log(`✅ 已添加密钥：${name}`);

    // 添加到配置文件（如果尚未声明）
    if (!hasKeyInConfig(configPath, name)) {
      addKeyToConfig(configPath, name, true);
      console.log(`   已在 config.yaml 中声明`);
    }

    console.log('');
    console.log('下一步:');
    console.log('   kveil add <另一个密钥>       # 继续添加密钥');
    console.log('   kveil list                   # 查看所有密钥');

  } catch (error) {
    console.error('❌ 添加失败:', error.message);
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

module.exports = { addCommand };
