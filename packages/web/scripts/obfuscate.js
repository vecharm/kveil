#!/usr/bin/env node

/**
 * kveil Web 构建脚本 - 混淆 dist 目录
 */

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

// 混淆配置
const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  identifierNamesGenerator: 'hexadecimal',
  rotateStringArray: true,
  selfDefending: true,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

/**
 * 混淆文件
 */
function obfuscateFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
    fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
    console.log(`✅ ${path.basename(filePath)} 混淆完成`);
  } catch (error) {
    console.error(`❌ ${path.basename(filePath)} 混淆失败:`, error.message);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔒 kveil Web 混淆脚本');
  console.log('='.repeat(50));

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist 目录不存在，请先运行 tsc');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.js'));
  
  if (files.length === 0) {
    console.log('⚠️  没有找到需要混淆的文件');
    return;
  }

  files.forEach(file => {
    obfuscateFile(path.join(DIST_DIR, file));
  });

  console.log('\n✅ 混淆完成！');
}

main();
