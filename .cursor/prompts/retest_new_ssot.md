もう一度作成したドキュメントを下記の点に注意してチェックしてください

・修正点以外は既存のドキュメント及び、ソースに則っているか
・既存のSSOTドキュメントと変数やパスなど細い部分でズレ、矛盾がないか
・これ以上のクオリティで作れないレベルでドキュメントを作成できたか
・システム間の連携に関しても完璧に想定したドキュメントか
・このドキュメントを読んで各システムから質問がない粒度で作成してあるか
・開発用など本番同等にならない設計になっていないか
・モック、フォールバック、一時対応などの設計をしていないか
・現在のドキュメントを100点満点で120点にするのにできることはないか
・現在のUI構成をそのまま使えるか
・UI構成を変えないといけない場合はまず提案をする
・管理画面用と客室端末用でSSOTは別々のものとして作成する(混乱をさけるため)
・ロードマップ上に記載のあるSSOTファイル名のSSOTのみ作成したか→勝手にファイル名を決めてSSOTファイルを生成ていないか確認

------------------------
データベーステーブルが含まれる場合
------------------------
必須チェック項目:
・DATABASE_NAMING_STANDARD.md v3.0.0に準拠しているか
・新規テーブル名: snake_case
・新規カラム名: snake_case  
・Prismaフィールド名: camelCase + @map
・@@mapディレクティブ: 必須
・既存テーブルは現状維持で記述しているか
・テンプレートを使用しているか

参照: /Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md
クイックリファレンス: /Users/kaneko/hotel-kanri/.cursor/prompts/database_naming_standard_reference.md
------------------------


------------------------
APIパス（動的パラメータ）が含まれる場合
------------------------
必須チェック項目:
❌ 禁止パターンが使われていないか:
・2階層以上の動的パス（例: /[id]/items/[itemId]）
・index.*ファイル（例: index.get.ts）

✅ 推奨パターンが使われているか:
・1階層の動的パスのみ（例: /[id].get.ts）
・フラット構造（例: /order-items/[itemId]）
・クエリパラメータ活用（例: ?orderId=123）
・明示的なファイル名（例: list.get.ts, create.post.ts）

参照: 
・/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md
・/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md
------------------------

ここまで読み込んだらまず「[このファイル名]+読了」と表示すること