# >> audit タグ - Cursor監査＆テスト

**バージョン**: 1.0.0
**最終更新**: 2026-01-29

## 概要

`>> audit [タスクID]` でClaude Codeの実装結果を監査し、テストを実行します。
Cursor（あなた）が実行し、品質を検証します。

## 使用方法

```
>> audit DEV-0170
```

## 監査フロー

### Phase 1: SSOT準拠確認（自動）

```bash
# 1. 変更ファイル一覧取得
cd /Users/kaneko/hotel-common-rebuild && git status
cd /Users/kaneko/hotel-saas-rebuild && git status

# 2. SSOT要件IDの実装確認
grep -r "XXX-001\|XXX-002" src/ server/
```

**チェック項目**:
- [ ] 全ての要件IDが実装されている
- [ ] Accept条件が満たされている

### Phase 2: 禁止パターン検出（自動）

```bash
# hotel-saas-rebuild
cd /Users/kaneko/hotel-saas-rebuild

# Prisma直接使用
grep -r "PrismaClient\|from '@prisma/client'" server/ pages/ --include="*.ts" --include="*.vue"

# $fetch直接使用
grep -r "\$fetch\s*(" server/ --include="*.ts" | grep -v "callHotelCommonAPI"

# フォールバック値
grep -r "|| 'default'\|?? 'default'\||| null\|?? null" server/ pages/ --include="*.ts" --include="*.vue"

# any型
grep -r ": any\|as any" server/ pages/ --include="*.ts" --include="*.vue"

# hotel-common-rebuild
cd /Users/kaneko/hotel-common-rebuild

# tenant_idなしクエリ
grep -r "findMany\|findFirst\|findUnique" src/ --include="*.ts" | grep -v "tenantId\|tenant_id"
```

**禁止パターン一覧**:
| パターン | 検出コマンド | 対処 |
|:---------|:------------|:-----|
| Prisma直接（saas） | `grep PrismaClient` | callHotelCommonAPI使用 |
| $fetch直接（saas） | `grep $fetch` | callHotelCommonAPI使用 |
| フォールバック値 | `grep "|| 'default'"` | エラースロー |
| any型 | `grep ": any"` | 適切な型定義 |
| tenant_idなし | `grep findMany` | where句にtenantId追加 |

### Phase 3: 標準テスト実行（自動）

```bash
# 管理画面テスト
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh 2>&1 | tee /tmp/test-admin.log

# ゲスト画面テスト（該当する場合）
./test-standard-guest.sh 2>&1 | tee /tmp/test-guest.log
```

### Phase 4: API動作確認（手動/自動）

```bash
# ログイン
curl -s -c /tmp/cookies.txt -X POST http://localhost:3401/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}'

# 対象API確認
curl -s -b /tmp/cookies.txt http://localhost:3401/api/v1/admin/xxx | jq .
```

### Phase 5: Evidence保存

```bash
# ディレクトリ作成
mkdir -p /Users/kaneko/hotel-kanri/evidence/DEV-XXXX

# ログ保存
cp /tmp/test-admin.log /Users/kaneko/hotel-kanri/evidence/DEV-XXXX/
cp /tmp/test-guest.log /Users/kaneko/hotel-kanri/evidence/DEV-XXXX/

# git status保存
cd /Users/kaneko/hotel-common-rebuild && git status > /Users/kaneko/hotel-kanri/evidence/DEV-XXXX/git-status-common.txt
cd /Users/kaneko/hotel-saas-rebuild && git status > /Users/kaneko/hotel-kanri/evidence/DEV-XXXX/git-status-saas.txt
```

## 監査結果レポート

### 合格時

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DEV-XXXX 監査結果: PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## SSOT準拠
- [x] 要件ID: 5/5 実装済み
- [x] Accept条件: 全て満たす

## 禁止パターン
- [x] Prisma直接: なし ✅
- [x] $fetch直接: なし ✅
- [x] フォールバック: なし ✅
- [x] any型: なし ✅
- [x] tenant_idなし: なし ✅

## テスト
- [x] test-standard-admin.sh: PASS ✅
- [x] test-standard-guest.sh: PASS ✅

## Evidence
- evidence/DEV-XXXX/test-admin.log
- evidence/DEV-XXXX/test-guest.log
- evidence/DEV-XXXX/git-status-common.txt
- evidence/DEV-XXXX/git-status-saas.txt

## 次のステップ
- git add . && git commit -m "feat(DEV-XXXX): 実装完了"
- gh pr create
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 不合格時

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DEV-XXXX 監査結果: FAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 検出された問題

### 禁止パターン違反
1. server/api/v1/admin/xxx.ts:15 - any型使用
   ```typescript
   const data: any = await response.json()
   ```
   → 修正: `const data: XxxResponse = await response.json()`

2. server/api/v1/admin/xxx.ts:23 - $fetch直接使用
   ```typescript
   const result = await $fetch(url)
   ```
   → 修正: `const result = await callHotelCommonAPI(event, url)`

### テスト失敗
- test-standard-admin.sh: FAIL
  - エラー: 401 Unauthorized at /api/v1/admin/xxx
  - 原因: Cookie転送が未実装

## 修正指示

Claude Codeに以下を依頼:

```text
DEV-XXXX 監査で以下の問題が検出されました。修正してください。

1. server/api/v1/admin/xxx.ts:15
   - 問題: any型使用
   - 修正: XxxResponse型を定義して使用

2. server/api/v1/admin/xxx.ts:23
   - 問題: $fetch直接使用
   - 修正: callHotelCommonAPI(event, url)を使用

3. テスト失敗
   - 問題: 401 Unauthorized
   - 修正: Cookie転送の実装確認
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 自動監査スクリプト

```bash
#!/bin/bash
# scripts/audit-task.sh

TASK_ID=$1
EVIDENCE_DIR="/Users/kaneko/hotel-kanri/evidence/${TASK_ID}"

mkdir -p "$EVIDENCE_DIR"

echo "━━━ Phase 1: 禁止パターン検出 ━━━"

# hotel-saas
cd /Users/kaneko/hotel-saas-rebuild
echo "Checking hotel-saas-rebuild..."

PRISMA=$(grep -r "PrismaClient" server/ pages/ --include="*.ts" --include="*.vue" 2>/dev/null | wc -l)
FETCH=$(grep -r "\$fetch\s*(" server/ --include="*.ts" 2>/dev/null | grep -v "callHotelCommonAPI" | wc -l)
ANY=$(grep -r ": any\|as any" server/ pages/ --include="*.ts" --include="*.vue" 2>/dev/null | wc -l)
FALLBACK=$(grep -r "|| 'default'\|?? 'default'" server/ pages/ --include="*.ts" --include="*.vue" 2>/dev/null | wc -l)

echo "  Prisma直接: $PRISMA"
echo "  \$fetch直接: $FETCH"
echo "  any型: $ANY"
echo "  フォールバック: $FALLBACK"

# hotel-common
cd /Users/kaneko/hotel-common-rebuild
echo "Checking hotel-common-rebuild..."

TENANT=$(grep -r "findMany\|findFirst" src/ --include="*.ts" 2>/dev/null | grep -v "tenantId\|tenant_id" | wc -l)
echo "  tenant_idなし: $TENANT"

echo ""
echo "━━━ Phase 2: 標準テスト ━━━"
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh 2>&1 | tee "$EVIDENCE_DIR/test-admin.log"

echo ""
echo "━━━ Evidence保存完了 ━━━"
ls -la "$EVIDENCE_DIR/"
```
