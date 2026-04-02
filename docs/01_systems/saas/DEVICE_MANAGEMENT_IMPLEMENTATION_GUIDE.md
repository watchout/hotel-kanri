# デバイス管理機能実装ガイド
*Version: 1.0 — 2025-07-XX*

## 1. 概要

本ガイドは、hotel-saasプロジェクトに実装されたGoogle TVストリーマーのデバイス管理機能について説明します。この機能は、チェックイン・チェックアウト時のデバイス制御、データリセット、隠しコマンドによる設定画面アクセスなどを提供します。

## 2. 機能一覧

### 2.1 WebSocket通信機能

WebSocketを使用して、サーバーとデバイス間でリアルタイム通信を行います。

- **実装ファイル**:
  - `server/utils/webSocketServer.ts` - WebSocketサーバーユーティリティ
  - `composables/useWebSocket.ts` - クライアント側WebSocket接続

- **主要機能**:
  - 部屋別メッセージング
  - タイプ別メッセージング（admin, kitchen, delivery, room）
  - 自動再接続

### 2.2 デバイスリセット機能

チェックアウト時や管理者の操作によるデバイスデータのリセットを行います。

- **実装ファイル**:
  - `composables/useDeviceReset.ts` - クライアント側リセット機能
  - `scripts/device/reset_device.sh` - ADBコマンドによるリセット
  - `server/api/v1/admin/devices/[id]/reset.post.ts` - リセットAPI

- **主要機能**:
  - ブラウザデータのクリア（localStorage, sessionStorage, IndexedDB, キャッシュ）
  - ADBコマンドによるデバイスデータのクリア
  - WebSocketイベントによるリセットトリガー

### 2.3 チェックイン・チェックアウト連携

フロント業務システムとの連携により、チェックイン・チェックアウト時にデバイス制御を行います。

- **実装ファイル**:
  - `server/api/v1/admin/front-desk/checkin.post.ts` - チェックインAPI
  - `server/api/v1/admin/front-desk/checkout.post.ts` - チェックアウトAPI

- **主要機能**:
  - チェックイン時のウェルカム画面表示
  - チェックアウト時のデータリセット

### 2.4 隠しコマンド機能

TVリモコンの特定のキー入力シーケンスにより、設定画面にアクセスする機能です。

- **実装ファイル**:
  - `plugins/tv-remote-control.client.js` - リモコン操作プラグイン
  - `pages/tv/settings.vue` - 設定画面

- **主要機能**:
  - キーシーケンス検出（↑↑↓↓←→←→Enter）
  - PINコード認証
  - 設定画面アクセス

### 2.5 管理画面機能

デバイスの管理・監視を行うための管理画面です。

- **実装ファイル**:
  - `pages/admin/devices/index.vue` - デバイス管理画面
  - `server/api/v1/admin/devices/index.get.ts` - デバイス一覧API
  - `server/api/v1/admin/devices/index.post.ts` - デバイス登録API
  - `server/api/v1/admin/devices/[id].put.ts` - デバイス更新API

- **主要機能**:
  - デバイス一覧表示
  - デバイス追加・編集
  - デバイスリセット・チェックアウト

## 3. 使用方法

### 3.1 デバイス初期設定

新しいGoogle TVストリーマーをセットアップする手順です。

```bash
# 1. デバイスをDOモードで設定
# (Android Enterprise管理コンソールで設定)

# 2. 初期設定スクリプトを実行
./scripts/device/setup_device.sh <デバイスIP>

# 3. デバイスのステータスを確認
./scripts/device/monitor_devices.sh <デバイスIP>
```

### 3.2 管理画面からのデバイス管理

1. 管理者としてログイン
2. 「デバイス管理」メニューを選択
3. デバイス一覧から操作するデバイスを選択
4. 「編集」「リセット」「チェックアウト」などの操作を実行

### 3.3 隠しコマンドの使用

1. TVモードでリモコンを使用
2. 特定のキーシーケンス（↑↑↓↓←→←→Enter）を入力
3. PINコードを入力
4. 設定画面にアクセス

