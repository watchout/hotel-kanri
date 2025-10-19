# 🔧 Phase 0 修正指示書 - hotel-common（完全版）

**対象システム**: hotel-common  
**担当AI**: Iza  
**期間**: 0.5日（4時間）  
**優先度**: 🟢 低（確認のみ）  
**作成日**: 2025年10月7日  
**バージョン**: 2.0.0（AI実行可能版）

---

## 📖 この指示書を受け取ったAIへ

### あなたがすべきこと

1. **この指示書を最初から最後まで読む**
   - 読み終わったら「指示書読了」と報告
   - 不明点があれば質問

2. **事前準備（Step 0-1〜0-3）を実行**
   - 必須ドキュメントを読む
   - 作業ディレクトリを確認
   - 進捗報告ファイルを作成

3. **Part 1から順番に実行**
   - 各タスクを順番に実行
   - 各タスク完了後、進捗報告ファイルに報告
   - 推測で修正せず、指示書通りに実行

4. **エラーが発生したら報告**
   - エラー内容を進捗報告ファイルに記録
   - ユーザーに報告

### 絶対に守ること

- ❌ 指示書を読まずに作業開始しない
- ❌ 推測で修正しない
- ❌ タスクをスキップしない
- ❌ 報告を省略しない
- ✅ 指示書の手順通りに実行
- ✅ 各タスク完了後に報告
- ✅ 不明点は質問

### 報告先

**進捗報告**: `/Users/kaneko/hotel-kanri/docs/03_ssot/phase0_progress_common.md`  
**質問・エラー報告**: ユーザーとのチャット

---

## 🎯 このタスクのゴール

### 最終目標
- Redis実装の確認（✅ 既に正しい）
- Session認証の確認（✅ 既に正しい）
- 環境分岐コードの確認・修正（一部修正必要の可能性）

### 成功の定義
1. Redis実装が正しいことを確認
2. Session認証が正しいことを確認
3. 環境分岐コードがあれば修正
4. hotel-commonが正常に起動・動作

---

## 📚 事前準備（必須）

### Step 0-1: 必須ドキュメントの読み込み

以下のドキュメントを**必ず読んでから**作業を開始してください：

```
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/IMPLEMENTATION_STATUS_ANALYSIS.md
read_file /Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md
```

### Step 0-2: 作業ディレクトリの確認

```bash
cd /Users/kaneko/hotel-common && pwd
```

**期待される出力**: `/Users/kaneko/hotel-common`

### Step 0-3: 進捗報告ファイルの作成

以下のファイルを作成してください：

```
write /Users/kaneko/hotel-kanri/docs/03_ssot/phase0_progress_common.md
```

**内容**:
```markdown
# Phase 0 進捗報告 - hotel-common

**担当AI**: Iza  
**開始日**: 2025年10月7日

## 進捗サマリー
- Redis実装確認: 未実施
- Session認証確認: 未実施
- 環境分岐コード確認: 未実施
- 動作確認: 未実施

## 確認結果
（作業開始後に記入）
```

---

## 🔧 Phase 0: 確認作業（4時間）

---

### 📋 Part 1: Redis実装の確認（30分）

---

#### Task 1-1: SessionAuthService.tsの読み込み（10分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-common/src/services/SessionAuthService.ts
```

**確認すること**:
- [ ] `RealRedis`クラスが実装されているか
- [ ] `SimpleRedis`が削除されているか
- [ ] Redis接続URLが`process.env.REDIS_URL`から取得されているか
- [ ] Redis接続エラーハンドリングがあるか

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 1-1: SessionAuthService.ts確認完了
- RealRedis実装: [あり/なし]
- SimpleRedis削除: [確認/残存]
- Redis接続URL: [環境変数から取得/ハードコード]
- エラーハンドリング: [あり/なし]
```

---

#### Task 1-2: Redis接続確認（10分）

**実行するコマンド**:
```bash
redis-cli ping
```

**期待される出力**: `PONG`

**もし接続できない場合**:
1. Redisが起動しているか確認
```bash
ps aux | grep redis
```

2. Redisを起動
```bash
redis-server
```

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 1-2: Redis接続確認完了
- Redis起動状態: [起動中/停止中]
- 接続確認: [成功/失敗]
```

---

#### Task 1-3: Redis実装の最終確認（10分）

**実行するコマンド**:
```
grep -rn "SimpleRedis" /Users/kaneko/hotel-common/src/
```

**期待される結果**: 何も表示されない（SimpleRedisが完全に削除されている）

**もし何か表示された場合**:
1. 表示されたファイルを確認
2. phase0_progress_common.mdに記録
3. Izaに報告（自分自身への確認）

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 1-3: Redis実装最終確認完了
- SimpleRedis検索結果: [0件/X件]
- 結論: [✅ 正しい実装/❌ 修正必要]
```

