# kveil-web

Kveil Web/React 运行时库 - 防 AI 密钥窃取工具

## 安装

```bash
npm install kveil-web
```

## 使用

### 1. 配置 bin 文件

将 `.kveil/secrets.bin` 文件拷贝到项目的 `public/` 目录：

```bash
cp .kveil/secrets.bin public/.kveil/secrets.bin
```

### 2. 初始化

```typescript
import { Kveil } from 'kveil-web';

await Kveil.init('/.kveil/secrets.bin');
```

### 3. 获取密钥

```typescript
const apiKey = Kveil.get('mi_api_key');
```

### 4. 检查必需密钥

```typescript
Kveil.checkRequiredKeys(['mi_api_key', 'stripe_key']);
```

## React Hooks 示例

```tsx
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

## API

### `Kveil.init(binUrl?: string)`

初始化 Kveil，加载并解密 bin 文件中的密钥。

- `binUrl` - bin 文件的 URL，默认为 `/.kveil/secrets.bin`

### `Kveil.get(key: string): string`

获取指定密钥的明文值。

### `Kveil.getKeys(): string[]`

获取所有已配置的密钥名列表。

### `Kveil.checkRequiredKeys(keys: string[]): void`

检查必需的密钥是否都存在，缺失则抛出异常。

### `Kveil.isInitialized(): boolean`

检查 Kveil 是否已初始化。

## CLI 工具

使用前需要先运行 CLI 工具初始化并添加密钥：

```bash
# 安装 CLI
npm install -g kveil

# 初始化
kveil init

# 添加密钥
kveil add mi_api_key "sk-1234567890abcdef"
```

## 完整文档

https://github.com/yourusername/kveil

## 许可证

MIT
