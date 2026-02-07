# Claude.ai バックグラウンドタスク実行プロンプト

## 概要

このプロンプトは、Claude.aiのバックグラウンドタスク機能を使用して、
PCを閉じても開発が継続するSSOTベースの自動開発を実現するためのものです。

## 実行手順

### Step 1: タスクキューの確認

```bash
cd /Users/kaneko/hotel-kanri
node scripts/auto-dev/queue-manager.cjs list
```

**確認事項**:
- [ ] 待機中のタスクがあるか
- [ ] 処理中のタスクがないか（ある場合は先に完了させる）

### Step 2: 次のタスクを取得

```bash
node scripts/auto-dev/queue-manager.cjs next
```

タスク情報を確認:
- タスクID（例: DEV-0175）
- SSOTパス（例: docs/03_ssot/01_admin_features/SSOT_XXX.md）
- 優先度

### Step 3: タスク処理を開始

```bash
node scripts/auto-dev/queue-manager.cjs start DEV-XXXX
```

### Step 4: SSOTを読み込む（必須）

```bash
cat docs/03_ssot/[SSOTパス]
```

**必ず確認する項目**:
1. 要件ID一覧（XXX-nnn形式）
2. Accept（合格条件）
3. 実装対象ファイル
4. テストケース

### Step 5: 既存実装の調査（15分）

```bash
# 関連ファイルの確認
ls -la [関連ディレクトリ]

# 既存コードの確認
cat [関連ファイル]

# Prismaスキーマの確認（DB関連の場合）
cat /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma | grep -A 20 "model [モデル名]"
```

### Step 6: 実装ブランチ作成

```bash
cd /Users/kaneko/hotel-common-rebuild  # または hotel-saas-rebuild
git checkout develop
git pull origin develop
git checkout -b feature/DEV-XXXX-[簡潔な説明]
```

### Step 7: 実装

SSOTの要件IDを順番に実装:
1. 各要件IDに対応するコードを実装
2. コード内に要件IDをコメントで記載

```typescript
// AUTH-001: ログイン機能
export async function login(email: string, password: string) {
  // 実装
}
```

### Step 8: テスト実行

```bash
# hotel-common の場合
cd /Users/kaneko/hotel-common-rebuild
npm run test

# hotel-saas の場合
cd /Users/kaneko/hotel-saas-rebuild
npm run test

# 統合テスト
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh  # 管理画面の場合
./test-standard-guest.sh  # ゲスト画面の場合
```

### Step 9: コミット

```bash
git add .
git commit -m "$(cat <<'EOF'
feat(DEV-XXXX): [機能名]を実装

## 参照SSOT
- docs/03_ssot/[SSOTパス]

## 実装要件
- [XXX-001]: [要件内容]
- [XXX-002]: [要件内容]

## テスト
- 単体テスト: Pass
- 統合テスト: Pass
EOF
)"
```

### Step 10: PR作成

```bash
git push -u origin HEAD

gh pr create --title "[DEV-XXXX] [機能名]を実装" --body "$(cat <<'EOF'
## 参照SSOT
- docs/03_ssot/[SSOTパス]

## Plane Issue
- [DEV-XXXX](Plane URL)

## 実装要件
- [x] XXX-001: [要件内容]
- [x] XXX-002: [要件内容]

## テスト・証跡

### Evidence 1: Commands & Logs
```
[テスト実行ログ]
```

### Evidence 2: Files
```
[変更ファイル一覧]
```

## CI
- [ ] CI通過待ち
EOF
)"
```

### Step 11: タスク完了

```bash
cd /Users/kaneko/hotel-kanri
node scripts/auto-dev/queue-manager.cjs complete DEV-XXXX --prUrl [PR URL]
```

### Step 12: 次のタスクへ

Step 2 に戻り、次のタスクを処理する。

---

## マルチLLMペアプログラミング（推奨）

品質をさらに高めるため、マルチLLMによるレビュー・監査を活用できます。

### オプション1: 並列コードレビュー

実装後、複数LLMでコードレビュー:

