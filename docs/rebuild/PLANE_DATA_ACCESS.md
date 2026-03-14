### 【Planeデータ取得ガイド】ロードマップを確実に可視化・確認する体制

本ガイドは、Planeを唯一の進捗管理ソースとして活用し、ロードマップ（親子ツリー）を常に確実・高速に確認できるようにするための手順をまとめたものです。MCPツールとCLIの両方に対応し、90秒TTLキャッシュ・増分取得・フィールド投影をサポートします。

---

#### 1. 事前準備（必須）

- `.env.mcp` に以下が設定済みであること（既に保存済み）
  - `PLANE_API_HOST_URL="https://plane.arrowsworks.com"`
  - `PLANE_API_KEY="..."`
  - `PLANE_WORKSPACE_SLUG="co"`
  - `PLANE_PROJECT_ID="7e187231-3f93-44cd-9892-a9322ebd4312"`
- MCP設定に `plane` サーバーが登録済み（`mcp.json`）
- 出力先ディレクトリ: `/Users/kaneko/hotel-kanri/tmp/plane`

---

#### 2. ロードマップの取得方法（推奨順）

##### A. MCPツール（推奨・軽量）
- ツール名: `plane.listIssuesTree`
- 返却: ツリーJSON（`meta`/`flat`/`tree`）
- 主な引数（任意）:
  - `since`: ISO8601（増分確認、例: `2025-11-01T00:00:00Z`）
  - `ttl`: キャッシュTTL秒（デフォルト90）
  - `force`: キャッシュ無視して再取得
  - `fields`: `id,title,parent_id,status,assignee` のように列絞り
  - `outDir`: 出力先（既定: `/Users/kaneko/hotel-kanri/tmp/plane`）
  - `host`/`apiKey`/`workspace`/`project`: 接続上書き

使い方（例）:

```json
{
  "name": "plane.listIssuesTree",
  "arguments": {
    "since": "2025-11-01T00:00:00Z",
    "fields": "id,title,parent_id,status,assignee",
    "ttl": 90
  }
}
```

取得後はツール応答の `content[0].json` をそのまま表示・二次利用できます（グラフ化・絞り込み等）。

##### B. CLI（ローカル実行）

```bash
# すべての成果物（JSON/MD/CSV）を出力（90秒TTLキャッシュ）
node /Users/kaneko/hotel-kanri/scripts/plane/list-issues-tree.cjs --format=all

# 増分（since以降の更新を優先視）
node /Users/kaneko/hotel-kanri/scripts/plane/list-issues-tree.cjs --since=2025-11-01T00:00:00Z --format=json

# 列絞り（id/title/parent_idは常に含有）
node /Users/kaneko/hotel-kanri/scripts/plane/list-issues-tree.cjs --fields=id,title,parent_id,status,assignee --format=csv

# キャッシュ無視（強制再取得）
node /Users/kaneko/hotel-kanri/scripts/plane/list-issues-tree.cjs --force --format=all
```

---

#### 3. 出力物（ロードマップ確認用）

- JSON（機械可読）: `/Users/kaneko/hotel-kanri/tmp/plane/issues_tree.json`
  - `meta`: 生成時刻・件数・TTL・since・fields
  - `flat`: 投影済みフラット配列（一覧処理に最適）
  - `tree`: 親ID→子配列のエントリー（階層構造処理に最適）

- Markdown（人が読むツリー）: `/Users/kaneko/hotel-kanri/tmp/plane/issues_tree.md`
  - Epics/Leaves集計付きの階層表示（ミーティングで即共有可能）

- CSV（分析向け）: `/Users/kaneko/hotel-kanri/tmp/plane/issues.csv`
  - `id,title,parent_id,status,assignee`

---

#### 4. ロードマップ確認フロー（標準）

1) 直近の更新を見たい場合
   - MCPで `since` を指定して `plane.listIssuesTree` を実行
   - 返却JSONの `flat` から差分項目を優先確認

2) 全体像を俯瞰したい場合
   - CLIで `--format=md` 実行 → `issues_tree.md` を開く
   - Epics（親）/Leaves（末端）件数でボリューム把握

3) 役割・状態で切り出したい場合
   - CLIで `--format=csv --fields=...` を指定
   - スプレッドシート流し込み・ピボットで集計

---

#### 5. 仕組み（安定運用のための要点）

- エンドポイント自動検出（`/issues` と `/workitems` 両系統を試行）
- 認証ヘッダー自動切替（`Bearer` と `X-API-KEY`）
- ページネーション対応（`per_page=100&page=...`）
- 90秒TTLキャッシュ（不要な重複呼び出しを抑制）
- `--since` で増分（`updated_at` 相当がない場合は全件維持）

---

#### 6. トラブルシューティング（よくある原因）

- Invalid URL / 接続失敗
  - `.env.mcp` の行末バックスラッシュや引用符の不整合に注意
  - 本ツールは行末バックスラッシュの除去・URL自動補完（`https://`）に対応済み

- 401/403（認証）
  - `PLANE_API_KEY` の有効性・権限を再確認
  - Workspace/Projectの指定が正しいか確認

- No endpoint matched / 空配列
  - APIエンドポイントの世代差異（`/issues` / `/workitems`）で失敗していないか
  - `PLANE_WORKSPACE_SLUG` / `PLANE_PROJECT_ID` が一致しているか

- レイテンシが重い
  - 90秒TTLキャッシュを活用 / `--since` で差分確認
  - MCPツールでJSONのみ取得（UI連携向き・軽量）

---

#### 7. 週次運用（推奨）

- 週次冒頭に `--format=md` で全体ツリーを生成し、定例の資料へ貼り付け
- `--format=csv` でメトリクス集計（完了率、Blocked数、担当別負荷）
- 必要に応じて `since` に先週基準日時を設定して差分のみレビュー

---

#### 8. 参照

- 運用詳細: `docs/rebuild/PLANE_OPERATIONS.md`
- MCPサーバー: `tools/mcp-plane/server.cjs`（ツール: `plane.listIssuesTree`）
- CLIスクリプト: `scripts/plane/list-issues-tree.cjs`



