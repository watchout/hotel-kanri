
⸻


# 📌 フェーズ P1–P3 詳細設計 & タスク分解

_Last updated: 2025-05-09_

---

## 0. 目的

- **P1** 注文をバックエンドへ永続化し ID を返す  
- **P2** キッチン／配膳端末で注文ステータスを更新できる UI  
- **P3** ステータス変更を客室・フロント側へリアルタイム配信  

---

## 1. P1 – MVP Back-end `POST /orders`

### 1.1 スキーマ (Prisma)

```prisma
model Order {
  id        Int         @id @default(autoincrement())
  roomId    String
  status    OrderStatus @default(received)
  items     Json        // [{menuId, name_ja, qty, price}]
  total     Int
  createdAt DateTime    @default(now())
}

enum OrderStatus {
  received
  cooking
  delivering
  done
}

1.2 API 仕様 (OpenAPI 抜粋)

post /api/v1/orders:
  requestBody:
    application/json:
      schema: OrderRequest
  responses:
    201:
      application/json:
        schema: { orderId: integer, status: string }

1.3 タスク

ID	Task	DoD
P1-1	Prisma schema 追加 & npx prisma migrate dev	sqlite ファイル生成
P1-2	POST /api/v1/orders Nitro エンドポイント	201 を返すテスト (Vitest)
P1-3	バリデーション (Zod) – roomId, items[], qty>0	400 テスト通過
P1-4	stores/order.ts に orderId/state 保存	UI で確認可能
P1-5	E2E (Playwright) – 送信→DB 挿入確認	GitHub Actions で通る


⸻

2. P2 – キッチン／配膳モニター UI

2.1 画面概要
	•	/orders/manage (キッチン)
	•	受信一覧 (received) → ボタン "調理開始" → cooking
	•	/delivery/manage (サーバー)
	•	cooking → ボタン "配膳開始" → delivering → "完了" → done

2.2 タスク

ID	Task	DoD
P2-1	GET /api/v1/orders?status=received API	JSON 返却
P2-2	PATCH /api/v1/orders/{id} で status 更新	200 テスト
P2-3	Page pages/orders/manage.vue 作成	Tailwind でカード表示
P2-4	Page pages/delivery/manage.vue 作成	同上
P2-5	権限ガード（簡易 BasicAuth 環境変数）	401 テスト通過


⸻

3. P3 – WebSocket / SSE 進捗配信

3.1 プロトコル
	•	Path: /ws/orders
	•	JSON: { orderId, status }

3.2 タスク

ID	Task	DoD
P3-1	Nitro WS ハンドラ実装 (ws.ts)	Connect / broadcast OK
P3-2	stores/order.ts で WS 購読	client で reactive 反映
P3-3	OrderStatusBadge.vue – 右上バッジ	状態変化で色＆効果音
P3-4	Playwright E2E – ステータス進行確認	自動テスト通過


⸻

4. タイムライン & リソース

Sprint	期間	目標	主要タスク
S0	5/12-5/23	P1 完了	P1-1〜P1-5
S1	5/26-6/06	P2 完了	P2-1〜P2-5
S2	6/09-6/20	P3 完了	P3-1〜P3-4


⸻

5. リスク & 対策

リスク	対策
SQLite 競合書き込み	同時 500 req/s 超時に WAL or Postgres 移行
WS 接続数膨張	Nitro WS を SSE fall-back に切替可能設計
UI 端末遅延	ステータス更新時にローカルトースト即時表示


⸻

6. 変更履歴

Date	Who	Change
2025-05-09	Kaneko / ChatGPT	初版 (P1-P3 詳細)


⸻


---

### 次のアクション
1. 上記を `docs/PHASE_P1_P3_DETAIL.md` で保存 → `git add & commit & push`  
2. Linear / GitHub Issues にタスク ID (P1-1 …) を起票  
3. Cursor へ各 Issue で  

CONTEXT

INCLUDE docs/PROJECT_GUIDELINES.md
INCLUDE docs/PHASE_P1_P3_DETAIL.md

TASK

Implement P1-1 …

---

### 3.6 決定事項追記（2025-05-10）

| 項目 | 方針 |
|------|------|
| **DB 切替** | 開発・MVP は **SQLite** / 本番デプロイ直前に **Postgres** へ移行<br>→ `DATABASE_URL` を差し替え `prisma migrate deploy` 実行 |
| **管理画面認証** | Nuxt **BasicAuth ミドルウェア方式**（環境変数 `BASIC_USER`, `BASIC_PASS`） |
| **注文 API 認証** | `deviceToken` ヘッダによる **HMAC 署名** 検証<br>`token = HMAC_SHA256(secretKey, roomId:timestamp)` |
| **LAN 制限** | ルータ / FW で **ホテル LAN 内 IP** のみ API ポート許可<br>レンジ外は `403 forbidden_ip` |
| **在庫切れエラー** | `409 CONFLICT { error:{ code:\"out_of_stock\", message:\"在庫切れ\" } }` |
| **SSE Fallback** | 初期リリースは **実装しない**（WebSocket のみ） |

> **備考**  
> - `MenuItem.stockAvailable: Boolean` を追加し、在庫判定を実装  
> - `docs/AUTH_DEVICE_SPEC.md` に詳細フローを別途記載（スマホ QR 登録など）

#### 3.7 テスト & エラー仕様（2025-05-09）

##### テスト環境
- **Vitest**：`pnpm run test` で単体／API テスト  
- **Playwright**：`pnpm run test:e2e` でブラウザ E2E  
- CI では両テストがグリーンでないとマージ不可

##### API エラーフォーマット
```jsonc
{
  "error": {
    "code": "out_of_stock",
    "message": "在庫切れです",
    "field": "items[0].menuId",
    "details": {}
  }
}

#### 3.8 実装詳細補足（2025-05-09）

- **SQLite→Postgres 移行**：Staging/Prod 前に `prisma migrate deploy` で一括
- **BasicAuth**：Nuxt middleware (`server/middleware/basicAuth.ts`) 実装
- **deviceToken**：HMAC_SHA256(roomId:timestamp) ±5min 許容
- **在庫管理**：MVP は `stockAvailable:Boolean` のみ。数量は P4 で追加予定
- **WS スケール**：MVP=WSのみ、2k接続超で SSE fallback (P9)
- **テスト**：Vitest + Playwright。CI で必須テストを緑に
- **追加エラー**：`invalid_token_timestamp`, `invalid_signature_algo`

---

