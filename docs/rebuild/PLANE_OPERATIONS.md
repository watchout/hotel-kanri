### 【Plane 運用ガイド（Issueツリー可視化・増分取得・キャッシュ）】

本ドキュメントは、Planeを唯一の進捗管理ツールとして活用するための、ローカル運用ガイドです。高速な可視化と省リソース運用のため、90秒TTLキャッシュ・増分取得・フィールド投影を備えたツールを提供します。

---

#### ★ 必須: 環境変数（`.env.mcp`）

- `PLANE_API_HOST_URL="https://plane.arrowsworks.com"`
- `PLANE_API_KEY="..."`
- `PLANE_WORKSPACE_SLUG="co"`
- `PLANE_PROJECT_ID="7e187231-3f93-44cd-9892-a9322ebd4312"`

上記は自動読込されます（未設定時のみ`.env.mcp`から補完）。

---

#### ★ コマンド

```bash
# すべての成果物（JSON/MD/CSV）を出力（90秒TTLキャッシュ）
node scripts/plane/list-issues-tree.cjs --format=all

# 増分（since以降に更新されたものを優先的に可視化）
node scripts/plane/list-issues-tree.cjs --since=2025-11-01T00:00:00Z --format=json

# 任意の出力先に保存
node scripts/plane/list-issues-tree.cjs --out-dir=/tmp/plane --format=md

# 欲しいフィールドだけ投影（id/title/parent_idは常に含有）
node scripts/plane/list-issues-tree.cjs --fields=id,title,parent_id,status,assignee --format=csv

# キャッシュ無視（強制再取得）
node scripts/plane/list-issues-tree.cjs --force --format=all
```

---

#### 出力

- `tmp/plane/issues_tree.json`  
  - meta（生成時刻・合計件数・TTL・since・fields）
  - flat（フィールド投影済みフラット配列）
  - tree（親ID→子配列のエントリー）

- `tmp/plane/issues_tree.md`  
  - 階層ツリー（Epics/Leaves集計含む）

- `tmp/plane/issues.csv`  
  - 最低限の分析用（id,title,parent_id,status,assignee）

---

#### 仕様（要点）

- エンドポイント自動検出（/issues, /workitems 両対応を試行）
- ページネーション対応（per_page=100, page=1..）
- ヘッダー自動切替（Bearer / X-API-KEY）
- 90秒TTLキャッシュ（`issues_cache.json`）
- `--since` は `updated_at` 相当のフィールドでローカルフィルタ（存在しない場合は全件維持）
- `--fields` で投影（指定なし=全項目、ただし id/title/parent_id は必ず保持）

---

#### 運用TIPS

- F5連打や大規模フェッチの重複を回避（90秒キャッシュ）
- 定例報告用：`--format=md` でレビューに貼り付けやすいツリーを出力
- データ分析：`--format=csv --fields=...` で必要列のみ抽出

---

#### 注意事項

- 本ツールは閲覧・可視化専用です（更新操作は行いません）
- APIのスキーマ差異に耐えるため、ペイロードは best-effort で解釈しています
- 見出し・必須セクション検証などのCIガードは別途GitHub Actionsで動作します



