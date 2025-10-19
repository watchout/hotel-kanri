# 認証システム実装計画（改訂版）

## 概要

hotel-saasシステムの認証システムを統合データベースに完全に移行するための実装計画です。データベース分析の結果、hotel-commonの定義と実際のデータベース構造に不一致があることが判明したため、実際のデータベース構造に基づいた実装計画を策定します。

## 現状分析

### 現在の認証システム

現在のhotel-saasシステムでは、以下の認証メカニズムを使用しています：

1. **モックアカウント**: 開発環境ではハードコードされたモックアカウントを使用
2. **JWT認証**: JWTトークンを使用した認証情報の管理
3. **権限管理**: シンプルなロールベースの権限管理（admin, staff）

### データベース構造

統合データベースには以下のテーブルが存在します：

1. **staff**: スタッフ情報を管理するテーブル
   ```
   - id (text, NOT NULL)
   - tenant_id (text, NOT NULL)
   - email (text, NOT NULL)
   - name (text, NOT NULL)
   - role (text, NOT NULL)
   - department (text, NULL)
   - is_active (boolean, NOT NULL)
   - created_at (timestamp, NOT NULL)
   - updated_at (timestamp, NOT NULL)
   ```

2. **Tenant**: テナント情報を管理するテーブル
   ```
   - id (text, NOT NULL)
   - name (text, NOT NULL)
   - domain (text, NULL)
   - status (text, NOT NULL)
   - contactEmail (text, NULL)
   - createdAt (timestamp, NOT NULL)
   - features (ARRAY, NULL)
   - planType (text, NULL)
   - settings (jsonb, NULL)
   ```

### 不一致点

1. **テーブル名の不一致**: hotel-commonでは`User`モデル（`users`テーブル）が定義されているが、実際には`staff`テーブルが存在
2. **命名規則の不一致**: `staff`テーブルは`snake_case`、`Tenant`テーブルは`camelCase`を使用
3. **カラムの不足**: `staff`テーブルにはパスワードハッシュや権限管理に必要なカラムが不足

## 実装計画

### 1. データベース変更

統合データベース変更申請書に基づき、以下の変更を実施します：

1. **staffテーブルへのカラム追加**
   - `password_hash`: パスワードのハッシュ値
   - `system_access`: システムアクセス権限
   - `base_level`: 権限レベル
   - `last_login_at`: 最終ログイン日時

2. **インデックスの追加**
   - `idx_staff_email`: メールアドレスでの検索を高速化
   - `idx_staff_tenant_id`: テナントIDでの検索を高速化

### 2. 認証システムの実装

#### 2.1 ログインAPI (`/api/v1/auth/login.post.ts`)

```typescript
import { H3Event } from 'h3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../utils/prisma';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readBody(event);
    const { email, password } = body;

    // スタッフをメールアドレスで検索
    let staff = null;
    try {
      // 実際のデータベース構造に合わせたクエリ
      const result = await prisma.$queryRaw`
        SELECT id, email, name, role, tenant_id, is_active, password_hash, system_access, base_level
        FROM staff
        WHERE email = ${email} AND is_active = true
        LIMIT 1;
      `;

      if (Array.isArray(result) && result.length > 0) {
        staff = result[0];
      }
    } catch (dbError) {
      console.error('データベース検索エラー:', dbError);
    }

    // 開発環境用のフォールバック
    if (!staff && process.env.NODE_ENV !== 'production') {
      // モックアカウント処理
      if (email === 'professional@example.com') {
        staff = {
          id: 'mock-professional',
          email: 'professional@example.com',
          name: 'プロフェッショナル管理者',
          role: 'admin',
          tenant_id: 'tenant-professional',
          is_active: true,
          // 開発環境ではパスワードハッシュは不要
        };
      }
      // 他のモックアカウント...
    }

    if (!staff) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      });
    }

    // パスワード検証
    let isPasswordValid = false;

    // 開発環境用のモック認証
    if (staff.id.startsWith('mock-')) {
      if (email === 'professional@example.com' && password === 'professional123') {
        isPasswordValid = true;
      }
      // 他のモックアカウント検証...
    }
    // 実際のデータベースアカウントの場合はbcryptで検証
    else if (staff.password_hash) {
      isPasswordValid = await bcrypt.compare(password, staff.password_hash);
    }

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
      });
    }

    // JWT生成
    const jwtSecret = process.env.JWT_SECRET || 'hotel-saas-integration-secret-key-2025';
    const accessToken = jwt.sign({
      userId: staff.id,
      tenantId: staff.tenant_id,
      role: staff.role,
      systemSource: 'saas',
      email: staff.email,
      baseLevel: staff.base_level || 1,
      systemAccess: staff.system_access || ['saas']
    }, jwtSecret, { expiresIn: '24h' });

    // 最終ログイン日時の更新（本番環境のみ）
    if (process.env.NODE_ENV === 'production' && !staff.id.startsWith('mock-')) {
      await prisma.$executeRaw`
        UPDATE staff
        SET last_login_at = NOW()
        WHERE id = ${staff.id};
      `;
    }

    // テナント情報の取得
    let tenant = null;
    try {
      const tenantResult = await prisma.$queryRaw`
        SELECT id, name, domain, "planType", status
        FROM "Tenant"
        WHERE id = ${staff.tenant_id}
        LIMIT 1;
      `;

      if (Array.isArray(tenantResult) && tenantResult.length > 0) {
        tenant = tenantResult[0];
      }
    } catch (tenantError) {
      console.error('テナント情報取得エラー:', tenantError);
    }

    // 開発環境用のフォールバック
    if (!tenant && process.env.NODE_ENV !== 'production') {
      tenant = {
        id: staff.tenant_id,
        name: staff.email.includes('professional') ? 'プロフェッショナルホテル' : 'エコノミーホテル',
        planType: staff.email.includes('professional') ? 'professional' : 'economy',
        status: 'active'
      };
    }

    return {
      success: true,
      accessToken,
      token: accessToken,
      user: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        tenantId: staff.tenant_id,
        systemAccess: staff.system_access || ['saas'],
        baseLevel: staff.base_level || 1,
        displayName: staff.name
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        planType: tenant.planType || 'professional',
        planCategory: 'omotenasuai'
      } : null,
      integration: {
        systemSource: 'saas',
        timestamp: new Date().toISOString(),
        tokenType: 'JWT',
        expiresIn: '24h',
        authType: 'staff',
        tenantId: staff.tenant_id
      }
    };
  } catch (error) {
    console.error('認証エラー:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication service error'
    });
  }
});
```