---

### 📋 Part 2: Session認証の確認（30分）

---

#### Task 2-1: セッション作成機能の確認（10分）

**実行するコマンド**:
```
grep -A 30 "async createSession" /Users/kaneko/hotel-common/src/services/SessionAuthService.ts
```

**確認すること**:
- [ ] セッションIDが生成されているか
- [ ] セッションデータがRedisに保存されているか
- [ ] Redis Key形式が`hotel:session:{sessionId}`か
- [ ] TTLが3600秒（1時間）か

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 2-1: セッション作成機能確認完了
- セッションID生成: [あり/なし]
- Redis保存: [あり/なし]
- Redis Key形式: [正しい/間違い]
- TTL設定: [3600秒/その他]
```

---

#### Task 2-2: セッション検証機能の確認（10分）

**実行するコマンド**:
```
grep -A 30 "async validateSession" /Users/kaneko/hotel-common/src/services/SessionAuthService.ts
```

**確認すること**:
- [ ] セッションIDからRedisデータを取得しているか
- [ ] セッションが存在しない場合にnullを返すか
- [ ] セッション更新（TTL延長）が実装されているか

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 2-2: セッション検証機能確認完了
- Redis取得: [あり/なし]
- null返却: [あり/なし]
- TTL延長: [あり/なし]
```

---

#### Task 2-3: セッション削除機能の確認（10分）

**実行するコマンド**:
```
grep -A 10 "async destroySession" /Users/kaneko/hotel-common/src/services/SessionAuthService.ts
```

**確認すること**:
- [ ] セッション削除機能が実装されているか
- [ ] Redisからセッションを削除しているか

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 2-3: セッション削除機能確認完了
- 削除機能: [あり/なし]
- Redis削除: [あり/なし]
```

---

### 📋 Part 3: データベーススキーマの確認（30分）

---

#### Task 3-1: Orderテーブルの確認（10分）

**実行するコマンド**:
```
grep -A 20 "model Order" /Users/kaneko/hotel-common/prisma/schema.prisma
```

**確認すること**:
- [ ] `sessionId`フィールドがあるか
- [ ] `checkin_sessions`とのリレーションがあるか
- [ ] `sessionId`にインデックスがあるか

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 3-1: Orderテーブル確認完了
- sessionIdフィールド: [あり/なし]
- checkin_sessionsリレーション: [あり/なし]
- sessionIdインデックス: [あり/なし]
```

---

#### Task 3-2: checkin_sessionsテーブルの確認（10分）

**実行するコマンド**:
```
grep -A 20 "model checkin_sessions" /Users/kaneko/hotel-common/prisma/schema.prisma
```

**確認すること**:
- [ ] `checkin_sessions`テーブルが存在するか
- [ ] `tenantId`, `roomId`, `status`フィールドがあるか
- [ ] 適切なインデックスがあるか

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 3-2: checkin_sessionsテーブル確認完了
- テーブル存在: [あり/なし]
- 必須フィールド: [全てあり/一部不足]
- インデックス: [あり/なし]
```

---

#### Task 3-3: staff_tenant_membershipsテーブルの確認（10分）

**実行するコマンド**:
```
grep -A 20 "model staff_tenant_memberships" /Users/kaneko/hotel-common/prisma/schema.prisma
```

**確認すること**:
- [ ] `staff_tenant_memberships`テーブルが存在するか
- [ ] マルチテナント対応フィールドがあるか
- [ ] `is_primary`フィールドがあるか

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 3-3: staff_tenant_membershipsテーブル確認完了
- テーブル存在: [あり/なし]
- マルチテナント対応: [あり/なし]
- is_primaryフィールド: [あり/なし]
```

---

### 📋 Part 4: 環境分岐コードの確認・修正（1時間）

---

#### Task 4-1: 環境分岐コードの検索（15分）

**実行するコマンド**:
```bash
cd /Users/kaneko/hotel-common && grep -rn "NODE_ENV.*development" src/
```

