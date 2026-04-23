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
  });
}
