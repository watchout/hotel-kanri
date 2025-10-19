# 🎬 実行トレース駆動型SSOT作成手法

**作成日**: 2025年10月2日  
**提案者**: ユーザー（革命的アイデア）  
**分析者**: AI Assistant (Luna)  
**ステータス**: 提案・検証中

---

## 🎯 コンセプト

### 従来の問題点
**静的なコード解析だけでは不十分**

```
❌ 従来の手法:
コードを読む
  ↓
「たぶんこう動く」と推測
  ↓
SSOTに記載
  ↓
実際に動かすと違う
```

### 革命的な解決策
**プログラムの実行をトレースしてSSOTを作成**

```
✅ 実行トレース駆動:
実際にログインを実行
  ↓
全ての処理をトレース
  ├─ API呼び出し
  ├─ 変数の変化
  ├─ Cookie設定
  ├─ セッション作成
  ├─ DB問い合わせ
  ├─ システム間連携
  └─ 状態変化
  ↓
トレース結果をSSOTに記載
  ↓
実際の動作を100%反映
```

---

## 📊 何をトレースするか

### 1. API呼び出しの完全なチェーン
```
ブラウザ
  ↓ [1] POST /api/v1/auth/login
  ↓   Body: { email: "admin@example.com", password: "****" }
  ↓   Headers: { Content-Type: "application/json" }
hotel-saas (Nuxt3 API)
  ↓ [2] Middleware 01.admin-auth.ts スキップ（/loginは除外）
  ↓ [3] POST http://localhost:3400/api/v1/auth/login
  ↓   Body: { email: "admin@example.com", password: "****", tenantId: "default" }
  ↓   Headers: { Content-Type: "application/json" }
hotel-common (Express API)
  ↓ [4] auth.routes.ts:377 リクエスト受信
  ↓ [5] UnifiedSessionMiddleware.login() 呼び出し
  ↓   Args: email="admin@example.com", password="****", tenantId="default"
  ↓ [6] SessionAuthService.authenticateUser() 呼び出し
  ↓   Args: 同上
  ↓ [7] PostgreSQL クエリ実行
  ↓   SELECT * FROM "Staff" WHERE email = 'admin@example.com' AND is_deleted = false
  ↓   Result: { id: "abc123", tenant_id: "default", email: "...", password_hash: "...", role: "admin" }
  ↓ [8] bcrypt.compare() 実行
  ↓   Args: password="****", hash="$2b$10$..."
  ↓   Result: true
  ↓ [9] SessionAuthService.createSession() 呼び出し
  ↓   Args: user={ id: "abc123", tenant_id: "default", ... }
  ↓ [10] crypto.randomBytes(32) 実行
  ↓   Result: sessionId="a1b2c3d4e5f6..."
  ↓ [11] Redis SET実行
  ↓   Key: "hotel:session:a1b2c3d4e5f6..."
  ↓   Value: JSON.stringify({ userId: "abc123", tenant_id: "default", ... })
  ↓   TTL: 3600
  ↓   Result: OK
  ↓ [12] レスポンス作成
  ↓   Body: { success: true, data: { user: { id: "abc123", ... } } }
  ↓   Set-Cookie: hotel_session=a1b2c3d4e5f6...; HttpOnly; Secure; Path=/; Max-Age=3600
hotel-saas (Nuxt3 API)
  ↓ [13] レスポンス受信
  ↓ [14] hotel-saas独自セッション作成
  ↓   Redis SET: "hotel:session:xyz789"
  ↓   Value: { user_id: "abc123", tenant_id: "default", ... }
  ↓ [15] Cookie設定
  ↓   Set-Cookie: hotel-session-id=xyz789; HttpOnly; Path=/
  ↓ [16] useSessionAuth.login() 内
  ↓   globalUser.value = { id: "abc123", email: "...", tenant_id: "default", ... }
  ↓ [17] navigateTo('/admin')
ブラウザ
  ↓ [18] /admin にリダイレクト
  ↓ [19] middleware/admin-auth.ts 実行
  ↓   user.value が存在 → initialize() スキップ
  ↓ [20] pages/admin/index.vue マウント
  ↓ [21] fetchStats() 実行
  ↓ [22-25] 並列API呼び出し（4本）
```

