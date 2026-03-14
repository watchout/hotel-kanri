# 📋 SSOT: [機能名]

**Doc-ID**: SSOT-[CATEGORY]-[NAME]-001  
**バージョン**: 1.0.0  
**作成日**: YYYY-MM-DD  
**最終更新**: YYYY-MM-DD  
**ステータス**: 🟡 作成中  
**所有者**: [担当AI名]

**関連SSOT**:
- [SSOT_XXX.md](../path/to/SSOT_XXX.md) - 説明

**関連ドキュメント**:
- [DOC_XXX.md](/path/to/DOC_XXX.md) - 説明

---

## 📋 目次

1. [概要](#概要)
2. [必須要件（CRITICAL）](#必須要件critical)
3. [技術スタック](#技術スタック)
4. [データベース設計](#データベース設計)
5. [API仕様](#api仕様)
6. [フロントエンド実装](#フロントエンド実装)
7. [セキュリティ](#セキュリティ)
8. [実装状況](#実装状況)
9. [実装チェックリスト](#実装チェックリスト)

---

## 📖 概要

### 目的

[この機能の目的を記載]

### 適用範囲

- [範囲1]
- [範囲2]

### 技術スタック

- **フロントエンド**: Vue 3 + Nuxt 3
- **バックエンド**: Express.js (hotel-common) / Nuxt Nitro (hotel-saas)
- **データベース**: PostgreSQL + Prisma
- **認証**: Session認証（Redis + HttpOnly Cookie）

---

## 🚨 必須要件（CRITICAL）

### 1. [必須要件1]

**理由**: [理由を記載]

### 2. [必須要件2]

**理由**: [理由を記載]

---

## 🗄️ データベース設計

### テーブル定義

```prisma
model ExampleTable {
  id        String   @id @default(cuid()) @map("id")
  tenantId  String   @map("tenant_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("example_table")
  @@index([tenantId])
}
```

---

## 🔌 API仕様

### hotel-common API

#### GET /api/v1/[endpoint]

**概要**: [説明]

**リクエスト**:
```typescript
// なし
```

**レスポンス**:
```typescript
{
  data: ExampleType[]
}
```

### hotel-saas プロキシAPI

#### GET /api/v1/admin/[endpoint]

**概要**: hotel-commonへのプロキシ

**実装**:
```typescript
export default defineEventHandler(async (event) => {
  const hotelCommonApiUrl = useRuntimeConfig().public.hotelCommonApiUrl
  
  return await $fetch(`${hotelCommonApiUrl}/api/v1/[endpoint]`, {
    credentials: 'include'
  })
})
```

---

## 🎨 フロントエンド実装

### ページ一覧

- `/pages/admin/[feature]/index.vue` - 一覧画面
- `/pages/admin/[feature]/[id].vue` - 詳細画面

### Composable

```typescript
// composables/use[Feature]Api.ts
export const use[Feature]Api = () => {
  const getList = async () => {
    return await $fetch('/api/v1/admin/[endpoint]')
  }
  
  return {
    getList
  }
}
```

---

## 🔐 セキュリティ

### 認証・認可

- ✅ Session認証必須
- ✅ テナント分離
- ✅ 権限チェック

---

## 📊 実装状況

> ⚠️ **未調査**: 実装状況は未調査です。実装作業開始時に調査します。

### 実装完了の定義

✅ **完了（100%）**: 以下の全てを満たす
- [ ] Phase 1: データベース実装完了（テーブル・カラムがSSOT通り）
- [ ] Phase 2: API実装完了（全エンドポイントが実装済み）
- [ ] Phase 3: フロントエンド実装完了（全画面・機能が実装済み）
- [ ] Phase 4: テスト完了（単体・統合・E2Eテスト）
- [ ] Phase 5: SSOT準拠確認（実装がSSOT通りに動作）

🟢 **部分実装（1-99%）**: 一部のPhaseが完了

❌ **未実装（0%）**: 未着手

❓ **未調査**: 実装状況未調査（実装作業開始時に調査）

---

### hotel-saas 実装状況

| バージョン | 状態 | 完了率 | 備考 |
|-----------|-----|--------|------|
| v1.0.0 | ❓ | 未調査 | 実装作業開始時に調査 |

---

### hotel-common 実装状況

| バージョン | 状態 | 完了率 | 備考 |
|-----------|-----|--------|------|
| v1.0.0 | ❓ | 未調査 | 実装作業開始時に調査 |

---

**実装状況最終更新**: YYYY-MM-DD

**調査方法**:
- 実装作業開始時に `/Users/kaneko/hotel-kanri/.cursor/prompts/implementation_status_guardrails.md` の「実装調査ワークフロー」に従って調査します

---

## ✅ 実装チェックリスト

### Phase 0: 準備

- [ ] 関連SSOT確認
- [ ] データベーススキーマ確認
- [ ] 既存実装調査

### Phase 1: データベース設計

- [ ] Prismaスキーマ作成
- [ ] マイグレーション実行
- [ ] テーブル確認

### Phase 2: API実装

#### hotel-common
- [ ] API実装
- [ ] エラーハンドリング
- [ ] テスト

#### hotel-saas
- [ ] プロキシAPI実装
- [ ] 動作確認

### Phase 3: フロントエンド実装

- [ ] ページ実装
- [ ] Composable実装
- [ ] UI/UX確認

### Phase 4: テスト

- [ ] 単体テスト
- [ ] 統合テスト
- [ ] E2Eテスト

### Phase 5: デプロイ・動作確認

- [ ] 開発環境デプロイ
- [ ] ステージング環境デプロイ
- [ ] 本番環境デプロイ
- [ ] SSOT準拠確認

---

## 📝 更新履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | YYYY-MM-DD | 初版作成 | [担当AI] |

---

**最終更新**: YYYY-MM-DD  
**作成者**: [担当AI]

