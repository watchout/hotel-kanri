# 🔧 Phase 0 修正指示書 - hotel-saas（完全版）

**対象システム**: hotel-saas  
**担当AI**: Sun  
**期間**: 3日  
**優先度**: 🔴 Critical  
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

3. **Day 1から順番に実行**
   - 各タスクを順番に実行
   - 各タスク完了後、進捗報告ファイルに報告
   - 推測で修正せず、指示書通りに実行

4. **エラーが発生したら即座に停止**
   - エラー内容を進捗報告ファイルに記録
   - ユーザーに報告
   - 指示を待つ

### 絶対に守ること

- ❌ 指示書を読まずに作業開始しない
- ❌ 推測で修正しない
- ❌ タスクをスキップしない
- ❌ 報告を省略しない
- ✅ 指示書の手順通りに実行
- ✅ 各タスク完了後に報告
- ✅ エラー時は即座に停止

### 報告先

**進捗報告**: `/Users/kaneko/hotel-kanri/docs/03_ssot/phase0_progress_saas.md`  
**質問・エラー報告**: ユーザーとのチャット

---

## 🎯 このタスクのゴール

### 最終目標
- JWT認証コードを完全削除（53ファイル）
- Session認証（Cookie）に統一
- テナントIDハードコードを削除（13ファイル）
- 環境分岐コードを削除（一部）

### 成功の定義
1. 全53ファイルの修正完了
2. hotel-saasが起動してエラーが出ない
3. ログイン → 注文作成 → メニュー取得が正常動作
4. JWT認証コードが完全に削除されている

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
cd /Users/kaneko/hotel-saas && pwd
```

**期待される出力**: `/Users/kaneko/hotel-saas`

### Step 0-3: 進捗報告ファイルの作成

以下のファイルを作成してください：

```
write /Users/kaneko/hotel-kanri/docs/03_ssot/phase0_progress_saas.md
```

**内容**:
```markdown
# Phase 0 進捗報告 - hotel-saas

**担当AI**: Sun  
**開始日**: 2025年10月7日

## 進捗サマリー
- 修正完了: 0/53ファイル
- テナントIDハードコード削除: 0/13ファイル
- 動作確認: 未実施

## Day 1
（作業開始後に記入）

## Day 2
（作業開始後に記入）

## Day 3
（作業開始後に記入）
```

---

## 🔧 Day 1: グループ1-4の修正（最優先）

**作業時間**: 8時間  
**対象**: 注文管理・メニュー管理・デバイス管理・フロント業務API

---

### 📋 Day 1 Morning - Part 1: グループ1（注文管理API）

**作業時間**: 1時間  
**対象ファイル**: 3ファイル

---

#### Task 1-1: create.post.tsの読み込みと分析（15分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts
```

**確認すること**:
- [ ] ファイルが存在するか
- [ ] `Authorization: Bearer ${user.token}`の行番号を特定
- [ ] `X-Tenant-ID`ヘッダーの有無を確認
- [ ] `credentials: 'include'`が既に存在するか確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 1-1: create.post.ts分析完了
- ファイルパス: /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts
- JWT認証コード: [行番号]行目に存在
- X-Tenant-IDヘッダー: [あり/なし]
- credentials設定: [あり/なし]
```

---

#### Task 1-2: create.post.tsの修正（15分）

**修正パターン**:

**❌ 削除する部分**（例）:
```typescript
headers: {
  'Authorization': `Bearer ${user.token}`,
  'Content-Type': 'application/json',
  'X-Tenant-ID': user.tenant_id || user.tenantId
}
```

**✅ 修正後**:
```typescript
credentials: 'include',
headers: {
  'Content-Type': 'application/json'
}
```

**実行する修正**:

1. **まず、修正対象の正確な文字列を確認**:
```
grep -A 5 "Authorization.*Bearer" /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts
```

2. **search_replaceツールで修正**:
```
search_replace /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts
old_string: [grepで確認した実際の文字列（前後3行含む）]
new_string: [修正後の文字列（前後3行含む）]
```

**重要**: 
- `old_string`は必ず**前後3-5行を含めて**ユニークにする
- インデント（スペース・タブ）も完全一致させる
- コメントも含める

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 1-2: create.post.ts修正完了
- 修正内容: JWT認証削除、Cookie認証に変更
- 修正行数: [X]行
- 修正後の確認: ✅ 完了
```

---

#### Task 1-3: create.post.tsの動作確認（15分）

