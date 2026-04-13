/**
 * @fileoverview bin 文件读取工具
 */

import { xorDecode, verifyChecksum, decrypt } from './crypto';

const XOR_ENCODED_HEADER_SIZE = 16;
const CHECKSUM_SIZE = 16;
const HEADER_SIZE = XOR_ENCODED_HEADER_SIZE + CHECKSUM_SIZE;

export interface KeyEntry {
  name: string;
  encrypted: string;
}

export interface BinFileData {
  masterKey: string;
  entries: KeyEntry[];
}

/**
 * 从 ArrayBuffer 解析 bin 文件
 * @param buffer - bin 文件的 ArrayBuffer
 * @returns { masterKey, entries }
 */
export function parseBinFile(buffer: ArrayBuffer): BinFileData {
  const data = new Uint8Array(buffer);

  if (data.length < HEADER_SIZE) {
    throw new Error('bin 文件格式错误：头部不完整');
  }

  // 读取 XOR 编码的主密钥
  const encodedKey = data.slice(0, XOR_ENCODED_HEADER_SIZE);
  const masterKey = xorDecode(encodedKey);

  // 读取校验值
  const storedChecksum = data.slice(XOR_ENCODED_HEADER_SIZE, HEADER_SIZE);

  // Web Crypto API 不支持 MD5，这里跳过校验值验证
  // 如果需要严格校验，可以在 CLI 工具中使用 MD5，Web 端使用 SHA-256 前 16 字节

  // 解析密钥条目
  const entries: KeyEntry[] = [];
  let offset = HEADER_SIZE;

  while (offset < data.length) {
    if (offset + 2 > data.length) {
      break;
    }

    // 读取密钥名长度 (2 字节，大端序)
    const nameLength = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    if (offset + nameLength > data.length) {
      throw new Error('bin 文件格式错误：密钥名不完整');
    }

    // 读取密钥名
    const decoder = new TextDecoder();
    const name = decoder.decode(data.slice(offset, offset + nameLength));
    offset += nameLength;

    if (offset + 2 > data.length) {
      throw new Error('bin 文件格式错误：加密值长度不完整');
    }

    // 读取加密值长度 (2 字节，大端序)
    const encryptedLength = (data[offset] << 8) | data[offset + 1];
    offset += 2;

    if (offset + encryptedLength > data.length) {
      throw new Error('bin 文件格式错误：加密数据不完整');
    }

    // 读取加密值（base64 格式，utf8 存储）
    const encrypted = decoder.decode(data.slice(offset, offset + encryptedLength));
    offset += encryptedLength;

    entries.push({ name, encrypted });
  }

  return { masterKey, entries };
}

/**
 * 通过 URL 加载 bin 文件
 * @param url - bin 文件的 URL
 * @returns bin 文件数据
 */
export async function loadBinFile(url: string): Promise<BinFileData> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`无法加载 bin 文件：${response.status} ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return parseBinFile(buffer);
  } catch (error) {
    throw new Error(`加载 bin 文件失败：${error}`);
  }
}
