# 🏗️ hotel-saas/hotel-common リビルドプロジェクト概要

**最終更新**: 2025年11月4日  
**目的**: 既存実装のCRUDエラー多発問題を根本解決  
**方針**: 1から実装し直す（テンプレートベース）

---

## 📊 プロジェクト全体像（5分で理解）

### なぜリビルドするのか？

```
現状の問題:
- ほぼ全てのCRUD APIでエラー発生（エラー率30%）
- JWT/Session認証が混在
- $fetch直接使用とcallHotelCommonAPI使用が混在
- パターンが統一されていない
- 修正に時間がかかる（終わりが見えない）

既存修正アプローチ:
- 所要時間: 68時間
- エラー対応: 終わりが見えない
- コード品質: 継ぎはぎだらけ

リビルドアプローチ:
- 所要時間: 24時間（44時間短縮）
- エラー率: 5%未満
- コード品質: 統一パターン
```

### 何を実現するのか？

```
リビルド後の状態:
✅ 全てのCRUD APIが動作する
✅ Session認証に統一
✅ callHotelCommonAPI使用に統一
✅ テンプレートベースで実装パターンを完全統一
✅ エラー率5%未満
✅ 既存環境（localhost:3100/3400）で動作
```

---

## 🏗️ 環境構成

### ディレクトリ構成（リポ方針: 専用rebuildリポを使用）

```
/Users/kaneko/
├─ hotel-kanri/                  ← 共通（SSOT・テンプレート・ドキュメント）
│  ├─ docs/03_ssot/              ← SSOT参照（両環境で使用）
│  ├─ docs/rebuild/              ← リビルドドキュメント
│  └─ templates/                 ← CRUDテンプレート保管
│
├─ hotel-saas/                   ← 既存（温存・localhost:3100）
├─ hotel-common/                 ← 既存（温存・localhost:3400）
│
├─ hotel-saas-rebuild/           ← 新規実装 ★ここで作業（rebuild専用リポ）
│  ├─ .env (PORT=3101)           ← 📌 確定ポート: 3101
│  ├─ server/api/v1/admin/       ← 空（これから実装）
│  └─ node_modules/              ← ✅ インストール済み
│
└─ hotel-common-rebuild/         ← 新規実装 ★ここで作業（rebuild専用リポ）
   ├─ .env (PORT=3401, DATABASE_URL=postgresql://kaneko@localhost:5432/hotel_common)
   │        ↑ 📌 確定ポート: 3401
   ├─ src/routes/                ← 空（これから実装）
   ├─ prisma/schema.prisma       ← 既存をコピー
   ├─ prisma/migrations/         ← マイグレーション履歴
   └─ node_modules/              ← ✅ インストール済み
```

**ポイント**:
- ✅ リビルドは専用リポで進める（既存リポにブランチは作らない）
- ✅ 環境構築完了（kanriが実施済み）
- ✅ 依存関係インストール完了
- ✅ 既存環境と完全分離（ポート番号違い）
- ✅ 同時起動して比較可能

**ポート設定（確定）**:
- 既存 hotel-saas: `3100`
- 既存 hotel-common: `3400`
- **rebuild hotel-saas-rebuild: `3101`** ← 既存+1
- **rebuild hotel-common-rebuild: `3401`** ← 既存+1

---

## 🔌 ポート設定（確定版）

### 全体構成

```
localhost ポートマップ
├─ 既存環境（温存）
│  ├─ hotel-saas: 3100
│  └─ hotel-common: 3400
│
└─ rebuild環境（新規）
   ├─ hotel-saas-rebuild: 3101  ← 📌 確定
   └─ hotel-common-rebuild: 3401 ← 📌 確定
```

### 環境変数設定

#### hotel-saas-rebuild/.env

```bash
PORT=3101
HOTEL_COMMON_API_URL=http://localhost:3401
```

#### hotel-common-rebuild/.env

```bash
PORT=3401
DATABASE_URL=postgresql://kaneko@localhost:5432/hotel_common
REDIS_SESSION_PREFIX=rebuild:session:
```

### 接続確認

```bash
# hotel-saas-rebuild 起動
cd /Users/kaneko/hotel-saas-rebuild
npm run dev
# → http://localhost:3101

# hotel-common-rebuild 起動（別ターミナル）
cd /Users/kaneko/hotel-common-rebuild
npm run dev
# → http://localhost:3401

# Health Check
curl http://localhost:3101/health  # saas-rebuild
curl http://localhost:3401/health  # common-rebuild
```

### 既存環境との同時起動

