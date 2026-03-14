=== hotel-saas 客室一覧・デバイス管理 API方式移行実装ガイド ===

【対象システム】hotel-saas → hotel-common API統合
【作成日】2025年10月1日
【実装期間】3-5日（Phase別実装）

## 【必読ドキュメント】

★★★ 最重要
- `docs/01_systems/saas/specs/2025-01-28_unified-api-specification.v1.md` - 統合API仕様書
- `docs/01_systems/common/api/UNIFIED_API_SPECIFICATION.md` - Common側API仕様
- `docs/01_systems/saas/MISSING_COMMON_APIS.md` - 不足API一覧

★★ 重要
- `docs/01_systems/saas/DEVICEROOM_TABLE_REQUEST.md` - DeviceRoomテーブル仕様
- `docs/01_systems/common/api/DEVICE_API_IMPLEMENTATION_SUMMARY.md` - デバイスAPI実装状況

★ 参考
- `docs/01_systems/saas/migration/API_INTEGRATION_PLAN.md` - 統合計画
- `docs/01_systems/saas/RECOVERY_STATUS.md` - 現在の復旧状況

## 【実装順序】

### Phase 1: 基盤準備（1日目）
1. DeviceRoomテーブル作成依頼
2. Common側客室管理API実装
3. SaaS側プロキシAPI基盤構築

### Phase 2: 客室一覧API統合（2日目）
1. Common側客室一覧API実装
2. SaaS側プロキシAPI実装
3. フロントエンド統合テスト

### Phase 3: デバイス管理API統合（3-4日目）
1. Common側デバイス管理API完全実装
2. SaaS側デバイス管理プロキシAPI実装
3. WebSocket連携調整

### Phase 4: 統合テスト・最適化（5日目）
1. エンドツーエンドテスト
2. パフォーマンス最適化
3. エラーハンドリング強化

## 【重要な実装方針】

❌ 禁止事項
- SaaS側でのPrisma直接使用
- 独自データベーススキーマの作成
- Common側APIを経由しないデータアクセス
- フォールバック処理の実装

✅ 必須事項
- すべてのデータアクセスはCommon API経由
- 統一レスポンス形式の遵守
- JWT認証の完全統合
- テナント分離の徹底
- エラーハンドリングの統一

## 【Phase 1: 基盤準備】

### 1.1 DeviceRoomテーブル作成（hotel-common側）

**対象ファイル**: `hotel-common/prisma/schema.prisma`

```prisma
model DeviceRoom {
  id           Int       @id @default(autoincrement())
  tenantId     String
  roomId       String    // 部屋番号（文字列形式）
  roomName     String?   // 部屋名称
  deviceId     String?   // デバイス識別子
  deviceType   String?   // "room", "front", "kitchen" など
  placeId      String?   // 場所ID
  status       String?   @default("active") // デバイスステータス
  ipAddress    String?   // IPアドレス
  macAddress   String?   // MACアドレス
  lastUsedAt   DateTime? // 最終使用日時
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // リレーション
  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  place        Place?    @relation(fields: [placeId], references: [id])

  @@index([tenantId])
  @@index([roomId])
  @@index([deviceId])
  @@index([placeId])
  @@index([status])
  @@map("device_rooms")
}
```

**実行コマンド**:
```bash
cd hotel-common
npx prisma db push
npx prisma generate
```

### 1.2 Common側客室管理API基盤実装

**対象ファイル**: `hotel-common/src/routes/admin/front-desk/rooms.routes.ts`