#### 2.2 権限検証API (`/api/v1/auth/verify-permissions.get.ts`)

```typescript
import { getServerSession } from '#auth';
import { H3Event } from 'h3';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../utils/prisma';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // セッション情報を取得
    const session = await getServerSession(event);

    // リクエストヘッダーからトークンを取得
    const authHeader = getRequestHeader(event, 'Authorization');
    const token = authHeader?.replace('Bearer ', '');

    // ユーザー情報変数
    let userData = null;

    if (session && session.user) {
      // 正規のセッションがあればそれを使用
      userData = session.user;
    } else if (token) {
      // トークンがあればデコードしてユーザー情報を取得
      try {
        const jwtSecret = process.env.JWT_SECRET || 'hotel-saas-integration-secret-key-2025';
        const decoded = jwt.verify(token, jwtSecret);
        userData = decoded;
      } catch (jwtError) {
        console.error('トークンデコードエラー:', jwtError);
      }
    }

    // ユーザー情報がない場合はエラー
    if (!userData) {
      throw createError({
        statusCode: 401,
        statusMessage: '認証されていません'
      });
    }

    // 型変換
    const user = userData as any;

    // スタッフ情報を取得
    let staffInfo = null;
    try {
      const result = await prisma.$queryRaw`
        SELECT id, email, name, role, tenant_id, base_level, system_access, department
        FROM staff
        WHERE id = ${user.userId || user.id}
        LIMIT 1;
      `;

      if (Array.isArray(result) && result.length > 0) {
        staffInfo = result[0];
      }
    } catch (staffError) {
      console.error('スタッフ情報取得エラー:', staffError);
    }

    // テナント情報を取得
    let tenantInfo = null;
    try {
      const result = await prisma.$queryRaw`
        SELECT id, name, domain, "planType", status
        FROM "Tenant"
        WHERE id = ${user.tenantId}
        LIMIT 1;
      `;

      if (Array.isArray(result) && result.length > 0) {
        tenantInfo = result[0];
      }
    } catch (tenantError) {
      console.error('テナント情報取得エラー:', tenantError);
    }

    // 権限チェック
    const baseLevel = staffInfo?.base_level || user.baseLevel || 1;
    const role = staffInfo?.role || user.role;

    const permissions = {
      general: baseLevel >= 1,
      write: baseLevel >= 2,
      admin: baseLevel >= 3 || role === 'admin',
      superAdmin: role === 'super_admin'
    };

    return {
      success: true,
      auth: {
        isAuthenticated: true,
        userId: user.userId || user.id,
        email: user.email,
        role: role,
        tenantId: user.tenantId
      },
      permissions,
      staff: staffInfo ? {
        id: staffInfo.id,
        email: staffInfo.email,
        name: staffInfo.name,
        role: staffInfo.role,
        baseLevel: staffInfo.base_level,
        department: staffInfo.department,
        systemAccess: staffInfo.system_access
      } : null,
      tenant: tenantInfo ? {
        id: tenantInfo.id,
        name: tenantInfo.name,
        domain: tenantInfo.domain,
        planType: tenantInfo.planType,
        status: tenantInfo.status
      } : null
    };
  } catch (error) {
    console.error('権限検証エラー:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '権限検証中にエラーが発生しました'
    });
  }
});
```