✅ **可能**: ポート番号が異なるため、既存環境とrebuild環境を同時に起動可能

```bash
# 既存環境
http://localhost:3100  # hotel-saas（既存）
http://localhost:3400  # hotel-common（既存）

# rebuild環境
http://localhost:3101  # hotel-saas-rebuild（新規）
http://localhost:3401  # hotel-common-rebuild（新規）
```

**メリット**:
- 既存環境で動作確認しながらrebuild開発可能
- API応答の比較が簡単
- 段階的な移行・検証が可能

---

### データベース管理

```
PostgreSQL (localhost:5432)
  ├─ 既存環境（hotel-saas:3100 + hotel-common:3400）
  │  └─ 既存DB: hotel_unified_db（変更なし）
  │
  └─ 新規環境（hotel-saas-rebuild:3101 + hotel-common-rebuild:3401）
     └─ 新規DB: hotel_common ★新規作成
     └─ URL: postgresql://kaneko@localhost:5432/hotel_common
```

**重要**:
- 🆕 **hotel-common-rebuildは新規DBを作成**（`hotel_common`）
- ✅ 既存DBとは完全分離（データ汚染なし）
- ✅ Prismaマイグレーションで作成
- ✅ テストテナント・テストデータも新規作成
- ✅ 既存環境への影響ゼロ
- 📌 **確定URL**: `postgresql://kaneko@localhost:5432/hotel_common`

---

### Redis管理

```
Redis (localhost:6379)
  ├─ 既存環境のセッション: session:*
  └─ 新規環境のセッション: rebuild:session:*  ← プレフィックスで分離
```

**設定**:
- 既存: `REDIS_SESSION_PREFIX="session:"`
- 新規: `REDIS_SESSION_PREFIX="rebuild:session:"`

---

### ポート番号

| 環境 | hotel-saas | hotel-common |
|-----|-----------|-------------|
| **既存** | 3100 | 3400 |
| **新規** | 3101 | 3401 |

**メリット**: 既存と新規を同時起動して比較可能

---

## 🎯 実装フロー

### 現在地

```
✅ Phase 0: 環境構築（完了）
  - hotel-saas-rebuild 作成完了
  - hotel-common-rebuild 作成完了
  - 依存関係インストール完了

👉 Phase 1: テンプレート作成（これから）
  - テストテナント作成（Phase 1で実施）
```

### Phase 1: テンプレート作成（2時間）

```
目的: 動作確認済みのテンプレートを作成

タスク:
0. 新規DB作成（30分） ★追加
   - hotel_unified_db_rebuild 作成
   - Prismaマイグレーション実行
   - テストテナント作成

1. hotel-common CRUDテンプレート作成（1時間）
   - sessionAuthMiddleware 使用
   - tenantId チェック
   - Prisma使用（新規DB接続）
   - エラーハンドリング統一

2. hotel-saas プロキシテンプレート作成（30分）
   - callHotelCommonAPI 使用
   - Cookie自動転送
   - エラーハンドリング統一

3. 動作確認（30分）
   - 客室グレードで実装
   - CRUD全て動作確認
   - エラーゼロ確認

完了条件:
✅ 新規DB作成完了（hotel_unified_db_rebuild）
✅ テンプレート2種類完成
✅ 客室グレードのCRUD全て動作
✅ エラーゼロ

次に進む条件:
✅ 新規DBが正常に動作
✅ テンプレートが完全に動作する
```

### Phase 2: 機能実装（20時間）

```
目的: 全機能をテンプレート使用して実装

実装パターン:
1. Plane Issueを確認
2. SSOTを読む（ある場合）
3. テンプレートをコピー
4. リソース名を置換
5. 動作確認（./crud-verify.sh）
6. ユーザーに報告
7. 承認後にPlane IssueをDoneに

優先度別実装:
- 最優先（5時間）: 認証・テナント・スタッフ・権限
- 高優先（8時間）: 客室・予約・顧客・料金
- 中優先（4時間）: キャンペーン・施設・アメニティ
- 低優先（3時間）: ログ・ダッシュボード

完了条件:
✅ 全機能のCRUD動作
✅ エラー率5%未満
✅ ユーザー承認済み

注: 工数はROADMAPの基準（Phase2=20h）を採用。短縮は実測蓄積後に反映。
```

### Phase 3: テスト（2時間）

```
目的: CRUD統合テスト + シナリオテスト

テスト内容:
1. CRUD統合テスト（1時間）
   - ./crud-verify-all.sh 実行
   - エラー率計算

2. シナリオテスト（1時間）
   - ログイン → 予約 → チェックイン
   - 全シナリオ動作確認

完了条件:
✅ 全テスト成功
✅ エラーゼロ
```

