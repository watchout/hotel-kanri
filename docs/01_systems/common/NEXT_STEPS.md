# 次のステップ

このドキュメントでは、`hotel-common`プロジェクトの次のステップと優先度の高いタスクについて説明します。

## 優先度の高いタスク

### 1. 残りのTypeScriptエラーの修正

**目標**: コンパイルエラーをゼロにする

**アプローチ**:
1. `src/utils/logger.ts`の`LogEntry`型の拡張
   ```typescript
   export interface LogEntry {
     message: string;
     level: string;
     timestamp: string;
     data?: any; // カスタムデータを格納するためのフィールド
     error?: Error;
     [key: string]: any; // 後方互換性のため
   }
   ```

2. `src/utils/error-helper.ts`の機能拡張
   ```typescript
   export function createErrorLogOption(error: unknown): { data: { error: Error } } {
     return {
       data: {
         error: error instanceof Error ? error : new Error(String(error))
       }
     };
   }
   ```

3. キャンペーン関連の型修正
   - `src/integrations/campaigns/utils.ts`の型キャスト修正
   - `src/integrations/campaigns/services.ts`の関数名修正

4. 階層管理関連の修正
   - `src/hierarchy/jwt-extension.ts`の型の互換性確保
   - `src/hierarchy/hierarchy-api.ts`のメソッド実装

### 2. データベース環境の整備

**目標**: 開発環境でのデータベース接続を確立

**アプローチ**:
1. PostgreSQLのセットアップ
   ```bash
   # PostgreSQLのインストール（Macの場合）
   brew install postgresql
   brew services start postgresql
   
   # データベースの作成
   createdb hotel_unified_db
   ```

2. Prismaマイグレーションの適用
   ```bash
   npx prisma migrate dev
   ```

3. 環境変数の設定
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_unified_db"
   REDIS_HOST="localhost"
   REDIS_PORT=6379
   JWT_SECRET="hotel-common-development-secret"
   ```

### 3. APIエンドポイントのテスト

**目標**: 主要なAPIエンドポイントの動作確認

**アプローチ**:
1. AIコンシェルジュAPIのテスト
   ```bash
   # レスポンスツリーの取得
   curl -X GET "http://localhost:3400/api/v1/ai-concierge/trees" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <テスト用トークン>"
   
   # レスポンスノードの取得
   curl -X GET "http://localhost:3400/api/v1/ai-concierge/trees/1/nodes" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <テスト用トークン>"
   ```

2. キャンペーンAPIのテスト
   ```bash
   # キャンペーン一覧の取得
   curl -X GET "http://localhost:3400/api/v1/campaigns" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <テスト用トークン>"
   ```

3. テストデータの投入
   - 必要に応じてテストデータ投入スクリプトの作成

### 4. ドキュメント整備

**目標**: 開発者向けドキュメントの充実

**アプローチ**:
1. API仕様書の更新
   - OpenAPI仕様の更新
   - エンドポイント一覧の整備

2. セットアップガイドの作成
   - 環境構築手順
   - テスト方法
   - デバッグのヒント

3. アーキテクチャ図の作成
   - コンポーネント間の関係
   - データフロー

## 長期的な改善点

### 1. コードの品質向上

- ESLintルールの追加
- 単体テストの拡充
- コードカバレッジの向上

### 2. パフォーマンス最適化

- N+1クエリの解消
- キャッシュ戦略の改善
- バッチ処理の最適化

### 3. セキュリティ強化

- 認証・認可の強化
- 入力バリデーションの徹底
- セキュリティスキャンの導入

## タイムライン

| フェーズ | 期間 | 主要タスク |
|---------|------|-----------|
| フェーズ1 | 1週間 | TypeScriptエラーの修正、データベース環境の整備 |
| フェーズ2 | 1週間 | APIエンドポイントのテスト、バグ修正 |
| フェーズ3 | 2週間 | ドキュメント整備、品質向上 |
| フェーズ4 | 継続的 | パフォーマンス最適化、セキュリティ強化 |

## 結論

`hotel-common`プロジェクトは基本的な構造の修正が完了し、次のステップとしてはTypeScriptエラーの完全な解消とデータベース環境の整備が優先度が高いです。これらが完了すれば、実際のAPIテストが可能になり、プロジェクトの安定性と品質が向上します。