```bash
cd /Users/kaneko/hotel-kanri
node scripts/auto-dev/multi-llm-pair-programming.cjs review \
  /Users/kaneko/hotel-common-rebuild/src/routes/[実装ファイル].ts \
  --ssot docs/03_ssot/[SSOTパス]
```

**レビュー構成**:
- GPT-4o: コードレビュー1
- Gemini 1.5 Pro: コードレビュー2

**判定基準**: 85点以上でPass

### オプション2: マルチLLM SSOT監査

PR前にSSoT準拠を厳密チェック:

```bash
node scripts/auto-dev/multi-llm-pair-programming.cjs audit \
  docs/03_ssot/[SSOTパス] \
  /Users/kaneko/hotel-common-rebuild/src/routes/[実装ファイル].ts
```

**監査構成**:
- Claude Opus 4: SSOT監査
- GPT-4o: SSOT監査
- Gemini 1.5 Pro: SSOT監査

**判定基準**: 3モデル中2以上でPass（投票方式）

### オプション3: ペアプログラミング生成

Claude + GPT-4oのペアプログラミング形式でコード生成:

```bash
node scripts/auto-dev/multi-llm-pair-programming.cjs generate \
  docs/03_ssot/[SSOTパス]
```

**フロー**:
1. Claude（Driver）が初期実装
2. GPT-4o（Navigator）がレビュー・指摘
3. Claude（Driver）が修正を反映
4. 最終版コードを出力

---

## 重要なルール

### 絶対禁止パターン

1. **SSOT未読で実装開始**
   - 必ずSSOTを読んでから実装する

2. **hotel-saasでPrisma直接使用**
   ```typescript
   // ❌ 禁止
   import { PrismaClient } from '@prisma/client';
   
   // ✅ callHotelCommonAPIを使用
   import { callHotelCommonAPI } from '~/server/utils/api-client';
   ```

3. **フォールバック値の使用**
   ```typescript
   // ❌ 禁止
   const tenantId = session.tenantId || 'default';
   
   // ✅ エラーを投げる
   if (!session.tenantId) {
     throw new Error('テナントIDが取得できません');
   }
   ```

4. **環境分岐実装**
   ```typescript
   // ❌ 禁止
   if (process.env.NODE_ENV === 'development') { ... }
   ```

### エラー発生時の対応

1. 実装を即座に停止
2. 該当SSOTを再読み込み
3. エラー内容を記録
4. リトライまたはタスクを失敗としてマーク

```bash
node scripts/auto-dev/queue-manager.cjs fail DEV-XXXX --reason "CI failed: [エラー内容]"
```

### CI失敗時の対応

1. CIログを確認
2. 失敗原因を特定
3. 修正をコミット
4. 再度プッシュ
5. 3回失敗したらタスクを失敗としてマーク

---

## バッチ実行モード

夜間に複数タスクを一括処理する場合:

```
1. task-queue.json の全タスクを確認
2. 各タスクを順番に処理
3. 1タスク完了ごとに次のタスクへ
4. 全タスク完了または失敗で終了
```

---

## チェックリスト

### タスク開始前
- [ ] task-queue.json を確認
- [ ] 処理中のタスクがないことを確認
- [ ] SSOTファイルが存在することを確認

### 実装中
- [ ] SSOTを読んだ
- [ ] 要件IDを全て抽出した
- [ ] 既存実装を調査した
- [ ] ブランチを作成した

### 実装後
- [ ] 全ての要件IDを実装した
- [ ] テストが通った
- [ ] コミットメッセージにSSOT参照を含めた
- [ ] PRを作成した
- [ ] task-queue.json を更新した

---

## 参考リンク

- [SSOT一覧](docs/03_ssot/README.md)
- [品質チェックリスト](docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md)
- [実装チェックリスト](docs/03_ssot/00_foundation/SSOT_IMPLEMENTATION_CHECKLIST.md)
- [API Routingガイドライン](docs/01_systems/saas/API_ROUTING_GUIDELINES.md)