**実行するコマンド**:
```bash
cd /Users/kaneko/hotel-saas && pnpm run dev
```

**確認すること**:
- [ ] サーバーが起動するか（エラーが出ないか）
- [ ] 起動ログに`Listening on http://localhost:3100`が表示されるか

**エラーが発生した場合**:
1. **即座に作業を停止**
2. **エラー内容を報告**（phase0_progress_saas.mdに追記）:
```markdown
### Task 1-3: エラー発生
- エラーメッセージ: [エラー内容をコピー]
- 発生箇所: [ファイル名と行番号]
- 実行した操作: create.post.tsの修正

**質問**: このエラーをどう対処すればよいですか？
```
3. **Izaの指示を待つ**

**正常に起動した場合**:
- サーバーを停止（Ctrl+C）
- 次のタスクへ進む

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 1-3: create.post.ts動作確認完了
- サーバー起動: ✅ 成功
- エラー: なし
```

---

#### Task 1-4: place.post.tsの修正（15分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-saas/server/api/v1/order/place.post.ts
```

**Task 1-1〜1-3と同じ手順を実行**:
1. ファイル読み込み・分析
2. JWT認証コード削除
3. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 1-4: place.post.ts修正完了
- 修正内容: JWT認証削除、Cookie認証に変更
- 動作確認: ✅ 成功
```

---

#### Task 1-5: menu.get.tsの修正（15分）

**実行するコマンド**:
```
read_file /Users/kaneko/hotel-saas/server/api/v1/order/menu.get.ts
```

**Task 1-1〜1-3と同じ手順を実行**:
1. ファイル読み込み・分析
2. JWT認証コード削除
3. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 1-5: menu.get.ts修正完了
- 修正内容: JWT認証削除、Cookie認証に変更
- 動作確認: ✅ 成功

---

## グループ1完了報告
- 修正ファイル数: 3/3
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 1 Morning - Part 2: グループ2（メニュー管理API）

**作業時間**: 3時間  
**対象ファイル**: 9ファイル

---

#### Task 2-1: items.get.tsの修正（20分）

**対象ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.get.ts`

**実行手順**:
1. ファイル読み込み
```
read_file /Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.get.ts
```

2. JWT認証コード検索
```
grep -n "Authorization.*Bearer" /Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.get.ts
```

3. 修正実行（Task 1-2と同じパターン）

4. 動作確認（サーバー起動確認）

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 2-1: items.get.ts修正完了
- 修正内容: JWT認証削除、Cookie認証に変更
- 動作確認: ✅ 成功
```

---

#### Task 2-2〜2-9: 残り8ファイルの修正（2時間40分）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories/[id].delete.ts
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. JWT認証コード検索
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 2-2〜2-9: メニュー管理API修正完了
- 修正ファイル数: 8/8
- 動作確認: ✅ 成功

---

## グループ2完了報告
- 修正ファイル数: 9/9
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 1 Afternoon - Part 1: グループ3（デバイス管理API）

**作業時間**: 2時間  
**対象ファイル**: 8ファイル

---

#### Task 3-1〜3-8: デバイス管理API修正（2時間）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/list.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/access-logs/index.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/stats/summary.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/stats/access.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/stats/ranking.get.ts
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. JWT認証コード検索
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 3-1〜3-8: デバイス管理API修正完了
- 修正ファイル数: 8/8
- 動作確認: ✅ 成功

---

## グループ3完了報告
- 修正ファイル数: 8/8
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 1 Afternoon - Part 2: グループ4（フロント業務API）

**作業時間**: 2時間  
**対象ファイル**: 7ファイル

---

#### Task 4-1〜4-7: フロント業務API修正（2時間）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/accounting.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/billing.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/billing-settings.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/checkin.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/checkout.post.ts
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. JWT認証コード検索
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 4-1〜4-7: フロント業務API修正完了
- 修正ファイル数: 7/7
- 動作確認: ✅ 成功

---

## グループ4完了報告
- 修正ファイル数: 7/7
- 所要時間: [実際の時間]
- 問題: [あれば記載]

---

## Day 1 完了報告
- 修正完了: 27/53ファイル（51%）
- グループ1: ✅ 完了（3ファイル）
- グループ2: ✅ 完了（9ファイル）
- グループ3: ✅ 完了（8ファイル）
- グループ4: ✅ 完了（7ファイル）
- 所要時間: [実際の時間]
- 問題: [あれば記載]
- 翌日の予定: グループ5-8の修正
```

---

