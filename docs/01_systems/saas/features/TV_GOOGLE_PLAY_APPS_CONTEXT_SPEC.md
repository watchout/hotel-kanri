# Google Playアプリ コンテキスト対応表示仕様書

## 1. 概要

本仕様書は、ホテル客室内のTVシステムにおけるGoogle Playアプリ表示機能に、コンテキスト対応表示およびパーソナライズ機能を追加するための設計を定義します。

## 2. 基本方針

### 2.1 推奨アプローチ

- **滞在期間中のパーソナライズ表示**: チェックイン〜チェックアウト期間の最終利用順表示
- **人気アプリの優先表示**: 直近90日間の利用統計に基づく表示順序最適化
- **ハイブリッド表示方式**: 最近使用したアプリ、人気アプリ、全アプリカタログの3段階表示
- **パフォーマンス最適化**: データ取得の軽量化とデータ量の制限

### 2.2 追加機能

- **コンテキスト対応表示**: 時間帯、天気、ホテルイベントに応じた表示変更
- **グループ化表示**: 関連アプリのバンドル表示と目的別グループ化
- **簡易評価システム**: アプリ使用後のフィードバック収集機能

## 3. データモデル設計

### 3.1 コンテキストルール定義

```typescript
interface ContextRule {
  id: string;
  name: string;
  type: 'timeOfDay' | 'weather' | 'event' | 'combined';
  condition: {
    timeRange?: { start: string; end: string }; // HH:MM形式
    weatherTypes?: string[]; // 'sunny', 'rainy', 'cloudy' など
    eventTypes?: string[]; // 'restaurant', 'spa', 'checkout' など
    eventTimeOffset?: { before: number; after: number }; // 分単位
  };
  priority: number; // 複数ルールが該当する場合の優先度
  boostCategories: { // カテゴリ別ブースト係数
    [category: string]: number; // 1.0が標準、高いほど優先表示
  };
  boostApps?: string[]; // 特定のパッケージ名を優先表示
}
```

### 3.2 セッションデータ構造

```typescript
interface RecentAppsSession {
  roomId: string;
  sessionId: string; // チェックインごとに生成
  recentApps: {
    packageName: string;
    lastUsed: Date;
    useCount: number;
  }[];
  expiresAt: Date; // チェックアウト日時
}
```

### 3.3 利用統計データ構造

```typescript
interface AppUsageStats {
  packageName: string;
  dailyLaunches: {
    date: string; // YYYY-MM-DD
    count: number;
  }[];
  totalLaunches90Days: number;
  lastUpdated: Date;
}
```

### 3.4 データベース拡張

```prisma
// アプリ利用統計
model AppUsageStats {
  id          String   @id @default(uuid())
  packageName String   @unique
  dailyData   Json     // 日別利用回数データ
  totalLaunches90Days Int @default(0)
  lastUpdated DateTime @default(now())

  @@index([packageName])
}

// セッション利用履歴 (一時データ)
model AppSession {
  id        String   @id @default(uuid())
  roomId    String
  sessionId String
  appData   Json     // 使用したアプリのリスト
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([roomId, sessionId])
  @@index([expiresAt]) // 期限切れ削除用
}

// アプリ評価
model AppRating {
  id          String   @id @default(uuid())
  appId       String
  isPositive  Boolean
  sessionId   String?
  createdAt   DateTime @default(now())

  @@index([appId])
}

// コンテキストルール
model ContextRule {
  id              String   @id @default(uuid())
  name            String
  type            String
  conditionData   Json
  priority        Int      @default(10)
  boostCategories Json
  boostApps       Json?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([type, isActive])
}
```

## 4. コンテキストルール設定

### 4.1 時間帯ベースルール

- **朝の情報タイム** (06:00-10:00)
  - 優先カテゴリ: ニュース(2.0)、天気(2.0)、生産性(1.5)
  - 優先アプリ: Googleニュース、Yahoo!ニュース、天気アプリ

- **日中のアクティビティ** (10:00-17:00)
  - 優先カテゴリ: 旅行(2.0)、地図(1.8)、飲食(1.5)

- **夜のリラックスタイム** (17:00-23:59)
  - 優先カテゴリ: 動画配信(2.0)、エンターテイメント(1.8)、音楽(1.8)、ゲーム(1.5)

### 4.2 天気ベースルール

- **雨の日特集**
  - 条件: 雨、嵐
  - 優先カテゴリ: 動画配信(2.0)、ゲーム(2.0)、書籍(1.8)、音楽(1.8)

### 4.3 イベントベースルール

- **お食事前情報**
  - 条件: レストラン予約の60分前まで
  - 優先カテゴリ: 飲食(2.5)、地図(1.5)
  - 優先アプリ: ホットペッパー、Googleマップ、Yahoo!マップ

- **チェックアウト準備**
  - 条件: チェックアウトの2時間前まで
  - 優先カテゴリ: 旅行(2.0)、交通(2.5)、天気(1.8)
  - 優先アプリ: 乗換案内、Googleマップ、NAVITIME

## 5. 外部データ連携

### 5.1 天気情報連携

- OpenWeatherMap APIなどの外部サービスから取得
- ホテル所在地の緯度・経度に基づく天気情報
- 天気タイプ（晴れ、雨、曇りなど）と気温を取得

### 5.2 ホテルイベント連携

- ホテルのPMSシステムやレストラン予約システムと連携
- 対象イベント: レストラン予約、スパ予約、チェックアウト予定など
- イベント情報: タイプ、予定時刻、関連情報

## 6. UI実装

### 6.1 コンポーネント構成

- **コンテキスト情報表示**: 現在適用中のコンテキストルールを視覚的に表示
- **最近使用したアプリセクション**: 横スクロールカルーセルで最大10件表示
- **カテゴリ別アプリグループ**: コンテキストに応じた優先度でカテゴリをソート
- **アプリ評価UI**: 使用後に表示される簡易評価ボタン
- **もっと見るボタン**: カテゴリ内の追加アプリを表示

### 6.2 表示最適化

- アプリアイコンのCDN活用によるロード時間短縮
- コンテキスト評価の15分ごとの更新
- 最大表示数の制限による表示パフォーマンス最適化

## 7. 実装ロードマップ

### フェーズ1: 基本機能実装
- 最近使用したアプリのセッション記録システム
- 基本的なアプリ利用統計の収集
- シンプルな時間帯ベースのコンテキスト表示

### フェーズ2: 拡張機能実装
- 天気情報連携
- ホテルイベント連携
- グループ化表示
- 簡易評価システム

### フェーズ3: 最適化と高度化
- パフォーマンス最適化
- 機械学習による推奨精度向上
- パーソナライズ機能の強化

## 8. 技術的考慮事項

### 8.1 データ保存場所

- セッションデータ: Redis/Memcachedなどのインメモリキャッシュ
- 利用統計: 軽量なNoSQLまたはRDBMS
- コンテキストルール: メインデータベース

### 8.2 パフォーマンス最適化

- 日次バッチ処理による利用統計の集計
- 90日以上経過したデータの自動削除
- アプリマスターデータへの集計結果キャッシュ

### 8.3 プライバシー考慮

- 個人特定情報を含まない匿名データのみ収集
- チェックアウト時のセッションデータ自動削除
- オプトアウト機能の提供