```typescript
import { Router } from 'express';
import { authenticateJWT, requireRole } from '../../../middleware/auth.middleware';
import { validateTenant } from '../../../middleware/tenant.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 客室一覧取得
router.get('/', 
  authenticateJWT,
  requireRole(['admin', 'staff']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        room_type, 
        floor 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where = {
        tenantId,
        ...(status && { status }),
        ...(room_type && { room_type }),
        ...(floor && { floor: Number(floor) })
      };

      const [rooms, total] = await Promise.all([
        prisma.room.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { room_number: 'asc' },
          include: {
            roomStatus: true
          }
        }),
        prisma.room.count({ where })
      ]);

      // ステータス集計
      const statusCounts = await prisma.room.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true }
      });

      const summary = {
        total_rooms: total,
        by_status: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>)
      };

      res.json({
        success: true,
        data: {
          rooms: rooms.map(room => ({
            id: room.id,
            room_number: room.room_number,
            room_type: room.room_type,
            floor: room.floor,
            status: room.roomStatus?.status || room.status,
            capacity: room.capacity,
            amenities: room.amenities || [],
            notes: room.notes,
            last_cleaned: room.roomStatus?.updatedAt,
            created_at: room.createdAt,
            updated_at: room.updatedAt
          })),
          summary
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total_items: total,
          total_pages: Math.ceil(total / Number(limit)),
          has_next: skip + Number(limit) < total,
          has_prev: Number(page) > 1
        }
      });
    } catch (error) {
      console.error('客室一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '客室一覧の取得に失敗しました'
        }
      });
    }
  }
);

// 客室詳細取得
router.get('/:id',
  authenticateJWT,
  requireRole(['admin', 'staff']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;

      const room = await prisma.room.findFirst({
        where: { 
          id,
          tenantId 
        },
        include: {
          roomStatus: true,
          deviceRooms: true
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '指定された客室が見つかりません'
          }
        });
      }

      res.json({
        success: true,
        data: {
          room: {
            id: room.id,
            room_number: room.room_number,
            room_type: room.room_type,
            floor: room.floor,
            status: room.roomStatus?.status || room.status,
            capacity: room.capacity,
            amenities: room.amenities || [],
            notes: room.notes,
            devices: room.deviceRooms || [],
            created_at: room.createdAt,
            updated_at: room.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('客室詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '客室詳細の取得に失敗しました'
        }
      });
    }
  }
);

// 客室状態更新
router.put('/:id',
  authenticateJWT,
  requireRole(['admin']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      const { status, notes, maintenance_reason } = req.body;

      const room = await prisma.room.findFirst({
        where: { id, tenantId }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '指定された客室が見つかりません'
          }
        });
      }

      // 客室状態を更新
      const updatedRoom = await prisma.room.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          updatedAt: new Date()
        }
      });

      // RoomStatusテーブルも更新
      if (status) {
        await prisma.roomStatus.upsert({
          where: { placeId: parseInt(room.id) },
          update: { 
            status,
            updatedAt: new Date()
          },
          create: {
            placeId: parseInt(room.id),
            status,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      res.json({
        success: true,
        data: {
          room: {
            id: updatedRoom.id,
            room_number: updatedRoom.room_number,
            status: updatedRoom.status,
            notes: updatedRoom.notes,
            updated_at: updatedRoom.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('客室状態更新エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '客室状態の更新に失敗しました'
        }
      });
    }
  }
);

export default router;
```

### 1.3 SaaS側プロキシAPI基盤構築

**対象ファイル**: `hotel-saas/server/utils/hotelCommonApi.ts`

```typescript
interface HotelCommonApiConfig {
  baseUrl: string;
  timeout: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

class HotelCommonApiClient {
  private config: HotelCommonApiConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400',
      timeout: 30000
    };
  }

  async request<T = any>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      query?: Record<string, any>;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, query } = options;
    
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    
    // クエリパラメータを追加
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`Hotel Common API Error [${method} ${endpoint}]:`, error);
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw createError({
          statusCode: 504,
          statusMessage: 'Hotel Common API timeout'
        });
      }

      if (error.message.includes('ECONNREFUSED')) {
        throw createError({
          statusCode: 503,
          statusMessage: 'Hotel Common API unavailable'
        });
      }

      throw createError({
        statusCode: 502,
        statusMessage: `Hotel Common API error: ${error.message}`
      });
    }
  }

  // 認証ヘッダーを含むリクエスト
  async authenticatedRequest<T = any>(
    endpoint: string,
    token: string,
    options: Parameters<typeof this.request>[1] = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
  }
}

export const hotelCommonApi = new HotelCommonApiClient();
```

