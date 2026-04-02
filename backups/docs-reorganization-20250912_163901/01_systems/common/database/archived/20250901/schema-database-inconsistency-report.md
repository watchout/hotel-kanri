# スキーマとデータベースの不一致レポート

**作成日**: 2025年8月20日  
**作成者**: データベース管理チーム

## 概要

Prismaスキーマ（schema.prisma）と実際のデータベース構造の間に大きな不一致が検出されました。この不一致はデータベース操作の問題を引き起こす可能性があります。本レポートでは、検出された不一致の詳細と推奨される対応策を提示します。

## 検出された不一致

### 1. モデル名の不一致

データベースとPrismaスキーマの間で、モデル名の大文字・小文字に不一致があります。データベース内のテーブル名は小文字（snake_case）である一方、Prismaスキーマでは多くのモデルがPascalCaseで定義されています。

#### 例：
- データベース: `admin` vs スキーマ: `Admin`
- データベース: `campaign_categories` vs スキーマ: `CampaignCategory`

### 2. テーブルマッピングの問題

Prismaスキーマでは`@@map`ディレクティブを使用してモデル名とテーブル名のマッピングを行っていますが、一部のモデルでこのマッピングが適切に設定されていない可能性があります。

### 3. Orderテーブルの欠落

Orderテーブルがデータベースに存在していませんでしたが、マイグレーションファイルには作成コードが含まれており、スキーマにも定義されています。これは、マイグレーションが正しく適用されなかったか、テーブルが手動で削除された可能性を示唆しています。

### 4. 検出された具体的な不一致

```
データベースには存在するが、schema.prismaに存在しないモデル:
- admin
- admin_log
- campaign_categories
- campaign_category_relations
- campaign_items
- campaign_translations
- campaign_usage_logs
- campaigns
- device_rooms
- device_video_caches
- notification_templates
- page_histories
- pages
- response_node_translations
- response_nodes
- response_tree_history
- response_tree_mobile_links
- response_tree_sessions
- response_tree_versions
- response_trees
- room_grades
- schema_version
- staff
- system_event
- tenant_access_logs

schema.prismaには存在するが、データベースに存在しないモデル:
- Page
- PageHistory
- Campaign
- CampaignTranslation
- CampaignItem
- CampaignCategory
- CampaignCategoryRelation
- CampaignUsageLog
- DeviceVideoCache
- DeviceRoom
- ResponseTree
- ResponseNode
- ResponseNodeTranslation
- ResponseTreeSession
- ResponseTreeHistory
- ResponseTreeVersion
- ResponseTreeMobileLink
- Admin
- AdminLog
- SchemaVersion
- SystemEvent
- Staff
- RoomGrade
- TenantAccessLog
- NotificationTemplate
```

## 原因分析

この不一致の主な原因として以下が考えられます：

1. **ケース感度の問題**：
   - PostgreSQLでは、引用符なしのテーブル名は小文字に変換される
   - Prismaスキーマでは、適切な`@@map`ディレクティブがない場合、モデル名がそのままテーブル名として使用される

2. **マイグレーション管理の不備**：
   - マイグレーションファイルの適用が不完全
   - マイグレーション履歴と実際のデータベース構造の不一致

3. **直接的なSQL操作**：
   - Prismaを介さない直接的なSQL操作によるスキーマ変更
   - スキーマ変更後のPrismaスキーマの更新漏れ

## 推奨される対応策

### 短期的な対応

1. **スキーマの同期**：
   ```bash
   # データベース構造をスキーマに反映
   npx prisma db pull --force
   
   # 生成されたスキーマを確認し、必要に応じて調整
   # モデル名とテーブル名のマッピングを確認
   
   # Prismaクライアントを再生成
   npx prisma generate
   ```

2. **Orderテーブルの再作成**：
   - 既に対応済み：Orderテーブル作成のマイグレーションを適用

3. **テーブルマッピングの修正**：
   - すべてのモデルに適切な`@@map`ディレクティブを追加
   - 例: `model User { ... @@map("users") }`

### 中長期的な対応

1. **SQL直接操作禁止ポリシーの導入**：
   - 既に対応済み：`docs/database/SQL_DIRECT_OPERATION_PREVENTION.md`を作成

2. **スキーマ検証ツールの導入**：
   - 既に対応済み：`scripts/check-schema-db.js`を作成

3. **CI/CDパイプラインでの検証**：
   - デプロイ前にスキーマとデータベースの整合性を自動検証
   - 不一致が検出された場合はデプロイをブロック

4. **命名規則の統一**：
   - モデル名：PascalCase（例：`User`）
   - テーブル名：snake_case（例：`users`）
   - すべてのモデルに`@@map`ディレクティブを追加

5. **開発者教育**：
   - Prismaマイグレーションのベストプラクティスに関するトレーニング
   - スキーマ変更プロセスの文書化と共有

## 結論

スキーマとデータベースの間に大きな不一致が検出されましたが、これは主にケース感度の問題とマッピングの不備によるものと考えられます。短期的には`prisma db pull`でスキーマを同期し、中長期的にはSQL直接操作禁止ポリシーの導入やスキーマ検証ツールの活用が推奨されます。

これらの対策を実施することで、今後同様の問題の発生を防ぎ、データベーススキーマの整合性を維持することができます。
