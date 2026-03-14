# Prismaアダプターパターン実装例

**作成日**: 2025年8月20日  
**最終更新**: 2025年8月20日  
**ステータス**: 参考実装  
**適用範囲**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）  

## 1. 概要

このドキュメントでは、Prismaを使用したアダプターパターンの実装例を提供します。これにより、データベースアクセスの一貫性を確保し、テスト容易性を向上させることができます。

## 2. ディレクトリ構造

```
src/
├── adapters/
│   ├── prisma.adapter.ts      // 基本アダプター（シングルトンPrismaClient）
│   ├── user.adapter.ts        // ユーザーアダプター
│   └── reservation.adapter.ts // 予約アダプター
├── dto/
│   ├── user.dto.ts            // ユーザー関連DTO
│   └── reservation.dto.ts     // 予約関連DTO
└── services/
    ├── user.service.ts        // ユーザーサービス
    └── reservation.service.ts // 予約サービス
```

## 3. 基本アダプター（PrismaClient）

```typescript
// src/adapters/prisma.adapter.ts
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

// シングルトンインスタンス
class PrismaAdapter {
  private static instance: PrismaClient;
  
  static getInstance(): PrismaClient {
    if (!PrismaAdapter.instance) {
      PrismaAdapter.instance = new PrismaClient({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
        ],
      });
      
      // クエリログ設定（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        PrismaAdapter.instance.$on('query', (e) => {
          Logger.debug(`Query: ${e.query}`);
          Logger.debug(`Params: ${e.params}`);
          Logger.debug(`Duration: ${e.duration}ms`);
        });
      }
    }
    return PrismaAdapter.instance;
  }
}

export const prisma = PrismaAdapter.getInstance();
```

## 4. モデル固有のアダプター

### 4.1 ユーザーアダプター

```typescript
// src/adapters/user.adapter.ts
import { prisma } from './prisma.adapter';
import { User, Prisma } from '@prisma/client';

export class UserAdapter {
  /**
   * IDによるユーザー検索
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }
  
  /**
   * メールアドレスによるユーザー検索
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
    });
  }
  
  /**
   * 全ユーザー取得（ページネーション対応）
   */
  async findAll(options?: { 
    skip?: number; 
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ users: User[]; total: number }> {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: options?.skip,
        take: options?.take,
        where: options?.where,
        orderBy: options?.orderBy,
      }),
      prisma.user.count({
        where: options?.where
      })
    ]);
    
    return { users, total };
  }
  
  /**
   * ユーザー作成
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }
  
  /**
   * ユーザー更新
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data
    });
  }
  
  /**
   * ユーザー削除
   */
  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id }
    });
  }
  
  /**
   * ユーザーとプロフィールを同時に作成（トランザクション使用）
   */
  async createWithProfile(
    userData: Prisma.UserCreateInput,
    profileData: Prisma.ProfileCreateInput
  ): Promise<{ user: User; profile: any }> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData });
      
      const profile = await tx.profile.create({
        data: {
          ...profileData,
          userId: user.id
        }
      });
      
      return { user, profile };
    });
  }
}
```

### 4.2 予約アダプター

```typescript
// src/adapters/reservation.adapter.ts
import { prisma } from './prisma.adapter';
import { Reservation, Prisma } from '@prisma/client';

export class ReservationAdapter {
  /**
   * IDによる予約検索
   */
  async findById(id: string): Promise<Reservation | null> {
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        user: true,
        room: true
      }
    });
  }
  
  /**
   * ユーザーIDによる予約検索
   */
  async findByUserId(userId: string): Promise<Reservation[]> {
    return prisma.reservation.findMany({
      where: { userId },
      include: {
        room: true
      },
      orderBy: {
        checkInDate: 'desc'
      }
    });
  }
  
  /**
   * 日付範囲による予約検索
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> {
    return prisma.reservation.findMany({
      where: {
        OR: [
          {
            // チェックイン日が範囲内
            checkInDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            // チェックアウト日が範囲内
            checkOutDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            // 滞在期間が範囲を包含
            AND: [
              {
                checkInDate: {
                  lte: startDate
                }
              },
              {
                checkOutDate: {
                  gte: endDate
                }
              }
            ]
          }
        ]
      },
      include: {
        user: true,
        room: true
      },
      orderBy: {
        checkInDate: 'asc'
      }
    });
  }
  
  /**
   * 予約作成（部屋の空き状況チェック付き）
   */
  async create(data: Prisma.ReservationCreateInput): Promise<Reservation> {
    // トランザクションで予約作成と空き状況チェックを行う
    return prisma.$transaction(async (tx) => {
      // 部屋の空き状況をチェック
      const conflictingReservation = await tx.reservation.findFirst({
        where: {
          roomId: data.room.connect?.id,
          OR: [
            {
              // チェックイン日が既存予約期間と重複
              checkInDate: {
                gte: data.checkInDate as Date,
                lt: data.checkOutDate as Date
              }
            },
            {
              // チェックアウト日が既存予約期間と重複
              checkOutDate: {
                gt: data.checkInDate as Date,
                lte: data.checkOutDate as Date
              }
            },
            {
              // 既存予約期間を包含
              AND: [
                {
                  checkInDate: {
                    lte: data.checkInDate as Date
                  }
                },
                {
                  checkOutDate: {
                    gte: data.checkOutDate as Date
                  }
                }
              ]
            }
          ]
        }
      });
      
      // 重複予約がある場合はエラー
      if (conflictingReservation) {
        throw new Error('Room is not available for the selected dates');
      }
      
      // 予約を作成
      return tx.reservation.create({ data });
    });
  }
  
  /**
   * 予約更新
   */
  async update(
    id: string,
    data: Prisma.ReservationUpdateInput
  ): Promise<Reservation> {
    return prisma.reservation.update({
      where: { id },
      data
    });
  }
  
  /**
   * 予約キャンセル（ソフトデリート）
   */
  async cancel(id: string, reason?: string): Promise<Reservation> {
    return prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason || 'Cancelled by user'
      }
    });
  }
  
  /**
   * チェックイン処理
   */
  async checkIn(id: string): Promise<Reservation> {
    return prisma.reservation.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        actualCheckInDate: new Date()
      }
    });
  }
  
  /**
   * チェックアウト処理
   */
  async checkOut(id: string): Promise<Reservation> {
    return prisma.reservation.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        actualCheckOutDate: new Date()
      }
    });
  }
}
```

