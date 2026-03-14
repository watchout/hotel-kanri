# 🏨 Hotel SaaS – MVP Overview  
_Last updated: 2025-05-16 (v1.1)_

---

## 1. MVP スコープ

| 機能 | 概要 | 完了条件 |
|------|------|----------|
| **① 客室オーダー** | メニュー UI・キッチン／配膳モニタ・WS 進捗 | E2E latency < 1 s |
| **② 館内インフォ + AI FAQ** | Markdown 記事 + RAG (OpenAI) + 周辺観光案内 | Top3 正答率 ≥ 85 % |
| **③ スマホ IP 内線** | QR → Wi-Fi 接続案内 → WebRTC でフロント通話 | 着呼 ≤ 0.5 s |

### オーダーシステム主要仕様

- **1オーダー1配膳制**：一つの注文は全商品がそろってから配膳する方式を採用
- **商品単位の調理状態管理**：キッチンでは各商品の準備状態を個別に更新可能
- **リアルタイム連携**：WebSocketによる状態変更の即時通知
- **バック・フロント両対応**：キッチン管理画面と客室表示の双方向同期

---

## 2. 開発フェーズ & カレンダー

| フェーズ | Sprint 日程 | 主要アウトプット |
|----------|------------|------------------|
| **A** オーダー | 5/12 – 6/20 | POST /orders ➜ WS ➜ UI 完成 |
| **B** インフォ | 6/23 – 7/19 | `/info` + FAQ API + 多言語 UI |
| **C** IP 内線 | 7/22 – 8/16 | QR ページ・WebRTC Signaling・フロント UI |

---

## 3. 技術スタック

- **Nuxt 3 / Tailwind 4 / Pinia / Vue-I18n**  
- **Prisma** (SQLite→Postgres) **Nitro WebSocket** **socket.io** (内線)  
- **OpenAI Embeddings + cosine search** (RAG)  
- **Vitest / Playwright / GitHub Actions**  
- **Cursor** で AI コード生成（Devin→退避）

---

## 4. 運用フロー

1. **Issue 作成**：`phase/*.md` で ID を列挙  
2. **Cursor 依頼**：最小タスク単位 (`# TASK:`) で実装  
3. **PR レビュー**：ESLint・Vitest・Playwright 緑→main  
4. **Release**：main = Staging、自動 smoke → Prod

---

## 5. 変更管理

| ラベル | 内容 | 必須アクション |
|--------|------|---------------|
| `spec-patch` | 文言修正 | version +0.0.1 |
| `spec-minor` | 非破壊追加 | version +0.1 & 対応 Task 追記 |
| `spec-major` | API 変更 | ADR 追加 & 全 Task 再チェック |

---

## 6. 最近の主要決定事項

- **2025-05-16**: MVPでは**1オーダー1配膳**制に統一し、ハイブリッドモードは採用せず
- **2025-05-16**: キッチン管理画面では**商品ごとに調理状態を個別管理**するUIを採用
- **2025-05-12**: 認証方式をデバイス自動認証（IP/MAC認証）に変更
- **2025-05-10**: カテゴリタグによるカテゴリ階層対応を実装