## 【Phase 2: 客室一覧API統合】

### 2.1 SaaS側客室一覧プロキシAPI実装

**対象ファイル**: `hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts`

```typescript
import { hotelCommonApi } from '~/server/utils/hotelCommonApi';

export default defineEventHandler(async (event) => {
  // 認証チェック
  const authUser = await verifyAuth(event);
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  // 管理者権限チェック
  if (!['admin', 'staff'].includes(authUser.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions'
    });
  }

  // クエリパラメータ取得
  const query = getQuery(event);

  try {
    // hotel-common API呼び出し
    const response = await hotelCommonApi.authenticatedRequest(
      '/api/v1/admin/front-desk/rooms',
      authUser.token,
      {
        method: 'GET',
        query: {
          page: query.page,
          limit: query.limit,
          status: query.status,
          room_type: query.room_type,
          floor: query.floor
        }
      }
    );

    return response;
  } catch (error: any) {
    console.error('客室一覧取得エラー:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '客室一覧の取得に失敗しました'
    });
  }
});
```

**対象ファイル**: `hotel-saas/server/api/v1/admin/front-desk/rooms/[id].get.ts`

```typescript
import { hotelCommonApi } from '~/server/utils/hotelCommonApi';

export default defineEventHandler(async (event) => {
  const authUser = await verifyAuth(event);
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  const roomId = getRouterParam(event, 'id');
  if (!roomId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Room ID is required'
    });
  }

  try {
    const response = await hotelCommonApi.authenticatedRequest(
      `/api/v1/admin/front-desk/rooms/${roomId}`,
      authUser.token,
      { method: 'GET' }
    );

    return response;
  } catch (error: any) {
    console.error('客室詳細取得エラー:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '客室詳細の取得に失敗しました'
    });
  }
});
```

**対象ファイル**: `hotel-saas/server/api/v1/admin/front-desk/rooms/[id].put.ts`

```typescript
import { hotelCommonApi } from '~/server/utils/hotelCommonApi';

export default defineEventHandler(async (event) => {
  const authUser = await verifyAuth(event);
  if (!authUser || authUser.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    });
  }

  const roomId = getRouterParam(event, 'id');
  const body = await readBody(event);

  // バリデーション
  const allowedStatuses = ['available', 'occupied', 'maintenance', 'cleaning'];
  if (body.status && !allowedStatuses.includes(body.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid room status'
    });
  }

  try {
    const response = await hotelCommonApi.authenticatedRequest(
      `/api/v1/admin/front-desk/rooms/${roomId}`,
      authUser.token,
      {
        method: 'PUT',
        body: {
          status: body.status,
          notes: body.notes,
          maintenance_reason: body.maintenance_reason
        }
      }
    );

    return response;
  } catch (error: any) {
    console.error('客室状態更新エラー:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '客室状態の更新に失敗しました'
    });
  }
});
```

### 2.2 フロントエンド統合

**対象ファイル**: `hotel-saas/composables/useRooms.ts`