## 5. サービスレイヤーでの使用例

### 5.1 ユーザーサービス

```typescript
// src/services/user.service.ts
import { UserAdapter } from '../adapters/user.adapter';
import { User } from '@prisma/client';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { hashPassword } from '../utils/auth';

export class UserService {
  private userAdapter = new UserAdapter();
  
  /**
   * ユーザー登録
   */
  async registerUser(createUserDto: CreateUserDto): Promise<User> {
    // メールアドレスの重複チェック
    const existingUser = await this.userAdapter.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // パスワードハッシュ化
    const hashedPassword = await hashPassword(createUserDto.password);
    
    // ユーザー作成
    return this.userAdapter.create({
      ...createUserDto,
      password: hashedPassword
    });
  }
  
  /**
   * ユーザー情報更新
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // ユーザーの存在確認
    const user = await this.userAdapter.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // パスワードが含まれている場合はハッシュ化
    if (updateUserDto.password) {
      updateUserDto.password = await hashPassword(updateUserDto.password);
    }
    
    // ユーザー更新
    return this.userAdapter.update(id, updateUserDto);
  }
  
  /**
   * ユーザー検索
   */
  async findUserById(id: string): Promise<User> {
    const user = await this.userAdapter.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  /**
   * ユーザー一覧取得（ページネーション）
   */
  async findUsers(page = 1, limit = 10): Promise<{ users: User[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const { users, total } = await this.userAdapter.findAll({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    
    const pages = Math.ceil(total / limit);
    
    return { users, total, pages };
  }
}
```

### 5.2 予約サービス

```typescript
// src/services/reservation.service.ts
import { ReservationAdapter } from '../adapters/reservation.adapter';
import { Reservation } from '@prisma/client';
import { CreateReservationDto } from '../dto/reservation.dto';
import { EventEmitter } from '../utils/event-emitter';

export class ReservationService {
  private reservationAdapter = new ReservationAdapter();
  private eventEmitter = new EventEmitter();
  
  /**
   * 新規予約作成
   */
  async createReservation(createReservationDto: CreateReservationDto): Promise<Reservation> {
    try {
      // 予約データを整形
      const reservationData = {
        checkInDate: new Date(createReservationDto.checkInDate),
        checkOutDate: new Date(createReservationDto.checkOutDate),
        numberOfGuests: createReservationDto.numberOfGuests,
        specialRequests: createReservationDto.specialRequests,
        status: 'CONFIRMED',
        user: {
          connect: { id: createReservationDto.userId }
        },
        room: {
          connect: { id: createReservationDto.roomId }
        }
      };
      
      // 予約作成（アダプター内で部屋の空き状況チェック）
      const reservation = await this.reservationAdapter.create(reservationData);
      
      // 予約作成イベント発行
      this.eventEmitter.emit('reservation.created', reservation);
      
      return reservation;
    } catch (error) {
      // エラーハンドリング
      if (error.message === 'Room is not available for the selected dates') {
        throw new Error('The selected room is not available for the specified dates');
      }
      throw new Error(`Failed to create reservation: ${error.message}`);
    }
  }
  
  /**
   * 予約キャンセル
   */
  async cancelReservation(id: string, reason?: string): Promise<Reservation> {
    // 予約の存在確認
    const reservation = await this.reservationAdapter.findById(id);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    // 既にキャンセル済みの場合はエラー
    if (reservation.status === 'CANCELLED') {
      throw new Error('Reservation is already cancelled');
    }
    
    // 既にチェックイン済みの場合はエラー
    if (reservation.status === 'CHECKED_IN' || reservation.status === 'CHECKED_OUT') {
      throw new Error('Cannot cancel a reservation that has already been checked in or out');
    }
    
    // 予約キャンセル
    const cancelledReservation = await this.reservationAdapter.cancel(id, reason);
    
    // キャンセルイベント発行
    this.eventEmitter.emit('reservation.cancelled', cancelledReservation);
    
    return cancelledReservation;
  }
  
  /**
   * チェックイン処理
   */
  async checkIn(id: string): Promise<Reservation> {
    // 予約の存在確認
    const reservation = await this.reservationAdapter.findById(id);
    if (!reservation) {
      throw new Error('Reservation not found');
    }
    
    // 予約状態チェック
    if (reservation.status !== 'CONFIRMED') {
      throw new Error(`Cannot check in reservation with status: ${reservation.status}`);
    }
    
    // チェックイン処理
    const checkedInReservation = await this.reservationAdapter.checkIn(id);
    
    // チェックインイベント発行
    this.eventEmitter.emit('reservation.checked_in', checkedInReservation);
    
    return checkedInReservation;
  }
}
```

