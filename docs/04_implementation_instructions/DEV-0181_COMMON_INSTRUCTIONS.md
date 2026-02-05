# DEV-0181 実装指示書: hotel-common-rebuild

**タスクID**: DEV-0181 / COM-247
**対象リポジトリ**: hotel-common-rebuild
**SSOT**: `docs/03_ssot/01_admin_features/SSOT_DEV-0181_DEVICE_SESSION_RESET.md`
**作成日**: 2026-02-05

---

## 概要

客室端末セッションリセット機能のバックエンドAPI実装。

**実装内容**:
1. DBスキーマ追加（2テーブル）
2. サービス層実装（2サービス）
3. API Routes実装（4エンドポイント）
4. WebSocket配信機能

---

## 1. データベース変更

### 1.1 Prismaスキーマ追加

**ファイル**: `prisma/schema.prisma`

```prisma
// === DEV-0181: Device Reset Tables ===

model device_reset_tokens {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  deviceId     String    @map("device_id")
  roomId       String    @map("room_id")
  token        String    @unique
  tokenHash    String    @map("token_hash")
  expiresAt    DateTime  @map("expires_at")
  isUsed       Boolean   @default(false) @map("is_used")
  usedAt       DateTime? @map("used_at")
  usedBy       String?   @map("used_by")
  createdBy    String    @map("created_by")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([tenantId, deviceId, token])
  @@index([tenantId])
  @@index([deviceId])
  @@index([token])
  @@index([expiresAt])
  @@index([isUsed])
  @@map("device_reset_tokens")
}

model device_reset_logs {
  id               String    @id @default(uuid())
  tenantId         String    @map("tenant_id")
  deviceId         String    @map("device_id")
  roomId           String    @map("room_id")
  resetMethod      String    @map("reset_method")  // 'admin_panel' | 'qr_code'
  executedBy       String    @map("executed_by")
  executedByName   String?   @map("executed_by_name")
  tokenId          String?   @map("token_id")
  status           String    // 'success' | 'failed'
  errorMessage     String?   @map("error_message")
  executedAt       DateTime  @default(now()) @map("executed_at")

  @@index([tenantId])
  @@index([deviceId])
  @@index([executedAt])
  @@index([resetMethod])
  @@index([status])
  @@map("device_reset_logs")
}
```

### 1.2 マイグレーション実行

```bash
npx prisma migrate dev --name add_device_reset_tables
```

---

## 2. サービス層実装

### 2.1 DeviceResetTokenService

**ファイル**: `src/services/device/device-reset-token.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY_MINUTES = 15;

interface TokenPayload {
  sub: string;
  iss: string;
  tenantId: string;
  deviceId: string;
  roomId: string;
  exp: number;
  iat: number;
}

export class DeviceResetTokenService {
  /**
   * リセットトークン生成
   * @param tenantId テナントID
   * @param deviceId デバイスID
   * @param roomId 部屋番号
   * @param createdBy 作成者ID
   */
  async generateToken(
    tenantId: string,
    deviceId: string,
    roomId: string,
    createdBy: string
  ): Promise<{
    token: string;
    tokenId: string;
    expiresAt: Date;
    qrCodeUrl: string;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    const payload: TokenPayload = {
      sub: 'device-reset',
      iss: 'hotel-saas',
      tenantId,
      deviceId,
      roomId,
      exp: now + TOKEN_EXPIRY_MINUTES * 60,
      iat: now,
    };

    const token = jwt.sign(payload, JWT_SECRET);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await prisma.device_reset_tokens.create({
      data: {
        tenantId,
        deviceId,
        roomId,
        token,
        tokenHash,
        expiresAt,
        createdBy,
      },
    });

    const baseUrl = process.env.HOTEL_SAAS_URL || 'https://hotel-saas';
    const qrCodeUrl = `${baseUrl}/device-reset?token=${encodeURIComponent(token)}`;

    return {
      token,
      tokenId: record.id,
      expiresAt,
      qrCodeUrl,
    };
  }

  /**
   * トークン検証
   * @param token JWTトークン
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    payload?: TokenPayload;
    tokenRecord?: any;
    error?: string;
  }> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;

      const record = await prisma.device_reset_tokens.findUnique({
        where: { token },
      });

      if (!record) {
        return { valid: false, error: 'INVALID_TOKEN' };
      }

      if (record.isUsed) {
        return { valid: false, error: 'TOKEN_ALREADY_USED' };
      }

      if (record.expiresAt < new Date()) {
        return { valid: false, error: 'TOKEN_EXPIRED' };
      }

      return { valid: true, payload, tokenRecord: record };
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'TOKEN_EXPIRED' };
      }
      return { valid: false, error: 'INVALID_TOKEN' };
    }
  }

  /**
   * トークンを使用済みに更新
   * @param tokenId トークンID
   * @param usedBy 使用者ID
   */
  async markAsUsed(tokenId: string, usedBy?: string): Promise<void> {
    await prisma.device_reset_tokens.update({
      where: { id: tokenId },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedBy,
      },
    });
  }
}
```

