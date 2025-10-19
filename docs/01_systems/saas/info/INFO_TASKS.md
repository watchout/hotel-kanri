---
title: Phase-B – Facility Info & AI FAQ
version: 1.0
---

# CONTEXT
INCLUDE docs/MVP_OVERVIEW.md

# GOAL
Markdown 記事 + 多言語 + RAG FAQ

# TASK LIST
| ID  | 内容                              | DoD                                   |
|-----|-----------------------------------|---------------------------------------|
| B-1 | Markdown CMS (content/)           | 表示 (JA/EN)                          |
| B-2 | Embedding batch `scripts/embed`   | embeddings.json 生成                  |
| B-3 | FAQ API `/api/v1/faq`             | Top3 BLEU ≥ 0.85                      |
| B-4 | `/info` UI + 検索バー             | 100 % hit, UX ≥ 4/5                   |
| B-5 | Playwright: 質問→答え表示         | 緑                                     |