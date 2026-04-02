# PHASE P4 — Admin 初版 & ダッシュボード設計書  
*Status: draft — 2025-05-09*

---

## 1. 目的
- ホテル従業員／経営者が **売上・注文状況・人気メニュー** をブラウザで確認できる  
- CSV エクスポートで月次会計処理を支援  
- タグ式メニュー CMS を “最小限” 編集できる UI を提供

---

## 2. 要件一覧 (MUST)

| ID | カテゴリ | 内容 | DoD |
|----|----------|------|-----|
| **A-01** | 売上ダッシュ | 当日売上合計・注文件数・平均単価 | `/admin/dashboard` にカード表示 |
| **A-02** | ランキング | 日／月／年タブで **TOP10 商品** を表示 | 切替 Latency < 200 ms |
| **A-03** | CSV 出力 | 任意期間 `orders.csv` ダウンロード | クリックで即 DL |
| **A-04** | メニュー CMS | name / price / tags / stockAvailable 編集 | 変更が即 API 反映 |
| **A-05** | BasicAuth 継続 | `/admin/**` 全ルートに適用 | 401 テスト通過 |

---

## 3. データモデル拡張

```prisma
model MenuItem {
  id              Int      @id @default(autoincrement())
  name_ja         String
  name_en         String
  price           Int
  tags            Json     // ["breakfast", "vegan"]
  stockAvailable  Boolean  @default(true)           // ← P3 で追加済
  updatedAt       DateTime @updatedAt
}

model Order {
  // 既存 …
  paidAt   DateTime?       // 管理画面から CSV 出力用
}


⸻

4. API 仕様 (OpenAPI 抜粋)

get /api/v1/admin/summary?from=&to=:
  200: { totalSales:int, orderCount:int, avgUnit:int }

get /api/v1/admin/rankings?period=day|month|year:
  200: [{ menuId,int, name_ja, qty,int, sales,int }]

get /api/v1/admin/orders.csv?from=&to=:
  200: text/csv

patch /api/v1/menu/{id}:
  body: { price?, tags?, stockAvailable? }
  200: MenuItem


⸻

5. 画面仕様

5.1 /admin/dashboard
	•	Tailwind Grid 2×2 カード
	•	ランキング表は <AdminRankingTable />

5.2 /admin/menu
	•	<MenuTable editable> — inline 編集セル
	•	編集成功で 緑トースト、失敗で 赤トースト

⸻

6. タスク分解

ID	Task	担当	依存
P4-1	Prisma paidAt 追加 & migrate	BE	–
P4-2	admin summary API	BE	P4-1
P4-3	ranking API + SQL	BE	P4-1
P4-4	CSV export (fast-csv)	BE	P4-1
P4-5	/admin/dashboard page	FE	P4-2/3
P4-6	/admin/menu page & CMS API	FE	–
P4-7	Playwright test: ranking switch	QA	P4-5
P4-8	CI update (new tests)	DevOps	P4-7


⸻

7. テスト
	•	Vitest: summary/ranking API unit test (mock Prisma)
	•	Playwright:
	•	ランキング日⇄月⇄年タブ切替 → 行数 = 10 を確認
	•	エディタで price 変更 → トースト “保存しました”

⸻

8. セキュリティ
	•	BasicAuth ミドルウェア再利用
	•	/api/v1/admin/** も同ミドルウェアで 401 制御
	•	CSV エクスポートは Content-Disposition: attachment で No-Cache

⸻

9. 変更履歴

Date	Who	Notes
2025-05-09	Kaneko / ChatGPT	初版


⸻


---

### AI (Cursor) への依頼例

```markdown
# CONTEXT
INCLUDE docs/PROJECT_GUIDELINES.md
INCLUDE docs/PHASE_P4_ADMIN_DETAIL.md

# TASK
Implement P4-2: admin summary API.

- Create server/api/admin/summary.get.ts
- Read `from` `to` query, default = today
- Return { totalSales, orderCount, avgUnit }
- Write Vitest with mock Prisma

# OUTPUT FORMAT
Pull Request 1, tests green.


⸻
## 📝 Admin Dash — Q&A Decision Log (v2025-05-10 r1)

> **目的**: フェーズ P4（管理ダッシュボード実装）の仕様確定  
> **出典**: 2025-05-10 プロダクトオーナー QA

| # | 質問 / 論点 | 採択した方針 | 根拠・備考 |
|---|-------------|-------------|------------|
| **1** | **タグの保持方法**<br>MenuItem.tags を JSON にするか、別テーブルに正規化するか？ | **JSON 配列で MVP 実装**<br>例: `["vegan","peanut_free"]` | 実装最短。後で正規化できるよう **ADR-tag-to-table.md** に移行手順を記載。 |
| **2** | **サマリー日付範囲 & TZ**<br>デフォルト期間／タイムゾーンは？ | デフォルト **「当日」**、TZ は **Asia/Tokyo 固定**。日付ピッカーで任意範囲選択可能。 | 国内ホテルのみ対象の MVP。海外展開時に `AT TIME ZONE` で拡張。 |
| **3** | **ランキング指標**<br>売上 or 注文数？ | **両方実装**：タブ切替「売上 TOP10」「数量 TOP10」。 | 経営者＝売上、キッチン＝数量で関心が異なるため。 |
| **4** | **CSV エクスポート列 & パフォーマンス** | 列: `orderId,roomId,createdAt,paidAt,total,status,items(json)`<br>期間指定必須。1 万行超は **streaming (fast-csv)**、UTF-8+BOM。 | メモリ節約 & Excel 互換。DL ≤ 5 s (95p)。 |
| **5** | **メニュー CMS 追加要件**<br>画像／在庫履歴／一括編集？ | - **画像 Upload は P5 へ後送り**<br>- `stockAvailable` 変更は `MenuStockLog` テーブルに履歴保存<br>- 一括編集は「表セル編集 (Ag-Grid)」のみ、CSV import は次期 | MVP 速度優先。 |
| **6** | **セキュリティ / 監査ログ** | BasicAuth 資格情報 `.env` 管理 (`BASIC_USER/PASS`)。`AdminAccessLog` (user, ip, path, ua, at) を Prisma で保持、90 日ローテーション。 | CSV DL 監査・GDPR 対応布石。 |
| **7** | **テスト & パフォーマンス基準** | - **API**: summary / ranking 200 & 値検証 (Vitest)<br>- **E2E**: 管理ログイン→ダッシュ→CSV DL (Playwright)<br>- **Perf**: summary API ≤ 300 ms (95p) / CSV 10k ≤ 5 s | 明文化して CI で自動検証。 |

---

### 📌 反映タスク

1. **ORDER_BACKEND_P4.md** → §Admin Spec を v1.1 へ更新（上表をコピペ）。  
2. **phase/P4_TASKS.md** → 各 ID の DoD に KPI を追記。  
3. `version:` を **+0.1** bump。  
4. PR タイトル: `docs: admin spec decisions (tags, CSV, ranking)`  
