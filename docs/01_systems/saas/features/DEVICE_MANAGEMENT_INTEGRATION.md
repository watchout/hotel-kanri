# デバイス管理機能の統合計画書
*Status: draft — 2025-07-XX*

## 1. 概要

Google TVストリーマーのデバイスオーナー（DO）機能を活用した管理機能を、既存のhotel-saasシステムに統合する計画です。この文書では、既存システムとの連携方法、重複機能の回避、および効率的な実装アプローチについて説明します。

## 2. 既存システムの分析

### 2.1 キャンペーン・ウェルカム機能

hotel-saasには既に以下の関連機能が実装されています：

1. **キャンペーン管理システム**
   - `docs/features/CAMPAIGN_SYSTEM.md`に詳細仕様あり
   - `Campaign`モデルで期間・時間帯・曜日指定が可能
   - 管理API・客室側APIが実装済み

2. **ウェルカムスクリーン機能**
   - `pages/welcome-screen.vue`として実装済み
   - 動画・画像表示、多言語対応
   - チェックイン時の表示判定API (`/welcome-screen/should-show`)

3. **WebSocket通信基盤**
   - `server/middleware/websocket.ts`でWebSocketサーバー実装済み
   - 接続タイプ（'admin', 'kitchen', 'delivery', 'room'）に応じた処理
   - `useWebSocket`コンポーザブルで簡易接続

### 2.2 チェックイン・チェックアウト機能

1. **フロント業務システム**
   - `server/api/v1/admin/front-desk/checkin.post.ts`
   - `server/api/v1/admin/front-desk/checkout.post.ts`
   - `pages/admin/front-desk/operation.vue`での管理UI

2. **客室状態管理**
   - `RoomStatus`モデルでチェックイン・チェックアウト状態管理
   - `Place.attributes`で運用状態を管理

## 3. 統合アプローチ

### 3.1 チェックアウト時のデータリセット連携

既存のチェックアウト処理に、デバイスリセット機能を追加します：

```typescript
// server/api/v1/admin/front-desk/checkout.post.ts に追加
// チェックアウト処理の最後に実行

// 該当する客室のデバイスを検索
const deviceRoom = await tx.deviceRoom.findFirst({
  where: { roomId: roomNumber }
});

if (deviceRoom) {
  // WebSocketでチェックアウトイベントを発行
  const wss = useWebSocketServer();
  wss.clients.forEach(client => {
    if (client.deviceId === deviceRoom.id) {
      client.send(JSON.stringify({
        type: 'GUEST_CHECKOUT',
        data: {
          deviceId: deviceRoom.id,
          roomId: roomNumber,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });

  // デバイスリセットスクリプトを実行（非同期で）
  try {
    const scriptPath = resolve(process.cwd(), 'scripts/device/reset_device.sh');
    exec(`${scriptPath} ${deviceRoom.ipAddress}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`デバイスリセットエラー: ${error}`);
        return;
      }
      console.log(`デバイスリセット成功: ${stdout}`);
    });
  } catch (error) {
    console.error('デバイスリセットスクリプト実行エラー:', error);
  }
}
```

### 3.2 チェックイン時のウェルカム表示連携

既存のウェルカムスクリーン機能と連携します：

```typescript
// server/api/v1/admin/front-desk/checkin.post.ts に追加
// チェックイン処理の最後に実行

// 該当する客室のデバイスを検索
const deviceRoom = await tx.deviceRoom.findFirst({
  where: { roomId: body.roomNumber }
});

if (deviceRoom) {
  // WebSocketでチェックインイベントを発行
  const wss = useWebSocketServer();
  wss.clients.forEach(client => {
    if (client.deviceId === deviceRoom.id) {
      client.send(JSON.stringify({
        type: 'GUEST_CHECKIN',
        data: {
          deviceId: deviceRoom.id,
          roomId: body.roomNumber,
          timestamp: new Date().toISOString()
        }
      }));
    }
  });
}
```

### 3.3 WebSocket連携

既存のWebSocketシステムを活用します：

```typescript
// server/utils/webSocket.ts に追加
// WebSocketメッセージ送信ユーティリティ

/**
 * 特定の部屋のデバイスにWebSocketメッセージを送信
 */
export function sendMessageToRoom(roomId: string, message: any): void {
  const connections = getConnectionsByType('room');
  const roomConnections = connections.filter(conn => conn.id === roomId);

  if (roomConnections.length === 0) {
    console.log(`部屋 ${roomId} に接続されたデバイスがありません`);
    return;
  }

  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

  roomConnections.forEach(conn => {
    try {
      conn.socket.send(messageStr);
    } catch (error) {
      console.error(`部屋 ${roomId} へのメッセージ送信エラー:`, error);
    }
  });
}