### Phase 4: 統合（3時間）

```
目的: 既存環境への統合

手順:
1. バックアップ（30分）
2. コード統合（1時間）
3. 最終動作確認（1時間）
4. クリーンアップ（30分）

完了条件:
✅ 既存環境（localhost:3100/3400）で全機能動作
✅ エラーゼロ
```

#### 統合PRの品質基準（Branch Protection適用対象）

統合PRは既存リポ（`hotel-saas` / `hotel-common`）の main/develop に対して作成し、以下を満たす。

- ✅ Critical Gates 全て Green（PRブロック要件）
  - evidence-check（PR本文に必須4見出し）
  - ssot-compliance（SSOT整合）
  - crud-verify（artifact: crud-verify-results.txt 必須）
  - lint-and-typecheck（--max-warnings=0）
  - security（npm audit）
- ✅ rebuild環境（3101/3401）で全機能動作確認済み（エラー率 < 5%）
- ✅ PR本文に下記を記載
  - 参照SSOT一覧 / 要件ID
  - CRUD Verify 成果物URL（artifact）
  - CI実行結果（全てGreen）
  - 必要なスクリーンショット/ログ
- ✅ 承認: レビュー1名以上 + 会話解決

---

## 📖 SSOTとの関係

### SSOTがある機能（SSOT準拠実装）

| 機能 | SSOT | 実装方針 |
|-----|------|---------|
| 認証・セッション | SSOT_SAAS_ADMIN_AUTHENTICATION.md | SSOT + テンプレート |
| テナント管理 | SSOT_SAAS_MULTITENANT.md | SSOT + テンプレート |
| スタッフ管理 | SSOT_SAAS_STAFF_MANAGEMENT.md | SSOT + テンプレート |
| 権限管理 | SSOT_SAAS_PERMISSION_SYSTEM.md | SSOT + テンプレート |
| 客室グレード | SSOT_SAAS_ROOM_MANAGEMENT.md | SSOT + テンプレート |
| 客室管理 | SSOT_SAAS_ROOM_MANAGEMENT.md | SSOT + テンプレート |
| 料金・プラン | SSOT_SAAS_PRICING_MANAGEMENT.md | SSOT + テンプレート |

**実装フロー**:
1. SSOTを読み込む
2. 機能要件・データ構造・API仕様を理解
3. テンプレートを使用して実装
4. SSOT のAccept条件を満たす

---

### SSOTがない機能（最小限実装）

| 機能 | 対応方針 | SSOT作成予定 |
|-----|---------|------------|
| 予約管理 | 既存実装参考 + テンプレート | リビルド完了後 |
| 顧客管理 | 既存実装参考 + テンプレート | リビルド完了後 |
| キャンペーン管理 | 既存実装参考 + テンプレート | リビルド完了後 |

**実装フロー**:
1. 既存実装を確認（参考程度）
2. テンプレートを使用して最小限CRUD実装
3. 動作確認
4. リビルド完了後にSSOT作成

---

## 🔄 Phase完了の判断

### 各Phase完了時のルール

```
実装AI:
1. 完了条件を全て確認
2. ユーザーに報告
   「Phase X完了しました。完了条件：
    ✅ 条件1
    ✅ 条件2
    次のPhaseに進んでよろしいですか？」
3. ユーザーの承認を待つ

ユーザー:
「承認します」または「修正が必要です」

❌ 絶対禁止:
- 自動で次のPhaseに進む
- 承認なしでPhaseを完了にする
- 完了条件を満たさずに次に進む
```

---

## 🚨 エラー発生時の対応

### エラー検知

以下の場合、**即座に実装を停止**:
- ❌ CRUD動作確認でエラー
- ❌ テスト実行でエラー
- ❌ 依存関係のブロック
- ❌ データベース接続エラー

### 対応フロー

```
Step 1: 実装即座停止
  ↓ エラーを修正しようとしない
  
Step 2: 該当SSOTを再確認
  ↓ 機能要件を再読み込み
  
Step 3: テンプレートを再確認
  ↓ 実装パターンが正しいか確認
  
Step 4: ユーザーに報告
  「エラーが発生しました。
   エラー内容: XXX
   該当機能: YYY
   原因: ZZZ
   対応方針: AAA」
  
Step 5: 承認後に修正・再開
  ↓ ユーザーの承認を得てから修正
```

### よくあるエラーパターン

