---
name: gate
description: 品質ゲートチェックを実行します
allowed-tools: Read, Grep, Glob, Bash
---

# /gate コマンド

PR前の品質ゲートチェックを実行します。

## 使用方法

```bash
/gate                    # 全チェック
/gate --common           # hotel-common-rebuildのみ
/gate --saas             # hotel-saas-rebuildのみ
/gate --patterns         # 禁止パターンのみ
/gate --build            # ビルドのみ
/gate --test             # テストのみ
```

## チェック内容

### Phase 1: 禁止パターン検出

**Critical（即停止）**
- hotel-saasでPrisma使用
- フォールバック値（`|| 'default'`）
- hotel-saasで直接API呼び出し

**High（修正必須）**
- any型使用
- tenant_idなしクエリ
- server/api/でindex.*ファイル

**Warning（推奨修正）**
- console.log
- TODO/FIXME
- @ts-ignore

### Phase 2: ビルド

```bash
# hotel-common
npm run build

# hotel-saas
npm run build
```

### Phase 3: テスト

```bash
# hotel-common
npm run test

# hotel-saas
npm run test
```

### Phase 4: SSOT準拠

```bash
# hotel-kanri
npm run check:ssot-links
```

## 判定基準

| 判定 | 条件 |
|:-----|:-----|
| ✅ PASS | Critical 0, High 0, ビルド成功, テスト成功 |
| ⚠️ 要修正 | Critical 0, High > 0 |
| ❌ FAIL | Critical > 0 または ビルド失敗 または テスト失敗 |

## 出力

```markdown
## 品質ゲートレポート

### 総合判定: ✅ PASS / ⚠️ 要修正 / ❌ FAIL

### Phase 1: 禁止パターン
- Critical: X件
- High: X件
- Warning: X件

### Phase 2: ビルド
- hotel-common: ✅/❌
- hotel-saas: ✅/❌

### Phase 3: テスト
- hotel-common: X pass, X fail
- hotel-saas: X pass, X fail

### 推奨アクション
1. ...
```

## 自動実行

```bash
# GitHubActions で自動実行される
# .github/workflows/quality-gate.yml
```

## 関連コマンド

- `/api` - API実装
- `/ui` - UI実装
- `/integrate` - 統合確認
- `/review` - コードレビュー
