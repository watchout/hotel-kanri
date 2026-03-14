# セキュリティガイドライン

## 🚨 本番環境でのモックデータ禁止

### 基本原則
**本番環境では一切のモック・テスト・ダミーデータを返してはならない**

### 違反例と修正例

#### ❌ 違反例：環境チェックなしのモックユーザー
```typescript
// 危険：本番環境でもモックユーザーが返される
app.post('/api/auth/verify', (req, res) => {
  const mockUser = {
    user_id: 'test_user_001',
    email: 'test@example.com'
  };
  res.json({ success: true, user: mockUser });
});
```

#### ✅ 修正例：環境チェック付き
```typescript
// 安全：本番環境ではエラーを返す
app.post('/api/auth/verify', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.ENVIRONMENT === 'production';
  
  if (isProduction) {
    return res.status(503).json({
      error: 'SERVICE_UNAVAILABLE',
      message: 'This is a development server. Use production service.'
    });
  }
  
  // 開発環境のみでモックユーザーを返す
  const mockUser = {
    user_id: 'test_user_001',
    email: 'test@example.com'
  };
  res.json({ 
    success: true, 
    user: mockUser,
    warning: 'DEVELOPMENT_MODE: Mock response'
  });
});
```

## 🛡️ 必須実装パターン

### 1. 環境判定の標準実装
```typescript
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.ENVIRONMENT === 'production';

if (isProduction) {
  // 本番環境では適切なエラーを返す
  return res.status(503).json({
    error: 'SERVICE_UNAVAILABLE',
    message: 'Development endpoint not available in production'
  });
}
```

### 2. 開発専用エンドポイントの保護
```typescript
// 開発・テスト専用エンドポイントには必ず環境チェックを追加
app.post('/api/test/*', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  next();
});
```

### 3. モックデータの明示
```typescript
// モックデータには必ず警告を含める
const mockResponse = {
  data: mockData,
  warning: 'DEVELOPMENT_MODE: This is mock data for development only',
  timestamp: new Date().toISOString()
};
```

## 📋 チェックリスト

### コード作成時
- [ ] モック・テストデータには環境チェックを実装
- [ ] 本番環境では適切なエラーレスポンスを返す
- [ ] 開発環境でも警告メッセージを含める
- [ ] ハードコードされた認証情報を使用しない

### コードレビュー時
- [ ] モックユーザー・テストデータの環境保護を確認
- [ ] 本番環境での動作を想定したレビュー
- [ ] セキュリティ観点での検証
- [ ] 環境変数の適切な使用を確認

### デプロイ前
- [ ] `npm run security-check` を実行
- [ ] 本番環境変数の設定確認
- [ ] モックデータが返されないことを確認
- [ ] エラーレスポンスに機密情報が含まれていないことを確認

## 🚫 禁止事項

### 絶対に行ってはならないこと
1. **本番環境でモック・テスト・ダミーデータを返す**
2. **環境チェックなしでテスト用エンドポイントを作成**
3. **ハードコードされたパスワード・トークンの使用**
4. **エラーメッセージでの機密情報の露出**
5. **本番データベースでのテストデータ作成**

### 危険なパターン
```typescript
// ❌ これらのパターンは禁止
const users = {
  'test_user': { password: 'password123' },
  'admin': { password: 'admin123' },
  'demo_user': { token: 'demo_token_123' }
};

// ❌ 環境チェックなしのフォールバック
if (!realUser) {
  return { user: mockUser }; // 危険！
}

// ❌ 開発用の固定トークン
const JWT_SECRET = 'development_secret_123';
```

## 🔧 自動化ツール

### 1. セキュリティチェックスクリプト
```bash
npm run security-check
```

### 2. CI/CDでの自動検証
- GitHub Actionsでの自動セキュリティチェック
- プルリクエスト時の必須検証
- デプロイ前の自動確認

### 3. 開発時の警告
- ESLintルールでの危険パターン検出
- コミット時の自動チェック
- IDE拡張での警告表示

## 📞 問題発生時の対応

### 緊急時の連絡先
- セキュリティ担当者: [要記入]
- システム管理者: [要記入]
- 開発チームリーダー: [要記入]

### インシデント対応手順
1. **即座にサービス停止**
2. **影響範囲の調査**
3. **修正版のデプロイ**
4. **事後分析と再発防止策の策定**

---

**重要**: このガイドラインは全開発者が必ず遵守すること。違反は重大なセキュリティインシデントにつながる可能性があります。

**最終更新**: 2025-09-30  
**承認者**: [要記入]