```typescript
interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  capacity: number;
  amenities: string[];
  notes?: string;
  last_cleaned?: string;
  created_at: string;
  updated_at: string;
}

interface RoomsResponse {
  rooms: Room[];
  summary: {
    total_rooms: number;
    by_status: Record<string, number>;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export const useRooms = () => {
  const rooms = ref<Room[]>([]);
  const summary = ref<RoomsResponse['summary']>({
    total_rooms: 0,
    by_status: {}
  });
  const pagination = ref<PaginationInfo>({
    page: 1,
    limit: 20,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 客室一覧取得
  const fetchRooms = async (params: {
    page?: number;
    limit?: number;
    status?: string;
    room_type?: string;
    floor?: number;
  } = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{
        success: boolean;
        data: RoomsResponse;
        pagination: PaginationInfo;
      }>('/api/v1/admin/front-desk/rooms', {
        query: params
      });

      if (data.success) {
        rooms.value = data.data.rooms;
        summary.value = data.data.summary;
        pagination.value = data.pagination;
      } else {
        throw new Error('Failed to fetch rooms');
      }
    } catch (err: any) {
      error.value = err.message || '客室一覧の取得に失敗しました';
      console.error('客室一覧取得エラー:', err);
    } finally {
      loading.value = false;
    }
  };

  // 客室詳細取得
  const fetchRoom = async (roomId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{
        success: boolean;
        data: { room: Room };
      }>(`/api/v1/admin/front-desk/rooms/${roomId}`);

      if (data.success) {
        return data.data.room;
      } else {
        throw new Error('Failed to fetch room details');
      }
    } catch (err: any) {
      error.value = err.message || '客室詳細の取得に失敗しました';
      console.error('客室詳細取得エラー:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // 客室状態更新
  const updateRoomStatus = async (
    roomId: string, 
    updates: {
      status?: string;
      notes?: string;
      maintenance_reason?: string;
    }
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const { data } = await $fetch<{
        success: boolean;
        data: { room: Room };
      }>(`/api/v1/admin/front-desk/rooms/${roomId}`, {
        method: 'PUT',
        body: updates
      });

      if (data.success) {
        // ローカル状態を更新
        const index = rooms.value.findIndex(room => room.id === roomId);
        if (index !== -1) {
          rooms.value[index] = { ...rooms.value[index], ...data.data.room };
        }
        return data.data.room;
      } else {
        throw new Error('Failed to update room status');
      }
    } catch (err: any) {
      error.value = err.message || '客室状態の更新に失敗しました';
      console.error('客室状態更新エラー:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    rooms: readonly(rooms),
    summary: readonly(summary),
    pagination: readonly(pagination),
    loading: readonly(loading),
    error: readonly(error),
    fetchRooms,
    fetchRoom,
    updateRoomStatus
  };
};
```

## 【Phase 3: デバイス管理API統合】

### 3.1 Common側デバイス管理API完全実装

**対象ファイル**: `hotel-common/src/routes/admin/devices.routes.ts`

