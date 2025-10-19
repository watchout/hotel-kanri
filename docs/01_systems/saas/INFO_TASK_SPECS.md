---
title: Phase-B – Facility Info & AI FAQ : Task Specs
version: 1.0
---

# 共通コンテキスト
INCLUDE docs/MVP_OVERVIEW.md  
INCLUDE docs/info/INFO_TASKS.md  

技術スタック : Nuxt 3 • Tailwind 4 • Content Module • OpenAI Embeddings • Nitro API • Prisma(SQLite) • Vitest • Playwright

---

## B-1 Markdown CMS  
### Goal  
`/content/info/*.md` を多言語 (ja/en) で SSG 表示できるようにする。  
### 要件
| 項目 | 内容 |
|------|------|
| ディレクトリ | `content/info/ja/` と `content/info/en/` |
| Front-matter | `title`, `coverImg`, `startAt`, `endAt` |
| 期限付き表示 | `now()` が `startAt–endAt` 外なら一覧/詳細に出さない |
| ルーティング | `/info` = 一覧、`/info/[slug]` = 詳細 |
### DoD
- `pnpm build` → SSG ページ生成 OK  
- Vitest : Markdown 3 本で表示 TRUE/FALSE を検証  
### Cursor Prompt

---

## B-2 Embedding Batch  
### Goal  
`content/info/**/*.md` を OpenAI embedding に変換し `data/embeddings.json` へ保存。  
### 要件
| 項目 | 内容 |
|------|------|
| スクリプト | `scripts/embedInfo.ts` |
| チャンク | 1 k tokens / chunk (tiktoken) |
| OpenAI Model | `text-embedding-3-small` |
| Rate-limit | 60 req/min （指数バックオフ） |
### DoD
- 実行 `pnpm run embed` → JSON 長さ > 0  
- Vitest : 任意文章を cosine で自己検索 Top1=自己
### Cursor Prompt

---

## B-3 FAQ API `/api/v1/faq`  
### Goal  
ユーザ質問 → cosine 類似 → 上位 3 件 & スニペットを返す。  
### 要件
| 項目 | 内容 |
|------|------|
| Method | GET |
| Query  | `q`=string, `lang`=`ja`\|`en` (default ja) |
| Algo   | cosine ≥ 0.75 → 上位 3 件 |
| Snippet| マークダウン先頭 120 chars / lang |
| CORS   | `*` (hotel LAN) |
### DoD
- Vitest : 既知質問で BLEU≥0.85  
- Perf : < 150 ms (95p) / 1 k embeddings
### Cursor Prompt


---

## B-4 `/info` UI + 検索バー  
### Goal  
一覧＋全文検索バー＋言語切替。Top-n 一覧は startAt 降順。  
### 要件
| UI | Tailwind Card (coverImg / title / snippet) |
| 検索 | `/api/v1/faq?q=` を呼び出し、ヒットを即時表示 |
| i18n | 同じ slug で `lang` 切替 (ja↔en) |
| UX  | Lighthouse Best Pract. ≥ 90 |
### DoD
- UX テスト 5 名中 4 名が「使いやすい」以上  
- Playwright : 検索 → 3 件表示 → 詳細遷移 = 緑
### Cursor Prompt


---

## B-5 E2E テスト  
### Goal  
スマホ viewport で「質問→答えが表示される」まで自動テスト。  
### 要件
| ツール | Playwright |
| Flow  | `/info` → 検索フォーム input → Enter → 結果カードクリック → 詳細へ |
| Lang  | ja/en の 2 回回す |
### DoD
- `pnpm run test:e2e` 緑  
- CI GitHub Actions で headless 実行成功
### Cursor Prompt