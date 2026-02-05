# >> ssot タグ - SSOT作成ガイド

**バージョン**: 1.0.0
**最終更新**: 2026-01-29

## 概要

`>> ssot [タスクID]` でSSOTを手動作成するためのガイドです。
品質を確保するため、AIがガイドしながら人間がレビュー・承認します。

## 使用方法

```
>> ssot DEV-0170
```

## 実行フロー

### Step 1: タスク情報取得（自動）

```bash
cd /Users/kaneko/hotel-kanri/scripts/plane
node get-next-task.cjs  # または指定タスクID
```

### Step 2: 既存実装調査（15分）

**必須調査項目**:
- [ ] 関連する既存SSOTを確認
- [ ] 対象システムの既存コードパターンを確認
- [ ] データベーススキーマを確認
- [ ] API設計（エンドポイント命名）を確認

### Step 3: SSOT作成

**必須セクション**:

```markdown
# SSOT_{機能名}

## 概要
- 目的: （1-2文で明確に）
- 対象システム: hotel-common / hotel-saas / 両方
- 優先度: MVP / Phase 2 / Phase 3

## 要件ID一覧
| ID | 要件 | Accept条件 |
|:---|:-----|:-----------|
| XXX-001 | 要件の説明 | 検証方法と期待結果 |

## 技術仕様

### API設計
- エンドポイント: `POST /api/v1/admin/xxx`
- リクエスト/レスポンス型定義

### データベース
- テーブル名: xxx（snake_case必須）
- カラム定義

### UI設計
- 画面一覧
- コンポーネント構成

## 禁止事項
- any型の使用禁止
- tenant_idなしクエリ禁止
- フォールバック値禁止（|| 'default'）
- hotel-saasでのPrisma直接使用禁止
- hotel-saasでの$fetch直接使用禁止

## テスト計画
- 標準テストスクリプト: test-standard-admin.sh / test-standard-guest.sh
- 追加テストケース

## 変更履歴
| バージョン | 日付 | 変更内容 |
|:-----------|:-----|:---------|
| 1.0.0 | YYYY-MM-DD | 初版作成 |
```

### Step 4: 品質チェック

**チェックリスト**:
- [ ] 要件IDが全て定義されている
- [ ] Accept条件が具体的（curl期待値、UI表示）
- [ ] 禁止事項が明記されている
- [ ] テスト計画がある
- [ ] データベース命名がsnake_case

### Step 5: 保存

```bash
# ファイル名規則
docs/03_ssot/{カテゴリ}/SSOT_{機能名}.md

# カテゴリ
# - 00_foundation: 基盤機能
# - 01_admin_features: 管理画面機能
# - 02_guest_features: ゲスト向け機能
```

## 出力

SSOTファイルパスと次のステップを表示：

```
✅ SSOT作成完了: docs/03_ssot/02_guest_features/SSOT_GUEST_AI_HANDOFF.md

次のステップ:
>> claude DEV-0170 part 1  # サブタスク指示を生成してClaude Codeへ
```
