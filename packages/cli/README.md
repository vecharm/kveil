# kveil

防 AI 密钥窃取工具 - 将密钥加密存储在二进制文件中，防止 AI 爬虫读取代码库时窃取敏感信息。

## 核心原理

- **bin 文件存储**：密钥加密后存储在二进制文件中，AI 爬虫通常不会读取二进制文件
- **AES-256-GCM 加密**：使用强加密算法保护密钥
- **XOR 编码主密钥**：主密钥经过 XOR 编码后存储在 bin 文件头部

## 快速开始

### 1. 初始化项目

```bash
kveil init
```

生成：
- `.kveil/secrets.bin` - 加密的密钥存储文件
- `.kveil/config.yaml` - 密钥声明配置

### 2. 添加密钥

```bash
kveil add mi_api_key "sk-1234567890abcdef"
```

### 3. 查看密钥

```bash
# 查看所有密钥的明文和密文
kveil show -l

# 查看指定密钥的明文
kveil show mi_api_key
```

### 4. 检查完整性

```bash
kveil check
kveil list
```

## 密钥管理

### 删除密钥

```bash
kveil remove mi_api_key
```

从 `secrets.bin` 和 `config.yaml` 中删除指定密钥。

### 重置单个密钥值

```bash
kveil reset mi_api_key "new-sk-0987654321fedcba"
```

更新指定密钥的值（使用相同的主密钥重新加密）。

### 更换主密钥

```bash
# 自动生成新主密钥
kveil rekey

# 指定新主密钥（必须 16 位）
kveil rekey --key "ABCDEFGHIJ123456"
```

**使用场景：**
- 主密钥可能泄露时
- 定期轮换密钥以提高安全性
- 团队成员变更后的安全加固

**注意事项：**
- 旧主密钥将失效
- 所有使用旧主密钥的运行时库需要同步更新
- 新主密钥需要安全分发给团队成员

## 运行时库集成

### Flutter

**pubspec.yaml**
```yaml
dependencies:
  kveil:
    path: path/to/kveil/packages/flutter
```

**代码使用**
```dart
import 'package:kveil/kveil.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Kveil.init();
  final apiKey = Kveil.get('mi_api_key');
  runApp(MyApp());
}
```

### Web/React

**安装**
```bash
npm install kveil-web
```

**配置** - 复制 bin 文件到 public 目录：
```bash
cp .kveil/secrets.bin public/.kveil/secrets.bin
```

**代码使用**
```typescript
import { Kveil } from 'kveil-web';

await Kveil.init('/.kveil/secrets.bin');
const apiKey = Kveil.get('mi_api_key');
```

## bin 文件格式

```
┌─────────────────────────────────┐
│ 头部 (32 字节)                   │
│ [0-15]  16 位主密钥 (XOR 编码)    │
│ [16-31] 校验值 (MD5 前 16 字节)   │
├─────────────────────────────────┤
│ 密钥条目 (变长，可重复)           │
│ [2 字节] 密钥名长度 (N)          │
│ [N 字节] 密钥名 (UTF-8)         │
│ [2 字节] 加密值长度 (M)          │
│ [M 字节] 加密值 (base64)        │
└─────────────────────────────────┘
```

## 安全说明

### 防护的场景
✅ AI 爬虫（不解析二进制文件）
✅ 代码审查（看不到明文密钥）

### 不防护的场景
❌ 专业逆向工程
❌ 运行时攻击
❌ 黑客攻击

## 完整文档

https://github.com/yourusername/kveil

## 许可证

MIT