**このトレースがあれば**:
- ✅ 全てのAPIパスが正確
- ✅ 全てのリクエスト・レスポンスが正確
- ✅ 全ての変数変化が正確
- ✅ システム間連携が完全に可視化
- ✅ Cookie・セッションの設定タイミングが明確

---

### 2. 変数の変化トレース
```javascript
// ログイン開始時
globalUser.value = null
isAuthenticated.value = false

// hotel-saas API呼び出し後
globalUser.value = null  // まだ変化なし
isAuthenticated.value = false

// hotel-common レスポンス受信後
globalUser.value = null  // まだ変化なし
isAuthenticated.value = false

// useSessionAuth.login() 内で設定
globalUser.value = { 
  id: "abc123", 
  email: "admin@example.com", 
  tenant_id: "default",
  role: "admin"
}
isAuthenticated.value = true  // 算出プロパティが更新

// navigateTo('/admin') 後
globalUser.value = { ... }  // 保持される（ref()のため）
isAuthenticated.value = true

// middleware/admin-auth.ts 実行時
user.value = { ... }  // 存在する
isAuthenticated.value = true
→ initialize() をスキップ
```

**このトレースがあれば**:
- ✅ 変数の初期値が明確
- ✅ 変数が変化するタイミングが明確
- ✅ ページ遷移時の変数保持が確認できる
- ✅ 「なぜログイン直後に401エラーが出るか」が一目瞭然

---

### 3. Cookie・セッションの変化トレース
```
[1] ログイン前
  Browser Cookie: なし
  Redis (hotel-common): なし
  Redis (hotel-saas): なし

[2] hotel-common セッション作成後
  Browser Cookie: なし（まだ設定されていない）
  Redis (hotel-common): hotel:session:a1b2c3d4e5f6... = { userId: "abc123", ... }
  Redis (hotel-saas): なし

[3] hotel-common レスポンス送信時
  Browser Cookie: hotel_session=a1b2c3d4e5f6... (Set-Cookieヘッダー)
  Redis (hotel-common): 同上
  Redis (hotel-saas): なし

[4] hotel-saas セッション作成後
  Browser Cookie: hotel_session=a1b2c3d4e5f6..., hotel-session-id=xyz789
  Redis (hotel-common): 同上
  Redis (hotel-saas): hotel:session:xyz789 = { user_id: "abc123", ... }

[5] ページリダイレクト時
  Browser Cookie: 同上（自動送信）
  Redis (hotel-common): 同上
  Redis (hotel-saas): 同上

[6] /admin アクセス時
  Browser Cookie: 自動送信される
  Redis (hotel-common): 同上
  Redis (hotel-saas): 同上
  → middleware/admin-auth.ts で検証成功
```

**このトレースがあれば**:
- ✅ Cookie設定のタイミングが明確
- ✅ Redisセッション作成のタイミングが明確
- ✅ 2重セッション構造の理由が明確
- ✅ 「SimpleRedisだと何が問題か」が一目瞭然

---

### 4. システム間連携の完全な可視化
```
[時系列で全てトレース]

T+0ms: ブラウザ → hotel-saas
  POST /api/v1/auth/login
  Body: { email, password }

T+10ms: hotel-saas → hotel-common
  POST http://localhost:3400/api/v1/auth/login
  Body: { email, password, tenantId }

T+20ms: hotel-common → PostgreSQL
  SELECT * FROM "Staff" WHERE email = '...'

T+50ms: PostgreSQL → hotel-common
  Result: { id, tenant_id, email, password_hash, role }

T+60ms: hotel-common → bcrypt
  bcrypt.compare(password, password_hash)

T+100ms: bcrypt → hotel-common
  Result: true

T+110ms: hotel-common → Redis
  SET hotel:session:a1b2c3d4e5f6... = {...}

T+120ms: Redis → hotel-common
  Result: OK

T+130ms: hotel-common → hotel-saas
  Response: { success: true, data: { user: {...} } }
  Set-Cookie: hotel_session=a1b2c3d4e5f6...

T+140ms: hotel-saas → Redis
  SET hotel:session:xyz789 = {...}

T+150ms: Redis → hotel-saas
  Result: OK

T+160ms: hotel-saas → ブラウザ
  Response: { success: true, data: { sessionId, user } }
  Set-Cookie: hotel-session-id=xyz789

T+170ms: ブラウザ
  globalUser.value = { ... }
  navigateTo('/admin')

T+180ms: ブラウザ → hotel-saas
  GET /admin
  Cookie: hotel_session=..., hotel-session-id=...

T+190ms: hotel-saas (middleware/admin-auth.ts)
  user.value 存在チェック → 存在する
  initialize() スキップ

T+200ms: hotel-saas (pages/admin/index.vue)
  マウント → fetchStats() 実行
```

