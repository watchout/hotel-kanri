# オーダー作成API実装仕様書

## 概要

本ドキュメントは、hotel-commonにおけるオーダー作成API（`POST /api/v1/orders`）の実装仕様を定義します。このAPIは、hotel-saasからの注文作成リクエストを処理し、統合データベースに保存する役割を担います。

## API仕様

### エンドポイント

```
POST /api/v1/orders
```

### リクエストヘッダー

| ヘッダー名 | 必須 | 説明 |
|------------|------|------|
| Authorization | ✅ | Bearer {JWT_TOKEN} 形式の認証トークン |
| X-Tenant-ID | ✅ | テナントID |
| Content-Type | ✅ | application/json |

### リクエストボディ

```json
{
  "roomId": "room-101",
  "items": [
    {
      "menuId": "menu-001",
      "name": "ハンバーガー",
      "price": 1500,
      "quantity": 2,
      "options": [
        {
          "id": "option-001",
          "name": "チーズ追加",
          "price": 200
        }
      ]
    },
    {
      "menuId": "menu-002",
      "name": "フライドポテト",
      "price": 500,
      "quantity": 1,
      "options": []
    }
  ],
  "specialInstructions": "ケチャップ多めでお願いします",
  "paymentMethod": "room-charge",
  "deviceId": "device-001",
  "source": "room-tablet"
}
```

#### リクエストパラメータ詳細

| パラメータ名 | 型 | 必須 | 説明 |
|--------------|------|------|------|
| roomId | string | ✅ | 部屋ID |
| items | array | ✅ | 注文アイテムの配列 |
| items[].menuId | string | ✅ | メニューアイテムID |
| items[].name | string | ✅ | アイテム名 |
| items[].price | number | ✅ | アイテム単価 |
| items[].quantity | number | ✅ | 数量（1以上） |
| items[].options | array | ❌ | オプションの配列 |
| items[].options[].id | string | ✅ | オプションID |
| items[].options[].name | string | ✅ | オプション名 |
| items[].options[].price | number | ✅ | オプション価格 |
| specialInstructions | string | ❌ | 特別指示（最大500文字） |
| paymentMethod | string | ✅ | 支払い方法（"room-charge", "credit-card", "cash"のいずれか） |
| deviceId | string | ❌ | 注文を作成したデバイスのID |
| source | string | ❌ | 注文ソース（"room-tablet", "mobile-app", "front-desk"など） |

### 成功レスポンス (200 OK)

```json
{
  "success": true,
  "order": {
    "id": "order-001",
    "roomId": "room-101",
    "status": "pending",
    "totalAmount": 3700,
    "createdAt": "2025-08-01T12:00:00.000Z",
    "updatedAt": "2025-08-01T12:00:00.000Z",
    "items": [
      {
        "id": "item-001",
        "menuId": "menu-001",
        "name": "ハンバーガー",
        "price": 1500,
        "quantity": 2,
        "totalPrice": 3000,
        "options": [
          {
            "id": "option-001",
            "name": "チーズ追加",
            "price": 200
          }
        ]
      },
      {
        "id": "item-002",
        "menuId": "menu-002",
        "name": "フライドポテト",
        "price": 500,
        "quantity": 1,
        "totalPrice": 500,
        "options": []
      }
    ],
    "specialInstructions": "ケチャップ多めでお願いします",
    "paymentMethod": "room-charge",
    "deviceId": "device-001",
    "source": "room-tablet"
  }
}
```

### エラーレスポンス

#### 400 Bad Request

```json
{
  "success": false,
  "error": "リクエストが不正です",
  "details": {
    "roomId": "部屋IDは必須です",
    "items": "少なくとも1つのアイテムが必要です"
  }
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "認証が必要です"
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "error": "このリソースにアクセスする権限がありません"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "指定された部屋が見つかりません"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "内部サーバーエラーが発生しました"
}
```

## 実装要件

### データベース操作

1. 注文データをOrdersテーブルに保存
2. 注文アイテムをOrderItemsテーブルに保存
3. オプションをOrderItemOptionsテーブルに保存
4. 関連するテーブル間のリレーションシップを適切に設定

### ビジネスロジック

1. 注文合計金額の計算
   - 各アイテムの価格 × 数量 + オプション価格の合計
2. 税金の計算（設定に基づく）
3. 注文ステータスの初期設定（デフォルトは "pending"）
4. 注文ID、アイテムID、オプションIDの生成
5. 注文時刻の記録

### バリデーション

1. 部屋IDの存在確認
2. アイテム配列が空でないことの確認
3. 各アイテムの必須フィールド（menuId, name, price, quantity）の検証
4. 数量が1以上であることの確認
5. 支払い方法が有効な値であることの確認

### セキュリティ

1. JWT認証の実装
2. テナントIDの検証
3. 権限チェック（注文作成権限の確認）
4. 入力値のサニタイズ

### パフォーマンス

1. データベースクエリの最適化
2. トランザクション処理の実装（注文作成の原子性を保証）
3. キャッシュ戦略の検討

## 実装手順

1. モデルの定義（Order, OrderItem, OrderItemOption）
2. バリデーション関数の実装
3. コントローラーの実装
4. ルートの定義
5. テストケースの作成と実行
6. ドキュメントの更新

## テスト計画

### 単体テスト

1. バリデーション関数のテスト
2. 金額計算ロジックのテスト
3. ID生成ロジックのテスト

### 統合テスト

1. 有効なリクエストでの注文作成テスト
2. 無効なリクエストでのエラーハンドリングテスト
3. 認証・認可テスト
4. エッジケースのテスト（大量のアイテム、特殊文字など）

### パフォーマンステスト

1. 負荷テスト（同時多数のリクエスト）
2. レスポンスタイムの測定

## 依存関係

1. 認証サービス（JWT検証）
2. テナントサービス（テナントID検証）
3. 部屋サービス（部屋ID検証）
4. メニューサービス（オプションでメニューアイテムの存在確認）

## 実装スケジュール

| タスク | 予定時間 | 担当者 |
|--------|----------|--------|
| モデル定義 | 2時間 | - |
| バリデーション実装 | 3時間 | - |
| コントローラー実装 | 4時間 | - |
| テスト作成・実行 | 4時間 | - |
| ドキュメント更新 | 1時間 | - |
| **合計** | **14時間** | - |

## 注意事項

1. 統合データベースのスキーマに合わせた実装が必要
2. エラーハンドリングを徹底し、適切なエラーメッセージを返す
3. ログ出力を適切に行い、デバッグ情報を残す
4. トランザクション処理を確実に実装し、データの整合性を保つ
5. 将来的な機能拡張（クーポン適用、ポイント付与など）を考慮した設計

## 参考情報

- 統合データベーススキーマ: `prisma/schema.prisma`
- 既存API実装: `server/api/v1/auth/login.post.ts`
- テスト例: `tests/api/v1/auth/login.test.ts`

以上の仕様に基づき、hotel-commonにオーダー作成APIを実装してください。実装完了後、hotel-saas側でAPIを呼び出す統合テストを行います。