// useWebSocketServer コンポーザブル
export function useWebSocketServer() {
  return {
    clients: getConnections(),
    sendToRoom: sendMessageToRoom
  };
}
```

### 3.4 隠しコマンド機能の統合

既存のTV用リモコン操作プラグインに隠しコマンド機能を追加します：

```typescript
// plugins/tv-remote-control.client.js に追加
// 既存のコードの後に追加

// 隠しコマンドのシーケンス
const secretSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'Enter'];
let currentSequence = [];

// PINコード検証
const verifyPin = (pin) => {
  // 開発中は固定PIN
  const validPin = '1234'; // 本番環境では環境変数や設定から取得
  return pin === validPin;
};

// 隠しコマンド検出
document.addEventListener('keydown', (e) => {
  // TV向けページのみで有効
  if (!window.location.pathname.startsWith('/tv')) return;

  // 現在のシーケンスを更新
  currentSequence.push(e.key);
  if (currentSequence.length > secretSequence.length) {
    currentSequence.shift();
  }

  // シーケンスが一致するか確認
  const isMatch = secretSequence.every((key, index) => currentSequence[index] === key);

  if (isMatch) {
    // PINコード入力ダイアログを表示
    const pin = prompt('設定画面へのアクセスにはPINコードが必要です');

    if (pin && verifyPin(pin)) {
      // 設定画面へ遷移
      nuxtApp.$router.push('/tv/settings');
    } else if (pin) {
      alert('PINコードが正しくありません');
    }

    // シーケンスをリセット
    currentSequence = [];
  }
});
```

## 4. 実装計画

### 4.1 ファイル構造

```
hotel-saas/
  ├── scripts/
  │   └── device/                  # デバイス管理スクリプト
  │       ├── setup_device.sh      # 初期設定スクリプト
  │       ├── reset_device.sh      # リセットスクリプト
  │       └── monitor_devices.sh   # 監視スクリプト
  │
  ├── composables/
  │   └── useDeviceReset.ts        # デバイスリセット機能
  │
  ├── pages/
  │   └── tv/
  │       └── settings.vue         # TV設定画面
  │
  └── server/
      └── api/
          └── admin/
              └── front-desk/
                  ├── checkin.post.ts    # チェックイン処理（拡張）
                  └── checkout.post.ts   # チェックアウト処理（拡張）
```

### 4.2 実装ステップ

1. **スクリプトの整理と配置**
   - `scripts/device/` ディレクトリの作成
   - 各スクリプトの実装と権限設定

2. **WebSocket連携の実装**
   - `useWebSocketServer` コンポーザブルの実装
   - 既存WebSocketシステムとの統合

3. **チェックアウト連携の実装**
   - `checkout.post.ts` への処理追加
   - `useDeviceReset` コンポーザブルの実装

4. **チェックイン連携の実装**
   - `checkin.post.ts` への処理追加
   - ウェルカムスクリーン連携

5. **隠しコマンド機能の実装**
   - `tv-remote-control.client.js` への機能追加
   - `tv/settings.vue` の実装

6. **テストと検証**
   - 各機能の単体テスト
   - 統合テスト

## 5. 重複回避と最適化

1. **ウェルカム機能**
   - 既存のキャンペーン・ウェルカムスクリーン機能を活用
   - 新規実装ではなく、WebSocketイベントでトリガー

2. **WebSocket通信**
   - 既存のWebSocketインフラを活用
   - 新規WebSocketサーバーは作成せず、既存サーバーを拡張

3. **チェックイン・チェックアウト連携**
   - 既存のフロント業務フローを変更せず、イベントリスナーとして追加
   - 非同期処理で本来のフロー速度に影響を与えない設計

## 6. 今後の展開

1. **管理画面の強化**
   - 既存の管理画面にデバイス管理機能を統合
   - デバイスステータスの可視化

2. **モニタリングシステムの強化**
   - 既存の監視基盤との連携
   - アラート機能の統合

3. **セキュリティ強化**
   - PIN管理機能の実装
   - アクセスログ記録の強化

## 7. 結論

既存のhotel-saasシステムに、Google TVストリーマーのデバイス管理機能を効率的に統合する計画を示しました。既存の機能（キャンペーン、ウェルカムスクリーン、WebSocket、チェックイン・チェックアウト）を最大限に活用し、重複を避けながら、新たな価値を追加します。この統合により、ホテル運営の効率化とセキュリティ向上が実現します。

## 更新履歴
- 2025-07-XX: 初版作成
