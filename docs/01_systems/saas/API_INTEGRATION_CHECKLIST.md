# 🔄 API統合チェックリスト

## 📋 概要

このチェックリストは、hotel-saasアプリケーションとhotel-common APIの統合作業を体系的に進めるためのものです。各APIの統合作業は以下のステップで行います：

1. **分析**: APIの仕様と現在の実装を確認
2. **実装**: APIクライアント層の更新と実装
3. **テスト**: APIの動作確認
4. **目視確認**: 実際のUIでの動作確認
5. **デプロイ**: 変更の適用

## 🚨 優先度の高いAPI

### 1. 認証API

| API | 優先度 | 状態 | 確認URL | 関連ファイル | API変更 | ソース変更 | 目視チェック |
|-----|--------|------|---------|------------|---------|------------|------------|
| `POST /api/auth/validate` | 最高 | ✅ 完了 | http://localhost:3100/api/v1/auth/test-integration | `server/utils/authService.v2.ts` | ✅ | ✅ | ✅ |
| `GET /api/tenants` | 最高 | ✅ 完了 | http://localhost:3100/api/v1/auth/test-integration | `server/middleware/00.unified-auth.v2.ts` | ✅ | ✅ | ✅ |
| `POST /api/v1/auth/login` | 高 | ⏳ 進行中 | http://localhost:3100/admin/login | `server/api/v1/auth/login.post.v2.ts` | ✅ | ✅ | ⏳ |
| `POST /api/v1/auth/refresh` | 高 | ⏳ 未実装 | http://localhost:3100/admin/login (トークン期限切れ時) | - | ❌ | ❌ | ❌ |

### 2. オーダー関連API

| API | 優先度 | 状態 | 確認URL | 関連ファイル | API変更 | ソース変更 | 目視チェック |
|-----|--------|------|---------|------------|---------|------------|------------|
| `GET /api/v1/orders/history` | 高 | ⏳ 未実装 | http://localhost:3100/admin/orders | `server/api/v1/orders/history.get.ts` | ❌ | ❌ | ❌ |
| `POST /api/v1/orders` | 高 | ⏳ 未実装 | http://localhost:3100/admin/orders/new | `server/api/v1/orders/index.post.ts` | ❌ | ❌ | ❌ |
| `GET /api/v1/orders/active` | 高 | ✅ 実装済 | http://localhost:3100/admin/orders?status=active | `server/api/v1/orders/active.get.ts` | ✅ | ✅ | ✅ |
| `GET /api/v1/orders/{id}` | 高 | ⏳ 未実装 | http://localhost:3100/admin/orders/[id] | `server/api/v1/orders/[id].get.ts` | ❌ | ❌ | ❌ |
| `PUT /api/v1/orders/{id}/status` | 高 | ⏳ 未実装 | http://localhost:3100/admin/orders/[id]/status | `server/api/v1/orders/[id]/status.put.ts` | ❌ | ❌ | ❌ |
| `GET /api/v1/order/menu` | 高 | ⏳ 未実装 | http://localhost:3100/order | `server/api/v1/order/menu.get.ts` | ❌ | ❌ | ❌ |

### 3. 管理画面API

| API | 優先度 | 状態 | 確認URL | 関連ファイル | API変更 | ソース変更 | 目視チェック |
|-----|--------|------|---------|------------|---------|------------|------------|
| `GET /api/v1/admin/summary` | 中 | ⏳ 未実装 | http://localhost:3100/admin | `server/api/v1/admin/summary.get.ts` | ❌ | ❌ | ❌ |
| `GET /api/v1/admin/dashboard/stats` | 中 | ⏳ 未実装 | http://localhost:3100/admin | `server/api/v1/admin/dashboard/stats.get.ts` | ❌ | ❌ | ❌ |
| `GET /api/v1/admin/devices/count` | 中 | ⏳ 未実装 | http://localhost:3100/admin | `server/api/v1/admin/devices/count.get.ts` | ❌ | ❌ | ❌ |
| `GET /api/v1/admin/orders/monthly-count` | 中 | ⏳ 未実装 | http://localhost:3100/admin | `server/api/v1/admin/orders/monthly-count.get.ts` | ❌ | ❌ | ❌ |

## 🔄 API統合手順

各APIの統合作業は以下の手順で行います：

### 1. 分析フェーズ

- [ ] APIの仕様を確認（パラメータ、レスポンス形式）
- [ ] 現在の実装を確認（Prismaクエリ、データ形式）
- [ ] 変換が必要なデータ形式を特定
- [ ] hotel-commonでAPIが実装されているか確認

