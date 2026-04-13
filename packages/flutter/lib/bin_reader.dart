import 'dart:convert';
import 'package:crypto/crypto.dart' as crypto_lib;
import 'package:pointycastle/export.dart';
import 'package:flutter/services.dart';

// XOR 掩码 - 必须与 CLI 工具一致
const List<int> XOR_MASK = [0x5A, 0x3C, 0x9F, 0x12, 0x7E, 0x4D, 0xB6, 0x81,
                            0x23, 0xF5, 0x67, 0xA9, 0xD4, 0x0E, 0x8C, 0x31];

/// 从 assets 读取 bin 文件
/// [binPath] bin 文件路径，相对于 assets 根目录
/// 返回 { masterKey, entries }
Future<Map<String, dynamic>> readBinFileFromAssets(String binPath) async {
  final ByteData data = await rootBundle.load(binPath);
  final Uint8List buffer = Uint8List.view(data.buffer);

  const int xorEncodedHeaderSize = 16;
  const int checksumSize = 16;
  const int headerSize = xorEncodedHeaderSize + checksumSize;

  if (buffer.length < headerSize) {
    throw Exception('bin 文件格式错误：头部不完整');
  }

  // 读取 XOR 编码的主密钥
  final Uint8List encodedKey = Uint8List.fromList(buffer.sublist(0, xorEncodedHeaderSize));
  final String masterKey = xorDecode(encodedKey);

  // 读取校验值
  final Uint8List storedChecksum = Uint8List.fromList(buffer.sublist(xorEncodedHeaderSize, headerSize));

  // 验证校验值
  if (!verifyChecksum(masterKey, storedChecksum)) {
    throw Exception('主密钥校验失败：bin 文件损坏或 XOR 掩码不匹配');
  }

  // 解析密钥条目
  final List<Map<String, dynamic>> entries = [];
  int offset = headerSize;

  while (offset < buffer.length) {
    if (offset + 2 > buffer.length) {
      break;
    }

    // 读取密钥名长度 (2 字节，大端序)
    final int nameLength = (buffer[offset] << 8) | buffer[offset + 1];
    offset += 2;

    if (offset + nameLength > buffer.length) {
      throw Exception('bin 文件格式错误：密钥名不完整');
    }

    // 读取密钥名
    final String name = String.fromCharCodes(buffer.sublist(offset, offset + nameLength));
    offset += nameLength;

    if (offset + 2 > buffer.length) {
      throw Exception('bin 文件格式错误：加密值长度不完整');
    }

    // 读取加密值长度 (2 字节，大端序)
    final int encryptedLength = (buffer[offset] << 8) | buffer[offset + 1];
    offset += 2;

    if (offset + encryptedLength > buffer.length) {
      throw Exception('bin 文件格式错误：加密数据不完整');
    }

    // 读取加密值（base64 格式，utf8 存储）
    final String encrypted = String.fromCharCodes(buffer.sublist(offset, offset + encryptedLength));
    offset += encryptedLength;

    entries.add({'name': name, 'encrypted': encrypted});
  }

  return {'masterKey': masterKey, 'entries': entries};
}

/// XOR 编码主密钥
Uint8List xorEncode(String masterKey) {
  final List<int> keyBytes = masterKey.codeUnits;
  final Uint8List encoded = Uint8List(16);

  for (int i = 0; i < 16; i++) {
    encoded[i] = keyBytes[i] ^ XOR_MASK[i];
  }

  return encoded;
}

/// XOR 解码主密钥
String xorDecode(Uint8List encoded) {
  final Uint8List decoded = Uint8List(16);

  for (int i = 0; i < 16; i++) {
    decoded[i] = encoded[i] ^ XOR_MASK[i];
  }

  return String.fromCharCodes(decoded);
}

/// 从主密钥派生 AES-256 密钥
Uint8List deriveKey(String masterKey) {
  return Uint8List.fromList(crypto_lib.sha256.convert(masterKey.codeUnits).bytes);
}

/// 计算主密钥的校验值 (MD5 前 16 字节)
Uint8List computeChecksum(String masterKey) {
  final md5Hash = crypto_lib.md5.convert(masterKey.codeUnits);
  return Uint8List.fromList(md5Hash.bytes.sublist(0, 16));
}

/// 验证校验值
bool verifyChecksum(String masterKey, Uint8List storedChecksum) {
  final Uint8List expectedChecksum = computeChecksum(masterKey);

  for (int i = 0; i < 16; i++) {
    if (expectedChecksum[i] != storedChecksum[i]) {
      return false;
    }
  }

  return true;
}

/// 使用 AES-256-GCM 解密
/// [masterKey] 16 位主密钥
/// [encrypted] base64 格式的加密字符串（iv|authTag|ciphertext）
String decrypt(String masterKey, String encrypted) {
  final parts = encrypted.split('|');
  if (parts.length != 3) {
    throw Exception('加密数据格式错误');
  }

  final Uint8List ivBytes = base64Decode(parts[0]);
  final Uint8List authTagBytes = base64Decode(parts[1]);
  final Uint8List ciphertextBytes = base64Decode(parts[2]);

  // 派生密钥
  final derivedKey = deriveKey(masterKey);

  // 合并 ciphertext 和 authTag（pointycastle 要求）
  final Uint8List fullData = Uint8List(ciphertextBytes.length + authTagBytes.length);
  fullData.setAll(0, ciphertextBytes);
  fullData.setAll(ciphertextBytes.length, authTagBytes);

  // 使用 pointycastle 进行 AES-GCM 解密
  final cipher = GCMBlockCipher(AESEngine())
    ..init(false, AEADParameters(
      KeyParameter(derivedKey),
      authTagBytes.length * 8,  // MAC 位数 (128-bit)
      ivBytes,                   // IV (96-bit)
      Uint8List(0),              // associatedData (空)
    ));

  // 解密密文
  final plaintext = cipher.process(fullData);

  return String.fromCharCodes(plaintext);
}

/// 解密单个密钥值
Future<String> decryptKeyValue(String masterKey, String encrypted) async {
  return decrypt(masterKey, encrypted);
}
