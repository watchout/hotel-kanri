# API 定義（MVP 版）

## 基本情報
| 項目 | 内容 |
|------|------|
| **Base URL** | `/api/` (Nitro 同居) |
| **Auth** | なし（端末テスト用） |
| **レスポンス形式** | JSON |
| **HTTP ステータス** | 200=OK / 4xx=バリデーション / 500=サーバ |

---

## エンドポイント一覧

| # | Method | Path | 説明 | 使用箇所 |
|---|--------|------|------|----------|
| 1 | **GET**  | `/menu` | メニュー一覧取得（モック JSON） | 客室 `/orders` UI |
| 2 | **POST** | `/orders` | 注文送信（Pinia→Nitro） | 客室 `/orders` UI |
| 3 | **GET**  | `/orders?status=pending` | 未処理注文一覧 | キッチン画面 |
| 4 | **PATCH** | `/orders/:id` | 注文ステータス更新 | キッチン／サーバ |

---

## データモデル

### MenuItem
```ts
{
  id:        number      // メニューID
  name:      string      // 名称
  price:     number      // 価格 (JPY)
  category?: string      // 任意カテゴリ
}