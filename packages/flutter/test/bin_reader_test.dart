import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:kveil/bin_reader.dart';

void main() {
  group('bin_reader 测试', () {
    test('xorEncode 和 xorDecode 应该正确编码解码', () {
      const masterKey = 'TestMasterKey123';
      final encoded = xorEncode(masterKey);
      final decoded = xorDecode(encoded);
      
      expect(decoded, equals(masterKey));
    });

    test('xorEncode 应该返回 16 字节', () {
      const masterKey = 'TestMasterKey123';
      final encoded = xorEncode(masterKey);
      
      expect(encoded.length, equals(16));
    });

    test('computeChecksum 应该返回 16 字节', () {
      const masterKey = 'TestMasterKey123';
      final checksum = computeChecksum(masterKey);
      
      expect(checksum.length, equals(16));
    });

    test('verifyChecksum 应该验证正确的校验值', () {
      const masterKey = 'TestMasterKey123';
      final checksum = computeChecksum(masterKey);
      
      expect(verifyChecksum(masterKey, checksum), isTrue);
    });

    test('verifyChecksum 应该拒绝错误的校验值', () {
      const masterKey = 'TestMasterKey123';
      const wrongKey = 'WrongMasterKey456';
      final checksum = computeChecksum(masterKey);
      
      expect(verifyChecksum(wrongKey, checksum), isFalse);
    });

    test('decrypt 应该正确解密', () {
      const masterKey = 'y6AVRsjqmFCZIzOi';
      // 使用 CLI 生成的测试加密数据
      const encrypted = '/0a53hc9BxCM7Qth|StnSvICE1EC3n7IIP9hqpA==|QapJIcVyveR1X0k/QyQ=';
      
      final decrypted = decrypt(masterKey, encrypted);
      
      // 验证解密结果
      expect(decrypted, equals('test_value_123'));
    });

    test('decrypt 应该拒绝格式错误的加密数据', () {
      const masterKey = 'TestMasterKey123';
      const badEncrypted = 'invalid|format';
      
      expect(() => decrypt(masterKey, badEncrypted), throwsException);
    });

    test('deriveKey 应该返回 32 字节', () {
      const masterKey = 'TestMasterKey123';
      final key = deriveKey(masterKey);
      
      expect(key.length, equals(32));
    });

    test('parseBinFile 头部不完整应该抛出异常', () {
      final shortBuffer = Uint8List(10); // 小于 32 字节
      expect(() => parseBinFile(shortBuffer), throwsException);
    });

    test('parseBinFile 校验失败应该抛出异常', () {
      final masterKey = 'TestMasterKey123';
      final builder = BytesBuilder();
      builder.add(xorEncode(masterKey));
      builder.add(Uint8List(16)); // 错误的校验值
      expect(() => parseBinFile(builder.toBytes()), throwsException);
    });

    test('parseBinFile 密钥名不完整应该抛出异常', () {
      final masterKey = 'TestMasterKey123';
      final builder = BytesBuilder();
      builder.add(xorEncode(masterKey));
      builder.add(computeChecksum(masterKey));
      builder.addByte(0); // 名称长度高字节
      builder.addByte(10); // 名称长度低字节 (10)，但后面没有数据
      expect(() => parseBinFile(builder.toBytes()), throwsException);
    });

    test('parseBinFile 加密值长度不完整应该抛出异常', () {
      final masterKey = 'TestMasterKey123';
      final builder = BytesBuilder();
      builder.add(xorEncode(masterKey));
      builder.add(computeChecksum(masterKey));
      builder.addByte(0); 
      builder.addByte(4); // 名称长度 4
      builder.add(utf8.encode('key1')); // 名称
      builder.addByte(0); // 只添加了一个字节，加密值长度字段不完整
      expect(() => parseBinFile(builder.toBytes()), throwsException);
    });

    test('parseBinFile 加密数据不完整应该抛出异常', () {
      final masterKey = 'TestMasterKey123';
      final builder = BytesBuilder();
      builder.add(xorEncode(masterKey));
      builder.add(computeChecksum(masterKey));
      builder.addByte(0); 
      builder.addByte(4); // 名称长度 4
      builder.add(utf8.encode('key1')); // 名称
      builder.addByte(0); 
      builder.addByte(10); // 加密值长度 10，但后面没有数据
      expect(() => parseBinFile(builder.toBytes()), throwsException);
    });

    test('decryptKeyValue 应该正确解密', () async {
      const masterKey = 'y6AVRsjqmFCZIzOi';
      const encrypted = '/0a53hc9BxCM7Qth|StnSvICE1EC3n7IIP9hqpA==|QapJIcVyveR1X0k/QyQ=';
      
      final result = await decryptKeyValue(masterKey, encrypted);
      expect(result, equals('test_value_123'));
    });
  });
}