```typescript
import { Router } from 'express';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { validateTenant } from '../../middleware/tenant.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// デバイス一覧取得
router.get('/',
  authenticateJWT,
  requireRole(['admin', 'staff']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        deviceType, 
        roomId 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where = {
        tenantId,
        ...(status && { status }),
        ...(deviceType && { deviceType }),
        ...(roomId && { roomId })
      };

      const [devices, total] = await Promise.all([
        prisma.deviceRoom.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { roomId: 'asc' },
          include: {
            place: true
          }
        }),
        prisma.deviceRoom.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          devices: devices.map(device => ({
            id: device.id,
            tenantId: device.tenantId,
            roomId: device.roomId,
            roomName: device.roomName,
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            status: device.status,
            ipAddress: device.ipAddress,
            macAddress: device.macAddress,
            lastUsedAt: device.lastUsedAt,
            isActive: device.isActive,
            place: device.place ? {
              id: device.place.id,
              name: device.place.name,
              code: device.place.code
            } : null,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt
          }))
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total_items: total,
          total_pages: Math.ceil(total / Number(limit)),
          has_next: skip + Number(limit) < total,
          has_prev: Number(page) > 1
        }
      });
    } catch (error) {
      console.error('デバイス一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'デバイス一覧の取得に失敗しました'
        }
      });
    }
  }
);

// デバイス作成
router.post('/',
  authenticateJWT,
  requireRole(['admin']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { 
        roomId, 
        roomName, 
        deviceId, 
        deviceType, 
        placeId, 
        ipAddress, 
        macAddress 
      } = req.body;

      // 必須フィールドチェック
      if (!roomId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'roomIdは必須です'
          }
        });
      }

      // 重複チェック
      if (deviceId) {
        const existingDevice = await prisma.deviceRoom.findFirst({
          where: { 
            tenantId, 
            deviceId 
          }
        });

        if (existingDevice) {
          return res.status(409).json({
            success: false,
            error: {
              code: 'RESOURCE_CONFLICT',
              message: '指定されたデバイスIDは既に使用されています'
            }
          });
        }
      }

      const device = await prisma.deviceRoom.create({
        data: {
          tenantId,
          roomId,
          roomName,
          deviceId,
          deviceType: deviceType || 'room',
          placeId,
          ipAddress,
          macAddress,
          status: 'active',
          isActive: true
        },
        include: {
          place: true
        }
      });

      res.status(201).json({
        success: true,
        data: {
          device: {
            id: device.id,
            tenantId: device.tenantId,
            roomId: device.roomId,
            roomName: device.roomName,
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            status: device.status,
            ipAddress: device.ipAddress,
            macAddress: device.macAddress,
            isActive: device.isActive,
            place: device.place,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('デバイス作成エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'デバイスの作成に失敗しました'
        }
      });
    }
  }
);

// デバイス詳細取得
router.get('/:id',
  authenticateJWT,
  requireRole(['admin', 'staff']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;

      const device = await prisma.deviceRoom.findFirst({
        where: { 
          id: Number(id),
          tenantId 
        },
        include: {
          place: true
        }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '指定されたデバイスが見つかりません'
          }
        });
      }

      res.json({
        success: true,
        data: {
          device: {
            id: device.id,
            tenantId: device.tenantId,
            roomId: device.roomId,
            roomName: device.roomName,
            deviceId: device.deviceId,
            deviceType: device.deviceType,
            status: device.status,
            ipAddress: device.ipAddress,
            macAddress: device.macAddress,
            lastUsedAt: device.lastUsedAt,
            isActive: device.isActive,
            place: device.place,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('デバイス詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'デバイス詳細の取得に失敗しました'
        }
      });
    }
  }
);

// デバイス更新
router.put('/:id',
  authenticateJWT,
  requireRole(['admin']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      const updates = req.body;

      const device = await prisma.deviceRoom.findFirst({
        where: { 
          id: Number(id),
          tenantId 
        }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '指定されたデバイスが見つかりません'
          }
        });
      }

      const updatedDevice = await prisma.deviceRoom.update({
        where: { id: Number(id) },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          place: true
        }
      });

      res.json({
        success: true,
        data: {
          device: updatedDevice
        }
      });
    } catch (error) {
      console.error('デバイス更新エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'デバイスの更新に失敗しました'
        }
      });
    }
  }
);

// デバイス削除
router.delete('/:id',
  authenticateJWT,
  requireRole(['admin']),
  validateTenant,
  async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;

      const device = await prisma.deviceRoom.findFirst({
        where: { 
          id: Number(id),
          tenantId 
        }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: '指定されたデバイスが見つかりません'
          }
        });
      }

      await prisma.deviceRoom.delete({
        where: { id: Number(id) }
      });

      res.json({
        success: true,
        message: 'デバイスが削除されました'
      });
    } catch (error) {
      console.error('デバイス削除エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'デバイスの削除に失敗しました'
        }
      });
    }
  }
);

export default router;
```

### 3.2 SaaS側デバイス管理プロキシAPI実装

**対象ファイル**: `hotel-saas/server/api/v1/admin/devices/index.get.ts`

```typescript
import { hotelCommonApi } from '~/server/utils/hotelCommonApi';

export default defineEventHandler(async (event) => {
  const authUser = await verifyAuth(event);
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  const query = getQuery(event);

  try {
    const response = await hotelCommonApi.authenticatedRequest(
      '/api/v1/admin/devices',
      authUser.token,
      {
        method: 'GET',
        query: {
          page: query.page,
          limit: query.limit,
          status: query.status,
          deviceType: query.deviceType,
          roomId: query.roomId
        }
      }
    );

    return response;
  } catch (error: any) {
    console.error('デバイス一覧取得エラー:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'デバイス一覧の取得に失敗しました'
    });
  }
});
```

**対象ファイル**: `hotel-saas/server/api/v1/admin/devices/index.post.ts`

