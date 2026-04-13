const fs = require('fs');
const path = require('path');
const { initBinFile } = require('../bin-format');
const { initConfig } = require('../config');

const DEFAULT_CONFIG_DIR = '.kveil';

/**
 * kveil init 命令
 * 初始化项目，生成 16 位主密钥和配置文件
 */
function initCommand(options = {}) {
  const cwd = process.cwd();
  const configDir = path.join(cwd, DEFAULT_CONFIG_DIR);
  const binPath = path.join(configDir, 'secrets.bin');
  const configPath = path.join(configDir, 'config.yaml');

  try {
    // 检查是否已初始化
    if (fs.existsSync(binPath) && fs.existsSync(configPath)) {
      console.log('⚠️  项目已初始化，如需重置请删除 .kveil 目录');
      console.log(`   配置目录：${configDir}`);
      return;
    }

    // 创建配置目录
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 初始化 bin 文件
    const masterKey = initBinFile(binPath, options.key);
    console.log('✅ 已生成主密钥');
    if (!options.key) {
      console.log(`   密钥：${masterKey}`);
      console.log('   ⚠️  请妥善保管此密钥，丢失后将无法解密已有的密钥值');
    }

    // 初始化配置文件
    initConfig(configPath);
    console.log('✅ 已创建配置文件');

    console.log('');
    console.log('📁 初始化完成！');
    console.log(`   配置目录：${configDir}`);
    console.log('');
    console.log('下一步:');
    console.log('   kveil add <密钥名> <密钥值>  # 添加密钥');
    console.log('   kveil list                   # 查看已配置的密钥');

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  }
}

module.exports = { initCommand, DEFAULT_CONFIG_DIR };
