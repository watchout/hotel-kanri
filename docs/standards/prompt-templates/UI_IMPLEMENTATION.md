# 📋 UI実装プロンプトテンプレート

**適用条件**: タスクに "[11] UI (hotel-saas)" 等が含まれる場合

---

## 🎯 目的

- hotel-saas のUI実装
- タスク: [タスクID] [サブタスク番号] UI (hotel-saas)

---

## 📚 前提条件

### サービス稼働確認
- hotel-saas: http://localhost:3101/api/v1/health → 200
- hotel-common: http://localhost:3401/health → 200

### 技術スタック
- 認証: セッション（Redis + HttpOnly Cookie）
- API呼び出し: 必ず `callHotelCommonAPI(event, ...)` を使用（Cookie転送）
- フレームワーク: Nuxt 3 + Vue 3 + TypeScript

### 参照ドキュメント（★必読）

#### 基盤SSOT（必須）
- **★★★ 管理画面CRUD UI標準**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_ADMIN_CRUD_UI_STANDARD.md` - **最重要・必読**
- **★★★ UI原則**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md`
- 認証/セッション: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
- マルチテナント: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`
- APIルーティング: `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`

#### UI実装ガイド（必須）
- **★★ shadcn/ui導入**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/UI_COMPONENTS_DEPLOYMENT_GUIDE.md`
- **★★ 実装詳細**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/UI_DESIGN_IMPLEMENTATION_GUIDE.md`
- **★ 多言語実装**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/MULTILINGUAL_IMPLEMENTATION_GUIDE.md`
- 管理画面UI設計: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_UI_DESIGN.md`

#### 機能SSOT（最重要・実装開始前に必読）
- [該当機能のSSOT]: `/Users/kaneko/hotel-kanri/docs/03_ssot/[カテゴリ]/[SSOT名].md`

---

## 🚨 重要：実装中断の基準（必読）★★★CRITICAL

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）- 絶対に停止

1. **SSOT照合失敗（0件）** or **SSOT複数一致**
2. **依存ファイル非実在・未生成**（API endpoint、composables、components等）
3. **型エラー連鎖**（>5件/1ステップ）
4. **矛盾の発見**（プロンプト vs SSOT、既存実装 vs SSOT）
5. **エラー原因不明**（15分以上調査で進展なし）
6. **UI設計の判断**（SSOT_ADMIN_CRUD_UI_STANDARDに記載がないUIパターン）
7. **アクセシビリティ判断**（WCAG AAA準拠の実装方法が不明）
8. **多言語対応判断**（翻訳キーの命名規則や配置が不明）

### 推奨停止トリガー（Layer 2）- 判断推奨

1. **UI/UX判断**（複数の実装方法があり、最適解が不明）
2. **コンポーネント選択**（shadcn/uiのどのコンポーネントを使用すべきか不明）
3. **レイアウト判断**（CRUD標準レイアウトの適用方法が不明）
4. **既存実装整合性**（既存UIとの一貫性が不明）

### 停止時の対応

1. 実装を停止
2. 「🛑 実装停止（判断依頼）」テンプレートで報告
3. ユーザーの指示を待つ
4. **推測で実装を続けない**

**詳細**: `/Users/kaneko/hotel-kanri/.cursor/prompts/implementation_halt_protocol.md`

**報告テンプレート**:
```markdown
## 🛑 実装停止（判断依頼）

### 停止理由
- **カテゴリ**: [SSOT照合失敗 / 依存ファイル不在 / 型エラー連鎖 / 矛盾の発見 / UI設計判断 / アクセシビリティ判断 / 多言語対応判断 / UI/UX判断 / コンポーネント選択 / レイアウト判断 / エラー原因不明]
- **詳細**: [具体的な状況]

### 現在の状況
- **実施済み**: [完了したItem・Step]
- **停止箇所**: Item [X] - Step [Y]
- **問題の内容**: 

[詳細な問題説明]

### 確認したこと
- [x] SSOT定義を確認したか？
  - 参照SSOT: [SSOT_ADMIN_CRUD_UI_STANDARD.md / 該当機能のSSOT]
  - 該当セクション: [セクション名]
  - **SSOT引用**:
    ```
    [該当行の引用]
    ```
