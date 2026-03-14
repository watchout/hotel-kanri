# SSOT_DEV-0270_ETA_TUNING.md

**バージョン**: 1.0.0  
**最終更新**: 2026-01-23  
**ドキュメントID**: SSOT-ADMIN-ETA-001  
**タスクID**: DEV-0270（親）, DEV-0271〜0274（サブタスク）

---

## 概要

- **目的**: 注文の到着予定時間（ETA）をテナントごとにカスタマイズ可能にし、ゲストへの正確な待ち時間表示と顧客満足度向上を実現する
- **適用範囲**: hotel-common（ETA計算）、hotel-saas（管理UI/ゲストUI）
- **関連SSOT**:
  - `SSOT_GUEST_ORDER_FLOW.md`（注文フロー）
  - `SSOT_SAAS_ORDER_MANAGEMENT.md`（注文管理）
  - `SSOT_MARKETING_INTEGRATION.md`（Config First）

---

## 要件ID体系

- ETA-001〜099: 機能要件
- ETA-100〜199: 非機能要件
- ETA-200〜299: UI/UX要件

---

## 機能要件（FR）

### ETA-001: 基本ETA設定

- **説明**: デフォルトのETA（分）を設定
- **Accept**:
  - テナントごとにデフォルトETA（分）を設定可能
  - 最小5分、最大120分の範囲
  - 未設定時のデフォルト: 30分

### ETA-002: カテゴリ別ETA

- **説明**: メニューカテゴリごとにETAを設定
- **Accept**:
  - 「ドリンク」は10分、「料理」は30分など
  - カテゴリに設定がない場合はデフォルトETAを使用
  - 複数カテゴリの注文は最大値を採用

### ETA-003: 時間帯別調整

- **説明**: 混雑時間帯にETAを自動延長
- **Accept**:
  - 時間帯ごとの調整係数（0.5〜2.0）を設定可能
  - 例: ランチタイム（11:00-14:00）は1.5倍
  - 調整後も最大値（設定可能）を超えない

### ETA-004: リアルタイム負荷調整

- **説明**: 現在の注文キュー状況に応じてETA調整
- **Accept**:
  - 待機中の注文数に応じて自動延長
  - 閾値（例: 5件以上で+10分）を設定可能
  - **Phase 2**（MVPでは固定値のみ）

### ETA-005: ETA表示

- **説明**: ゲストUIに予想到着時間を表示
- **Accept**:
  - 注文確認画面に「約30分でお届け予定」表示
  - 注文履歴に予想到着時刻（HH:MM形式）表示
  - ETAを過ぎた場合は「まもなく到着」表示

---

## 非機能要件（NFR）

### ETA-100: パフォーマンス

- ETA計算: 50ms以内
- 設定取得: Redisキャッシュ使用

### ETA-101: 正確性

- 表示ETAと実際の到着時間の乖離を記録
- 定期的な精度分析（Phase 2）

---

## API仕様

### エンドポイント一覧

**管理API**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/admin/eta/settings` | ETA設定取得 | Session認証 |
| PUT | `/api/v1/admin/eta/settings` | ETA設定更新 | Session認証 |
| GET | `/api/v1/admin/eta/categories` | カテゴリ別ETA取得 | Session認証 |
| PUT | `/api/v1/admin/eta/categories/:categoryId` | カテゴリ別ETA更新 | Session認証 |

**内部API**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/internal/eta/calculate` | ETA計算 | 内部認証 |

### リクエスト/レスポンス詳細

```json
// GET /api/v1/admin/eta/settings
// Response
{
  "success": true,
  "data": {
    "defaultEtaMinutes": 30,
    "minEtaMinutes": 5,
    "maxEtaMinutes": 120,
    "timeAdjustments": [
      {
        "start": "11:00",
        "end": "14:00",
        "multiplier": 1.5,
        "label": "ランチタイム"
      },
      {
        "start": "18:00",
        "end": "21:00",
        "multiplier": 1.3,
        "label": "ディナータイム"
      }
    ]
  }
}

// PUT /api/v1/admin/eta/settings
// Request
{
  "defaultEtaMinutes": 25,
  "timeAdjustments": [
    {
      "start": "12:00",
      "end": "13:00",
      "multiplier": 2.0,
      "label": "ピーク時"
    }
  ]
}

// GET /api/v1/internal/eta/calculate?categoryIds=1,2&orderTime=2026-01-23T12:30:00
// Response
{
  "success": true,
  "data": {
    "etaMinutes": 45,
    "etaTime": "2026-01-23T13:15:00+09:00",
    "breakdown": {
      "baseEta": 30,
      "categoryAdjustment": 0,
      "timeMultiplier": 1.5,
      "finalEta": 45
    }
  }
}
```