**期待される結果**: 
- 環境分岐コードが少ない、または存在しない
- もし存在する場合は、ファイルパスと行番号を記録

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 4-1: 環境分岐コード検索完了
- 検索結果: [0件/X件]
- 該当ファイル: [あれば記載]
```

---

#### Task 4-2: 環境分岐コードの分析（15分）

**もし環境分岐コードが見つかった場合**:

1. **各ファイルを読み込み**
```
read_file [該当ファイルパス]
```

2. **環境分岐の内容を確認**
   - 開発環境専用の処理があるか
   - 本番環境と異なるロジックがあるか
   - フォールバック実装があるか

3. **修正が必要か判断**
   - 環境変数で接続先のみ変更: 修正不要
   - ロジックが環境で異なる: 修正必要

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 4-2: 環境分岐コード分析完了
- 該当ファイル数: [X]件
- 修正必要: [あり/なし]
- 修正内容: [あれば記載]
```

---

#### Task 4-3: 環境分岐コードの修正（30分）

**もし修正が必要な場合**:

**修正パターン**:

**❌ 削除する部分**:
```typescript
if (process.env.NODE_ENV === 'development') {
  // 開発環境専用の処理
  return mockData
}
```

**✅ 修正後**:
```typescript
// 環境変数で接続先のみ変更、ロジックは同一
const databaseUrl = process.env.DATABASE_URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
```

**実行する修正**:
1. ファイル読み込み
2. 環境分岐コードの特定
3. search_replaceツールで修正
4. 動作確認

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 4-3: 環境分岐コード修正完了
- 修正ファイル数: [X]件
- 修正内容: [詳細]
- 動作確認: [成功/失敗]
```

---

### 📋 Part 5: 動作確認（1時間）

---

#### Task 5-1: サーバー起動確認（15分）

**実行するコマンド**:
```bash
cd /Users/kaneko/hotel-common && pnpm run dev
```

**確認すること**:
- [ ] サーバーが起動するか
- [ ] エラーログが出ないか
- [ ] `Server running on port 3400`が表示されるか
- [ ] Redis接続成功ログが表示されるか

**エラーが発生した場合**:
1. エラーメッセージをコピー
2. phase0_progress_common.mdに記録
3. 修正方法を検討
4. 必要に応じてユーザーに報告

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 5-1: サーバー起動確認完了
- サーバー起動: [成功/失敗]
- Redis接続: [成功/失敗]
- エラー: [あれば記載]
```

---

#### Task 5-2: Redis接続確認（15分）

**実行するコマンド**:
```bash
redis-cli KEYS "hotel:*"
```

**確認すること**:
- [ ] Redisに接続できるか
- [ ] hotel-commonが同じRedisを使用しているか

**テスト用セッション作成**:
```bash
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

**セッション確認**:
```bash
redis-cli KEYS "hotel:session:*"
```

**期待される結果**: `hotel:session:{sessionId}`が表示される

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 5-2: Redis接続確認完了
- Redis接続: [成功/失敗]
- セッション作成: [成功/失敗]
- セッションKey: [表示された/表示されない]
```

---

#### Task 5-3: hotel-saasからのAPI呼び出し確認（15分）

**前提条件**: hotel-saasが起動していること

**実行手順**:

1. **hotel-saasでログイン**
```
http://localhost:3100/admin/login
```

2. **hotel-commonログ確認**
   - hotel-commonのログに`[hotel-common] ログインリクエスト受信`が表示されるか確認

3. **hotel-saasでメニュー取得**
```
http://localhost:3100/admin/menu
```

4. **hotel-commonログ確認**
   - hotel-commonのログに`[hotel-common] メニュー取得リクエスト受信`が表示されるか確認

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 5-3: hotel-saasからのAPI呼び出し確認完了
- ログインAPI: [成功/失敗]
- メニュー取得API: [成功/失敗]
- hotel-saas連携: [成功/失敗]
```

---

#### Task 5-4: 最終確認（15分）

**最終チェックリスト**:
- [ ] Redis実装確認完了
- [ ] Session認証確認完了
- [ ] データベーススキーマ確認完了
- [ ] 環境分岐コード確認完了
- [ ] サーバー起動成功
- [ ] Redis接続成功
- [ ] hotel-saas連携成功

**報告すること**（phase0_progress_common.mdに追記）:
```markdown
### Task 5-4: 最終確認完了
- Redis実装: ✅ 正しい
- Session認証: ✅ 正しい
- データベーススキーマ: ✅ 正しい
- 環境分岐コード: [✅ 問題なし/✅ 修正完了]
- 動作確認: ✅ 成功
```

---

## 🎉 Phase 0 完了報告

**最終報告**（phase0_progress_common.mdに追記）:
```markdown
---

## 🎉 Phase 0 完了報告

### 確認サマリー
- Redis実装: ✅ 正しい（RealRedis使用、SimpleRedis削除済み）
- Session認証: ✅ 正しい（作成・検証・削除機能完備）
- データベーススキーマ: ✅ 正しい（sessionId対応済み）
- 環境分岐コード: [✅ 問題なし/✅ 修正完了]
- 動作確認: ✅ 成功

