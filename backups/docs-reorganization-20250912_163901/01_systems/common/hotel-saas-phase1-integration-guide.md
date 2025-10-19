# hotel-saas Phase 1統合ガイド
## 最小限統合：JWT認証のみ（MVP開発速度優先）

**対象**: hotel-saasチーム  
**実装期間**: 2-3日  
**MVP開発への影響**: 5%以下  

---

## 🎯 **Phase 1の目標**

- ✅ **JWT認証のみ統合**: 統一認証基盤の使用開始
- ✅ **SQLite維持**: 既存データベースはそのまま使用
- ✅ **独自API維持**: 既存API仕様は変更なし
- ✅ **MVP開発継続**: 開発速度を最優先

---

## 📋 **実装手順**

### **Step 1: hotel-commonライブラリのインストール**

```bash
# hotel-saasプロジェクトルートで実行
npm install @hotel-common/core@latest
# または
yarn add @hotel-common/core@latest
```

### **Step 2: 認証ライブラリのインポート**

```javascript
// hotel-saas/src/auth/jwt-integration.js
import { HotelSaasAuth } from '@hotel-common/integrations/hotel-saas'
```

### **Step 3: 既存ログイン処理の拡張**

#### **Before（現在の実装）:**
```javascript
// hotel-saas/src/routes/auth.js
app.post('/login', async (req, res) => {
  const { email, password } = req.body
  
  // 既存のSQLite認証処理
  const user = await authenticateUser(email, password)
  
  if (user) {
    res.json({ success: true, user })
  } else {
    res.status(401).json({ error: 'Invalid credentials' })
  }
})
```

#### **After（統合後）:**
```javascript
// hotel-saas/src/routes/auth.js
import { HotelSaasAuth } from '@hotel-common/integrations/hotel-saas'

app.post('/login', async (req, res) => {
  const result = await HotelSaasAuth.loginWithJWT(
    req.body,
    // 既存の認証ロジックをそのまま渡す
    async (credentials) => {
      const user = await authenticateUser(credentials.email, credentials.password)
      return user ? { success: true, user } : { success: false, error: 'Invalid credentials' }
    }
  )
  
  if (result.success) {
    res.json({
      success: true,
      tokens: result.tokens, // 🆕 統一JWT
      user: result.user
    })
  } else {
    res.status(401).json({ error: result.error })
  }
})
```

### **Step 4: 保護されたルートでの認証ミドルウェア**

```javascript
// hotel-saas/src/middleware/auth.js
import { HotelSaasAuth } from '@hotel-common/integrations/hotel-saas'

// 🆕 統一JWT認証ミドルウェア
export const authenticateJWT = HotelSaasAuth.expressMiddleware()

// 既存のルートに適用
app.use('/api/protected', authenticateJWT)
app.use('/api/orders', authenticateJWT)
app.use('/api/dashboard', authenticateJWT)
```

### **Step 5: フロントエンド側の対応**

```javascript
// hotel-saas/frontend/src/auth/api.js
const loginResponse = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})

const data = await loginResponse.json()

if (data.success) {
  // 🆕 JWTトークンを保存
  localStorage.setItem('accessToken', data.tokens.accessToken)
  localStorage.setItem('refreshToken', data.tokens.refreshToken)
}

// API呼び出し時
const token = localStorage.getItem('accessToken')
const response = await fetch('/api/protected/data', {
  headers: {
    'Authorization': `Bearer ${token}` // 🆕 統一Bearer認証
  }
})
```

---

## 🔧 **環境変数設定**

```bash
# hotel-saas/.env
JWT_SECRET=your-production-jwt-secret-here
JWT_REFRESH_SECRET=your-production-refresh-secret-here
REDIS_URL=redis://localhost:6379  # 将来のセッション管理用
```

---

## ✅ **実装確認チェックリスト**

- [ ] hotel-commonライブラリインストール完了
- [ ] 既存ログイン処理にJWT生成追加
- [ ] 保護されたルートに認証ミドルウェア適用
- [ ] フロントエンドでJWTトークン処理実装
- [ ] 環境変数設定完了
- [ ] ログイン・認証フローのテスト完了

---

## 🚨 **注意点・制約事項**

### **Phase 1で変更しない項目**
- ❌ **データベース**: SQLiteのまま（変更禁止）
- ❌ **API仕様**: 既存エンドポイントの変更禁止
- ❌ **UI**: 認証画面の大幅変更禁止

### **Phase 1でのみ変更する項目**
- ✅ **JWT生成**: ログイン時にトークン追加
- ✅ **認証ミドルウェア**: Bearer認証の追加
- ✅ **フロントエンド**: Token handling追加

---

## 🔄 **段階的移行計画**

### **Phase 1（現在）: 認証統合**
```
期間: 2-3日
影響: 5%以下
内容: JWT認証のみ統合
```

### **Phase 2（Week 3-8）: 新機能で統一API**
```
期間: MVP開発期間中
影響: 新機能のみ
内容: 新機能開発時に統一APIクライアント使用
```

### **Phase 3（MVP完成後）: 完全統合**
```
期間: 2-3週間
影響: 大幅効率向上
内容: データベース統合、API統一
```

---

## 📞 **サポート・問い合わせ**

**技術的質問**:
- hotel-commonチームに Slack で相談
- 実装中の問題は即座に共有

**緊急時対応**:
- 問題発生時は既存実装にロールバック可能
- Phase 1は破壊的変更なしの安全設計

---

## 🎯 **成功指標**

- ✅ **開発速度**: MVP開発への影響5%以下
- ✅ **JWT統合**: 統一認証トークンの生成・検証
- ✅ **互換性**: 既存機能の完全動作
- ✅ **準備完了**: Phase 2への準備完了

---

**実装開始**: 今週中  
**完了目標**: 3日以内  
**次のステップ**: Phase 2（新機能での統一API使用） 