## 🔧 Day 2: グループ5-8の修正

**作業時間**: 8時間  
**対象**: 客室グレード管理・メモ管理・その他API・ユーティリティファイル

---

### 📋 Day 2 Morning - Part 1: グループ5（客室グレード管理API）

**作業時間**: 1.5時間  
**対象ファイル**: 5ファイル

---

#### Task 5-1〜5-5: 客室グレード管理API修正（1.5時間）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/reorder.patch.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media/index.get.ts
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. JWT認証コード検索
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 5-1〜5-5: 客室グレード管理API修正完了
- 修正ファイル数: 5/5
- 動作確認: ✅ 成功

---

## グループ5完了報告
- 修正ファイル数: 5/5
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 2 Morning - Part 2: グループ6（メモ管理API）

**作業時間**: 1.5時間  
**対象ファイル**: 6ファイル

---

#### Task 6-1〜6-6: メモ管理API修正（1.5時間）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/memos.get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos.post.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].patch.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id]/comments.post.ts
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. JWT認証コード検索
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 6-1〜6-6: メモ管理API修正完了
- 修正ファイル数: 6/6
- 動作確認: ✅ 成功

---

## グループ6完了報告
- 修正ファイル数: 6/6
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 2 Morning - Part 3: グループ7（その他API）

**作業時間**: 1時間  
**対象ファイル**: 15ファイル

---

#### Task 7-1〜7-15: その他API修正（1時間）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/categories/list.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/[roomNumber]/logs.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/menu.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/operation-logs.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/tenant/current.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/content.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/publish.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/media/reorder.post.ts
/Users/kaneko/hotel-saas/server/api/v1/menu/items.get.ts
/Users/kaneko/hotel-saas/server/api/v1/menu/categories.get.ts
/Users/kaneko/hotel-saas/server/api/v1/media-proxy.get.ts
/Users/kaneko/hotel-saas/server/api/v1/media/proxy/[...path].get.ts
/Users/kaneko/hotel-saas/server/api/v1/devices/client-ip.get.ts
/Users/kaneko/hotel-saas/server/api/v1/devices/check-status.post.ts
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. JWT認証コード検索
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 7-1〜7-15: その他API修正完了
- 修正ファイル数: 15/15
- 動作確認: ✅ 成功

---

## グループ7完了報告
- 修正ファイル数: 15/15
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 2 Afternoon - Part 1: グループ8（ユーティリティファイル）

**作業時間**: 2時間  
**対象ファイル**: 2ファイル

---

#### Task 8-1: api-client.tsの修正（1時間）

**対象ファイル**: `/Users/kaneko/hotel-saas/server/utils/api-client.ts`

**実行手順**:

1. **ファイル全体を読み込み**
```
read_file /Users/kaneko/hotel-saas/server/utils/api-client.ts
```

2. **JWT認証関連コードを全て検索**
```
grep -n "token\|Bearer\|Authorization" /Users/kaneko/hotel-saas/server/utils/api-client.ts
```

3. **修正実行**
   - JWT認証関連のコードを完全削除
   - `credentials: 'include'`を追加
   - `user.token`への参照を全て削除

4. **動作確認**

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 8-1: api-client.ts修正完了
- 修正内容: JWT認証関連コード完全削除
- 削除した関数/変数: [リスト]
- 動作確認: ✅ 成功
```

---

#### Task 8-2: api-context.tsの修正（1時間）

**対象ファイル**: `/Users/kaneko/hotel-saas/server/utils/api-context.ts`

**実行手順**:

1. **ファイル全体を読み込み**
```
read_file /Users/kaneko/hotel-saas/server/utils/api-context.ts
```

2. **JWT認証関連コードを全て検索**
```
grep -n "token\|Bearer\|Authorization" /Users/kaneko/hotel-saas/server/utils/api-context.ts
```

3. **修正実行**
   - JWT認証関連のコードを完全削除
   - Session認証に統一

4. **動作確認**

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 8-2: api-context.ts修正完了
- 修正内容: JWT認証関連コード完全削除
- 動作確認: ✅ 成功

---

## グループ8完了報告
- 修正ファイル数: 2/2
- 所要時間: [実際の時間]
- 問題: [あれば記載]
```

---

### 📋 Day 2 Afternoon - Part 2: テナントIDハードコード削除

**作業時間**: 2時間  
**対象ファイル**: 13ファイル

---

#### Task 9-1〜9-13: テナントIDハードコード削除（2時間）

