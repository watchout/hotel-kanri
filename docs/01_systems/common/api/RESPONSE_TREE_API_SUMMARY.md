# AIコンシェルジュ レスポンスツリーAPI概要

*作成日: 2025-08-05*

## 概要

AIコンシェルジュ機能のTV向け質問選択型インターフェース実装のためのAPI概要です。このAPIは、TV向けインターフェースとスマホ向けインターフェースの両方で使用され、質問と回答を階層構造で管理するための「レスポンスツリー」機能を提供します。

## 主要コンポーネント

1. **レスポンスツリー管理API**
   - アクティブなレスポンスツリー一覧取得
   - レスポンスツリー詳細取得

2. **レスポンスノード管理API**
   - ノード詳細取得
   - 子ノード一覧取得
   - ノード検索

3. **セッション管理API**
   - セッション開始
   - セッション状態取得
   - セッション更新
   - セッション終了

4. **モバイル連携API**
   - QRコード生成
   - モバイル連携確認
   - モバイル連携実行

5. **管理者向けAPI**
   - レスポンスツリー作成
   - レスポンスツリー更新
   - レスポンスツリー公開
   - ノード作成

## データモデル

1. **ResponseTree**: レスポンスツリーの基本情報
2. **ResponseNode**: カテゴリーや質問などのノード
3. **ResponseNodeTranslation**: ノードの多言語対応
4. **ResponseTreeVersion**: ツリーのバージョン管理
5. **ResponseTreeSession**: セッション管理
6. **ResponseTreeHistory**: セッション履歴
7. **ResponseTreeMobileLink**: モバイル連携

## 実装方針

1. **コントローラー構成**
   - ResponseTreeController
   - ResponseNodeController
   - ResponseSessionController
   - ResponseMobileLinkController
   - AdminResponseTreeController

2. **サービス層**
   - ResponseTreeService
   - ResponseNodeService
   - ResponseSessionService
   - ResponseMobileLinkService

3. **リポジトリ層**
   - ResponseTreeRepository
   - ResponseNodeRepository
   - ResponseSessionRepository
   - ResponseMobileLinkRepository

## 実装上の注意点

1. **パフォーマンス最適化**
   - キャッシュの活用
   - N+1クエリ問題の回避
   - ページネーションの実装

2. **セキュリティ**
   - 認証・認可の徹底
   - テナント分離
   - 入力サニタイズ

3. **テスト**
   - 単体テスト
   - 統合テスト
   - 負荷テスト

## 添付ドキュメント

1. [API仕様書](./RESPONSE_TREE_API_SPEC.md)
2. [スキーマ提案](./RESPONSE_TREE_SCHEMA_PROPOSAL.prisma)
3. [マイグレーションサンプル](./RESPONSE_TREE_MIGRATION_SAMPLE.sql)
4. [実装ガイド](./RESPONSE_TREE_IMPLEMENTATION_GUIDE.md)