### 2.2 DeviceResetService

**ファイル**: `src/services/device/device-reset.service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { WebSocketService } from '../websocket/websocket.service';

const prisma = new PrismaClient();

type ResetMethod = 'admin_panel' | 'qr_code';
type ResetStatus = 'success' | 'failed';

interface ResetResult {
  success: boolean;
  logId?: string;
  error?: {
    code: string;
    message: string;
  };
}

export class DeviceResetService {
  private wsService: WebSocketService;

  constructor() {
    this.wsService = new WebSocketService();
  }

  /**
   * デバイスリセット実行
   */
  async resetDevice(
    tenantId: string,
    deviceId: string,
    executedBy: string,
    executedByName: string | null,
    resetMethod: ResetMethod,
    tokenId?: string,
    reason?: string
  ): Promise<ResetResult> {
    // デバイス存在確認
    const device = await prisma.device_rooms.findFirst({
      where: { id: deviceId, tenantId },
    });

    if (!device) {
      return {
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: '指定されたデバイスが見つかりません',
        },
      };
    }

    try {
      // WebSocketイベント送信
      const wsResult = await this.wsService.sendDeviceReset({
        tenantId,
        deviceId,
        roomId: device.roomId,
        resetMethod,
        executedBy,
        executedAt: new Date().toISOString(),
        reason,
      });

      if (!wsResult.success) {
        // WebSocketエラー時のログ記録
        const log = await this.logReset(
          tenantId,
          deviceId,
          device.roomId,
          resetMethod,
          executedBy,
          executedByName,
          'failed',
          'WEBSOCKET_ERROR',
          tokenId
        );

        return {
          success: false,
          logId: log.id,
          error: {
            code: 'WEBSOCKET_ERROR',
            message: 'リセット指示の送信に失敗しました',
          },
        };
      }

      // 成功ログ記録
      const log = await this.logReset(
        tenantId,
        deviceId,
        device.roomId,
        resetMethod,
        executedBy,
        executedByName,
        'success',
        null,
        tokenId
      );

      return {
        success: true,
        logId: log.id,
      };
    } catch (err) {
      // 例外時のログ記録
      const log = await this.logReset(
        tenantId,
        deviceId,
        device.roomId,
        resetMethod,
        executedBy,
        executedByName,
        'failed',
        String(err),
        tokenId
      );

      return {
        success: false,
        logId: log.id,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'リセット処理中にエラーが発生しました',
        },
      };
    }
  }

  /**
   * リセットログ記録
   */
  private async logReset(
    tenantId: string,
    deviceId: string,
    roomId: string,
    resetMethod: ResetMethod,
    executedBy: string,
    executedByName: string | null,
    status: ResetStatus,
    errorMessage: string | null,
    tokenId?: string
  ) {
    return prisma.device_reset_logs.create({
      data: {
        tenantId,
        deviceId,
        roomId,
        resetMethod,
        executedBy,
        executedByName,
        tokenId,
        status,
        errorMessage,
      },
    });
  }

  /**
   * リセットログ一覧取得
   */
  async getLogs(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      roomId?: string;
      resetMethod?: ResetMethod;
      from?: Date;
      to?: Date;
    }
  ) {
    const { page = 1, limit = 20, roomId, resetMethod, from, to } = options;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (roomId) where.roomId = roomId;
    if (resetMethod) where.resetMethod = resetMethod;
    if (from || to) {
      where.executedAt = {};
      if (from) where.executedAt.gte = from;
      if (to) where.executedAt.lte = to;
    }

    const [logs, total] = await Promise.all([
      prisma.device_reset_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { executedAt: 'desc' },
      }),
      prisma.device_reset_logs.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

---

## 3. API Routes実装

### 3.1 デバイスリセットAPI

**ファイル**: `src/routes/api/v1/admin/devices/[deviceId]/reset.post.ts`

```typescript
import { Request, Response } from 'express';
import { DeviceResetService } from '@/services/device/device-reset.service';
import { checkPermission } from '@/middleware/permission';