**対象ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/content.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/publish.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/reorder.patch.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/memos.post.ts
/Users/kaneko/hotel-saas/server/api/v1/memos.get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].patch.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id]/comments.post.ts
/Users/kaneko/hotel-saas/server/api/v1/media/proxy/[...path].get.ts
/Users/kaneko/hotel-saas/server/api/v1/pages/top.ts
```

**修正パターン**:

**❌ 削除する部分**:
```typescript
const tenantId = user.tenant_id || 'default'
const tenantId = session.tenantId ?? 'default'
```

**✅ 修正後**:
```typescript
const tenantId = user.tenant_id
if (!tenantId) {
  throw createError({
    statusCode: 400,
    message: 'テナントIDが取得できません'
  })
}
```

**各ファイルで実行すること**:
1. ファイル読み込み
2. テナントIDハードコード検索
```
grep -n "tenant.*||.*default\|tenant.*??.*default" [ファイルパス]
```
3. 修正実行
4. 動作確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 9-1〜9-13: テナントIDハードコード削除完了
- 修正ファイル数: 13/13
- 動作確認: ✅ 成功

---

## Day 2 完了報告
- 修正完了: 53/53ファイル（100%）
- グループ5: ✅ 完了（5ファイル）
- グループ6: ✅ 完了（6ファイル）
- グループ7: ✅ 完了（15ファイル）
- グループ8: ✅ 完了（2ファイル）
- テナントIDハードコード削除: ✅ 完了（13ファイル）
- 所要時間: [実際の時間]
- 問題: [あれば記載]
- 翌日の予定: 動作確認・テスト
```

---

## 🔧 Day 3: 動作確認・テスト

**作業時間**: 8時間  
**目的**: 全修正の動作確認とエラー修正

---

### 📋 Day 3 Morning: 基本動作確認

**作業時間**: 4時間

---

#### Task 10-1: サーバー起動確認（30分）

**実行するコマンド**:
```bash
cd /Users/kaneko/hotel-saas && pnpm run dev
```

**確認すること**:
- [ ] サーバーが起動するか
- [ ] エラーログが出ないか
- [ ] `Listening on http://localhost:3100`が表示されるか

**エラーが発生した場合**:
1. エラーメッセージをコピー
2. phase0_progress_saas.mdに記録
3. Izaに報告
4. 指示を待つ

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 10-1: サーバー起動確認
- 結果: [成功/失敗]
- エラー: [あれば記載]
```

---

#### Task 10-2: ログイン動作確認（30分）

**実行手順**:

1. **ブラウザでアクセス**
```
http://localhost:3100/admin/login
```

2. **ログイン実行**
   - Email: `admin@example.com`（テストアカウント）
   - Password: `password123`（テストパスワード）

3. **Cookie確認**
   - ブラウザの開発者ツールを開く
   - Application → Cookies → `http://localhost:3100`
   - `hotel-session-id`が設定されているか確認

4. **ログ確認**
   - サーバーログに`[hotel-saas] ログイン成功`が表示されるか確認

**確認すること**:
- [ ] ログインページが表示されるか
- [ ] ログインが成功するか
- [ ] Cookieが設定されるか
- [ ] 管理画面にリダイレクトされるか

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 10-2: ログイン動作確認
- ログインページ表示: [成功/失敗]
- ログイン実行: [成功/失敗]
- Cookie設定: [成功/失敗]
- リダイレクト: [成功/失敗]
```

---

#### Task 10-3: 注文作成動作確認（1時間）

**実行手順**:

1. **管理画面にアクセス**
```
http://localhost:3100/admin
```

2. **客室端末画面にアクセス**
```
http://localhost:3100/room/101
```

3. **メニュー表示確認**
   - メニューが表示されるか確認

4. **注文作成**
   - メニューから商品を選択
   - 注文ボタンをクリック
   - 注文が成功するか確認

5. **hotel-commonログ確認**
   - hotel-commonのログに注文作成ログが表示されるか確認

**確認すること**:
- [ ] 客室端末画面が表示されるか
- [ ] メニューが表示されるか
- [ ] 注文が作成できるか
- [ ] hotel-commonにリクエストが届いているか

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 10-3: 注文作成動作確認
- 客室端末画面表示: [成功/失敗]
- メニュー表示: [成功/失敗]
- 注文作成: [成功/失敗]
- hotel-common連携: [成功/失敗]
```

---

#### Task 10-4: メニュー管理動作確認（1時間）

**実行手順**:

