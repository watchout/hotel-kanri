---
name: impl
description: SSOTに基づいて実装を開始します
---

# /impl コマンド

SSOTに基づいて実装を開始します。

## 使い方

```
/impl [SSOT名]
```

例:
```
/impl SSOT_GUEST_AI_HANDOFF
/impl SSOT_SAAS_MENU_MANAGEMENT
```

## 実行フロー

### Phase 1: SSOT読み込み（必須）

1. 該当SSOTファイルを開く
2. 要件IDを全て抽出
3. Accept条件を確認
4. 「[SSOTファイル名] 読了」と表示

### Phase 2: 既存実装調査（15分）

1. 同ディレクトリの既存ファイル3つ以上確認
2. Prismaスキーマ確認
3. 関連SSOT確認
4. 命名規則・パターン把握

### Phase 3: 実装プラン提案

1. 実装対象ファイル一覧
2. 実装順序
3. 工数見積もり
4. **ユーザー承認待ち**

### Phase 4: 実装

1. SSOT準拠の徹底
2. 命名規則厳守
3. エラーハンドリング統一
4. 認証・セキュリティ確認

### Phase 5: テスト

```bash
# 管理画面
./scripts/test-standard-admin.sh

# ゲスト画面
./scripts/test-standard-guest.sh
```

### Phase 6: 完了報告

```markdown
## 実装完了報告

### 実装ファイル
- [ファイル1]
- [ファイル2]

### テスト結果
✅ PASS / ❌ FAIL

### 要件ID達成状況
- XXX-001: ✅
- XXX-002: ✅
```

## 参照ドキュメント

- skills/hotel-common-patterns.md
- skills/hotel-saas-patterns.md
- skills/multitenant-rules.md

## 禁止事項

- ❌ SSOT未読で実装開始
- ❌ 承認なしで実装開始
- ❌ テストなしで完了報告
