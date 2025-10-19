# 📊 SSOT進捗監視スクリプト

**作成日**: 2025-10-08  
**バージョン**: 1.0.0  
**管理者**: Iza（統合管理者）

---

## 🎯 目的

hotel-kanriプロジェクトのSSOT（Single Source of Truth）作成進捗を自動的に監視し、統一フォーマットで報告するためのスクリプトです。

---

## 📁 ファイル構成

```
/Users/kaneko/hotel-kanri/scripts/monitoring/
├── check-ssot-progress.sh      # メインスクリプト（進捗確認）
├── ssot-progress-config.json   # 設定ファイル（目標数・Phase定義）
└── README.md                    # このファイル（使用方法）
```

---

## 🚀 使用方法

### 基本的な実行

```bash
# プロジェクトルートから実行
/Users/kaneko/hotel-kanri/scripts/monitoring/check-ssot-progress.sh

# または、スクリプトディレクトリに移動して実行
cd /Users/kaneko/hotel-kanri/scripts/monitoring
./check-ssot-progress.sh
```

### 出力をファイルに保存

```bash
# テキストファイルとして保存
./check-ssot-progress.sh > progress_report_$(date +%Y%m%d).txt

# カラーコードを含めて保存（ターミナルで表示時に色付き）
./check-ssot-progress.sh | tee progress_report_$(date +%Y%m%d).txt
```

### 定期実行（cron）

毎日午前9時に自動実行し、ログを保存する場合：

```bash
# crontabを編集
crontab -e

# 以下の行を追加
0 9 * * * /Users/kaneko/hotel-kanri/scripts/monitoring/check-ssot-progress.sh > /Users/kaneko/hotel-kanri/logs/ssot_progress_$(date +\%Y\%m\%d).log 2>&1
```

---

## 📋 出力内容

### 1. 総合進捗状況

- 全体の進捗率（%）
- カテゴリ別の作成済み/未作成/合計数
- カテゴリ別進捗率

### 2. カテゴリ別詳細

各カテゴリ（00_foundation、01_admin_features等）ごとに：

- 作成済みSSOTファイルのリスト
- ファイル数とパーセンテージ

### 3. Phase別進捗状況

- MVP完成状況（12件中何件完成か）
- Phase 1〜5の進捗状況
- 各Phaseの進捗バー

### 4. マイルストーン状況

- M0（MVP）〜M5（Phase 5完了）までの状態
- 目標日と稼働率

### 5. サマリー

- 作成済みSSOT総数
- 残りSSOT数
- 現在の稼働率
- 最終目標日

---

## ⚙️ 設定ファイルの更新

`ssot-progress-config.json`を編集することで、以下を変更できます：

### 1. 目標SSOT数の変更

```json
"target_counts": {
  "00_foundation": 14,        // ← この数値を変更
  "01_admin_features": 20,
  // ...
}
```

### 2. MVP必須SSOTの追加・削除

```json
"mvp_required": {
  "files": [
    "SSOT_SAAS_AUTHENTICATION.md",
    // ← 追加・削除可能
  ]
}
```

### 3. Phase定義の変更

```json
"phase1_required": {
  "description": "Phase 1完成に必要なSSOT（6件）",
  "files": [
    // ← 追加・削除可能
  ]
}
```

### 4. マイルストーン情報の更新

```json
"milestones": {
  "M1": {
    "name": "Phase 1完了（基盤完成）",
    "target_date": "2025-10-28",  // ← 日付を変更
    "uptime_target": "92%",       // ← 目標稼働率を変更
    "status": "pending"           // ← 状態を変更
  }
}
```

### 5. 変更履歴の記録

設定を変更した場合は、必ず`update_notes`セクションに記録してください：

```json
"update_notes": [
  {
    "date": "2025-10-15",
    "version": "1.1.0",
    "changes": [
      "Phase 2のSSOTを追加",
      "目標日を1週間延期"
    ]
  }
]
```

---

## 🔧 スクリプトのカスタマイズ

### 進捗バーの幅を変更

