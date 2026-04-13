# kveil

防 AI 密钥窃取工具 - 将密钥加密存储在二进制文件中，防止 AI 爬虫读取代码库时窃取敏感信息。

## 核心原理

- **bin 文件存储**：密钥加密后存储在二进制文件中，AI 爬虫通常不会读取二进制文件
- **AES-256-GCM 加密**：使用强加密算法保护密钥
- **XOR 编码主密钥**：主密钥经过 XOR 编码后存储在 bin 文件头部
- **校验值验证**：使用校验值确保 bin 文件完整性

## 项目结构

```
kveil/
├── packages/
│   ├── cli/           # Node.js CLI 工具
│   ├── flutter/       # Flutter 运行时库
│   └── web/           # Web/React 运行时库
```

## CLI 工具使用

### 安装

```bash
cd packages/cli
npm install
npm link  # 全局安装 kveil 命令
```

### 初始化项目

```bash
kveil init
```

生成：
- `.kveil/secrets.bin` - 加密的密钥存储文件
- `.kveil/config.yaml` - 密钥声明配置

### 添加密钥

```bash
kveil add mi_api_key "sk-1234567890abcdef"
```

### 查看密钥列表

```bash
kveil list
```

### 检查完整性

```bash
kveil check
```

### 获取解密的密钥（调试用）

```bash
kveil get mi_api_key
```

### 查看密钥信息

```bash
# 查看所有密钥的明文和密文
kveil show -l

# 查看指定密钥的明文
kveil show mi_api_key
```

示例输出：
```
📦 Kveil 密钥信息：

1. mi_api_key:
   密文：HPDmK6RYZg01Nc1Y|Wavsketr9KP3T031bsya1A==|xje16ULc29bI1WRJGw==
   原文：sk-123qsdawda

共 1 个密钥
```

## Flutter 集成

### 1. 添加依赖

在 `pubspec.yaml` 中：

```yaml
dependencies:
  kveil:
    path: path/to/kveil/packages/flutter
```

### 2. 配置 assets

```yaml
flutter:
  assets:
    - .kveil/secrets.bin
    - .kveil/config.yaml
```

### 3. 使用

```dart
import 'package:kveil/kveil.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化
  await Kveil.init();

  // 获取密钥
  final apiKey = Kveil.get('mi_api_key');

  runApp(MyApp());
}
```

### 4. 检查必需密钥

```dart
// 检查必需的密钥是否都存在
Kveil.checkRequiredKeys(['mi_api_key', 'stripe_key']);
```

## Web/React 集成

### 1. 安装依赖

```bash
npm install path/to/kveil/packages/web
```

### 2. 配置 bin 文件

将 `.kveil/secrets.bin` 文件拷贝到 `public/` 目录：

```bash
cp .kveil/secrets.bin public/.kveil/secrets.bin
```

### 3. 使用

```typescript
import { Kveil } from 'kveil-web';

// 初始化
await Kveil.init('/.kveil/secrets.bin');

// 获取密钥
const apiKey = Kveil.get('mi_api_key');
```

### React Hooks 示例

```typescript
import { useEffect, useState } from 'react';
import { Kveil } from 'kveil-web';

function useApiKey(name: string): string | null {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    if (Kveil.isInitialized()) {
      setKey(Kveil.get(name));
    }
  }, [name]);

  return key;
}

function MyApp() {
  const apiKey = useApiKey('mi_api_key');

  if (!apiKey) {
    return <div>加载中...</div>;
  }

  return <div>API Key: {apiKey}</div>;
}
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

### 这个工具防护的场景

✅ **AI 爬虫**：AI 训练爬虫通常只读取文本文件，不会解析二进制文件
✅ **代码审查**：人类审查时看不到明文密钥
✅ **版本控制**：bin 文件中的密钥是加密的

### 这个工具不防护的场景

❌ **专业逆向工程**：bin 文件可以被分析和逆向
❌ **运行时攻击**：攻击者可以通过 hook 运行时获取明文
❌ **黑客攻击**：这不是一个防黑客工具

### 最佳实践

1. **不要将 bin 文件提交到公共仓库** - 虽然密钥是加密的，但仍可能被分析
2. **在 CI/CD 中注入密钥** - 使用环境变量或密钥管理服务
3. **定期轮换密钥** - 减少泄露风险
4. **限制密钥权限** - 使用最小权限原则

## 开发

### 运行测试

```bash
# CLI 测试
cd packages/cli
npm test

# Web 运行时测试
node packages/web/test/web.test.js
```

### 构建 Web 库

```bash
cd packages/web
npm install
npm run build
```

## 许可证

MIT
# kveil