```typescript
import { hotelCommonApi } from '~/server/utils/hotelCommonApi';

export default defineEventHandler(async (event) => {
  const authUser = await verifyAuth(event);
  if (!authUser || authUser.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    });
  }

  const body = await readBody(event);

  // バリデーション
  if (!body.roomId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'roomId is required'
    });
  }

  try {
    const response = await hotelCommonApi.authenticatedRequest(
      '/api/v1/admin/devices',
      authUser.token,
      {
        method: 'POST',
        body
      }
    );

    return response;
  } catch (error: any) {
    console.error('デバイス作成エラー:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'デバイスの作成に失敗しました'
    });
  }
});
```

## 【実装チェックリスト】

### Phase 1: 基盤準備
□ DeviceRoomテーブルをhotel-common/prisma/schema.prismaに追加
□ `npx prisma db push`でマイグレーション実行
□ Common側客室管理APIルーター実装
□ SaaS側HotelCommonApiClientクラス実装
□ 認証ミドルウェアの動作確認

### Phase 2: 客室一覧API統合
□ Common側客室一覧API実装（GET /api/v1/admin/front-desk/rooms）
□ Common側客室詳細API実装（GET /api/v1/admin/front-desk/rooms/:id）
□ Common側客室状態更新API実装（PUT /api/v1/admin/front-desk/rooms/:id）
□ SaaS側プロキシAPI実装（3つのエンドポイント）
□ useRooms composable実装
□ フロントエンド画面での動作確認

### Phase 3: デバイス管理API統合
□ Common側デバイス管理API完全実装（CRUD操作）
□ SaaS側デバイス管理プロキシAPI実装
□ WebSocket連携の調整
□ デバイス認証フローの統合

### Phase 4: 統合テスト・最適化
□ エンドツーエンドテスト実行
□ エラーハンドリングの確認
□ パフォーマンステスト
□ ログ出力の確認
□ セキュリティテスト

## 【デプロイメント手順】

### 開発環境
```bash
# 1. hotel-commonでマイグレーション実行
cd hotel-common
npx prisma db push
npx prisma generate

# 2. hotel-commonサーバー再起動
npm run dev

# 3. hotel-saasでAPI実装
cd hotel-saas
# APIファイルを実装

# 4. hotel-saasサーバー再起動
npm run dev

# 5. 動作確認
curl -H "Authorization: Bearer <token>" \
  http://localhost:3100/api/v1/admin/front-desk/rooms
```

### 本番環境
```bash
# 1. hotel-commonデプロイ
cd hotel-common
npm run build
npm run deploy

# 2. hotel-saasデプロイ
cd hotel-saas
npm run build
npm run deploy

# 3. ヘルスチェック
curl https://hotel-saas.example.com/api/health
curl https://hotel-common.example.com/api/health
```

## 【トラブルシューティング】

### よくある問題と解決方法

**1. DeviceRoomテーブルが見つからない**
```bash
# 解決方法
cd hotel-common
npx prisma db push --force-reset
npx prisma generate
```

**2. hotel-common APIに接続できない**
```bash
# 環境変数確認
echo $HOTEL_COMMON_API_URL

# hotel-commonサーバー状態確認
curl http://localhost:3400/api/health
```

**3. 認証エラーが発生する**
```bash
# JWTトークンの確認
# ブラウザ開発者ツールでCookieまたはAuthorizationヘッダーを確認
```

**4. プロキシAPIでタイムアウトが発生する**
```typescript
// hotel-saas/server/utils/hotelCommonApi.ts
// timeoutを調整
this.config = {
  baseUrl: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400',
  timeout: 60000 // 60秒に延長
};
```

## 【注意事項】

1. **データ整合性**: 移行中は必ずバックアップを取得
2. **パフォーマンス**: APIレスポンス時間を監視
3. **エラーハンドリング**: すべてのエラーケースをテスト
4. **セキュリティ**: JWT認証とテナント分離を徹底
5. **ログ**: 詳細なログ出力でデバッグを容易に

---

**作成者**: システム統合チーム  
**レビュー**: 必須（実装前に技術リーダーの承認を得ること）  
**更新履歴**: 2025年10月1日 初版作成