const resetService = new DeviceResetService();

export default async function handler(req: Request, res: Response) {
  // 権限チェック
  if (!checkPermission(req, 'device:reset')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'この操作を実行する権限がありません',
      },
    });
  }

  const { deviceId } = req.params;
  const { reason } = req.body || {};
  const tenantId = req.headers['x-tenant-id'] as string;
  const user = req.user; // Session認証からユーザー情報取得

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'テナントIDが必要です',
      },
    });
  }

  const result = await resetService.resetDevice(
    tenantId,
    deviceId,
    user.id,
    user.name,
    'admin_panel',
    undefined,
    reason
  );

  if (!result.success) {
    const statusCode = result.error?.code === 'DEVICE_NOT_FOUND' ? 404 : 500;
    return res.status(statusCode).json(result);
  }

  return res.status(200).json({
    success: true,
    data: {
      deviceId,
      roomId: result.roomId,
      resetMethod: 'admin_panel',
      executedBy: user.id,
      executedAt: new Date().toISOString(),
      logId: result.logId,
    },
  });
}
```

### 3.2 トークン生成API

**ファイル**: `src/routes/api/v1/admin/devices/[deviceId]/reset-token.post.ts`

```typescript
import { Request, Response } from 'express';
import { DeviceResetTokenService } from '@/services/device/device-reset-token.service';
import { checkPermission } from '@/middleware/permission';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const tokenService = new DeviceResetTokenService();

export default async function handler(req: Request, res: Response) {
  // 権限チェック
  if (!checkPermission(req, 'device:generate-reset-token')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'この操作を実行する権限がありません',
      },
    });
  }

  const { deviceId } = req.params;
  const tenantId = req.headers['x-tenant-id'] as string;
  const user = req.user;

  // デバイス確認
  const device = await prisma.device_rooms.findFirst({
    where: { id: deviceId, tenantId },
  });

  if (!device) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'DEVICE_NOT_FOUND',
        message: '指定されたデバイスが見つかりません',
      },
    });
  }

  const result = await tokenService.generateToken(
    tenantId,
    deviceId,
    device.roomId,
    user.id
  );

  return res.status(200).json({
    success: true,
    data: {
      token: result.token,
      tokenId: result.tokenId,
      deviceId,
      roomId: device.roomId,
      expiresAt: result.expiresAt.toISOString(),
      qrCodeUrl: result.qrCodeUrl,
    },
  });
}
```

### 3.3 トークン検証＋リセットAPI

**ファイル**: `src/routes/api/v1/devices/reset-by-token.post.ts`

```typescript
import { Request, Response } from 'express';
import { DeviceResetTokenService } from '@/services/device/device-reset-token.service';
import { DeviceResetService } from '@/services/device/device-reset.service';

const tokenService = new DeviceResetTokenService();
const resetService = new DeviceResetService();

