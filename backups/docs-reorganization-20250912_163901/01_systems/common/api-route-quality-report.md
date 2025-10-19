# API ルート品質チェックレポート

生成日時: 2025-09-12T00:27:17.034Z

## 📊 サマリー

- 🚨 エラー: 0件
- ⚠️ 警告: 0件  
- ℹ️ 情報: 0件

## 🚨 エラー（修正必須）



## ⚠️ 警告（修正推奨）



## ℹ️ 情報（改善提案）



## 🎯 RESTful API設計ガイドライン

### ✅ 推奨パターン

```
GET /api/v1/resources
GET /api/v1/resources/:id
POST /api/v1/resources
PUT /api/v1/resources/:id
DELETE /api/v1/resources/:id

# クエリパラメータでフィルタリング
GET /api/v1/resources?category=value&status=active
```

### ❌ 避けるべきパターン

```
# 複数の動的パラメータ
GET /api/v1/resources/:id/sub/:subId

# 動詞の使用
POST /api/v1/resources/create
GET /api/v1/resources/get/:id

# 深いネスト
GET /api/v1/a/:id/b/:id/c/:id
```