`check-ssot-progress.sh`の`generate_progress_bar`関数内：

```bash
generate_progress_bar() {
    local percent=$1
    local width=20  # ← この数値を変更（デフォルト: 20文字）
    # ...
}
```

### カラーコードの変更

スクリプト冒頭のカラーコード定義を変更：

```bash
# カラーコード
GREEN='\033[0;32m'    # 緑
YELLOW='\033[1;33m'   # 黄色
RED='\033[0;31m'      # 赤
BLUE='\033[0;34m'     # 青
NC='\033[0m'          # リセット
```

---

## 📝 運用ルール

### 1. 定期確認

- **推奨頻度**: 毎日1回（朝会前）
- **方法**: スクリプトを手動実行、または cron で自動実行

### 2. 設定更新タイミング

以下の場合は`ssot-progress-config.json`を更新してください：

- ✅ 新しいSSOTを追加する計画が確定したとき
- ✅ Phase定義を変更するとき
- ✅ マイルストーンの目標日を変更するとき
- ✅ 目標SSOT数を変更するとき

### 3. バージョン管理

- 設定ファイルを更新したら、必ず`version`と`last_updated`を更新
- `update_notes`に変更内容を記録
- Git commitメッセージに「[SSOT進捗] 設定更新: 〇〇を変更」と記載

### 4. レポート保存

重要なマイルストーン達成時は、レポートをファイルに保存して記録：

```bash
./check-ssot-progress.sh > /Users/kaneko/hotel-kanri/docs/reports/ssot_progress_M1_completed.txt
```

---

## 🎯 活用例

### 例1: 朝会での進捗共有

```bash
# 朝会前にレポートを生成
./check-ssot-progress.sh

# 出力された進捗率とPhase状況を共有
# 「現在、Phase 1が33.3%完成しています。残り4件のSSOTを今週中に完成させます」
```

### 例2: 週次報告

```bash
# 毎週金曜日にレポートを保存
./check-ssot-progress.sh > ~/Desktop/weekly_report_$(date +%Y%m%d).txt

# 経営陣へのレポートに添付
```

### 例3: マイルストーン達成確認

```bash
# Phase 1完了確認
./check-ssot-progress.sh | grep "Phase 1"

# 出力例:
# 🔴 Phase 1（基盤完成）: 6/6 (100.0%)
# ■■■■■■■■■■■■■■■■■■■■  100.0%
```

---

## 🐛 トラブルシューティング

### 問題1: スクリプトが実行できない

```bash
# 実行権限を確認
ls -l check-ssot-progress.sh

# 実行権限がない場合は付与
chmod +x check-ssot-progress.sh
```

### 問題2: ファイルが見つからないエラー

```bash
# SSOTディレクトリのパスを確認
ls -la /Users/kaneko/hotel-kanri/docs/03_ssot/

# スクリプト内のパスを修正（必要に応じて）
vi check-ssot-progress.sh
# → PROJECT_ROOT="/Users/kaneko/hotel-kanri" を環境に合わせて修正
```

### 問題3: 進捗率が正しく計算されない

```bash
# 設定ファイルの目標数を確認
cat ssot-progress-config.json | grep target_counts

# 実際のファイル数を手動でカウント
find /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation -maxdepth 1 -name "SSOT_*.md" | wc -l
```

---

## 📚 関連ドキュメント

- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md` - 進捗管理・ロードマップ統合（唯一のファイル）
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md` - SSOT作成ルール
- `/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_creation_prompt_phase1.md` - SSOT作成プロンプト

---

## 🔄 更新履歴

### v1.0.0（2025-10-08）

- ✅ 初回作成
- ✅ 基本的な進捗確認機能を実装
- ✅ カテゴリ別・Phase別の進捗表示
- ✅ 設定ファイル（JSON）を分離
- ✅ README作成

---

## 📧 お問い合わせ

スクリプトに関する質問や改善提案は、Iza（統合管理者）までお願いします。

---

**最終更新**: 2025年10月8日  
**管理者**: 🌊 Iza（Izanagi）- 統合管理者