export default async function handler(req: Request, res: Response) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'トークンが必要です',
      },
    });
  }

  // トークン検証
  const verification = await tokenService.verifyToken(token);

  if (!verification.valid) {
    const errorMessages: Record<string, string> = {
      TOKEN_EXPIRED: 'QRコードの有効期限が切れています',
      TOKEN_ALREADY_USED: 'このQRコードは既に使用されています',
      INVALID_TOKEN: '無効なQRコードです',
    };

    return res.status(401).json({
      success: false,
      error: {
        code: verification.error,
        message: errorMessages[verification.error!] || '認証エラー',
      },
    });
  }

  const { payload, tokenRecord } = verification;

  // リセット実行
  const result = await resetService.resetDevice(
    payload!.tenantId,
    payload!.deviceId,
    'qr_code_user', // QRコード経由は匿名
    null,
    'qr_code',
    tokenRecord.id
  );

  if (!result.success) {
    return res.status(500).json(result);
  }

  // トークン使用済みに更新
  await tokenService.markAsUsed(tokenRecord.id);

  return res.status(200).json({
    success: true,
    data: {
      deviceId: payload!.deviceId,
      roomId: payload!.roomId,
      resetMethod: 'qr_code',
      executedAt: new Date().toISOString(),
      logId: result.logId,
    },
  });
}
```

### 3.4 リセットログ一覧API

**ファイル**: `src/routes/api/v1/admin/devices/reset-logs.get.ts`

```typescript
import { Request, Response } from 'express';
import { DeviceResetService } from '@/services/device/device-reset.service';
import { checkPermission } from '@/middleware/permission';

const resetService = new DeviceResetService();

export default async function handler(req: Request, res: Response) {
  // 権限チェック
  if (!checkPermission(req, 'device:view-logs')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'この操作を実行する権限がありません',
      },
    });
  }

  const tenantId = req.headers['x-tenant-id'] as string;
  const {
    page,
    limit,
    roomId,
    resetMethod,
    from,
    to,
  } = req.query;

  const result = await resetService.getLogs(tenantId, {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    roomId: roomId as string | undefined,
    resetMethod: resetMethod as 'admin_panel' | 'qr_code' | undefined,
    from: from ? new Date(from as string) : undefined,
    to: to ? new Date(to as string) : undefined,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
}
```

---

## 4. ルーター登録

**ファイル**: `src/server/index.ts`

```typescript
// === DEV-0181: Device Reset Routes ===
// 認証必須エンドポイント
app.use('/api/v1/admin/devices', authMiddleware, deviceResetRouter);

// 認証不要（トークンベース）
app.use('/api/v1/devices/reset-by-token', resetByTokenRouter);
```

---

## 5. テスト要件

### 5.1 ユニットテスト

**ファイル**: `src/services/device/__tests__/device-reset.service.test.ts`

```typescript
describe('DeviceResetService', () => {
  describe('resetDevice', () => {
    it('should reset device successfully', async () => {
      // テスト実装
    });

    it('should return error when device not found', async () => {
      // テスト実装
    });

    it('should log failed reset on WebSocket error', async () => {
      // テスト実装
    });
  });
});
```

### 5.2 統合テスト

```bash
# 管理画面リセット
curl -X POST http://localhost:3401/api/v1/admin/devices/{deviceId}/reset \
  -H "Authorization: Bearer {sessionId}" \
  -H "X-Tenant-ID: {tenantId}" \
  -H "Content-Type: application/json"

# トークン生成
curl -X POST http://localhost:3401/api/v1/admin/devices/{deviceId}/reset-token \
  -H "Authorization: Bearer {sessionId}" \
  -H "X-Tenant-ID: {tenantId}"

# トークンリセット
curl -X POST http://localhost:3401/api/v1/devices/reset-by-token \
  -H "Content-Type: application/json" \
  -d '{"token": "{jwt}"}'
```

---

## 6. チェックリスト

- [ ] Prismaスキーマ追加
- [ ] マイグレーション実行
- [ ] DeviceResetTokenService実装
- [ ] DeviceResetService実装
- [ ] API Routes実装（4エンドポイント）
- [ ] ルーター登録
- [ ] WebSocket配信機能
- [ ] ユニットテスト作成
- [ ] 統合テスト実行

---

**参照SSOT**: `docs/03_ssot/01_admin_features/SSOT_DEV-0181_DEVICE_SESSION_RESET.md`