## 6. DTOの例

### 6.1 ユーザーDTO

```typescript
// src/dto/user.dto.ts
export class CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export class UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isActive?: boolean;
}
```

### 6.2 予約DTO

```typescript
// src/dto/reservation.dto.ts
export class CreateReservationDto {
  userId: string;
  roomId: string;
  checkInDate: string; // ISO形式の日付文字列
  checkOutDate: string; // ISO形式の日付文字列
  numberOfGuests: number;
  specialRequests?: string;
}

export class UpdateReservationDto {
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: number;
  specialRequests?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT';
}
```

## 7. テストの例

### 7.1 モック化したアダプターを使用したサービスのテスト

```typescript
// src/services/__tests__/user.service.test.ts
import { UserService } from '../user.service';
import { UserAdapter } from '../../adapters/user.adapter';
import { hashPassword } from '../../utils/auth';

// UserAdapterのモック
jest.mock('../../adapters/user.adapter');
jest.mock('../../utils/auth');

describe('UserService', () => {
  let userService: UserService;
  let mockUserAdapter: jest.Mocked<UserAdapter>;
  
  beforeEach(() => {
    // テスト前にモックをリセット
    jest.clearAllMocks();
    
    // モックアダプターの設定
    mockUserAdapter = new UserAdapter() as jest.Mocked<UserAdapter>;
    UserAdapter.prototype.findByEmail = mockUserAdapter.findByEmail;
    UserAdapter.prototype.create = mockUserAdapter.create;
    
    // テスト対象のサービスを作成
    userService = new UserService();
  });
  
  describe('registerUser', () => {
    it('should create a new user with hashed password', async () => {
      // モックの戻り値を設定
      mockUserAdapter.findByEmail.mockResolvedValue(null);
      mockUserAdapter.create.mockResolvedValue({
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashed_password',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);
      
      (hashPassword as jest.Mock).mockResolvedValue('hashed_password');
      
      // テスト実行
      const result = await userService.registerUser({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });
      
      // 検証
      expect(mockUserAdapter.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserAdapter.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User'
      });
      expect(result.id).toBe('123');
    });
    
    it('should throw an error if user with email already exists', async () => {
      // モックの戻り値を設定
      mockUserAdapter.findByEmail.mockResolvedValue({
        id: '123',
        email: 'test@example.com'
      } as any);
      
      // テスト実行と検証
      await expect(userService.registerUser({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      })).rejects.toThrow('User with this email already exists');
      
      // ユーザー作成が呼ばれていないことを確認
      expect(mockUserAdapter.create).not.toHaveBeenCalled();
    });
  });
});
```

## 8. まとめ

このアダプターパターンの実装により、以下のメリットが得られます：

1. **関心の分離**: データアクセスロジックをビジネスロジックから分離
2. **テスト容易性**: アダプターをモック化することで単体テストが容易
3. **一貫性**: データベースアクセスの方法が統一される
4. **再利用性**: 共通のデータアクセスパターンを再利用可能
5. **型安全性**: Prismaの型定義を活用した型安全なデータアクセス

アダプターパターンは、特に複雑なデータアクセスロジックや、複数のマイクロサービスにまたがるシステムで効果を発揮します。各システムでこのパターンを採用することで、コードの品質と保守性を向上させることができます。



