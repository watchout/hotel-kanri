# キャンペーンAPI統合方式変更に関する更新

## 概要

hotel-common側でキャンペーンAPIの実装方式が変更され、他のモジュール（hotel-member等）と同様の統合方式に変更されました。この変更により、API管理の一貫性が向上し、今後の機能追加や保守が容易になります。

## 変更内容

### 1. APIエンドポイント構造の統一

以前のエンドポイント構造:
```
http://localhost:3400/api/v1/campaigns/...
http://localhost:3400/api/v1/admin/campaigns/...
```

新しいエンドポイント構造:
```
http://localhost:3400/api/campaigns/...
http://localhost:3400/api/campaigns/admin/...
```

### 2. 各エンドポイントのパス変更

| 機能 | 旧パス | 新パス |
|------|--------|--------|
| アクティブキャンペーン取得 | `/api/v1/campaigns/active` | `/api/campaigns/active` |
| カテゴリー別キャンペーン取得 | `/api/v1/campaigns/by-category/:code` | `/api/campaigns/by-category/:code` |
| キャンペーン適用確認 | `/api/v1/campaigns/check` | `/api/campaigns/check` |
| 管理者キャンペーン一覧 | `/api/v1/admin/campaigns` | `/api/campaigns/admin` |
| 管理者キャンペーン詳細 | `/api/v1/admin/campaigns/:id` | `/api/campaigns/admin/:id` |
| 管理者キャンペーン作成 | `/api/v1/admin/campaigns` | `/api/campaigns/admin` |
| 管理者キャンペーン更新 | `/api/v1/admin/campaigns/:id` | `/api/campaigns/admin/:id` |
| 管理者キャンペーン削除 | `/api/v1/admin/campaigns/:id` | `/api/campaigns/admin/:id` |
| キャンペーン効果分析 | `/api/v1/admin/campaigns/:id/analytics` | `/api/campaigns/admin/:id/analytics` |
| 全キャンペーン統計 | `/api/v1/admin/campaigns/analytics/summary` | `/api/campaigns/admin/analytics/summary` |
| ウェルカムスクリーン設定取得 | `/api/v1/welcome-screen/config` | `/api/campaigns/welcome-screen/config` |
| ウェルカムスクリーン表示判定 | `/api/v1/welcome-screen/should-show` | `/api/campaigns/welcome-screen/should-show` |
| ウェルカムスクリーン完了マーク | `/api/v1/welcome-screen/mark-completed` | `/api/campaigns/welcome-screen/mark-completed` |

### 3. サーバー起動方法の変更

以前の起動方法:
```bash
cd ../hotel-common
./start-campaign-server.sh
```

新しい起動方法:
```bash
cd ../hotel-common
./start-server.sh
```

## 変更対応

hotel-saas側では以下のファイルを修正して対応しました:

1. `src/api/hotel-common-client.ts`
   - ベースURLを `/api/v1` から `/api/campaigns` に変更

2. `src/api/services/campaign-service.ts`
   - 各エンドポイントのパスを変更
   - `/campaigns/active` → `/active`
   - `/campaigns/by-category/:code` → `/by-category/:code`
   - `/campaigns/check` → `/check`

3. `src/api/services/admin-campaign-service.ts`
   - 各エンドポイントのパスを変更
   - `/admin/campaigns` → `/admin`
   - `/admin/campaigns/:id` → `/admin/:id`
   - `/admin/campaigns/:id/analytics` → `/admin/:id/analytics`
   - `/admin/campaigns/analytics/summary` → `/admin/analytics/summary`

4. `src/api/services/welcome-screen-service.ts`
   - ベースURLの変更のみ（パス自体は変更なし）

## 注意事項

1. 環境変数 `HOTEL_COMMON_API_URL` が設定されている場合は、その値が優先されます。
2. 新しい統合方式では、hotel-common側のサーバーを `./start-server.sh` で起動する必要があります。
3. APIレスポンスの形式や内容に変更はありません。
4. 今後のAPI開発は統合方式に従って行ってください。

## 動作確認方法

1. hotel-common側のサーバーを起動:
   ```bash
   cd ../hotel-common
   ./start-server.sh
   ```

2. hotel-saas側の開発サーバーを起動:
   ```bash
   cd ../hotel-saas
   npm run dev
   ```

3. ブラウザで管理画面にアクセスし、キャンペーン管理機能が正常に動作することを確認してください。
