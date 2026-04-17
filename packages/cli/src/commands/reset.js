const path = require('path');
const { resetKeyInBin, readBinFile } = require('../bin-format');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil reset <name> <newValue> 命令
 * 重置密钥（更新密钥值）
 */
function resetCommand(name, newValue, options = {}) {
  const cwd = process.cwd();
  const configDir = path.join(cwd, DEFAULT_CONFIG_DIR);
  const binPath = path.join(configDir, 'secrets.bin');

  try {
    // 检查是否已初始化
    if (!pathExists(binPath)) {
      console.error('❌ 项目未初始化，请先运行：kveil init');
      process.exit(1);
    }

    // 检查密钥是否存在
    const { entries } = readBinFile(binPath);
    const existsInBin = entries.some(e => e.name === name);

    if (!existsInBin) {
      console.error(`❌ 密钥"${name}"不存在，请先使用 kveil add ${name} <value> 添加`);
      process.exit(1);
    }

    // 更新密钥值
    resetKeyInBin(binPath, name, newValue);
    console.log(`✅ 已重置密钥：${name}`);

    console.log('');
    console.log('下一步:');
    console.log('   kveil get ${name}           # 验证新密钥值');
    console.log('   kveil reset ${name} <新值>  # 再次重置密钥');

  } catch (error) {
    console.error('❌ 重置失败:', error.message);
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

module.exports = { resetCommand };