1. **管理画面にアクセス**
```
http://localhost:3100/admin/menu
```

2. **メニュー一覧表示確認**
   - メニュー一覧が表示されるか確認

3. **メニュー作成**
   - 新規メニューを作成
   - 保存が成功するか確認

4. **メニュー編集**
   - 既存メニューを編集
   - 保存が成功するか確認

5. **メニュー削除**
   - メニューを削除
   - 削除が成功するか確認

**確認すること**:
- [ ] メニュー一覧が表示されるか
- [ ] メニューが作成できるか
- [ ] メニューが編集できるか
- [ ] メニューが削除できるか

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 10-4: メニュー管理動作確認
- メニュー一覧表示: [成功/失敗]
- メニュー作成: [成功/失敗]
- メニュー編集: [成功/失敗]
- メニュー削除: [成功/失敗]
```

---

#### Task 10-5: デバイス管理動作確認（1時間）

**実行手順**:

1. **管理画面にアクセス**
```
http://localhost:3100/admin/devices
```

2. **デバイス一覧表示確認**
   - デバイス一覧が表示されるか確認

3. **デバイス作成**
   - 新規デバイスを作成
   - 保存が成功するか確認

4. **デバイス編集**
   - 既存デバイスを編集
   - 保存が成功するか確認

**確認すること**:
- [ ] デバイス一覧が表示されるか
- [ ] デバイスが作成できるか
- [ ] デバイスが編集できるか

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 10-5: デバイス管理動作確認
- デバイス一覧表示: [成功/失敗]
- デバイス作成: [成功/失敗]
- デバイス編集: [成功/失敗]
```

---

### 📋 Day 3 Afternoon: エラーケース確認・最終確認

**作業時間**: 4時間

---

#### Task 11-1: エラーケース確認（2時間）

**テストケース1: テナントID未設定時のエラー**

1. **セッションを削除**
```bash
redis-cli DEL "hotel:session:*"
```

2. **APIにアクセス**
```bash
curl http://localhost:3100/api/v1/admin/menu/items
```

3. **期待される結果**
   - ステータスコード: 401
   - エラーメッセージ: `認証が必要です`

**テストケース2: Cookie未設定時のエラー**

1. **Cookieなしでアクセス**
```bash
curl http://localhost:3100/api/v1/admin/menu/items
```

2. **期待される結果**
   - ステータスコード: 401
   - エラーメッセージ: `認証が必要です`

**テストケース3: hotel-common接続失敗時のエラー**

1. **hotel-commonを停止**

2. **APIにアクセス**
```bash
curl -b "hotel-session-id=test" http://localhost:3100/api/v1/admin/menu/items
```

3. **期待される結果**
   - ステータスコード: 503
   - エラーメッセージ: `サービスが一時的に利用できません`

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 11-1: エラーケース確認
- テナントID未設定: [成功/失敗]
- Cookie未設定: [成功/失敗]
- hotel-common接続失敗: [成功/失敗]
```

---

#### Task 11-2: JWT認証コード完全削除確認（1時間）

**実行するコマンド**:
```bash
cd /Users/kaneko/hotel-saas && grep -r "Authorization.*Bearer" server/
```

**期待される結果**:
- 何も表示されない（JWT認証コードが完全に削除されている）

**もし何か表示された場合**:
1. 表示されたファイルを確認
2. JWT認証コードを削除
3. 再度確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 11-2: JWT認証コード完全削除確認
- 検索結果: [0件/X件]
- 残存ファイル: [あれば記載]
- 対応: [削除完了/未対応]
```

---

#### Task 11-3: テナントIDハードコード完全削除確認（1時間）

**実行するコマンド**:
```bash
cd /Users/kaneko/hotel-saas && grep -r "tenant.*||.*'default'\|tenant.*??.*'default'" server/
```

**期待される結果**:
- 何も表示されない（テナントIDハードコードが完全に削除されている）

**もし何か表示された場合**:
1. 表示されたファイルを確認
2. テナントIDハードコードを削除
3. 再度確認

**報告すること**（phase0_progress_saas.mdに追記）:
```markdown
### Task 11-3: テナントIDハードコード完全削除確認
- 検索結果: [0件/X件]
- 残存ファイル: [あれば記載]
- 対応: [削除完了/未対応]
```

---

#### Task 11-4: 最終確認・完了報告（1時間）

