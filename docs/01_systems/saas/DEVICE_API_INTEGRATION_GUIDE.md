# デバイスAPI統合ガイド

このドキュメントは、hotel-saasアプリケーションでデバイス関連APIをhotel-common APIに統合する方法を説明します。

## 概要

デバイス関連APIは、ホテル内の各種デバイス（客室タブレット、TVなど）の管理、認証、状態確認などの機能を提供します。これらのAPIをhotel-common APIに統合することで、統一的なデバイス管理が可能になります。

## 統合済みAPI

以下のAPIがhotel-common APIに統合されています：

1. **デバイス一覧取得API** (`GET /api/v1/devices`)
2. **デバイスステータス確認API** (`POST /api/v1/devices/check-status`)
3. **クライアントIP取得API** (`GET /api/v1/devices/client-ip`)
4. **デバイス数取得API** (`GET /api/v1/devices/count`)

## 使用方法

### APIクライアント

デバイス関連APIは、`server/utils/api-client.ts`で定義されている`deviceApi`オブジェクトを通じて利用できます。

```typescript
import { deviceApi } from '~/server/utils/api-client';

// デバイス一覧取得
const devices = await deviceApi.getDevices();

// デバイスステータス確認
const deviceStatus = await deviceApi.checkDeviceStatus({
  macAddress: 'AA:BB:CC:DD:EE:FF',
  ipAddress: '192.168.1.101',
  userAgent: 'Mozilla/5.0 ...',
  pagePath: '/order'
});

// クライアントIP取得
const clientIp = await deviceApi.getClientIp();

// デバイス数取得
const deviceCount = await deviceApi.getDeviceCount();
```

### エラーハンドリング

すべてのAPIは、エラー発生時に例外をスローします。適切なエラーハンドリングを行ってください。

```typescript
try {
  const devices = await deviceApi.getDevices();
  // 成功時の処理
} catch (error) {
  console.error('デバイス一覧取得エラー:', error);
  // エラー時の処理
}
```

## 認証

管理者権限が必要なAPIは、リクエストヘッダーに認証情報を含める必要があります。これは、hotel-saasの認証ミドルウェアによって自動的に処理されます。

## テスト

APIの動作確認は、以下のコマンドで行うことができます：

```bash
# デバイス一覧取得API
curl -X GET http://localhost:3100/api/v1/admin/devices

# デバイスステータス確認API
curl -X POST http://localhost:3100/api/v1/device/check-status \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:FF","ipAddress":"127.0.0.1","userAgent":"Mozilla/5.0","pagePath":"/order"}'

# クライアントIP取得API
curl -X GET http://localhost:3100/api/v1/device/client-ip

# デバイス数取得API
curl -X GET http://localhost:3100/api/v1/admin/devices/count
```

## 注意事項

- hotel-common APIが未実装の場合、APIは404または500エラーを返します。
- 開発環境でもモックデータを使用せず、本番環境と同じ動作をします。
- デバイス認証に失敗した場合、`/unauthorized-device`ページにリダイレクトされます。

## 関連ドキュメント

- [デバイスAPI仕様書](./DEVICE_API_SPEC.md)
- [API統合チェックリスト](./API_INTEGRATION_MASTER_CHECKLIST.md)
- [hotel-common API利用ガイド](../COMMON_API_USAGE_GUIDE.md)
