# 認証システム実装計画（改訂版2）

## 現状分析

最新の調査結果から、以下の重要な不一致が確認されました：

1. **スキーマとテーブルの不一致**:
   - hotel-commonの`schema.prisma`では`User`モデルが定義され`users`テーブルにマッピングされている
   - 実際のデータベースには`users`テーブルが存在せず、代わりに`staff`テーブルが存在している

2. **認証に必要なカラムの欠落**:
   - `staff`テーブルには以下のカラムが存在する:
     - id, tenant_id, email, name, role, department, is_active, created_at, updated_at
   - 認証に必要な以下のカラムが欠落している:
     - password_hash, system_access, base_level, last_login_at

3. **データ不足**:
   - `staff`テーブルにはデータが存在しない（0件）

## 実装方針

### フェーズ1: 現状維持と変更申請（短期）

1. **現在のモックアカウント認証を維持**:
   - `login.post.ts`での現在のモック認証処理を維持
   - 開発環境では以下のアカウントでの認証を継続:
     - professional@example.com / professional123
     - economy@example.com / economy123
     - test@example.com / password

2. **統合データベース変更申請の提出**:
   - `staff`テーブルに以下のカラムの追加を申請:
     ```sql
     ALTER TABLE staff ADD COLUMN password_hash TEXT;
     ALTER TABLE staff ADD COLUMN system_access JSONB;
     ALTER TABLE staff ADD COLUMN base_level INTEGER DEFAULT 1;
     ALTER TABLE staff ADD COLUMN last_login_at TIMESTAMP;
     ```

3. **テスト用データの追加申請**:
   - 基本的なテスト用スタッフアカウントの追加を申請:
     ```sql
     INSERT INTO staff (id, tenant_id, email, name, role, is_active, password_hash, system_access, base_level, created_at, updated_at)
     VALUES
     ('test-admin', 'tenant-test', 'test@example.com', 'テスト管理者', 'super_admin', true, '$2a$10$...[ハッシュ値]', '["saas"]', 5, NOW(), NOW()),
     ('test-prof', 'tenant-professional', 'professional@example.com', 'プロフェッショナル管理者', 'admin', true, '$2a$10$...[ハッシュ値]', '["saas"]', 4, NOW(), NOW()),
     ('test-eco', 'tenant-economy', 'economy@example.com', 'エコノミー管理者', 'admin', true, '$2a$10$...[ハッシュ値]', '["saas"]', 3, NOW(), NOW());
     ```

### フェーズ2: 認証システムの適応（中期）

1. **マッピングレイヤーの実装**:
   - `server/utils/auth-adapter.ts`を作成し、`staff`テーブルと`User`モデルの間のマッピングを実装:
     ```typescript
     // staff テーブルと User モデルの間のマッピング
     export function mapStaffToUser(staffRecord: any): User {
       return {
         id: staffRecord.id,
         tenantId: staffRecord.tenant_id,
         email: staffRecord.email,
         role: staffRecord.role,
         isActive: staffRecord.is_active,
         passwordHash: staffRecord.password_hash || null,
         systemAccess: staffRecord.system_access || ['saas'],
         lastLoginAt: staffRecord.last_login_at || null,
         createdAt: staffRecord.created_at,
         updatedAt: staffRecord.updated_at
       };
     }
     ```

2. **認証コードの修正**:
   - `login.post.ts`を修正して、`staff`テーブルからのデータ取得とマッピングを実装:
     ```typescript
     // データベースからスタッフを検索
     const result = await prisma.$queryRaw`
       SELECT id, email, name, role, tenant_id, is_active, password_hash, system_access, base_level, last_login_at
       FROM staff
       WHERE email = ${email} AND is_active = true
       LIMIT 1;
     `;

     // 取得したスタッフデータをUserモデルにマッピング
     if (Array.isArray(result) && result.length > 0) {
       const staffRecord = result[0];
       staff = mapStaffToUser(staffRecord);
     }
     ```

3. **JWT生成の修正**:
   - JWT生成部分を修正して、`staff`テーブルのデータ構造に合わせる:
     ```typescript
     const accessToken = jwt.sign({
       userId: staff.id,
       tenantId: staff.tenant_id,
       role: staff.role,
       systemSource: 'saas',
       email: staff.email,
       system_access: staff.system_access || ['saas'],
       base_level: staff.base_level || (staff.role === 'admin' ? 4 : 2)
     }, jwtSecret, { expiresIn: '24h' });
     ```

### フェーズ3: 完全統合（長期）

1. **スキーマ統一の検討**:
   - hotel-commonの`schema.prisma`と実際のデータベース構造の不一致を解消するための調整
   - 選択肢1: `schema.prisma`を修正して`User`モデルを`staff`テーブルにマッピング
   - 選択肢2: データベースマイグレーションを実行して`users`テーブルを作成し、`staff`テーブルからデータを移行

2. **権限管理システムの強化**:
   - `base_level`と`system_access`に基づいた詳細な権限管理システムの実装
   - 権限チェックミドルウェアの強化

3. **テナント分離の完全実装**:
   - テナントIDに基づくデータ分離の徹底
   - マルチテナント環境での認証フローの最適化

## 実装スケジュール

1. **フェーズ1（短期・1週間）**:
   - 統合データベース変更申請の提出
   - 現状のモックアカウント認証維持

2. **フェーズ2（中期・2週間）**:
   - 変更申請承認後のマッピングレイヤー実装
   - 認証コードの修正とテスト

3. **フェーズ3（長期・1ヶ月）**:
   - スキーマ統一の検討と実装
   - 権限管理システムの強化
   - テナント分離の完全実装

## リスクと対策

1. **変更申請が承認されない場合**:
   - 対策: 現状のモックアカウント認証を維持しつつ、代替案を検討

2. **スキーマ統一による既存システムへの影響**:
   - 対策: 段階的な移行と十分なテストを実施

3. **認証システムの移行中の一時的な問題**:
   - 対策: フォールバックメカニズムの実装と監視強化

## 結論

hotel-commonの`schema.prisma`と実際のデータベース構造には重大な不一致があり、特に認証システムに関わる部分で問題が発生しています。短期的には現状のモックアカウント認証を維持しつつ、必要なカラムの追加を申請します。中長期的にはマッピングレイヤーの実装やスキーマ統一の検討を行い、最終的には完全に整合性のとれた認証システムを構築します。