- [x] プロンプトを確認したか？
  - 該当箇所: [セクション名]
- [x] 既存UI実装を確認したか？
  - 確認ファイル: [pages/admin/*/index.vue]
  - パターン: [確認したパターン]

### 判断が必要な内容
- [質問1]
- [質問2]

### 提案（あれば）
- [提案1]
- [提案2]

判断をお願いします。
```

---

## 📍 Item 1: 事前調査（必須）

**所要時間**: 15分

**📖 共通セクション参照**: `COMMON_SECTIONS.md` の Item 1

**UI実装特有の追加確認**:

### Step 1: 既存の管理画面を確認

```bash
# 管理画面の既存ファイル一覧
find /Users/kaneko/hotel-saas-rebuild/pages/admin -name "*.vue" -type f | head -10

# 一覧表示画面を優先的に確認
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/*/index.vue
```

### Step 2: 既存のVueファイルを読む

```bash
# 最も参考になりそうな画面を1つ選んで読む
cat /Users/kaneko/hotel-saas-rebuild/pages/admin/[類似画面名]/index.vue
```

**確認ポイント**:
- `<script setup>` の書き方
- `useFetch` の使い方
- ローディング・エラーハンドリングの実装パターン
- UIコンポーネントの使用パターン

### Step 3: APIルートの存在確認

```bash
# 対象機能のAPIルートを確認
ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名]*

# 存在する場合は読む
cat /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].get.ts 2>/dev/null
cat /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].post.ts 2>/dev/null
```

### Step 4: Composablesの確認

```bash
# 認証関連Composableの確認
ls -la /Users/kaneko/hotel-saas-rebuild/composables/