**最終チェックリスト**:
- [ ] 全53ファイルの修正完了
- [ ] JWT認証コード完全削除
- [ ] テナントIDハードコード完全削除
- [ ] サーバー起動成功
- [ ] ログイン動作成功
- [ ] 注文作成動作成功
- [ ] メニュー管理動作成功
- [ ] デバイス管理動作成功
- [ ] エラーハンドリング確認

**最終報告**（phase0_progress_saas.mdに追記）:
```markdown
---

## 🎉 Phase 0 完了報告

### 修正サマリー
- 修正ファイル数: 53/53（100%）
- テナントIDハードコード削除: 13/13（100%）
- JWT認証コード削除: ✅ 完了
- 動作確認: ✅ 完了

### 所要時間
- Day 1: [X]時間
- Day 2: [X]時間
- Day 3: [X]時間
- 合計: [X]時間

### 発見した問題
[あれば記載]

### Phase 0 完了確認
- [x] 全53ファイルの修正完了
- [x] JWT認証コード完全削除
- [x] テナントIDハードコード完全削除
- [x] 動作確認完了
- [x] エラーハンドリング確認

### 次のステップ
Phase 1の準備開始
```

---

## 🚨 エラー発生時の対処フロー

### エラーが発生した場合の絶対ルール

1. **即座に作業を停止**
2. **エラー内容を記録**
3. **Izaに報告**
4. **指示を待つ**

### エラー報告フォーマット

phase0_progress_saas.mdに以下を追記：

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
- 修正完了ファイル数: X/53
- 最後に成功した操作: [操作内容]
- サーバー起動状態: [起動中/停止中]

### 質問
[不明点があれば記載]
```

---

## ✅ 修正完了チェックリスト

### JWT認証の残骸削除
- [ ] グループ1: 注文管理API（3ファイル）
- [ ] グループ2: メニュー管理API（9ファイル）
- [ ] グループ3: デバイス管理API（8ファイル）
- [ ] グループ4: フロント業務API（7ファイル）
- [ ] グループ5: 客室グレード管理API（5ファイル）
- [ ] グループ6: メモ管理API（6ファイル）
- [ ] グループ7: その他API（15ファイル）
- [ ] グループ8: ユーティリティファイル（2ファイル）

### テナントIDハードコード削除
- [ ] 13ファイルの修正完了

### 動作確認
- [ ] サーバー起動確認
- [ ] ログイン動作確認
- [ ] 注文作成動作確認
- [ ] メニュー管理動作確認
- [ ] デバイス管理動作確認
- [ ] エラーハンドリング確認

### 最終確認
- [ ] JWT認証コード完全削除確認
- [ ] テナントIDハードコード完全削除確認
- [ ] 全機能動作確認

---

## 📊 進捗追跡

### 修正進捗
- Day 1: 0 → 27ファイル（51%）
- Day 2: 27 → 53ファイル（100%）
- Day 3: 動作確認・テスト

### 現在の状況
- 修正完了: 0/53ファイル
- テナントIDハードコード削除: 0/13ファイル
- 動作確認: 未実施

---

## 🎯 重要な注意事項

### 必ず守ること

1. **credentials: 'include'を必ず追加**
   - Cookie自動送信のために必須

2. **Authorization ヘッダーを完全削除**
   - JWT認証の残骸を完全に削除

3. **X-Tenant-ID ヘッダーも削除**
   - テナントIDはCookieから自動取得

4. **テナントIDフォールバック禁止**
   - `|| 'default'`や`?? 'default'`は絶対に使用しない

5. **エラーハンドリング必須**
   - テナントID未設定時は明確なエラーを返す

6. **修正前に必ずファイルを読み込む**
   - ファイルの構造を理解してから修正

7. **修正後に必ず動作確認**
   - サーバーが起動するか確認

8. **エラーが出たら即座に停止**
   - 推測で修正せず、Izaに報告

---

## 📝 修正後の正しい実装例

### API呼び出しの正しい例

```typescript
// ✅ 正しい実装
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/xxx`, {
  method: 'POST',
  credentials: 'include',  // ← Cookie自動送信
  headers: {
    'Content-Type': 'application/json'
  },
  body: data
})
```

### テナントID取得の正しい例

```typescript
// ✅ 正しい実装
const tenantId = user.tenant_id
if (!tenantId) {
  throw createError({
    statusCode: 400,
    message: 'テナントIDが取得できません'
  })
}
```

---

**作成日**: 2025年10月7日  
**担当AI**: Sun（hotel-saas担当）  
**承認者**: Iza（統合管理者）  
**バージョン**: 2.0.0（AI実行可能版）