#### 2.3 認証ミドルウェア (`/server/middleware/auth.ts`)

```typescript
import { getServerSession } from '#auth';
import { H3Event } from 'h3';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

// 認証が不要なパス
const PUBLIC_PATHS = [
  '/api/auth/session',
  '/api/v1/auth/login',
  '/health',
  // その他の公開パス
];

export default defineEventHandler(async (event: H3Event) => {
  const path = event.path;
  console.log('認証ミドルウェア: パス「' + path + '」をチェック');

  // 公開パスはスキップ
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    console.log('認証ミドルウェア: パブリックパス「' + path + '」はスキップします');
    return;
  }

  // 管理画面APIのみチェック
  if (!path.startsWith('/api/v1/admin/')) {
    console.log('管理者認証: 客室側パス「' + path + '」はスキップ');
    return;
  }

  try {
    // セッション情報を取得
    const session = await getServerSession(event);

    // JWTトークンを取得
    const authHeader = getRequestHeader(event, 'Authorization');
    const token = authHeader?.replace('Bearer ', '');

    let isAuthenticated = false;
    let userId = null;
    let tenantId = null;

    // セッションによる認証
    if (session && session.user) {
      isAuthenticated = true;
      userId = (session.user as any).id || (session.user as any).userId;
      tenantId = (session.user as any).tenantId;
    }
    // JWTトークンによる認証
    else if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET || 'hotel-saas-integration-secret-key-2025';
        const decoded = jwt.verify(token, jwtSecret) as any;
        isAuthenticated = true;
        userId = decoded.userId || decoded.id;
        tenantId = decoded.tenantId;
      } catch (jwtError) {
        console.error('JWT検証エラー:', jwtError);
      }
    }

    if (!isAuthenticated) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // アクセスログの記録
    const headers = getHeaders(event);
    const ipAddress = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
    const userAgent = headers['user-agent'] || 'unknown';

    try {
      // 開発環境ではログをコンソールに出力するのみ
      console.log(`📝 管理画面アクセスログ: ${path} (${userId || 'unknown'}, ${ipAddress})`);

      // 本番環境ではデータベースに記録
      if (process.env.NODE_ENV === 'production') {
        await prisma.$executeRaw`
          INSERT INTO admin_log (path, method, user_id, ip_address, user_agent, created_at)
          VALUES (${path}, ${event.method}, ${userId || 'unknown'}, ${ipAddress}, ${userAgent}, NOW());
        `;
      }
    } catch (logError) {
      console.error('アクセスログ記録エラー:', logError);
    }

    // テナントIDをコンテキストに設定
    if (tenantId) {
      event.context.tenantId = tenantId;
    }

  } catch (error) {
    console.error('認証エラー:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication service error'
    });
  }
});
```

### 3. テスト計画

#### 3.1 単体テスト

```typescript
// tests/unit/auth.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';
import jwt from 'jsonwebtoken';

describe('認証システム', () => {
  beforeEach(async () => {
    // テスト用のモックデータを設定
    vi.mock('../server/utils/prisma', () => ({
      prisma: {
        $queryRaw: vi.fn().mockImplementation((query, ...params) => {
          if (query.includes('FROM staff')) {
            return [{
              id: 'test-staff-1',
              email: 'test@example.com',
              name: 'テストユーザー',
              role: 'admin',
              tenant_id: 'test-tenant-1',
              is_active: true,
              password_hash: '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
              base_level: 3,
              system_access: ['saas']
            }];
          }
          if (query.includes('FROM "Tenant"')) {
            return [{
              id: 'test-tenant-1',
              name: 'テストテナント',
              domain: 'test.example.com',
              planType: 'professional',
              status: 'active'
            }];
          }
          return [];
        }),
        $executeRaw: vi.fn()
      }
    }));

    // bcryptのモック
    vi.mock('bcryptjs', () => ({
      compare: vi.fn().mockResolvedValue(true)
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('正常なログインが成功すること', async () => {
    const response = await $fetch('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    expect(response.success).toBe(true);
    expect(response.token).toBeDefined();
    expect(response.user.email).toBe('test@example.com');
  });

  it('無効な認証情報でログインが失敗すること', async () => {
    vi.mock('bcryptjs', () => ({
      compare: vi.fn().mockResolvedValue(false)
    }));

    try {
      await $fetch('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      });
      // エラーがスローされなければテスト失敗
      expect(true).toBe(false);
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });

  it('権限検証が正常に動作すること', async () => {
    // JWTトークンを生成
    const token = jwt.sign({
      userId: 'test-staff-1',
      tenantId: 'test-tenant-1',
      role: 'admin',
      email: 'test@example.com'
    }, 'hotel-saas-integration-secret-key-2025');

    const response = await $fetch('/api/v1/auth/verify-permissions', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    expect(response.success).toBe(true);
    expect(response.auth.isAuthenticated).toBe(true);
    expect(response.permissions.admin).toBe(true);
  });
});
```