# useAuth等の使用例を確認
grep -r "useAuth\|useFetch" /Users/kaneko/hotel-saas-rebuild/pages/admin/*.vue | head -5
```

### Step 5: UIコンポーネントの確認

```bash
# 共通コンポーネントの確認
ls -la /Users/kaneko/hotel-saas-rebuild/components/

# モーダル・ボタン・テーブル等の確認
ls -la /Users/kaneko/hotel-saas-rebuild/components/ui/ 2>/dev/null
```

---

## 📍 Item 2: 要件スコープの明確化

**所要時間**: 10分

### 目的
実装範囲を明確化し、後続タスクとの境界を定義

### 実施内容

#### ステップ1: 実装スコープの確認

**今回実装する機能**:
- ✅ [機能名]一覧表示
- ✅ 新規作成モーダル（表示のみ）
- ✅ 基本的なローディング・エラー表示

**今回実装しない機能**（後続タスクへ）:
- ❌ 編集機能
- ❌ 削除機能
- ❌ 詳細画面
- ❌ 検索・フィルタ

#### ステップ2: UI要件の明確化

**一覧表示**:
- 表示項目: [項目1, 項目2, ...]
- データ取得: `/api/v1/admin/[機能名]`（GET）
- 表示順: [ソート条件]

**新規作成モーダル**:
- 入力項目: [項目1, 項目2, ...]
- データ送信: `/api/v1/admin/[機能名]`（POST）
- 成功時: モーダルを閉じて一覧を再取得

---

## 📍 Item 3: UI実装（Nuxt 3 / Vue 3）

**所要時間**: 40分

### ⚠️ 停止チェックポイント（Item開始前・必須）

**以下を確認し、1つでも該当する場合は停止**:
- [ ] APIエンドポイントが未実装か？ → **Layer 1停止**（依存ファイル不在）
- [ ] SSOT_ADMIN_CRUD_UI_STANDARDの該当セクションを読んだか？ → 未読なら停止
- [ ] UIパターンがSSOTに記載されているか？ → 記載なしなら**Layer 2停止**（UI設計判断）
- [ ] 使用するコンポーネントが明確か？ → 不明なら**Layer 2停止**（コンポーネント選択）
- [ ] アクセシビリティ要件が明確か？ → 不明なら**Layer 1停止**（アクセシビリティ判断）

→ **1つでも該当する場合は、Item開始前に停止して報告**

### 目的
`pages/admin/[機能名]/index.vue` を作成・実装

### 実施内容

#### ステップ1: ディレクトリとファイルの作成

```bash
# ディレクトリ存在確認
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]/

# ファイル存在確認
ls -la /Users/kaneko/hotel-saas-rebuild/pages/admin/[機能名]/index.vue
```

**判断**:
- ファイルが存在する → `read_file`で読んでから編集（`search_replace`）
- ファイルが存在しない → 新規作成（`write`）

#### ステップ2: ファイル実装

**ツール**: `write` または `search_replace`

**実装テンプレート**:

```vue
<script setup lang="ts">
// 型定義
interface [機能名] {
  id: string
  // 必要なフィールドを追加
  created_at: string
}

// データ取得
const { data: [機能名複数形], pending, error, refresh } = await useFetch<{
  success: boolean
  data: [機能名][]
}>('/api/v1/admin/[機能名]')

// モーダル制御
const isModalOpen = ref(false)
const new[機能名] = ref({
  // 必要なフィールドを追加
})

// 新規作成
const create[機能名] = async () => {
  try {
    const response = await $fetch('/api/v1/admin/[機能名]', {
      method: 'POST',
      body: new[機能名].value
    })
    
    if (response.success) {
      isModalOpen.value = false
      new[機能名].value = { /* リセット */ }
      await refresh()
    }
  } catch (err) {
    console.error('Failed to create [機能名]:', err)
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">[機能名]管理</h1>
      <button 
        @click="isModalOpen = true"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        新規作成
      </button>
    </div>

    <!-- ローディング -->
    <div v-if="pending" class="text-center py-8">
      <p>読み込み中...</p>
    </div>

    <!-- エラー -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <p>エラーが発生しました: {{ error.message }}</p>
    </div>

    <!-- 空表示 -->
    <div v-else-if="![機能名複数形]?.data || [機能名複数形].data.length === 0" class="text-center py-8">
      <p class="text-gray-500">データがありません</p>
    </div>

    <!-- 一覧テーブル -->
    <div v-else class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <!-- カラムヘッダー -->
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in [機能名複数形].data" :key="item.id">
            <!-- データ行 -->
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新規作成モーダル -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">新規[機能名]作成</h2>
        
        <form @submit.prevent="create[機能名]" class="space-y-4">
          <!-- フォームフィールド -->
          
          <div class="flex gap-2 justify-end">
            <button 
              type="button"
              @click="isModalOpen = false"
              class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
```

#### ステップ3: 実装チェックリスト

**確認項目**:
- [ ] `useFetch('/api/v1/admin/[機能名]')` で一覧取得
- [ ] `pending` でローディング表示
- [ ] `error` でエラー表示
- [ ] `!data || data.length === 0` で空表示
- [ ] 新規作成モーダル実装
- [ ] `$fetch` で POST送信
- [ ] 成功時にモーダルを閉じて `refresh()` で一覧再取得
- [ ] TypeScript型定義
- [ ] Tailwind CSSでスタイリング

---

## 📍 Item 4: サーバールート確認・実装（hotel-saas）

**所要時間**: 20分

### 目的
SaaS側のAPIルートを確認・作成

### 実施内容

#### ステップ1: 既存ルートの確認

```bash
# GETルート確認
ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].get.ts

# POSTルート確認
ls -la /Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].post.ts
```

**判断**:
- ✅ 両方存在する → Phase 4へスキップ
- ❌ 片方/両方不在 → 以下の実装を実施

#### ステップ2: GETルートの実装（不在時のみ）

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].get.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 認証チェック（ミドルウェアで認証済み）
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です'
    })
  }

  // hotel-commonのAPIを呼び出し（Cookie自動転送）
  const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
    method: 'GET'
  })

  return response
})
```

#### ステップ3: POSTルートの実装（不在時のみ）

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/admin/[機能名].post.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 認証チェック（ミドルウェアで認証済み）
  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '認証が必要です'
    })
  }

  // リクエストボディ取得
  const body = await readBody(event)

  // hotel-commonのAPIを呼び出し（Cookie自動転送）
  const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
    method: 'POST',
    body
  })

  return response
})
```

---

## 📍 Item 5: 動作確認・テスト（手動テスト）

**所要時間**: 20分

**📖 共通セクション参照**: `COMMON_SECTIONS.md` のエラー時の対処フロー

### UI実装特有の確認

#### ステップ1: サービス起動確認

```bash
# hotel-common-rebuild のヘルスチェック
curl -s http://localhost:3401/health | jq .

