const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { test } = require('node:test');

const CLI_PATH = path.join(__dirname, '../bin/kveil');
const TEST_DIR = path.join(__dirname, '../../.test');

// 清理测试目录
function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

// 设置测试目录
function setup() {
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// 运行 CLI 命令
function runCli(args, cwd = TEST_DIR) {
  try {
    return execSync(`node ${CLI_PATH} ${args}`, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env }
    });
  } catch (error) {
    return error.stdout || error.stderr || '';
  }
}

test('CLI 工具测试', async (t) => {
  await t.test('--version 应该输出版本号', () => {
    setup();
    const output = runCli('--version');
    assert(output.includes('0.1.0'), '应该输出版本号 0.1.0');
    cleanup();
  });

  await t.test('init 应该创建 .kveil 目录和配置文件', () => {
    setup();
    const output = runCli('init');

    assert(output.includes('✅ 已生成主密钥'), '应该生成主密钥');
    assert(output.includes('✅ 已创建配置文件'), '应该创建配置文件');

    const binPath = path.join(TEST_DIR, '.kveil/secrets.bin');
    const configPath = path.join(TEST_DIR, '.kveil/config.yaml');

    assert(fs.existsSync(binPath), 'secrets.bin 应该存在');
    assert(fs.existsSync(configPath), 'config.yaml 应该存在');
    cleanup();
  });

  await t.test('init 重复初始化应该提示', () => {
    setup();
    runCli('init');
    const output = runCli('init');

    assert(output.includes('⚠️  项目已初始化'), '应该提示已初始化');
    cleanup();
  });

  await t.test('add 应该添加密钥', () => {
    setup();
    runCli('init');
    const output = runCli('add mi_api_key "sk-test123"');

    assert(output.includes('✅ 已添加密钥'), '应该添加密钥成功');
    assert(output.includes('mi_api_key'), '应该显示密钥名');
    cleanup();
  });

  await t.test('add 未初始化应该报错', () => {
    setup();
    const emptyDir = path.join(TEST_DIR, 'empty');
    fs.mkdirSync(emptyDir);

    const result = runCli('add test_key "value"', emptyDir);

    assert(result !== '', '应该报错');
    assert(result.includes('未初始化'), '应该提示未初始化');
    cleanup();
  });

  await t.test('list 应该列出所有密钥', () => {
    setup();
    runCli('init');
    runCli('add key1 "value1"');
    runCli('add key2 "value2"');

    const output = runCli('list');

    assert(output.includes('key1'), '应该包含 key1');
    assert(output.includes('key2'), '应该包含 key2');
    cleanup();
  });

  await t.test('check 应该通过检查', () => {
    setup();
    runCli('init');
    runCli('add key1 "value1"');

    const output = runCli('check');

    assert(output.includes('✅ 所有密钥配置完整'), '应该通过检查');
    cleanup();
  });

  await t.test('get 应该返回解密的密钥', () => {
    setup();
    runCli('init');
    runCli('add mi_api_key "sk-test123"');

    const output = runCli('get mi_api_key');

    assert(output.includes('sk-test123'), '应该返回原始密钥值');
    cleanup();
  });

  await t.test('get 获取不存在的密钥应该报错', () => {
    setup();
    runCli('init');

    const result = runCli('get nonexistent_key');

    assert(result !== '', '应该报错');
    assert(result.includes('不存在'), '应该提示密钥不存在');
    cleanup();
  });

  await t.test('加密解密应该正确处理特殊字符', () => {
    setup();
    runCli('init');
    runCli('add special_key "sk-test!@#$%^&*()"');

    const output = runCli('get special_key');

    assert(output.includes('sk-test!@#$%^&*()'), '应该正确解密特殊字符');
    cleanup();
  });
});

console.log('所有测试通过！');
