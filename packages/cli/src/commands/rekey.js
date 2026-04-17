const path = require('path');
const fs = require('fs');
const readline = require('readline');
const { rekeyBinFileWithBackup, readBinFile } = require('../bin-format');
const { generateMasterKey } = require('../crypto');
const { DEFAULT_CONFIG_DIR } = require('./init');

/**
 * kveil rekey 命令
 * 更换主密钥，并用新主密钥重新加密所有存储的密钥
 */
function rekeyCommand(options = {}) {
  const cwd = process.cwd();
  const configDir = path.join(cwd, DEFAULT_CONFIG_DIR);
  const binPath = path.join(configDir, 'secrets.bin');

  try {
    // 检查是否已初始化
    if (!pathExists(binPath)) {
      console.error('❌ 项目未初始化，请先运行：kveil init');
      process.exit(1);
    }

    // 读取当前的密钥条目
    const { entries } = readBinFile(binPath);

    if (entries.length === 0) {
      console.error('❌ 没有密钥需要重新加密');
      process.exit(1);
    }

    // 显示警告并请求确认
    console.log('⚠️  警告：此操作将更换主密钥');
    console.log('');
    console.log('   - 旧主密钥将失效');
    console.log('   - 所有密钥将用新主密钥重新加密');
    console.log('   - 需要同步更新所有使用旧主密钥的运行时库');
    console.log('');

    // 使用同步方式读取用户输入
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve, reject) => {
      rl.question('   是否继续？[y/N] ', (answer) => {
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          console.log('❌ 已取消操作');
          process.exit(0);
        }

        // 继续执行 rekey
        executeRekey(binPath, entries, options);
        resolve();
      });
    });

  } catch (error) {
    console.error('❌ 更换主密钥失败:', error.message);
    process.exit(1);
  }
}

/**
 * 执行 rekey 操作
 */
async function executeRekey(binPath, entries, options) {
  try {
    // 生成或使用指定的新主密钥
    let newMasterKey = options.key;
    let isGenerated = false;

    if (!newMasterKey) {
      newMasterKey = generateMasterKey();
      isGenerated = true;
    } else {
      // 验证指定的主密钥长度
      if (newMasterKey.length !== 16) {
        console.error('❌ 主密钥必须是 16 位');
        process.exit(1);
      }
    }

    // 执行 rekey（带备份）
    const backupPath = rekeyBinFileWithBackup(binPath, newMasterKey);

    // 输出结果
    if (isGenerated) {
      console.log('');
      console.log('✅ 已生成新主密钥');
      console.log(`   ${newMasterKey}`);
      console.log('');
      console.log('   ⚠️  请立即复制并妥善保管此密钥，丢失后将无法解密已有的密钥值');
      console.log('   💡  建议：将密钥保存到密码管理器或安全的位置');
    } else {
      console.log('');
      console.log('✅ 已使用指定的新主密钥');
    }

    console.log('');
    console.log(`✅ 已用新主密钥重新加密 ${entries.length} 个密钥`);
    console.log(`💾 备份已保存：${backupPath}`);
    console.log('');
    console.log('下一步:');
    console.log('   kveil list                   # 查看所有密钥');
    console.log('   kveil get <name>             # 验证密钥值');
    console.log('   kveil rekey --key <新密钥>   # 使用指定密钥再次更换');

  } catch (error) {
    console.error('❌ 更换主密钥失败:', error.message);
    process.exit(1);
  }
}

// 简单的路径存在检查（避免循环依赖）
function pathExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

module.exports = { rekeyCommand };