# hotel-saas-rebuild のヘルスチェック
curl -s http://localhost:3101/api/v1/health | jq .
```

#### ステップ2: ログイン

```bash
# ログインしてセッションCookie取得
curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq .
```

#### ステップ3: API動作確認（curl）

```bash
# 一覧取得
curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq .

# 新規作成
curl -s -b /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/[機能名] \
  -H 'Content-Type: application/json' \
  -d '[リクエストボディJSON]' | jq .

# 再度一覧取得（作成したデータが含まれているか確認）
curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq .
```

#### ステップ4: UI動作確認（ブラウザ）

**手順**:
1. ブラウザで `http://localhost:3101` にアクセス
2. ログイン（owner@test.omotenasuai.com / owner123）
3. [機能名]管理画面に遷移
4. 一覧が表示されることを確認
5. 「新規作成」ボタンをクリック
6. モーダルが表示されることを確認
7. データを入力して「作成」ボタンをクリック
8. 一覧に追加されることを確認

**確認項目**:
- [ ] 一覧表示が正常
- [ ] ローディング表示が出る
- [ ] 新規作成モーダルが開く
- [ ] データ作成が成功
- [ ] 作成後、一覧が更新される
- [ ] ブラウザコンソールにエラーがない
- [ ] ネットワークタブで401/403エラーがない

---

## 📍 Item 6: 受入基準確認と証跡提出

**所要時間**: 15分

### 受入基準

**必須項目**:
1. ✅ 一覧取得がUIで成功（件数が0以上で表示）
2. ✅ 新規作成後、一覧に即反映
3. ✅ サーバーログに401/403が出ない
4. ✅ ブラウザコンソールにエラーがない
5. ✅ SSOT準拠（認証・マルチテナント・APIルーティング）

### 証跡提出物

#### 1. スクリーンショット

**必要な画面**:
- 一覧画面（データあり）
- 新規作成モーダル（入力前）
- 新規作成モーダル（入力後）
- 作成成功後の一覧（新規データが追加されている）

#### 2. curlテストログ

```bash
# 以下をまとめて実行してログを保存
{
  echo "=== Health Check ==="
  curl -s http://localhost:3401/health | jq .
  curl -s http://localhost:3101/api/v1/health | jq .
  
  echo "=== Login ==="
  curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq .
  
  echo "=== GET List ==="
  curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq .
  
  echo "=== POST Create ==="
  curl -s -b /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/[機能名] \
    -H 'Content-Type: application/json' \
    -d '[リクエストボディJSON]' | jq .
  
  echo "=== GET List (after create) ==="
  curl -s -b /tmp/cookies.txt http://localhost:3101/api/v1/admin/[機能名] | jq .
} | tee /tmp/[タスクID]-test-log.txt
```

#### 3. 変更ファイルリスト

```bash
# 変更ファイル一覧を生成
git status --short > /tmp/[タスクID]-changed-files.txt
git diff --stat >> /tmp/[タスクID]-changed-files.txt
```

### PR本文テンプレート

