# SQLによる直接操作の禁止ポリシー

## 目的

このポリシーは、データベーススキーマの一貫性と整合性を確保するために、直接的なSQL操作を禁止し、Prismaを通じたデータベース管理を徹底することを目的としています。

## 背景

直接的なSQL操作によるスキーマ変更は、以下の問題を引き起こす可能性があります：

- Prismaスキーマとデータベース構造の不一致（スキーマドリフト）
- マイグレーション履歴の不整合
- 環境間のスキーマ差異
- アプリケーション動作の予期せぬ障害

これらの問題を防ぐため、すべてのデータベース変更はPrismaマイグレーションを通じて行うことを義務付けます。

## ポリシー

### 1. 技術的制限

#### 1.1 データベースユーザー権限の制限

```sql
-- アプリケーション用DBユーザーの作成（最小権限）
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE hotel_unified_db TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- 新しいテーブルにも自動的に権限を付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE ON SEQUENCES TO app_user;

-- マイグレーション用DBユーザーの作成（スキーマ変更権限あり）
CREATE USER migration_user WITH PASSWORD 'secure_migration_password';
GRANT ALL PRIVILEGES ON DATABASE hotel_unified_db TO migration_user;
```

#### 1.2 環境変数の分離

```
# .env.development - 開発環境用
DATABASE_URL="postgresql://migration_user:secure_migration_password@localhost:5432/hotel_unified_db"

# .env.production - 本番環境用
DATABASE_URL="postgresql://app_user:secure_password@localhost:5432/hotel_unified_db"
```

#### 1.3 データベース変更監査ログの設定

```sql
-- PostgreSQLの監査ログを有効化
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_min_duration_statement = 0;

-- DDL変更を記録するトリガーの作成
CREATE OR REPLACE FUNCTION log_ddl_changes() RETURNS event_trigger AS $$
BEGIN
    INSERT INTO "DatabaseChangeLog" ("changeType", "description", "details", "createdBy")
    VALUES ('MANUAL_DDL', TG_TAG, json_build_object('command', current_query()), current_user);
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER ddl_trigger ON ddl_command_end
    EXECUTE PROCEDURE log_ddl_changes();
```

### 2. プロセス制限

#### 2.1 スキーマ変更ワークフロー

1. スキーマ変更の提案（Issue作成）
2. schema.prismaの更新
3. `npx prisma migrate dev --name descriptive_name`でマイグレーションファイル生成
4. マイグレーションファイルのコードレビュー
5. CI/CDでの自動検証
6. 承認後のマイグレーション適用

#### 2.2 緊急時の例外プロセス

緊急時に直接SQLを実行する必要がある場合は、以下のプロセスに従う：

1. 緊急変更申請の提出と承認
2. 変更内容の詳細な文書化
3. 変更実施と結果の記録
4. 48時間以内のPrismaスキーマへの反映
5. 事後レビューと再発防止策の検討

### 3. 検証と監視

#### 3.1 自動スキーマ検証