---

## データベース設計

### tenant_settings（既存テーブル利用）

```typescript
// category: 'eta'
// keys:
// - default_minutes: 30
// - min_minutes: 5
// - max_minutes: 120
// - time_adjustments: [{ start, end, multiplier, label }]
// - category_overrides: { categoryId: minutes }
```

### menu_categories 拡張

```prisma
model MenuCategory {
  // ... 既存フィールド
  
  // ETA設定（追加）
  etaMinutes    Int?     @map("eta_minutes")  // カテゴリ固有ETA（null=デフォルト使用）
  
  @@map("menu_categories")
}
```

---

## UI/UX要件

### ETA-200: ETA設定画面

- パス: `/admin/settings/eta`
- デフォルトETA入力（スライダー or 数値入力）
- 時間帯別調整の一覧/編集
- カテゴリ別ETA設定へのリンク

### ETA-201: 時間帯調整設定

- 時間帯の追加/編集/削除
- 開始時刻、終了時刻、倍率、ラベル
- プレビュー表示（現在時刻での計算結果）

### ETA-202: カテゴリ別ETA設定

- メニューカテゴリ管理画面内に配置
- カテゴリごとのETA入力欄
- 「デフォルトを使用」チェックボックス

### ETA-203: ゲストUI表示

- 注文確認画面: 「約XX分でお届け予定」
- 注文履歴: 到着予定時刻（HH:MM）
- 遅延時: 「まもなく到着します」

---

## ETA計算ロジック

```typescript
async function calculateEta(
  tenantId: string,
  categoryIds: number[],
  orderTime: Date
): Promise<number> {
  // 1. 設定取得
  const settings = await getEtaSettings(tenantId)
  
  // 2. ベースETA決定（カテゴリ別の最大値）
  let baseEta = settings.defaultEtaMinutes
  for (const categoryId of categoryIds) {
    const categoryEta = settings.categoryOverrides[categoryId]
    if (categoryEta && categoryEta > baseEta) {
      baseEta = categoryEta
    }
  }
  
  // 3. 時間帯調整
  const timeStr = format(orderTime, 'HH:mm')
  let multiplier = 1.0
  for (const adj of settings.timeAdjustments) {
    if (timeStr >= adj.start && timeStr <= adj.end) {
      multiplier = Math.max(multiplier, adj.multiplier)
    }
  }
  
  // 4. 最終計算
  let finalEta = Math.round(baseEta * multiplier)
  finalEta = Math.max(settings.minMinutes, Math.min(settings.maxMinutes, finalEta))
  
  return finalEta
}
```

---

## Config設定（Marketing Injection対応）

| 設定項目 | カテゴリ | キー | デフォルト値 |
|:---------|:---------|:-----|:------------|
| デフォルトETA | eta | default_minutes | 30 |
| 最小ETA | eta | min_minutes | 5 |
| 最大ETA | eta | max_minutes | 120 |
| 時間帯調整 | eta | time_adjustments | [] |
| カテゴリ別 | eta | category_overrides | {} |

---

## 実装チェックリスト

### 🔴 MVP（DEV-0270スコープ）

- [ ] tenant_settings にETA設定シード
- [ ] menu_categories にeta_minutesフィールド追加（マイグレーション）
- [ ] ETA計算サービス実装
- [ ] GET/PUT /api/v1/admin/eta/settings 実装
- [ ] GET /api/v1/internal/eta/calculate 実装
- [ ] hotel-saas プロキシ実装
- [ ] 注文作成時にETA計算・保存
- [ ] 管理UI: ETA設定画面
- [ ] ゲストUI: ETA表示

### 🟡 Phase 2

- [ ] リアルタイム負荷調整（ETA-004）
- [ ] ETA精度分析ダッシュボード
- [ ] 機械学習ベースのETA予測

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-23 | 1.0.0 | 初版作成（DEV-0270: ETAチューニング） |