### 所要時間
- Part 1: Redis実装確認（30分）
- Part 2: Session認証確認（30分）
- Part 3: データベーススキーマ確認（30分）
- Part 4: 環境分岐コード確認・修正（1時間）
- Part 5: 動作確認（1時間）
- 合計: 4時間

### 発見した問題
[あれば記載]

### 修正した内容
[あれば記載]

### Phase 0 完了確認
- [x] Redis実装確認完了
- [x] Session認証確認完了
- [x] データベーススキーマ確認完了
- [x] 環境分岐コード確認完了
- [x] 動作確認完了

### 結論
**hotel-commonは既に正しく実装されている**

- ✅ Redis実装: 正しい
- ✅ Session認証: 正しい
- ✅ データベーススキーマ: 正しい
- ✅ マルチテナント対応: 正しい
- ✅ チェックインセッション対応: 正しい

**Phase 0での修正は不要（または軽微な確認のみ）**

### 次のステップ
Phase 1の準備開始
```

---

## 🚨 エラー発生時の対処フロー

### エラーが発生した場合の絶対ルール

1. **即座に作業を停止**
2. **エラー内容を記録**
3. **修正方法を検討**
4. **必要に応じてユーザーに報告**

### エラー報告フォーマット

phase0_progress_common.mdに以下を追記：

```markdown
---

## 🚨 エラー報告

### 発生日時
[日時]

### 発生したエラー
- ファイル: [ファイルパス]
- 行番号: [行番号]
- エラーメッセージ: 
```
[エラー内容をコピー]
```

### 実行しようとした操作
[操作内容]

### 現在の状況
- 確認完了項目: [リスト]
- サーバー起動状態: [起動中/停止中]

### 質問
[不明点があれば記載]
```

---

## ✅ 確認完了チェックリスト

### Redis実装
- [ ] RealRedis実装確認
- [ ] SimpleRedis削除確認
- [ ] Redis接続確認

### Session認証
- [ ] セッション作成機能確認
- [ ] セッション検証機能確認
- [ ] セッション削除機能確認
- [ ] TTL設定確認

### データベーススキーマ
- [ ] Orderテーブル確認
- [ ] checkin_sessionsテーブル確認
- [ ] staff_tenant_membershipsテーブル確認

### 環境分岐コード
- [ ] 環境分岐コードの検索
- [ ] 発見された場合は修正
- [ ] 修正後の動作確認

### 動作確認
- [ ] サーバー起動確認
- [ ] Redis接続確認
- [ ] hotel-saasからのAPI呼び出し確認

---

## 📝 正しい実装例

### Redis実装の正しい例

```typescript
// ✅ 正しい実装: RealRedis使用
class RealRedis implements RedisLike {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.error('[hotel-common] Redis接続エラー:', err);
      });
      
      await this.client.connect();
      console.log('[hotel-common] Redis接続成功:', redisUrl);
    }
    return this.client;
  }
}

const redis: RedisLike = new RealRedis();
```

### Session認証の正しい例

```typescript
// ✅ 正しい実装: セッション作成
async createSession(user: SessionUser): Promise<string> {
  const sessionId = this.generateSecureSessionId();
  const sessionData: SessionUser = {
    user_id: user.user_id,
    tenant_id: user.tenant_id,
    email: user.email,
    role: user.role,
    level: user.level,
    permissions: user.permissions,
    accessibleTenants: user.accessibleTenants,
    currentTenant: user.currentTenant,
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString()
  };

  // セッションをRedisに保存（1時間有効）
  await redis.setex(
    `hotel:session:${sessionId}`,
    3600,
    JSON.stringify(sessionData)
  );

  return sessionId;
}
```

---

## 🎯 重要な注意事項

### 必ず守ること

1. **Redis統一要件**
   - hotel-saasとhotel-commonは同じRedisインスタンスを使用

2. **Session認証の一貫性**
   - Redis Key形式: `hotel:session:{sessionId}`
   - TTL: 3600秒（1時間）

3. **環境分岐禁止**
   - 開発環境専用のロジックは実装しない
   - 環境変数で接続先のみ変更

4. **エラーハンドリング必須**
   - Redis接続失敗時は503エラー
   - セッション検証失敗時は401エラー

5. **確認作業の徹底**
   - 推測せず、実際のコードを確認
   - 動作確認を必ず実施

---

**作成日**: 2025年10月7日  
**担当AI**: Iza（統合管理者）  
**承認者**: Iza（統合管理者）  
**バージョン**: 2.0.0（AI実行可能版）
