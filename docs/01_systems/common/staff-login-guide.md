# スタッフログイン実装ガイド

**作成日**: 2025年7月31日  
**バージョン**: 1.0.0  
**対象システム**: hotel-common, hotel-member, hotel-pms, hotel-saas

## 1. 概要

本ドキュメントでは、統一データベーススキーマを使用したスタッフログインシステムの実装方法と使用方法について説明します。スタッフログインは、JWT（JSON Web Token）を使用した認証システムに基づいており、全システム間で共通の認証基盤として機能します。

## 2. スタッフモデル構造

スタッフ情報は `Staff` モデルで管理され、以下の主要フィールドを持ちます：

```prisma
model Staff {
  id                   String    @id @default(cuid())
  tenantId             String    @map("tenant_id")
  staffCode            String    @map("staff_code")
  staffNumber          String    @map("staff_number")
  
  // 個人基本情報
  lastName             String    @map("last_name")
  firstName            String    @map("first_name")
  displayName          String    @map("display_name")
  
  // 認証情報
  email                String?   @unique
  passwordHash         String?   @map("password_hash")
  failedLoginCount     Int       @default(0) @map("failed_login_count")
  lastLoginAt          DateTime? @map("last_login_at")
  
  // 権限情報
  baseLevel            Int       @default(1) @map("base_level")
  positionTitle        String?   @map("position_title")
  
  // リレーション
  tenant               Tenant    @relation(fields: [tenantId], references: [id])
  
  // その他のフィールドは省略
}
```

## 3. ログインフロー

### 3.1 基本認証フロー

1. **ユーザー認証リクエスト**
   - メールアドレスとパスワードを受け取る
   - メールアドレスでスタッフを検索
   - パスワードハッシュを検証（2025-09-11 by common: bcrypt.compareで`staff.password_hash`と照合。不一致は401）

2. **認証成功時の処理**
   - 最終ログイン日時を更新
   - JWTトークンを生成
   - レスポンスとしてトークンを返却

3. **認証失敗時の処理**
   - 失敗理由に応じたエラーメッセージを返却
   - 失敗ログイン回数をインクリメント
   - 一定回数以上の失敗でアカウントをロック

### 3.2 JWTトークン構造

```typescript
interface HotelJWTPayload {
  // 標準クレーム
  iss: string                  // Issuer: "hotel-common-auth"
  sub: string                  // Subject: staff_id (UUID)
  aud: string[]               // Audience: ["hotel-member", "hotel-pms", "hotel-saas"]
  exp: number                 // Expiration: Unix timestamp (8時間後)
  nbf: number                 // Not Before: Unix timestamp
  iat: number                 // Issued At: Unix timestamp
  jti: string                 // JWT ID: UUID (Redis管理用)
  
  // Hotel System専用クレーム
  tenant_id: string           // テナントUUID
  email: string               // スタッフメールアドレス
  role: string                // 'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER' | 'SYSTEM'
  level: number               // 権限レベル 1-5
  permissions: string[]       // 詳細権限配列
  
  // システム間連携クレーム
  origin_system: string       // 発行元システム
  source_systems: string[]    // アクセス可能システム
  
  // セッション管理クレーム
  session_id: string          // Redisセッション識別子
}
```

## 4. 実装例

### 4.1 スタッフ作成

```javascript
// スタッフユーザーを作成する
async function createStaffUser(
  tenantId,
  staffCode,
  lastName,
  firstName,
  email,
  password,
  role,
  level
) {
  const staffNumber = generateStaffNumber();
  
  return await prisma.staff.create({
    data: {
      tenantId,
      staffCode,
      staffNumber,
      lastName,
      firstName,
      displayName: `${lastName} ${firstName}`,
      email,
      passwordHash: hashPassword(password),
      baseLevel: level,
      positionTitle: role,
      // その他の必要なフィールド
    }
  });
}
```

### 4.2 ログイン処理

