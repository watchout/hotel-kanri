------------------------
新規SSOT作成時の※※必須確認事項※※
------------------------
・既存ドキュメント、各システムの実装ソースを全文を正確に把握して、準拠する
・基本的には実装済みや作成済みであることを前提として、ドキュメント・ソース・テーブル・ユーザーなど見つけられな場合は多角的な方法で検索して探す
・システム間連携についても確実に連携可能できるように仕様を明記している
・開発本番がすべて統一されること
┗開発用など本番同等にならない設計になっていないか？
┗モック、フォールバック、一時対応などの設計をしていないか？
・既存のSSOTの記載と矛盾がないこと
・細部まで各システムの開発を予測して必要な情報や値、データを漏れなく記入すること
・想像や想定で実装せず、ドキュメントにない点はソースから、ソースにない点は私に質問すること
・実装用のコードは書かない。書いてもサンプル程度にとどめる
・E2Eテスト（Playwright等）は記載しない。テストはAPIテスト（curl）と手動UIテストのみ
・システム共通で使用する変数やパスの扱いについては特に注意する
・できる限り現状を優先として、どうしても変更しないと実現できない場合のみに変更設計をする
・UIとしてパスが作成されるものに関してはそれごとに仕様を整理して
・現在のUI構成をそのまま利用できる設計になっているか
・UIを変更しなければならない場合は改善提案を行う
・管理画面用と客室端末用でSSOTは別々のものとして作成する(混乱をさけるため)
・既存のSSOTを全て読み込んで作成する
・既存のSSOTと矛盾が発生する場合はSSOTの作成を中断して質問をする
・UIの仕様においてもどこにどのように表示するかを定義する
・現在の各システム(saas,common,pms,member)のソースを実際に読み込み理解し確認した上で、実装フローをSSOTに盛り込む
・ロードマップ上に記載のあるSSOTファイル名のSSOTのみ作成する→勝手にファイル名を決めてSSOTファイルを生成しない

------------------------
過去のドキュメントファイル
------------------------
過去のドキュメントは下記に集約されています。
SSOTの新規作成の際には参照してください
/Users/kaneko/hotel-kanri/docs/_archived_system_docs/

------------------------
データベーステーブルを含む場合
------------------------
必ず参照: 
・/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md v3.0.0
・/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md（★★★必須）
クイックリファレンス: 
・/Users/kaneko/hotel-kanri/.cursor/prompts/database_naming_standard_reference.md
・/Users/kaneko/hotel-kanri/.cursor/prompts/database_operation_rules.md（★★★データベース操作指示ルール）

必須ルール:
・新規テーブル名: snake_case必須
・新規カラム名: snake_case必須
・Prismaモデル名: PascalCase
・Prismaフィールド名: camelCase + @mapディレクティブ必須
・@@mapディレクティブ必須
・既存テーブルは現状維持（強制統一しない）

★★★ データベース操作を含む実装指示を作成する場合:
・database_operation_rules.md に従って指示を作成すること
・SSOT_DATABASE_MIGRATION_OPERATION.md を必ず参照すること
・直接SQL実行の指示は絶対禁止
・Prisma標準手順を必ず含めること
------------------------


------------------------
APIパス（動的パラメータ）を含む場合
------------------------
必ず参照: 
・/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md
・/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md
クイックリファレンス: /Users/kaneko/hotel-kanri/.cursor/prompts/api_routing_standard_reference.md

必須ルール（Nuxt 3 / Nitro制約）:
❌ 禁止パターン:
・深いネスト（2階層以上の動的パス）
  例: /api/v1/admin/orders/[id]/items/[itemId]
・index.*ファイル
  例: server/api/v1/admin/rooms/index.get.ts

✅ 推奨パターン:
・フラット構造（1階層の動的パスのみ）
  例: /api/v1/admin/order-items/[itemId]
・クエリパラメータ活用
  例: /api/v1/admin/order-items?orderId=123
・明示的なファイル名
  例: list.get.ts, create.post.ts, [id].get.ts

理由: Nuxt 3のVue Routerが干渉し、404エラーの原因となる
------------------------


------------------------
マイグレーションが必要な場合
------------------------
下記を参照して実行する
運用ガイド: /Users/kaneko/hotel-common/docs/MIGRATION_GUIDE.md
SSOT文書: /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md
------------------------


が守られているかを確認
そして、これ以上に完璧なドキュメントを作れない精度で完成しているかを確認して


------------------------
SSOT実装時の絶対ルール
------------------------
必ず参照: /Users/kaneko/hotel-kanri/.cursor/prompts/ssot_implementation_guard.md

🚨 エラー発生時の絶対ルール:
1. 実装停止
2. SSOT確認
3. 記載あり → SSOT通りに実装
4. 記載なし → ユーザーに質問
5. 承認後実装再開

❌ 絶対禁止:
・システムの境界を越えた実装（hotel-saasでPrisma直接使用等）
・開発環境専用のフォールバック実装
・SSOTを読まずに実装を続ける

「慌てて修正」ではなく「SSOTを確認」
------------------------


------------------------
既存SSOTへの多言語化統合
------------------------
必ず参照: /Users/kaneko/hotel-kanri/.cursor/prompts/ssot_multilingual_integration_workflow.md

🎯 統合前の必須理解:
1. SSOT_MULTILINGUAL_SYSTEM.md を100%理解
2. 対象SSOTを100%理解
3. 影響度を正しく判断

🚨 絶対に守るべき原則:
・既存仕様を変更しない（カラム削除・API変更禁止）
・段階的移行を明記（Phase 1-5）
・既存カラムはPhase 5まで維持（3-6ヶ月後削除）
・translationsテーブルと並行運用

✅ 統合パターン:
・高影響（データフィールドあり）: 詳細対応（約200行追加）
・中影響（UIテキストのみ）: 軽量対応（約50行追加）
・低影響（システム内部データ）: 対応不要

「既存仕様 + 多言語化 = 統合SSOT（完全版・矛盾なし）」
------------------------


ここまで読み込んだらまず「[このファイル名]+読了」と表示すること
