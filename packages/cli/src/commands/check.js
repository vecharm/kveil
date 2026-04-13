const path = require('path');
const { readBinFile } = require('../bin-format');
const { getAllDeclaredKeys, getRequiredKeys } = require('../config');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil check 命令
 * 检查配置文件完整性
 */
function checkCommand() {
  const cwd = process.cwd();
  const configDir = path.join(cwd, DEFAULT_CONFIG_DIR);
  const binPath = path.join(configDir, 'secrets.bin');
  const configPath = path.join(configDir, 'config.yaml');

  try {
    // 读取 bin 文件中的密钥
    let binKeys = [];
    try {
      const binData = readBinFile(binPath);
      binKeys = binData.entries.map(e => e.name);
    } catch (error) {
      console.error('❌ 读取 bin 文件失败:', error.message);
      process.exit(1);
    }

    // 读取配置文件中的密钥
    const declaredKeys = getAllDeclaredKeys(configPath);
    const requiredKeys = getRequiredKeys(configPath);

    // 检查差异
    const declaredButMissing = declaredKeys.filter(k => !binKeys.includes(k));
    const inBinButNotDeclared = binKeys.filter(k => !declaredKeys.includes(k));
    const missingRequired = requiredKeys.filter(k => !binKeys.includes(k));

    // 输出结果
    console.log('📋 配置检查报告:');
    console.log('');
    console.log(`   config.yaml 声明：${declaredKeys.length} 个密钥`);
    console.log(`   secrets.bin 存储：${binKeys.length} 个密钥`);
    console.log('');

    let hasError = false;

    if (declaredButMissing.length > 0) {
      hasError = true;
      console.log('❌ 已声明但未存储的密钥:');
      for (const key of declaredButMissing) {
        console.log(`   • ${key}`);
      }
      console.log('');
    }

    if (inBinButNotDeclared.length > 0) {
      console.log('⚠️  已存储但未声明的密钥:');
      for (const key of inBinButNotDeclared) {
        console.log(`   • ${key}`);
      }
      console.log('');
    }

    if (missingRequired.length > 0) {
      hasError = true;
      console.log('❌ 缺失的必需密钥:');
      for (const key of missingRequired) {
        console.log(`   • ${key}`);
      }
      console.log('');
    }

    if (hasError) {
      console.log('🔧 修复建议:');
      if (declaredButMissing.length > 0) {
        console.log(`   kveil add ${declaredButMissing[0]} <密钥值>`);
      }
      process.exit(1);
    } else {
      console.log('✅ 所有密钥配置完整');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    process.exit(1);
  }
}

module.exports = { checkCommand };
