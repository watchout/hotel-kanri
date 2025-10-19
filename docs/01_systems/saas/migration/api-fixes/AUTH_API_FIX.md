# 認証API修正仕様書

## 概要

hotel-commonに認証関連のAPI（`POST /api/v1/auth/login`と`POST /api/v1/auth/refresh`）が実装されていないため、新規に実装する必要があります。これらのAPIは、hotel-saasからの認証リクエストを処理し、JWTトークンを発行・更新する役割を担います。

## API仕様

### 1. ログインAPI

#### エンドポイント

```
POST /api/v1/auth/login
```

#### リクエストボディ

```json
{
  "email": "professional@example.com",
  "password": "professional123"
}
```

#### レスポンス形式

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "staff-001",
    "email": "professional@example.com",
    "role": "admin",
    "tenantId": "tenant-001"
  }
}
```

### 2. トークン更新API

#### エンドポイント

```
POST /api/v1/auth/refresh
```

#### リクエストボディ

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### レスポンス形式

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 実装方法

### 1. モデルの確認

以下のモデルがPrismaスキーマに存在することを確認します：

- `Staff`
- `RefreshToken`

存在しない場合は、以下のようなスキーマを追加します：

```prisma
model Staff {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String?
  role          String    @default("staff")
  tenant_id     String
  is_active     Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  staffId   String
  staff     Staff    @relation(fields: [staffId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

### 2. ログインAPIの実装

`/Users/kaneko/hotel-common/src/server/integration-server-extended.ts`に以下のコードを追加します：

```typescript
// ログインAPI
this.app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 必須パラメータのチェック
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'メールアドレスとパスワードは必須です'
      });
    }

    // スタッフの検索
    const staff = await this.prisma.staff.findUnique({
      where: { email }
    });

    // スタッフが存在しない場合
    if (!staff) {
      return res.status(401).json({
        success: false,
        error: '認証情報が無効です'
      });
    }

    // アカウントが無効化されている場合
    if (!staff.is_active) {
      return res.status(403).json({
        success: false,
        error: 'アカウントが無効化されています'
      });
    }

    // パスワードの検証
    // 本番環境ではbcryptなどを使用してハッシュ化されたパスワードを比較する
    // 開発環境では簡易的な比較を行う
    const isPasswordValid = process.env.NODE_ENV === 'production'
      ? await bcrypt.compare(password, staff.password)
      : password === staff.password;

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '認証情報が無効です'
      });
    }

    // JWTトークンの生成
    const jwtSecret = process.env.JWT_SECRET || 'hotel-common-integration-secret-key-2025';
    const accessToken = jwt.sign({
      userId: staff.id,
      tenantId: staff.tenant_id,
      role: staff.role,
      systemSource: 'common',
      email: staff.email,
      permissions: staff.role === 'admin' ? ['*'] : ['basic']
    }, jwtSecret, { expiresIn: '1h' });

    // リフレッシュトークンの生成
    const refreshToken = jwt.sign({
      userId: staff.id,
      tokenType: 'refresh'
    }, jwtSecret, { expiresIn: '7d' });

    // リフレッシュトークンをデータベースに保存
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日後

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        staffId: staff.id,
        expiresAt
      }
    });

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        tenantId: staff.tenant_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: '認証処理中にエラーが発生しました'
    });
  }
});
```

### 3. トークン更新APIの実装

```typescript
// トークン更新API
this.app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // リフレッシュトークンが提供されていない場合
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'リフレッシュトークンは必須です'
      });
    }

    // リフレッシュトークンをデータベースから検索
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { staff: true }
    });

    // トークンが存在しない場合
    if (!storedToken) {
      return res.status(401).json({
        success: false,
        error: '無効なリフレッシュトークンです'
      });
    }

    // トークンの有効期限が切れている場合
    if (new Date() > storedToken.expiresAt) {
      // 期限切れのトークンを削除
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id }
      });

      return res.status(401).json({
        success: false,
        error: 'リフレッシュトークンの有効期限が切れています'
      });
    }

    const staff = storedToken.staff;

    // アカウントが無効化されている場合
    if (!staff.is_active) {
      return res.status(403).json({
        success: false,
        error: 'アカウントが無効化されています'
      });
    }

    // 新しいアクセストークンの生成
    const jwtSecret = process.env.JWT_SECRET || 'hotel-common-integration-secret-key-2025';
    const newAccessToken = jwt.sign({
      userId: staff.id,
      tenantId: staff.tenant_id,
      role: staff.role,
      systemSource: 'common',
      email: staff.email,
      permissions: staff.role === 'admin' ? ['*'] : ['basic']
    }, jwtSecret, { expiresIn: '1h' });

    // 新しいリフレッシュトークンの生成
    const newRefreshToken = jwt.sign({
      userId: staff.id,
      tokenType: 'refresh'
    }, jwtSecret, { expiresIn: '7d' });

    // 古いリフレッシュトークンを削除
    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    // 新しいリフレッシュトークンをデータベースに保存
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日後

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        staffId: staff.id,
        expiresAt
      }
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'トークン更新中にエラーが発生しました'
    });
  }
});
```

### 4. トークン検証APIの実装

```typescript
// トークン検証API
this.app.post('/api/v1/auth/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    // トークンが提供されていない場合
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'トークンは必須です'
      });
    }

    // JWTトークンの検証
    const jwtSecret = process.env.JWT_SECRET || 'hotel-common-integration-secret-key-2025';

    try {
      const decoded = jwt.verify(token, jwtSecret);

      // スタッフの存在確認
      const staff = await this.prisma.staff.findUnique({
        where: { id: decoded.userId }
      });

      // スタッフが存在しない場合
      if (!staff) {
        return res.json({
          valid: false,
          error: 'ユーザーが存在しません'
        });
      }

      // アカウントが無効化されている場合
      if (!staff.is_active) {
        return res.json({
          valid: false,
          error: 'アカウントが無効化されています'
        });
      }

      return res.json({
        valid: true,
        user: {
          id: staff.id,
          email: staff.email,
          role: staff.role,
          tenantId: staff.tenant_id
        }
      });
    } catch (error) {
      return res.json({
        valid: false,
        error: '無効なトークンです'
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      valid: false,
      error: 'トークン検証中にエラーが発生しました'
    });
  }
});
```

## 実装手順

1. hotel-commonリポジトリをクローンまたは更新
2. `schema.prisma`ファイルを確認し、必要なモデルが存在するか確認
3. 存在しない場合は、モデルを追加してマイグレーションを実行
4. 上記のAPIコードを実装
5. 必要なパッケージをインストール（jwt、bcrypt）
6. サーバーを再起動
7. APIをテストして正常に動作することを確認

## テスト方法

### ログインAPIのテスト

```bash
curl -X POST "http://localhost:3400/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "professional@example.com",
    "password": "professional123"
  }'
```

### トークン更新APIのテスト

```bash
curl -X POST "http://localhost:3400/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### トークン検証APIのテスト

```bash
curl -X POST "http://localhost:3400/api/v1/auth/validate-token" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## 注意事項

- 本番環境では、パスワードは必ずハッシュ化して保存してください
- JWTシークレットは環境変数から取得し、安全に管理してください
- トークンの有効期限は適切に設定してください
- エラーハンドリングを適切に行い、クライアントに分かりやすいエラーメッセージを返してください
- セキュリティ上の理由から、認証エラーの詳細は本番環境では最小限に抑えてください