| エラー | 原因 | 対処法 |
|-------|------|--------|
| 401 Unauthorized | Cookie転送されていない | callHotelCommonAPI使用確認 |
| tenantId undefined | セッションからtenantId取得失敗 | sessionAuthMiddleware確認 |
| Prisma error | テーブル名・カラム名間違い | schema.prisma確認 |
| CRUD動作しない | テンプレート置換ミス | リソース名確認 |

---

## 📊 進捗管理

### Plane完全依存

```
Plane（唯一の真実・リアルタイム）
  ├─ Project: hotel-saas/hotel-common リビルド
  ├─ Cycles: Phase 1-4
  ├─ Issues: REBUILD-1〜REBUILD-15（優先度別に集約）
  ├─ Dependencies: Blocked by設定
  └─ Progress: リアルタイム更新

  ↓ 週次自動エクスポート

REBUILD_PROGRESS.md（新規・読み取り専用・バックアップ）
  ├─ Planeデータを自動変換
  ├─ Markdown形式で保存
  └─ Git履歴に残る
```

**ルール**:
- ✅ 進捗はPlaneで更新
- ✅ タスク追加はPlaneで実施
- ✅ 依存関係はPlaneで管理
- ❌ Fileでの手動更新は禁止

**補足（粒度/受入）**:
- REBUILD-1〜16は「エピック」層。各Issueに標準サブタスク（DB/API/Proxy/UI/Test/Verifyの6〜10件）を必ず追加。
- Issue Doneの受入基準: 両リポジトリでCI green（lint/type/test/build/security）かつ対象機能のCRUD Verify成功（証跡をPlaneに添付）。

---

## 📚 ドキュメント構成

```
/Users/kaneko/hotel-kanri/docs/rebuild/
├── OVERVIEW.md           ← このファイル（プロジェクト全体像）
├── ROADMAP.md            ← Phase別詳細計画（既存）
├── TEMPLATE_SPEC.md      ← テンプレート完全仕様
└── PLANE_ISSUES.md       ← Issue定義
```

**読む順序**:
1. **OVERVIEW.md**（このファイル）← まずこれを読む
2. **ROADMAP.md** ← Phase別の詳細を確認
3. **TEMPLATE_SPEC.md** ← テンプレート作成時に参照
4. **PLANE_ISSUES.md** ← タスク一覧を確認

---

## 🎯 成功の定義

### 定量的基準

1. **全てのCRUD APIが動作する**
   - Create/Read/Update/Delete 全て動作
   - エラー率5%未満

2. **実装パターンが統一されている**
   - 全てテンプレートベース
   - Session認証統一
   - callHotelCommonAPI統一

3. **既存環境で動作する**
   - localhost:3100/3400 で動作
   - 既存データベース使用
   - エラーゼロ

4. **時間内に完了する**
   - 目標: 24時間
   - 許容: 30時間

### エラー率の測定方法

```bash
# 全API数
TOTAL_APIS=$(find server/api -name "*.ts" | wc -l)

# 失敗API数（./crud-verify-all.sh の結果から）
FAILED_APIS=$(grep "❌" test-results.txt | wc -l)

# エラー率
ERROR_RATE=$(echo "scale=2; $FAILED_APIS / $TOTAL_APIS * 100" | bc)

# 判定
if [ $ERROR_RATE -lt 5 ]; then
  echo "✅ 成功（エラー率: ${ERROR_RATE}%）"
else
  echo "❌ 失敗（エラー率: ${ERROR_RATE}%）"
fi
```

---

## 🚀 次のアクション

### 実装AIへの指示

```
Step 1: このOVERVIEW.mdを読む（5分）
  ↓ プロジェクト全体像を理解

Step 2: TEMPLATE_SPEC.mdを読む（15分）
  ↓ テンプレートの完全なコードを確認

Step 3: Phase 1開始
  ↓ テンプレート作成

Step 4: PLANE_ISSUES.mdでタスク確認
  ↓ Plane Issueに従って実装
```

### 開始コマンド

```bash
# 新規環境に移動
cd /Users/kaneko/hotel-saas-rebuild

# テンプレート作成開始
# 詳細は TEMPLATE_SPEC.md を参照
```

---

## 📞 問い合わせ

問題・質問がある場合:
- Luna（設計・管理AI）に相談
- `/Users/kaneko/hotel-kanri/docs/rebuild/` を参照

---

## 🎓 重要な心構え

```
「慌てて修正」ではなく「テンプレート使用」
「想像で実装」ではなく「SSOT確認」
「いきなり実装」ではなく「まず動作確認」
「動けばいい」ではなく「パターン統一」
```

**テンプレートを使えば、エラーは出ません。**