```markdown
## 参照SSOT

- **Path**: /Users/kaneko/hotel-kanri/docs/03_ssot/[該当SSOT].md
- **Version**: vX.Y.Z
- **要件ID**: [タスクID]

## Plane

- **Issue**: [タスクID]
- **URL**: https://plane.arrowsworks.com/co/projects/7e187231-3f93-44cd-9892-a9322ebd4312/issues/[issue-id]
- **State**: In Progress → Done

## テスト・証跡

### 受入基準確認
- [x] 一覧取得がUIで成功（件数が0以上で表示）
- [x] 新規作成後、一覧に即反映
- [x] サーバーログに401/403が出ない
- [x] ブラウザコンソールにエラーがない
- [x] SSOT準拠（認証・マルチテナント・APIルーティング）

### 動作確認
**curlテスト結果**: `/tmp/[タスクID]-test-log.txt` 参照
- ヘルスチェック: ✅
- ログイン: ✅
- GET 一覧: ✅
- POST 作成: ✅
- GET 再取得: ✅（新規データあり）

**UI確認**: スクリーンショット添付
- 一覧画面: ✅
- 新規作成モーダル: ✅
- 作成後の一覧: ✅

### 変更ファイル
- `pages/admin/[機能名]/index.vue`: 新規作成
- `server/api/v1/admin/[機能名].get.ts`: [新規作成/既存]
- `server/api/v1/admin/[機能名].post.ts`: [新規作成/既存]

## CI

- [ ] evidence-check: Pass
- [ ] ssot-compliance: Pass
- [ ] lint-and-typecheck: Pass
- [ ] unit-tests: Pass
- [ ] crud-verify: Pass
- [ ] build: Pass
- [ ] security: Pass
- [ ] quality-gate: Pass
```

---

## 📍 Item 6.5: 標準テストスクリプト実行（必須・commit/PR前ゲート）

**絶対ルール**: 以下が全て成功しない限り、commit/PRは禁止

### スクリプト選択（実装タイプに応じて）

#### 管理画面UI実装の場合

```bash
/Users/kaneko/hotel-kanri/scripts/test-standard-admin.sh
```

**対象**: `/admin/*`  
**認証**: Session認証（Redis + Cookie）  
**検証**: ログイン → テナント切替 → API → UI SSR

#### ゲスト画面UI実装の場合

```bash
/Users/kaneko/hotel-kanri/scripts/test-standard-guest.sh
```

**対象**: `/menu`  
**認証**: デバイス認証（MAC/IP → device_rooms）  
**検証**: デバイス認証 → API → UI注意事項

### 失敗時の対処

**管理画面用**:
- 401: ログイン/テナント切替やり直し（Cookie転送漏れは`callHotelCommonAPI`を確認）
- 404: パス/ID不正（API結果から正しいIDを使用）

**ゲスト画面用**:
- 401: デバイス認証失敗（device_roomsにテストデバイス登録確認）
- 404: パス/ID不正（API結果から正しいIDを使用）
- 空配列: seed未投入（10〜20件のカテゴリ/メニューを投入）
- 5xx: サーバーログで原因特定（実装修正）

成功時（抜粋EvidenceをPRに貼付）:
- 実行ログ（終了コード0）
- `/menu` 抜粋（「データの取得に失敗しました」が含まれないこと）
- `categories/items` 件数（jqの評価結果）

---

## 🛡️ UI実装特有の実装ガード

### 禁止1: 直接 `$fetch` でcommonを叩く ❌

```typescript
// ❌ 間違い（Cookie転送されない）
const response = await $fetch('http://localhost:3401/api/v1/admin/[機能名]')

// ✅ 正しい（Cookie自動転送）
const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]', {
  method: 'GET'
})
```

### 禁止2: Prisma/DBへの直接アクセス ❌

```typescript
// ❌ 間違い（SaaSはプロキシ専用）
import { PrismaClient } from '@prisma/client'

// ✅ 正しい（hotel-common経由）
const response = await callHotelCommonAPI(event, '/api/v1/admin/[機能名]')
```

### 禁止3: 深いネスト/index.*ファイル ❌

```typescript
// ❌ 間違い（Nuxt 3制約）
/server/api/v1/admin/[機能名]/[id]/items/[itemId].get.ts
/server/api/v1/admin/[機能名]/index.get.ts

// ✅ 正しい（フラット構造）
/server/api/v1/admin/[機能名].get.ts
/server/api/v1/admin/[機能名]/[id].get.ts
```

---

## ✅ 完了条件

以下の全てを満たしたら完了：

- [ ] Phase 0-5の全てを完了
- [ ] 受入基準5項目を全て満たす
- [ ] 証跡3点を提出
- [ ] PR作成（base=develop）
- [ ] PR本文に必須セクション記載（参照SSOT/Plane/テスト・証跡/CI）
- [ ] CI Green
- [ ] Gatekeeper承認待ち

