# Architecture Decision Records (ADR)

プロジェクトの重要な意思決定を記録します。

## ADR-001: Session認証の採用

**日付**: 2024-10
**ステータス**: 採用

### 決定
JWTではなく、Redis + HttpOnly CookieによるSession認証を採用。

### 理由
- JWTの複雑さが開発効率を低下させていた
- 移行コスト56時間で年間720時間の工数削減効果
- KISS原則に基づき、最小限の機能から開始

### 影響
- 全APIで`hotel_session` Cookieを使用
- Redisへのセッション保存

---

## ADR-002: システム間分離

**日付**: 2024-10
**ステータス**: 採用

### 決定
- hotel-saas: フロントエンド + プロキシ（DB直接アクセス禁止）
- hotel-common: API基盤 + DB層

### 理由
- 責務の明確化
- セキュリティ強化（フロントからDB直接アクセス禁止）

### 影響
- hotel-saasからはcallHotelCommonAPIを使用
- Prismaはhotel-commonのみ

---

## ADR-003: B方式ルーティング

**日付**: 2024-11
**ステータス**: 採用

### 決定
Express（hotel-common）ではB方式を採用。
- router側: 相対パス
- app.use側: 絶対パス

### 理由
- A/B混在による二重付与バグを防止
- 一貫性の確保

---

## テンプレート

```markdown
## ADR-XXX: [タイトル]

**日付**: YYYY-MM
**ステータス**: 検討中 / 採用 / 廃止

### 決定
[何を決定したか]

### 理由
[なぜその決定をしたか]

### 影響
[その決定による影響]
```
