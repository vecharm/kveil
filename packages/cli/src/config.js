const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 读取配置文件
 * @param {string} filePath - yaml 文件路径
 * @returns {{ keys: Array<{name: string, required: boolean}> }}
 */
function readConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`配置文件不存在：${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const config = yaml.load(content);

  return config || { keys: [] };
}

/**
 * 写入配置文件
 * @param {string} filePath - yaml 文件路径
 * @param {{ keys: Array<{name: string, required: boolean}> }} config - 配置对象
 */
function writeConfig(filePath, config) {
  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1, // 不限制行宽
    noRefs: true   // 不使用引用
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * 初始化配置文件
 * @param {string} filePath - yaml 文件路径
 * @returns {{ keys: Array<{name: string, required: boolean}> }}
 */
function initConfig(filePath) {
  const config = { keys: [] };
  writeConfig(filePath, config);
  return config;
}

/**
 * 添加密钥声明到配置文件
 * @param {string} filePath - yaml 文件路径
 * @param {string} name - 密钥名
 * @param {boolean} required - 是否必需
 */
function addKeyToConfig(filePath, name, required = true) {
  const config = readConfig(filePath);

  // 检查是否已存在
  const existingIndex = config.keys.findIndex(k => k.name === name);

  if (existingIndex >= 0) {
    config.keys[existingIndex] = { name, required };
  } else {
    config.keys.push({ name, required });
  }

  writeConfig(filePath, config);
}

/**
 * 检查密钥是否在配置中声明
 * @param {string} filePath - yaml 文件路径
 * @param {string} name - 密钥名
 * @returns {boolean}
 */
function hasKeyInConfig(filePath, name) {
  const config = readConfig(filePath);
  return config.keys.some(k => k.name === name);
}

/**
 * 获取所有必需的密钥名
 * @param {string} filePath - yaml 文件路径
 * @returns {string[]}
 */
function getRequiredKeys(filePath) {
  const config = readConfig(filePath);
  return config.keys.filter(k => k.required).map(k => k.name);
}

/**
 * 获取所有已声明的密钥名
 * @param {string} filePath - yaml 文件路径
 * @returns {string[]}
 */
function getAllDeclaredKeys(filePath) {
  const config = readConfig(filePath);
  return config.keys.map(k => k.name);
}

module.exports = {
  readConfig,
  writeConfig,
  initConfig,
  addKeyToConfig,
  hasKeyInConfig,
  getRequiredKeys,
  getAllDeclaredKeys
};
