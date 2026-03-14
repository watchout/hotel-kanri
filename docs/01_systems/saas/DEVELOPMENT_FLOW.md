以下を まるごとコピー → docs/DEVELOPMENT_FLOW.md に貼り付けてコミットしてください。
（先頭行から末尾行まで／囲みは 不要 です）

⸻

🌐 Development Flow – Hotel SaaS MVP

⸻

0. Tech Stack

Layer	Tech	備考
Front	Nuxt 3 · TypeScript · TailwindCSS · Pinia	<script setup>・Composition API
API	Nitro（server/api/**）	MVP はモック実装 → 後で Prisma 接続
DB	Prisma + SQLite	本番は MySQL / Postgres 予定
Docs	Markdown · Mermaid · OpenAPI	npm run docs:build で自動再生成



⸻

1. Issue → PR サイクル

flowchart LR
  I[GitHub Issue<br>/devin take] -->|Webhook| D(Devin Bot)
  D --> B[Branch devin/feat]
  B --> P[Pull Request]
  P -->|Cursor Review| M((main))
  M --> G[docs:build<br/>auto-commit]

	1.	New Issue を作り末尾に /devin take
	2.	Devin がブランチ＆PR を自動生成
	3.	VS Code + Cursor でコードレビュー・リファクタ
	4.	CI ✅ → Squash & Merge
	5.	GitHub Actions が docs を再生成し自動コミット

⸻

2. タグ仕様（Issue 内 YAML）

キー	値例	説明
menuSource	mock-json / rest-api	メニュー取得方法
menuPersist	prisma-sqlite / memory	保存方式
roomIdStrategy	test-input / device-token	部屋番号の決定方法
uiStyle	tailwind-simple / daisyui	UI テーマ

Issue 本文末尾にコードブロックで書き、変更時は /devin continue。

⸻

3. 自動ドキュメント生成

コマンド	出力ファイル	目的
npm run docs:build	docs/architecture.md	ディレクトリツリー＋Mermaid
〃	docs/api.md	エンドポイント表＋OpenAPI 抜粋

docs.yml（Actions）が push / pull_request 時に実行し、差分があれば bot が自動コミット。

⸻

4. ロードマップ（例）

Sprint	期間	目標	主な Issue
S-1	5/6 – 5/12	F-01 客室オーダー UI + API モック	#12
S-2	5/13 – 5/19	F-02 館内情報 + AI チャット	#18
S-3	5/20 – 5/26	F-03 VoIP 内線	#25



⸻

5. コーディング規約（抜粋）

詳細は .cursor/rules/project.mdc 参照
	•	ファイル構成 pages/, components/, stores/, server/api/ …
	•	命名 kebab-case (order-card.vue)、型は PascalCase
	•	コミット feat:, fix:, chore: を先頭に
	•	テスト pnpm run lint && pnpm run test を CI 必須

⸻

6. 進捗可視化

6.1 GitHub Projects Board
	1.	Repo → Projects → New → Board を作成
	2.	カラム: Backlog · Todo · Dev · Review · Done
	3.	Board 右上 Automation
	•	When issue added / Status changes → カラム自動移動
	4.	Board Insights → Burndown / Velocity を ON

6.2 docs/features.md チェックリスト
	•	docs/features.md に機能リストを [ ] / [x] 形式で列挙
	•	Devin が PR Merge 時に自動でチェックを付与
	•	Raw URL を共有すれば非エンジニアもブラウザ閲覧可

6.3 README バッジ

![CI](https://github.com/<org>/<repo>/actions/workflows/ci.yml/badge.svg)

CI 成否を即表示。必要に応じて Codecov 等も追加。

⸻

7. 多言語対応プロセス

7.1 internationalization (i18n) 基本方針
	•	コンポーザブル useLocale で各ページ・コンポーネントに統一実装
	•	必須言語: ja / en （MVPフェーズ）→ 最終10言語対応
	•	キー方式: common.xxx, menu.xxx, order.xxx 等カテゴリ分け
	•	手動翻訳（自動翻訳はコンテンツ部分のみ許容）

7.2 i18n 実装ステップ
	1.	ハードコード文字列を全て `t('キー')` 形式に置換
	2.	composables/useLocale.ts の translations 辞書に追加
	3.	言語切替UIをグローバルに追加
	4.	レイアウト崩れチェック（言語による文字数変化対応）

7.3 バックエンド対応
	•	エラーメッセージは JSON + キー形式で返却
	•	日時・通貨・単位はクライアント側でフォーマット
	•	APIドキュメント・管理画面も日英対応

⸻

Last updated : 2025-05-07