#### 3.2 統合テスト

```javascript
// scripts/test-auth-integration.cjs
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3100';

async function testAuth() {
  console.log('hotel-common統合認証テスト');
  console.log('APIエンドポイント:', API_BASE_URL);
  console.log();

  try {
    // ステップ1: ログインテスト
    console.log('ステップ1: ログインテスト');
    const email = 'professional@example.com';
    const password = 'professional123';
    console.log('メールアドレス:', email);
    console.log('パスワード:', password);
    console.log();

    console.log('ログイン試行中...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      email: email,
      password: password
    });

    const authData = loginResponse.data;
    const authToken = authData.token;

    console.log('ログイン成功!');
    console.log('ユーザー情報:');
    console.log('- ID:', authData.user.id);
    console.log('- メール:', authData.user.email);
    console.log('- ロール:', authData.user.role);
    console.log('- テナントID:', authData.user.tenantId);
    console.log();

    console.log('テナント情報:');
    console.log('- 名前:', authData.tenant.name);
    console.log('- プラン:', authData.tenant.planType);
    console.log();

    // ステップ2: 権限検証テスト
    console.log('ステップ2: 権限検証テスト');
    console.log('権限検証中...');

    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/auth/verify-permissions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('権限検証成功!');
      console.log('権限情報:');
      console.log(response.data.permissions);

      if (response.data.staff) {
        console.log('スタッフ情報:');
        console.log('- 名前:', response.data.staff.name);
        console.log('- 権限レベル:', response.data.staff.baseLevel);
      }
    } catch (error) {
      console.log('権限検証エラー:', error.response?.data || error);
    }

  } catch (error) {
    console.log('ログインエラー:', error.response?.data || error);
  }

  console.log();
  console.log('テスト完了');
}

testAuth();
```

## 移行手順

### 1. 開発環境での準備

1. **データベース変更申請書の提出**
   - 実際のデータベース構造に基づいた変更申請書を作成
   - hotel-common統合データベース管理チームに提出

2. **テスト環境の構築**
   - モックデータを使用したテスト環境の構築
   - 認証システムの実装と単体テスト

### 2. 段階的移行

1. **フェーズ1: 認証基盤の実装**
   - ログインAPI (`/api/v1/auth/login.post.ts`) の実装
   - 権限検証API (`/api/v1/auth/verify-permissions.get.ts`) の実装
   - 認証ミドルウェア (`/server/middleware/auth.ts`) の実装

2. **フェーズ2: テストとデバッグ**
   - 単体テストの実行
   - 統合テストの実行
   - 発見された問題の修正

3. **フェーズ3: 本番環境への移行**
   - モックアカウントから実際のデータベースアカウントへの移行
   - パフォーマンスモニタリングの実施
   - フォールバックメカニズムの準備

### 3. 移行後の対応

1. **モニタリングと最適化**
   - 認証システムのパフォーマンスモニタリング
   - 必要に応じたインデックスの追加や最適化

2. **ドキュメントの更新**
   - 実装した認証システムのドキュメント作成
   - 開発者向けのガイドライン作成

3. **長期的な改善計画**
   - hotel-commonのスキーマ定義と実際のデータベース構造の不一致解消
   - 命名規則の統一

## リスク対策

1. **認証失敗時の対策**
   - フォールバックメカニズムの実装
   - モックアカウントの維持（開発環境のみ）

2. **パフォーマンス低下の対策**
   - インデックスの追加
   - クエリの最適化
   - キャッシュの検討

3. **データ不整合の対策**
   - マイグレーション前後の検証テスト
   - ロールバック計画の準備

4. **スキーマ不一致の対策**
   - 実際のデータベース構造に合わせた実装
   - 長期的なスキーマ統一の検討

## 結論

実際のデータベース構造に基づいた認証システムの実装により、hotel-saasシステムをhotel-common統合データベースと完全に連携させることが可能です。段階的な移行アプローチとリスク対策により、安全かつ効率的な移行を実現します。

長期的には、hotel-commonのスキーマ定義と実際のデータベース構造の不一致を解消し、より一貫性のあるデータベース設計を目指すことが重要です。
