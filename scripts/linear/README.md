# Linear 連携スクリプト

hotel-kanriプロジェクトとLinearを連携するためのスクリプト群

---

## 📋 スクリプト一覧

### 1. `migrate-to-linear.js`

**目的**: SSOT_PROGRESS_MASTER.mdからLinearへの初回データ移行

**使用方法**:

```bash
# 1. 依存関係インストール
cd scripts/linear
npm install

# 2. Linear API キー設定
export LINEAR_API_KEY="lin_api_xxxxx"

# 3. スクリプト内のID設定
# - TEAM_IDS: Linearで作成したチームIDを設定
# - PROJECT_IDS: Linearで作成したプロジェクトIDを設定
# - LABEL_IDS: Linearで作成したラベルIDを設定

# 4. ドライラン（実際には作成しない）
npm run migrate:dry-run

# 5. 実行
npm run migrate
```

### 2. `export-from-linear.js`

**目的**: LinearからMarkdownへの週次エクスポート

**使用方法**:

```bash
# 1. Linear API キー設定
export LINEAR_API_KEY="lin_api_xxxxx"

# 2. 週次レポート生成（現在のサイクルのみ）
npm run export

# 3. 全体エクスポート生成
npm run export:full
```

**出力先**: `docs/03_ssot/_linear_exports/`

---

## 🔑 Linear API キーの取得方法

1. Linear にログイン
2. Settings → API → Personal API Keys
3. "Create new key" をクリック
4. キー名を入力（例: "hotel-kanri-scripts"）
5. 生成されたキーをコピー
6. 環境変数に設定:

```bash
# ~/.bashrc または ~/.zshrc に追記
export LINEAR_API_KEY="lin_api_xxxxx"

# または .envファイルに記載
echo "LINEAR_API_KEY=lin_api_xxxxx" > .env
```

---

## 🆔 ID の取得方法

### Team ID

```bash
# Linear GraphQL Playground で実行
query {
  teams {
    nodes {
      id
      name
    }
  }
}
```

### Project ID

```bash
query {
  projects {
    nodes {
      id
      name
    }
  }
}
```

### Label ID

```bash
query {
  issueLabels {
    nodes {
      id
      name
    }
  }
}
```

---

## 📊 運用フロー

### 初回セットアップ

```
1. Linear でチーム・プロジェクト・ラベルを作成
   └─ LINEAR_SETUP_GUIDE.md を参照

2. スクリプト内のIDを設定
   └─ migrate-to-linear.js の TEAM_IDS, PROJECT_IDS, LABEL_IDS

3. ドライランで確認
   └─ npm run migrate:dry-run

4. データ移行実行
   └─ npm run migrate

5. Linear で確認
   └─ すべてのタスクが作成されているか確認
```

### 週次運用

```
毎週月曜日:

1. Linear から週次レポート生成
   └─ npm run export

2. Gitにコミット
   └─ git add docs/03_ssot/_linear_exports/
   └─ git commit -m "chore: 週次進捗レポート (YYYY-MM-DD)"

3. 週次レビューミーティング
   └─ レポートを元に進捗確認
   └─ ロードマップ調整（必要に応じて）
```

### 月次運用

```
毎月第1月曜日:

1. Linear から全体エクスポート生成
   └─ npm run export:full

2. Gitにコミット
   └─ git add docs/03_ssot/_linear_exports/
   └─ git commit -m "chore: 月次進捗レポート (YYYY-MM)"

3. 月次レビューミーティング
   └─ 全体進捗確認
   └─ マイルストーン達成状況確認
```

---

## 🔄 自動化（オプション）

### GitHub Actions で週次自動エクスポート

`.github/workflows/linear-export.yml`:

```yaml
name: Linear Weekly Export

on:
  schedule:
    # 毎週月曜日 9:00 JST (00:00 UTC)
    - cron: '0 0 * * 1'
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd scripts/linear
          npm install
      
      - name: Export from Linear
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
        run: |
          cd scripts/linear
          npm run export
      
      - name: Commit and push
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/03_ssot/_linear_exports/
          git commit -m "chore: 週次進捗レポート ($(date +%Y-%m-%d))" || exit 0
          git push
```

**Secret 設定**:
- GitHub → Settings → Secrets → Actions
- `LINEAR_API_KEY` を追加

---

## 🚨 トラブルシューティング

### エラー: "LINEAR_API_KEY environment variable is not set"

**原因**: API キーが設定されていない

**解決策**:

```bash
export LINEAR_API_KEY="lin_api_xxxxx"
```

### エラー: "Team ID not found for XXX"

**原因**: TEAM_IDS が設定されていない

**解決策**:

1. Linear GraphQL Playground でチームIDを取得
2. `migrate-to-linear.js` の `TEAM_IDS` を更新

### エラー: "No issues found"

**原因**: 
- Linearに課題が存在しない
- APIキーの権限不足

**解決策**:
- Linear で課題が作成されているか確認
- APIキーの権限を確認（Admin以上推奨）

---

## 📚 参考リンク

- [Linear API Documentation](https://developers.linear.app/)
- [Linear SDK](https://github.com/linear/linear/tree/master/packages/sdk)
- [Linear GraphQL Playground](https://studio.apollographql.com/public/Linear-API/explorer)

