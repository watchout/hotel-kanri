# 🔌 接続問題のトラブルシューティング

## **🚨 問題: 「Connection failed」エラーが連続して表示される**

### **📋 症状**
- ブラウザで接続時に「Connection failed. If the problem persists, please check your internet connection or VPN」というエラーが頻繁に表示される
- APIは正常に動作しているが、フロントエンドの接続に問題がある

### **🔍 原因**

1. **ポート競合**:
   - 標準ポート(3100)が他のプロセスと競合している可能性
   - サーバーが別のポート(3001)で起動している

2. **CORS設定の問題**:
   - フロントエンドとバックエンドのオリジンが一致していない
   - ブラウザのCORSポリシーによりリクエストがブロックされている

3. **ネットワーク設定**:
   - ローカルネットワークの設定やファイアウォールの問題
   - VPNが接続を妨げている可能性

4. **キャッシュの問題**:
   - ブラウザのキャッシュが古い状態を保持している
   - サービスワーカーが古いリソースを提供している

### **🛠️ 解決策**

#### **1. 明示的なポート指定で起動**

```bash
# ポート3100を明示的に指定して起動
npm run dev -- --host 0.0.0.0 --port 3100
```

#### **2. 使用中のポートを確認・解放**

```bash
# 使用中のポートを確認
lsof -i :3100
# または
netstat -an | grep 3100

# プロセスを終了（PIDはlsofの結果から）
kill -9 <PID>
```

#### **3. ブラウザのキャッシュをクリア**

- ブラウザの開発者ツールを開く (F12 または Cmd+Option+I)
- 「Application」タブ→「Clear storage」→「Clear site data」
- ハード更新 (Shift+F5 または Cmd+Shift+R)

#### **4. CORS設定の確認**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // ...
  nitro: {
    cors: {
      origin: ['http://localhost:3100', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }
  },
  // ...
})
```

#### **5. 環境変数の設定**

```bash
# .env ファイル
NUXT_PUBLIC_API_BASE=http://localhost:3100
```

#### **6. 接続タイムアウト設定の調整**

```typescript
// plugins/api.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const apiFetch = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    retry: 1,
    timeout: 30000, // タイムアウト時間を増やす
    onRequestError: (error) => {
      console.error('API Request Error:', error);
    }
  });

  return {
    provide: {
      api: apiFetch
    }
  };
});
```

### **🔄 サーバー再起動手順**

1. 実行中のNode.jsプロセスを終了:
   ```bash
   killall -9 node
   ```

2. キャッシュをクリア:
   ```bash
   rm -rf .nuxt
   rm -rf node_modules/.vite
   ```

3. サーバーを明示的なポート指定で再起動:
   ```bash
   npm run dev -- --host 0.0.0.0 --port 3100
   ```

### **🧪 接続テスト**

```bash
# APIサーバーの応答確認
curl -s http://localhost:3100/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"professional@example.com","password":"professional123"}'

# 別ポートの確認
curl -s http://localhost:3001 > /dev/null && echo "ポート3001は応答しています" || echo "ポート3001は応答していません"
```

## **📝 注意事項**

- ポート3100が既に使用中の場合は、別のポートを指定して起動する
- 環境変数とブラウザのキャッシュが一致していることを確認
- VPNを使用している場合は、一時的に無効化してテスト
- Docker環境の場合は、ポートマッピングが正しく設定されていることを確認

---

**作成日**: 2025年8月18日
**最終更新**: 2025年8月18日
