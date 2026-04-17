const fs = require('fs');
const path = require('path');
const { xorEncode, xorDecode, computeChecksum, verifyChecksum, encrypt, decrypt, generateMasterKey } = require('./crypto');

const XOR_ENCODED_HEADER_SIZE = 16;
const CHECKSUM_SIZE = 16;
const HEADER_SIZE = XOR_ENCODED_HEADER_SIZE + CHECKSUM_SIZE; // 32 字节

/**
 * 读取 bin 文件
 * @param {string} filePath - bin 文件路径
 * @returns {{ masterKey: string, entries: Array<{name: string, encrypted: string}> }}
 */
function readBinFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`bin 文件不存在：${filePath}`);
  }

  const buffer = fs.readFileSync(filePath);

  if (buffer.length < HEADER_SIZE) {
    throw new Error('bin 文件格式错误：头部不完整');
  }

  // 读取 XOR 编码的主密钥
  const encodedKey = new Uint8Array(buffer.slice(0, XOR_ENCODED_HEADER_SIZE));
  const masterKey = xorDecode(encodedKey);

  // 读取校验值
  const storedChecksum = new Uint8Array(buffer.slice(XOR_ENCODED_HEADER_SIZE, HEADER_SIZE));

  // 验证校验值
  if (!verifyChecksum(masterKey, storedChecksum)) {
    throw new Error('主密钥校验失败：bin 文件损坏或 XOR 掩码不匹配');
  }

  // 解析密钥条目
  const entries = [];
  let offset = HEADER_SIZE;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) {
      break;
    }

    // 读取密钥名长度 (2 字节，大端序)
    const nameLength = buffer.readUInt16BE(offset);
    offset += 2;

    if (offset + nameLength > buffer.length) {
      throw new Error('bin 文件格式错误：密钥名不完整');
    }

    // 读取密钥名
    const name = buffer.slice(offset, offset + nameLength).toString('utf8');
    offset += nameLength;

    if (offset + 2 > buffer.length) {
      throw new Error('bin 文件格式错误：加密值长度不完整');
    }

    // 读取加密值长度 (2 字节)
    const encryptedLength = buffer.readUInt16BE(offset);
    offset += 2;

    if (offset + encryptedLength > buffer.length) {
      throw new Error('bin 文件格式错误：加密数据不完整');
    }

    // encrypted 是 base64 格式（含 | 分隔符），用 utf8 读取
    const encrypted = buffer.slice(offset, offset + encryptedLength).toString('utf8');
    offset += encryptedLength;

    entries.push({ name, encrypted });
  }

  return { masterKey, entries };
}

/**
 * 写入 bin 文件
 * @param {string} filePath - bin 文件路径
 * @param {string} masterKey - 16 位主密钥
 * @param {Array<{name: string, encrypted: string}>} entries - 密钥条目
 */
function writeBinFile(filePath, masterKey, entries) {
  // 确保目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffers = [];

  // 写入 XOR 编码的主密钥
  const encodedKey = xorEncode(masterKey);
  buffers.push(Buffer.from(encodedKey));

  // 写入校验值
  const checksum = computeChecksum(masterKey);
  buffers.push(Buffer.from(checksum));

  // 写入密钥条目
  for (const entry of entries) {
    // 密钥名长度 (2 字节)
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const nameLengthBuffer = Buffer.alloc(2);
    nameLengthBuffer.writeUInt16BE(nameBuffer.length, 0);
    buffers.push(nameLengthBuffer);

    // 密钥名
    buffers.push(nameBuffer);

    // 加密值长度 (2 字节)
    // encrypted 是 base64 格式（含 | 分隔符），直接用 utf8 存储
    const encryptedBuffer = Buffer.from(entry.encrypted, 'utf8');
    const encryptedLengthBuffer = Buffer.alloc(2);
    encryptedLengthBuffer.writeUInt16BE(encryptedBuffer.length, 0);
    buffers.push(encryptedLengthBuffer);

    // 加密值
    buffers.push(encryptedBuffer);
  }

  // 合并所有 buffer
  const finalBuffer = Buffer.concat(buffers);
  fs.writeFileSync(filePath, finalBuffer);
}

/**
 * 初始化 bin 文件
 * @param {string} filePath - bin 文件路径
 * @param {string} [masterKey] - 可选的 16 位主密钥，不指定则自动生成
 * @returns {string} 生成的主密钥
 */
function initBinFile(filePath, masterKey) {
  const finalKey = masterKey || generateMasterKey();
  writeBinFile(filePath, finalKey, []);
  return finalKey;
}

/**
 * 添加密钥到 bin 文件
 * @param {string} filePath - bin 文件路径
 * @param {string} name - 密钥名
 * @param {string} value - 明文密钥值
 */
function addKeyToBin(filePath, name, value) {
  const { masterKey, entries } = readBinFile(filePath);

  // 检查是否已存在
  const existingIndex = entries.findIndex(e => e.name === name);
  const encrypted = encrypt(masterKey, value);

  if (existingIndex >= 0) {
    entries[existingIndex] = { name, encrypted };
  } else {
    entries.push({ name, encrypted });
  }

  writeBinFile(filePath, masterKey, entries);
}

/**
 * 从 bin 文件获取解密的密钥
 * @param {string} filePath - bin 文件路径
 * @param {string} name - 密钥名
 * @returns {string} 解密的明文密钥
 */
function getKeyFromBin(filePath, name) {
  const { masterKey, entries } = readBinFile(filePath);

  const entry = entries.find(e => e.name === name);
  if (!entry) {
    throw new Error(`密钥"${name}"不存在`);
  }

  return decrypt(masterKey, entry.encrypted);
}

/**
 * 从 bin 文件删除密钥
 * @param {string} filePath - bin 文件路径
 * @param {string} name - 密钥名
 */
function removeKeyFromBin(filePath, name) {
  const { masterKey, entries } = readBinFile(filePath);

  // 检查是否存在
  const existingIndex = entries.findIndex(e => e.name === name);
  if (existingIndex < 0) {
    throw new Error(`密钥"${name}"不存在`);
  }

  // 删除密钥
  entries.splice(existingIndex, 1);

  writeBinFile(filePath, masterKey, entries);
}

/**
 * 更换密钥（更新密钥值）
 * @param {string} filePath - bin 文件路径
 * @param {string} name - 密钥名
 * @param {string} newValue - 新的明文密钥值
 */
function rotateKeyInBin(filePath, name, newValue) {
  const { masterKey, entries } = readBinFile(filePath);

  // 检查是否存在
  const existingIndex = entries.findIndex(e => e.name === name);
  if (existingIndex < 0) {
    throw new Error(`密钥"${name}"不存在`);
  }

  // 更新加密值
  const encrypted = encrypt(masterKey, newValue);
  entries[existingIndex] = { name, encrypted };

  writeBinFile(filePath, masterKey, entries);
}

module.exports = {
  readBinFile,
  writeBinFile,
  initBinFile,
  addKeyToBin,
  getKeyFromBin,
  removeKeyFromBin,
  rotateKeyInBin,
  HEADER_SIZE
};
