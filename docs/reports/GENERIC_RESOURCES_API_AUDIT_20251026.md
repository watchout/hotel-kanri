# Generic Resources API 監査レポート（2025-10-26）
- 対象: hotel-common PR#8
- ルーティング順序: OK（CookieMW先行）
- Cookie認証/TTL: OK（期限切れ削除→401）
- JWT残存: auth.middleware.ts / auth.routes.ts 他
- 提案: Set-Cookie属性強制、cookie-parser導入、GLOBAL-401監視、ROUTE-DUMPのCI化
- 判定: 条件付き承認（上記改善は追随PRで）