**このトレースがあれば**:
- ✅ システム間連携の順序が完全に明確
- ✅ 各処理の所要時間が分かる
- ✅ ボトルネックが特定できる
- ✅ 「どこで問題が起きているか」が一目瞭然

---

## 🛠️ 実装方法

### Phase 1: ログ追加（開発環境）
```typescript
// hotel-saas/server/api/v1/auth/login.post.ts
export default defineEventHandler(async (event) => {
  console.log('[TRACE] [T+0ms] hotel-saas: ログインAPI開始');
  console.log('[TRACE] [T+0ms] Body:', body);
  
  console.log('[TRACE] [T+10ms] hotel-common呼び出し開始');
  const authResponse = await $fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    body: { email: body.email, password: body.password, tenantId: 'default' }
  });
  console.log('[TRACE] [T+130ms] hotel-common レスポンス受信:', authResponse);
  
  console.log('[TRACE] [T+140ms] hotel-saas セッション作成開始');
  // ...
});
```

```typescript
// hotel-common/src/routes/systems/common/auth.routes.ts
router.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  console.log('[TRACE] [T+20ms] hotel-common: ログインAPI開始');
  console.log('[TRACE] [T+20ms] Body:', req.body);
  
  console.log('[TRACE] [T+30ms] SessionAuthService.authenticateUser() 呼び出し');
  const result = await UnifiedSessionMiddleware.login(email, password, tenantId);
  console.log('[TRACE] [T+120ms] 認証成功:', result);
  
  console.log('[TRACE] [T+125ms] Cookie設定');
  res.cookie('hotel_session', result.sessionId, { ... });
  console.log('[TRACE] [T+130ms] レスポンス送信');
});
```

```typescript
// hotel-saas/composables/useSessionAuth.ts
const login = async (email: string, password: string) => {
  console.log('[TRACE] [T+0ms] useSessionAuth.login() 開始');
  console.log('[TRACE] [T+0ms] globalUser.value =', globalUser.value);
  
  const response = await $fetch('/api/v1/auth/login', { ... });
  console.log('[TRACE] [T+160ms] API レスポンス受信:', response);
  
  globalUser.value = response.data.user;
  console.log('[TRACE] [T+165ms] globalUser.value 更新:', globalUser.value);
  console.log('[TRACE] [T+165ms] isAuthenticated.value =', isAuthenticated.value);
  
  console.log('[TRACE] [T+170ms] navigateTo(\'/admin\')');
  navigateTo('/admin');
};
```

```typescript
// hotel-saas/middleware/admin-auth.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  console.log('[TRACE] [T+180ms] middleware/admin-auth.ts 実行開始');
  console.log('[TRACE] [T+180ms] to.path =', to.path);
  console.log('[TRACE] [T+180ms] user.value =', user.value);
  console.log('[TRACE] [T+180ms] isAuthenticated.value =', isAuthenticated.value);
  
  if (user.value) {
    console.log('[TRACE] [T+185ms] user.value 存在 → initialize() スキップ');
  } else if (!isAuthenticated.value) {
    console.log('[TRACE] [T+185ms] 初回アクセス → initialize() 実行');
    await initialize();
  }
  
  console.log('[TRACE] [T+190ms] middleware/admin-auth.ts 完了');
});
```