## 4. 開発者向け情報

### 4.1 WebSocketメッセージ形式

```typescript
// イベントメッセージ形式
interface WebSocketMessage {
  type: string;        // イベントタイプ（'GUEST_CHECKIN', 'GUEST_CHECKOUT'など）
  data?: {             // イベントデータ
    deviceId: number;  // デバイスID
    roomId: string;    // 部屋ID
    timestamp: string; // タイムスタンプ（ISO 8601形式）
    [key: string]: any; // その他のデータ
  };
}
```

### 4.2 WebSocketサーバーの使用

```typescript
// サーバーサイドでのWebSocketサーバーの使用例
import { useWebSocketServer } from '~/server/utils/webSocketServer';

export default defineEventHandler(async (event) => {
  // WebSocketサーバーを取得
  const wss = useWebSocketServer();

  // 特定の部屋にメッセージを送信
  wss.sendToRoom('101', {
    type: 'GUEST_CHECKIN',
    data: {
      deviceId: 1,
      roomId: '101',
      timestamp: new Date().toISOString()
    }
  });

  return { success: true };
});
```

### 4.3 デバイスリセットの使用

```typescript
// クライアントサイドでのデバイスリセットの使用例
import { useDeviceReset } from '~/composables/useDeviceReset';

export default defineComponent({
  setup() {
    const { resetDevice, isResetting } = useDeviceReset();

    const handleReset = async () => {
      const success = await resetDevice();
      if (success) {
        console.log('リセット成功');
      } else {
        console.error('リセット失敗');
      }
    };

    return {
      handleReset,
      isResetting
    };
  }
});
```

### 4.4 テスト用スクリプト

```bash
# WebSocketテスト
node scripts/test/test_websocket.js ws://localhost:3100/ws listen

# デバイスリセットテスト
node scripts/test/test_device_reset.js 1 reset

# 隠しコマンドテスト
# ブラウザで scripts/test/test_hidden_command.html を開く
```

## 5. トラブルシューティング

### 5.1 WebSocket接続エラー

- **症状**: WebSocket接続が確立できない
- **対処**:
  1. サーバーが起動しているか確認
  2. WebSocketエンドポイント（/ws）が有効か確認
  3. ネットワーク接続を確認
  4. ファイアウォール設定を確認

### 5.2 デバイスリセット失敗

- **症状**: デバイスリセットが失敗する
- **対処**:
  1. ADB接続を確認（`adb devices`で接続状態を確認）
  2. デバイスがDOモードになっているか確認
  3. クライアント側リセットのフォールバックが機能しているか確認
  4. スクリプトの実行権限を確認（`chmod +x`）

### 5.3 隠しコマンドが動作しない

- **症状**: 隠しコマンドが検出されない
- **対処**:
  1. TVモードであることを確認
  2. キーシーケンスが正しいか確認
  3. コンソールでエラーがないか確認
  4. リモコン操作プラグインが正しく読み込まれているか確認

## 6. セキュリティ考慮事項

1. **PINコード管理**: 設定画面へのアクセスに使用するPINコードは定期的に変更し、環境変数や設定ファイルで管理する

2. **WebSocket認証**: WebSocket接続時に適切な認証を行い、不正アクセスを防止する

3. **ADBセキュリティ**: ADBコマンドの実行は管理者権限のあるユーザーのみに制限する

4. **データ削除の確実性**: チェックアウト時のデータ削除は複数層で行い、個人情報の漏洩を防止する

## 7. 今後の拡張予定

1. **デバイス監視機能の強化**: リアルタイムのデバイスステータス監視、アラート機能

2. **リモート操作機能の拡張**: 画面キャプチャ、リモートデバッグ機能

3. **統計情報の収集と分析**: デバイス使用状況の分析、パフォーマンスモニタリング

4. **自動更新機能**: デバイスソフトウェアの自動更新機能

## 更新履歴
- 2025-07-XX: 初版作成