```javascript
// ログイン処理
async function loginStaff(email, password) {
  // メールアドレスでスタッフを検索
  const staff = await prisma.staff.findUnique({
    where: { email }
  });
  
  if (!staff) {
    throw new Error('ユーザーが見つかりません');
  }
  
  // アカウントロック確認
  if (staff.lockedUntil && staff.lockedUntil > new Date()) {
    throw new Error('アカウントがロックされています');
  }
  
  // パスワードの検証（bcrypt）
  const isValid = await bcrypt.compare(password, staff.passwordHash);
  if (!isValid) {
    // 失敗ログイン回数をインクリメント
    await prisma.staff.update({
      where: { id: staff.id },
      data: { 
        failedLoginCount: { increment: 1 },
        lockedUntil: staff.failedLoginCount >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null // 5回失敗で30分ロック
      }
    });
    
    throw new Error('パスワードが一致しません');
  }
  
  // テナント情報を取得
  const tenant = await prisma.tenant.findUnique({
    where: { id: staff.tenantId }
  });
  
  if (!tenant) {
    throw new Error('テナント情報が見つかりません');
  }
  
  // ログイン成功処理
  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginCount: 0
    }
  });
  
  // JWTトークンを生成
  const token = generateJwtToken(staff, tenant);
  
  return {
    token,
    staff: {
      id: staff.id,
      name: staff.displayName,
      email: staff.email,
      role: staff.positionTitle,
      level: staff.baseLevel,
      tenant: tenant.name
    }
  };
}
```

### 4.3 トークン検証

```javascript
// トークン検証
async function verifyToken(token) {
  try {
    // JWTトークンを検証
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // トークンの有効期限を確認
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('トークンの有効期限が切れています');
    }
    
    // スタッフ情報を取得
    const staff = await prisma.staff.findUnique({
      where: { id: decoded.sub }
    });
    
    if (!staff) {
      throw new Error('ユーザーが見つかりません');
    }
    
    // テナント情報を取得
    const tenant = await prisma.tenant.findUnique({
      where: { id: decoded.tenant_id }
    });
    
    if (!tenant) {
      throw new Error('テナント情報が見つかりません');
    }
    
    return {
      isValid: true,
      staff,
      tenant,
      permissions: decoded.permissions
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}
```

## 5. 権限レベルとアクセス制御

### 5.1 権限レベル

| レベル | 役割 | 説明 |
|-------|------|------|
| 1 | STAFF | 一般スタッフ。基本的な読み取り権限のみ |
| 2 | STAFF+ | 上級スタッフ。一部の書き込み権限あり |
| 3 | MANAGER | マネージャー。多くの読み書き権限あり |
| 4 | ADMIN | 管理者。ほぼ全ての権限あり |
| 5 | OWNER | オーナー。全ての権限あり |

### 5.2 詳細権限

権限は `entity.operation` 形式で定義され、以下のような例があります：

- `customer.read`: 顧客情報の読み取り
- `customer.write`: 顧客情報の書き込み
- `reservation.read`: 予約情報の読み取り
- `staff.write`: スタッフ情報の書き込み
- `system.admin`: システム管理機能へのアクセス

## 6. セキュリティ対策

1. **パスワード管理**
   - パスワードは常にハッシュ化して保存
   - 適切なソルトとペッパーを使用
   - 定期的なパスワード変更を推奨

2. **アカウントロック**
   - 連続5回のログイン失敗でアカウントを一時的にロック
   - ロック期間は30分
   - ロック解除は管理者権限で可能

3. **トークン管理**
   - トークンの有効期限は8時間
   - セッションIDをRedisで管理し、強制ログアウト可能
   - トークンの更新（リフレッシュ）機能を実装

4. **監査ログ**
   - ログイン成功・失敗を記録
   - 重要な操作はすべて監査ログに記録

## 7. テスト方法

1. **テストユーザー作成**
   ```bash
   node scripts/create-test-staff.js
   ```

2. **ログインテスト実行**
   ```bash
   node scripts/test-staff-login.js
   ```

3. **テスト結果確認**
   - 成功ログイン: JWTトークン生成
   - 失敗ログイン: エラーメッセージ表示

## 8. 実装チェックリスト

- [ ] スタッフモデルの実装
- [ ] パスワードハッシュ化機能の実装
- [ ] ログイン処理の実装
- [ ] JWTトークン生成の実装
- [ ] トークン検証の実装
- [ ] 権限チェック機能の実装
- [ ] アカウントロック機能の実装
- [ ] 監査ログ記録の実装
- [ ] ログアウト機能の実装
- [ ] パスワードリセット機能の実装

## 9. 参考リソース

- JWT仕様: https://jwt.io/
- Prisma ORM: https://www.prisma.io/docs/
- 統一データベーススキーマ仕様書
- JWT認証基盤設計書