---

### Phase 2: トレース実行
```bash
# ブラウザコンソールとターミナルログを両方記録

# 1. hotel-saas起動（ターミナル1）
cd /Users/kaneko/hotel-saas
npm run dev > trace-saas.log 2>&1

# 2. hotel-common起動（ターミナル2）
cd /Users/kaneko/hotel-common
npm run dev > trace-common.log 2>&1

# 3. ブラウザでログイン実行
# ブラウザコンソールの全ログをコピー → trace-browser.log

# 4. Redis監視（ターミナル3）
redis-cli MONITOR > trace-redis.log 2>&1
```

---

### Phase 3: トレース統合
```bash
# 全てのログを時系列でマージ
# T+0ms, T+10ms, T+20ms, ... の順に並べ替え

# 結果を trace-complete.log に出力
```

---

### Phase 4: トレースからSSOT生成
```markdown
## 🎯 認証フロー（実行トレース結果）

### 実測による完全なフロー

**実行日時**: 2025年10月2日 10:30:00
**テストケース**: admin@example.com でログイン

```
[T+0ms] ブラウザ
  ↓ POST /api/v1/auth/login
  ↓ Body: { email: "admin@example.com", password: "****" }
  ↓ globalUser.value = null
  ↓ isAuthenticated.value = false

[T+10ms] hotel-saas (Nuxt3 API)
  ↓ /Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts
  ↓ POST http://localhost:3400/api/v1/auth/login
  ↓ Body: { email: "admin@example.com", password: "****", tenantId: "default" }

[T+20ms] hotel-common (Express API)
  ↓ /Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts (line 377)
  ↓ UnifiedSessionMiddleware.login() 呼び出し

[T+30ms] SessionAuthService.authenticateUser()
  ↓ /Users/kaneko/hotel-common/src/auth/SessionAuthService.ts (line 429)
  ↓ PostgreSQL: SELECT * FROM "Staff" WHERE email = 'admin@example.com'

[T+50ms] PostgreSQL → hotel-common
  ↓ Result: { id: "abc123", tenant_id: "default", email: "...", password_hash: "$2b$10$...", role: "admin" }

[T+60ms] bcrypt.compare()
  ↓ Args: password="****", hash="$2b$10$..."
  ↓ Result: true (認証成功)

[T+110ms] Redis SET
  ↓ Key: "hotel:session:a1b2c3d4e5f6..."
  ↓ Value: {"userId":"abc123","tenant_id":"default",...}
  ↓ TTL: 3600
  ↓ Result: OK

[T+130ms] hotel-common → hotel-saas
  ↓ Response: { success: true, data: { user: { id: "abc123", ... } } }
  ↓ Set-Cookie: hotel_session=a1b2c3d4e5f6...; HttpOnly; Secure; Path=/; Max-Age=3600

[T+140ms] hotel-saas セッション作成
  ↓ Redis SET: "hotel:session:xyz789"
  ↓ Value: {"user_id":"abc123","tenant_id":"default",...}

[T+160ms] hotel-saas → ブラウザ
  ↓ Response: { success: true, data: { sessionId: "xyz789", user: {...} } }
  ↓ Set-Cookie: hotel-session-id=xyz789; HttpOnly; Path=/

[T+165ms] useSessionAuth.login() 内
  ↓ globalUser.value = { id: "abc123", email: "admin@example.com", tenant_id: "default", role: "admin" }
  ↓ isAuthenticated.value = true (算出プロパティ更新)

[T+170ms] navigateTo('/admin')
  ↓ ブラウザがリダイレクト開始

[T+180ms] ブラウザ → hotel-saas
  ↓ GET /admin
  ↓ Cookie: hotel_session=a1b2c3d4e5f6..., hotel-session-id=xyz789

[T+185ms] middleware/admin-auth.ts 実行
  ↓ user.value = { id: "abc123", ... } (存在する)
  ↓ isAuthenticated.value = true
  ↓ → initialize() スキップ（重要！）