```javascript
// scripts/validate-schema-db.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 一時ファイル名の設定
const tempSchemaPath = path.join(__dirname, '../prisma/temp-schema.prisma');
const currentSchemaPath = path.join(__dirname, '../prisma/schema.prisma');

try {
  console.log('データベース構造をエクスポート中...');
  execSync(`npx prisma db pull --schema=${tempSchemaPath}`, { stdio: 'inherit' });
  
  console.log('スキーマの差分を確認中...');
  
  // ファイルの内容を読み込み
  const currentSchema = fs.readFileSync(currentSchemaPath, 'utf8');
  const dbSchema = fs.readFileSync(tempSchemaPath, 'utf8');
  
  // モデル定義のみを抽出する関数
  const extractModels = (schema) => {
    const modelRegex = /model\s+\w+\s+{[\s\S]*?}/g;
    return schema.match(modelRegex) || [];
  };
  
  const currentModels = extractModels(currentSchema);
  const dbModels = extractModels(dbSchema);
  
  // モデルの差分を確認
  const missingInSchema = dbModels.filter(dbModel => {
    const modelName = dbModel.match(/model\s+(\w+)/)[1];
    return !currentModels.some(m => m.includes(`model ${modelName}`));
  });
  
  const missingInDb = currentModels.filter(schemaModel => {
    const modelName = schemaModel.match(/model\s+(\w+)/)[1];
    return !dbModels.some(m => m.includes(`model ${modelName}`));
  });
  
  if (missingInSchema.length > 0 || missingInDb.length > 0) {
    console.error('スキーマドリフトが検出されました:');
    
    if (missingInSchema.length > 0) {
      console.error('\nデータベースには存在するが、schema.prismaに存在しないモデル:');
      missingInSchema.forEach(model => {
        console.error(`\n${model}`);
      });
    }
    
    if (missingInDb.length > 0) {
      console.error('\nschema.prismaには存在するが、データベースに存在しないモデル:');
      missingInDb.forEach(model => {
        console.error(`\n${model}`);
      });
    }
    
    process.exit(1);
  } else {
    console.log('スキーマは同期しています。不一致は検出されませんでした。');
  }
} catch (error) {
  console.error('検証中にエラーが発生しました:', error);
  process.exit(1);
} finally {
  // 一時ファイルの削除
  if (fs.existsSync(tempSchemaPath)) {
    fs.unlinkSync(tempSchemaPath);
  }
}
```

#### 3.2 CI/CDパイプラインへの統合

```yaml
# .github/workflows/schema-validation.yml
name: Database Schema Validation

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'prisma/**'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'prisma/**'

jobs:
  validate-schema:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
      
      - name: Apply migrations to test database
        run: |
          npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Validate schema against database
        run: node scripts/validate-schema-db.js
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
```

#### 3.3 定期的なスキーマ監査

```javascript
// scripts/scheduled-schema-audit.js
const { execSync } = require('child_process');
const nodemailer = require('nodemailer');
const fs = require('fs');

async function auditSchema() {
  try {
    // スキーマ検証の実行
    execSync('node ./scripts/validate-schema-db.js');
    console.log('スキーマ監査が正常に完了しました。不一致は検出されませんでした。');
    return true;
  } catch (error) {
    console.error('スキーマ監査で不一致が検出されました:', error.stdout?.toString());
    
    // 管理者に通知
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
    
    await transporter.sendMail({
      from: process.env.ALERT_FROM_EMAIL,
      to: process.env.ALERT_TO_EMAIL,
      subject: '【緊急】データベーススキーマの不一致が検出されました',
      text: `
データベーススキーマの監査で不一致が検出されました。
早急な対応が必要です。

詳細:
${error.stdout?.toString() || error.message}
      `
    });
    
    return false;
  }
}

auditSchema();
```

### 4. 教育と文化

#### 4.1 開発者向けガイドライン

すべての開発者は以下のガイドラインに従うこと：

1. データベーススキーマの変更は必ずPrismaを通じて行う
2. 直接SQLの実行は禁止（クエリの実行は許可）
3. スキーマ変更前にチームリードの承認を得る
4. マイグレーションファイルは必ずコードレビューを受ける
5. マイグレーション適用後は検証を行う

#### 4.2 トレーニングプログラム

1. 新入社員向けPrismaトレーニング
2. マイグレーションベストプラクティスワークショップ
3. スキーマ設計レビューセッション
4. データベース変更リスク管理セミナー

## 実施と監視

このポリシーは即時適用されます。コンプライアンスは定期的な監査とレビューによって確保されます。

1. 週次のスキーマ整合性チェック
2. 月次のデータベース変更監査
3. 四半期ごとのポリシーレビューと更新

## 例外処理

このポリシーの例外は、CTO/データベース管理者の書面による承認が必要です。すべての例外は文書化され、監査されます。
