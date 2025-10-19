# デバイス管理機能仕様書
*Status: draft — 2025-07-XX*

## 1. 概要
Google TVストリーマーを含むホテル客室デバイスを一元管理するための機能です。デバイスオーナー（DO）権限を活用し、リモートコントロール、チェックアウト時のデータリセット、隠しコマンドによる設定画面アクセスなどを実現します。

## 2. 機能要件

| ID | カテゴリ | 内容 | DoD |
|----|----------|------|-----|
| **D-01** | キオスクモード | ホームボタンでホテルアプリを開く | ホームボタン押下時に指定アプリが起動する |
| **D-02** | データリセット | チェックアウト時に個人情報を削除 | WebSocket通知でデータクリア・初期画面表示 |
| **D-03** | 隠しコマンド | 特定キー操作で設定画面にアクセス | コナミコマンド+PIN認証で設定画面表示 |
| **D-04** | デバイス管理 | 管理画面からのデバイス操作 | リセット・再起動・状態確認が可能 |
| **D-05** | セキュリティ | 認証・権限管理 | 管理機能は管理者のみアクセス可能 |

## 3. 技術仕様

### 3.1 デバイスオーナー（DO）設定
- TestDPC（Android Enterprise Device Policy Controller）を使用
- ADBコマンドによるデバイス初期設定
- ポリシー適用によるホームアプリ固定

### 3.2 データモデル
```prisma
// 既存のDeviceRoomモデルを拡張
model DeviceRoom {
  id          Int      @id @default(autoincrement())
  macAddress  String?  @unique // MACアドレス
  ipAddress   String?  // IPアドレス
  deviceName  String   // デバイス識別名（例: "Room 101 Tablet"）
  roomId      String   // 部屋番号
  deviceType  String?  // デバイスタイプ（タブレット、STB、スマートTV等）
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastUsedAt  DateTime?

  // 追加フィールド
  deviceOwner Boolean  @default(false) // DO権限取得済みか
  osVersion   String?  // Android OSバージョン
  lastResetAt DateTime? // 最終リセット日時

  // プレイス管理との統合
  placeId     Int?     // プレイスID（Place統合後）
  place       Place?   @relation(fields: [placeId], references: [id])

  @@map("device_rooms")
}
```

### 3.3 WebSocket通信
- サーバーからクライアントへのイベント通知
- チェックアウト時に`GUEST_CHECKOUT`イベント発行
- クライアント側でデータクリア処理を実行

### 3.4 隠しコマンド
- キーシーケンス: 上上下下左右左右OK（コナミコマンド）
- PIN認証による二重保護
- 設定画面へのアクセス制御

## 4. API仕様

### 4.1 デバイス管理API

```
# デバイス一覧取得
GET /api/admin/devices
Response: DeviceRoom[]

# デバイス詳細取得
GET /api/admin/devices/:id
Response: DeviceRoom

# デバイスリセット
POST /api/admin/devices/:id/reset
Response: { success: boolean }

# デバイス再起動
POST /api/admin/devices/:id/reboot
Response: { success: boolean }

# チェックアウト処理
POST /api/admin/devices/:id/checkout
Response: { success: boolean }
```

### 4.2 WebSocketイベント

```typescript
// チェックアウトイベント
{
  type: 'GUEST_CHECKOUT',
  data: {
    deviceId: number,
    roomId: string,
    timestamp: string
  }
}

// デバイスステータス更新イベント
{
  type: 'DEVICE_STATUS_UPDATE',
  data: {
    deviceId: number,
    status: 'online' | 'offline' | 'rebooting',
    timestamp: string
  }
}
```

## 5. ユーザーインターフェース

### 5.1 管理画面
- デバイス一覧画面（`/admin/devices`）
  - デバイス検索・フィルタリング
  - ステータス表示（オンライン/オフライン）
  - 操作ボタン（リセット、再起動、詳細）
- デバイス詳細画面（`/admin/devices/:id`）
  - 詳細情報表示
  - ログ履歴
  - 詳細操作

### 5.2 TV設定画面
- 隠しコマンドでアクセス可能
- デバイスリセット
- ネットワーク設定
- サーバー設定
- 戻るボタン

## 6. セキュリティ考慮事項

- 管理機能は管理者権限を持つユーザーのみアクセス可能
- 隠しコマンドはPIN認証で保護
- ADBコマンド実行は適切な権限チェック後に実行
- リセット操作は確認ダイアログで保護

## 7. 実装計画

### フェーズ1: 基盤構築（1-2日）
- スクリプトの整理と配置
- `useDeviceReset` composableの実装

### フェーズ2: 隠しコマンド実装（1-2日）
- 隠しコマンド機能の実装
- TV設定画面の実装

### フェーズ3: 管理API実装（1-2日）
- デバイス管理APIの実装
- WebSocket連携の実装

### フェーズ4: 統合・テスト（1日）
- 統合テスト
- ドキュメント作成

## 8. 運用ガイドライン

### デバイス初期設定手順
1. デバイスを工場出荷状態にリセット
2. 初期設定ウィザードを完了
3. 開発者オプションを有効化
4. ADBデバッグを有効化
5. `setup_device.sh`スクリプトを実行
6. TestDPCでポリシーを設定

### トラブルシューティング
- デバイスが応答しない場合: 電源の再投入
- ホームアプリが起動しない場合: TestDPCポリシーの再設定
- データリセットが動作しない場合: WebSocket接続を確認

## 9. 更新履歴
- 2025-07-XX: 初版作成
