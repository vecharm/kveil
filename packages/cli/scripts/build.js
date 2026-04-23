#!/usr/bin/env node

/**
 * kveil 构建脚本 - 混淆核心模块
 * 
 * 使用方法:
 *   node scripts/build.js          # 构建并混淆
 *   node scripts/build.js --dry    # 仅检查，不写入
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// 需要混淆的文件
const FILES_TO_OBFUSCATE = [
  'src/crypto.js',
  'src/bin-format.js',
  'src/config.js',
  'src/commands/init.js',
  'src/commands/add.js',
  'src/commands/list.js',
  'src/commands/check.js',
  'src/commands/get.js',
  'src/commands/show.js',
  'src/commands/remove.js',
  'src/commands/reset.js',
  'src/commands/rekey.js'
];

// 混淆配置
const OBFUSCATION_OPTIONS = {
  // 压缩代码
  compact: true,
  
  // 控制流平坦化（降低可读性）
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  
  // 字符串数组化并加密
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  
  // 注入死代码（增加逆向难度）
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  
  // 变量名使用十六进制
  identifierNamesGenerator: 'hexadecimal',
  
  // 旋转字符串数组
  rotateStringArray: true,
  
  // 防格式化
  selfDefending: true,
  
  // 转换对象键名
  transformObjectKeys: true,
  
  // 不启用调试保护（影响性能）
  debugProtection: false,
  
  // 不禁用 console（需要调试信息）
  disableConsoleOutput: false,
  
  // 不使用 unicode 转义（影响可读性但不影响安全）
  unicodeEscapeSequence: false
};

/**
 * 混淆单个文件
 */
function obfuscateFile(filePath, dryRun = false) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 文件不存在：${filePath}`);
    return false;
  }
  
  const code = fs.readFileSync(fullPath, 'utf8');
  
  try {
    const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
    const obfuscatedCode = result.getObfuscatedCode();
    
    if (dryRun) {
      console.log(`📄 ${filePath} (${code.length} → ${obfuscatedCode.length} 字节)`);
      return true;
    }
    
    // 写入混淆后的文件
    fs.writeFileSync(fullPath, obfuscatedCode, 'utf8');
    console.log(`✅ ${filePath} (${code.length} → ${obfuscatedCode.length} 字节)`);
    return true;
  } catch (error) {
    console.error(`❌ 混淆失败 ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  
  console.log('🔒 kveil 构建脚本 - JavaScript 混淆');
  console.log('='.repeat(50));
  
  if (dryRun) {
    console.log('🔍 预览模式（不写入文件）\n');
  } else {
    console.log('🚀 开始混淆...\n');
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of FILES_TO_OBFUSCATE) {
    if (obfuscateFile(file, dryRun)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 结果：${successCount} 成功，${failCount} 失败`);
  
  if (failCount > 0) {
    process.exit(1);
  }
  
  if (!dryRun) {
    console.log('\n✅ 混淆完成！');
    console.log('💡 提示：运行 npm test 验证功能');
  }
}

main();