### 2. 実装フェーズ

- [ ] `server/utils/api-client.ts`にAPIメソッドを追加
- [ ] 関連するファイルでPrisma呼び出しをAPI呼び出しに置き換え
- [ ] データ形式の変換処理を実装
- [ ] エラーハンドリングとフォールバック処理を実装
- [ ] 必要に応じてテスト用APIエンドポイントを作成

### 3. テストフェーズ

- [ ] 統合テストAPIでAPIの動作を確認
- [ ] エラーケースのテスト（APIが利用できない場合など）
- [ ] パフォーマンステスト（応答時間など）

### 4. 目視確認フェーズ

- [ ] 実際のUIからの動作を確認（指定されたURLにアクセス）
- [ ] データが正しく表示されているか確認
- [ ] ユーザー操作（ボタンクリックなど）が正常に機能するか確認
- [ ] エラー時の表示が適切か確認

### 5. デプロイフェーズ

- [ ] 変更をコミット
- [ ] 本番環境に適用
- [ ] 動作監視

## 📊 進捗管理

| カテゴリ | 総数 | 完了 | 進捗率 |
|---------|------|------|--------|
| 認証API | 4 | 2.5 | 62.5% |
| オーダー関連API | 6 | 0 | 0% |
| 管理画面API | 4 | 0 | 0% |
| その他API | ~186 | 0 | 0% |
| **合計** | ~200 | 2.5 | 1.25% |

## 🧪 テスト環境

- **開発サーバー**: http://localhost:3100
- **hotel-common API**: http://localhost:3400
- **テスト用API**: http://localhost:3100/api/v1/auth/test-integration

## 📝 注意事項

1. **データ形式の違い**:
   - Prismaは特定の形式でデータを返します（例：関連データの自動ネスト）
   - APIからの応答は異なる形式になる可能性があるため、変換が必要

2. **エラーハンドリング**:
   - APIが利用できない場合のフォールバック処理を必ず実装
   - タイムアウト設定を適切に行う
   - エラーメッセージをユーザーフレンドリーに表示

3. **トランザクション処理**:
   - Prismaの`$transaction`をAPI呼び出しのシーケンスに置き換える
   - 整合性を保つための対策を講じる

4. **キャッシュ戦略**:
   - 頻繁に使用されるデータはキャッシュを検討
   - キャッシュの有効期限を適切に設定

5. **目視確認のポイント**:
   - データが正しく表示されているか
   - レイアウトが崩れていないか
   - インタラクションが正常に機能するか
   - エラー表示が適切か
   - パフォーマンスに問題がないか

## 📅 次のステップ

1. ログインAPI (`POST /api/v1/auth/login`) の統合
   - 実装ファイル: `server/api/v1/auth/login.post.v2.ts`
   - 確認URL: http://localhost:3100/admin/login
   - 目視確認項目: ログインフォーム送信、認証成功、ダッシュボード表示

2. トークン更新API (`POST /api/v1/auth/refresh`) の統合
   - 実装ファイル: 新規作成予定
   - 確認URL: http://localhost:3100/admin/login (トークン期限切れ時)
   - 目視確認項目: セッション維持、自動再認証

3. オーダー履歴API (`GET /api/v1/orders/history`) の統合
   - 実装ファイル: `server/api/v1/orders/history.get.ts`
   - 確認URL: http://localhost:3100/admin/orders
   - 目視確認項目: オーダー一覧表示、ページネーション、フィルター

## 🔍 進捗確認方法

### API動作確認

1. 統合テストAPIにアクセス: http://localhost:3100/api/v1/auth/test-integration
2. 対象のAPIがテスト結果に含まれていることを確認
3. ステータスが「success」であることを確認
4. データが正しく返されていることを確認

### UI動作確認

1. 指定されたURLにアクセス（例：http://localhost:3100/admin/login）
2. 関連機能を操作（例：ログインフォームに入力して送信）
3. 正常に動作することを確認（例：ログイン成功、ダッシュボード表示）
4. エラーケースも確認（例：誤ったパスワードでログイン）

### チェックリスト更新

1. API変更：APIクライアントの実装が完了したらチェック
2. ソース変更：関連ファイルの修正が完了したらチェック
3. 目視チェック：UIでの動作確認が完了したらチェック

---
**作成日**: 2025-08-22
**更新日**: 2025-08-23
**実装者**: AI