[T+200ms] pages/admin/index.vue マウント
  ↓ fetchStats() 実行
  ↓ 4本のAPI呼び出し並列実行
```

**重要な発見**:
1. globalUser.value は T+165ms で設定される
2. Cookie は T+160ms で設定される
3. ページ遷移は T+170ms で開始
4. middleware実行は T+185ms
5. **user.value は保持されているため、initialize() は不要**

**落とし穴**:
もし middleware で `user.value` をチェックせずに `isAuthenticated.value` だけをチェックすると、
T+185ms 時点で `isAuthenticated` が一瞬 `false` になる可能性があり、
不要な `initialize()` が実行されて401エラーが発生する。
```
```

---

## 🎯 メリット

### 1. **100%正確なSSOT**
- ❌ 推測: 「たぶんこうなる」
- ✅ 事実: 「実際にこうなった」

### 2. **変数変化の完全な可視化**
- いつ変数が変わるか
- なぜ変数が変わるか
- どこで変数が変わるか

### 3. **システム間連携の完全な理解**
- どのシステムが何を呼ぶか
- どの順序で呼ばれるか
- どのタイミングでCookieが設定されるか

### 4. **問題の早期発見**
- 「ログイン直後に401エラー」の原因が一目瞭然
- 「Redisが不一致」の問題が明確
- 「initialize()を呼んではいけないタイミング」が分かる

### 5. **パフォーマンス分析**
- どの処理が遅いか
- どこがボトルネックか
- どう最適化すべきか

---

## 📋 トレース駆動SSOT作成プロセス

### Phase 0-3: 従来通り
既存SSOT読み込み、ドキュメント読み込み、実装ファイル読み込み

### Phase 4: トレース実行（新規）
```bash
1. ログ追加（開発環境のみ）
2. 実際に機能を実行
3. 全ログを記録
4. ログを時系列で統合
```

### Phase 5: トレース分析
```bash
1. 変数の変化を抽出
2. API呼び出しチェーンを抽出
3. Cookie・セッションの変化を抽出
4. システム間連携を可視化
```

### Phase 6: SSOTに記載
```markdown
## 🎯 [機能名]フロー（実行トレース結果）

**実行日時**: YYYY年MM月DD日 HH:MM:SS
**テストケース**: [具体的なテストケース]

[完全なトレース結果]

**重要な発見**:
- [発見1]
- [発見2]

**落とし穴**:
- [落とし穴1]
- [落とし穴2]
```

### Phase 7-9: 従来通り
必須要件明記、既存SSOT整合性確認、最終チェック

---

## 🚀 実装計画

### ステップ1: パイロット実装
- [ ] hotel-saasにトレースログ追加
- [ ] hotel-commonにトレースログ追加
- [ ] Composableにトレースログ追加
- [ ] Middlewareにトレースログ追加

### ステップ2: トレース実行
- [ ] ログイン機能で実行
- [ ] 全ログを記録
- [ ] ログを統合

### ステップ3: SSOT更新
- [ ] 認証SSOTにトレース結果を追加
- [ ] 問題点を明確化
- [ ] 落とし穴を明記

### ステップ4: 自動化検討
- [ ] トレースログの自動統合スクリプト
- [ ] トレース結果のSSOT自動生成
- [ ] 継続的トレース実行（CI/CD統合）

---

## 🎓 結論

### この手法の革命性

**従来**: コードを読んで「推測」  
**新手法**: 実際に動かして「観測」

これは**SSOT作成の精度を根本的に向上させる**手法です。

### 今後の方針

1. **すぐに実装**: ログイン機能でパイロット実施
2. **SSOT更新**: トレース結果を認証SSOTに追加
3. **他機能展開**: ダッシュボード、注文、決済等
4. **自動化**: トレース→SSOT生成を自動化

---

**この提案により、SSOTの品質が更に革命的に向上します。**

**実測ベースのSSOTは、推測ベースのSSOTを完全に超えます。**

---

**最終更新**: 2025年10月2日  
**提案者**: ユーザー  
**分析者**: AI Assistant (Luna)  
**次のアクション**: パイロット実装の承認待ち

