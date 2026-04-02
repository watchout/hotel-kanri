/**
 * チェックインセッション - 共通型定義
 * 
 * この型定義は hotel-saas, hotel-pms, hotel-common で共有される
 * SSOT: docs/SSOT_CHECKIN_SESSIONS.md
 * Version: 1.0.0
 * Last Updated: 2025-10-01
 */

/** セッションステータス */
export type SessionStatus = 'active' | 'expired' | 'terminated';

/** セッションエンティティ */
export interface CheckinSession {
  /** セッションID (ULID) */
  sessionId: string;
  
  /** テナントID (ULID) */
  tenantId: string;
  
  /** 客室ID */
  roomId: number;
  
  /** デバイス識別子 */
  deviceId: string;
  
  /** セッション状態 */
  status: SessionStatus;
  
  /** 有効期限 (ISO 8601) */
  expiresAt: string;
  
  /** メタデータ */
  metadata?: Record<string, any>;
  
  /** 作成日時 (ISO 8601) */
  createdAt: string;
  
  /** 更新日時 (ISO 8601) */
  updatedAt: string;
}

/** セッション作成リクエスト */
export interface CreateSessionRequest {
  /** 客室ID */
  roomId: number;
  
  /** デバイス識別子 (1-255文字) */
  deviceId: string;
  
  /** 有効期限（秒） 60-86400 */
  expiresIn?: number;
}

/** セッション作成レスポンス */
export interface CreateSessionResponse {
  success: true;
  data: CheckinSession;
  traceId: string;
}

/** セッション検証レスポンス */
export interface ValidateSessionResponse {
  success: true;
  data: {
    valid: boolean;
    sessionId: string;
    status: SessionStatus;
    expiresAt: string;
    remainingSeconds: number;
  };
  traceId: string;
}

/** セッション更新リクエスト */
export interface ExtendSessionRequest {
  /** 有効期限（秒） 60-86400 */
  expiresIn: number;
}

/** セッション更新レスポンス */
export interface ExtendSessionResponse {
  success: true;
  data: {
    sessionId: string;
    expiresAt: string;
    updatedAt: string;
  };
  traceId: string;
}

/** セッション終了レスポンス */
export interface TerminateSessionResponse {
  success: true;
  data: {
    sessionId: string;
    status: 'terminated';
    terminatedAt: string;
  };
  traceId: string;
}

/** セッション一覧取得クエリパラメータ */
export interface ListSessionsQuery {
  /** セッション状態フィルタ */
  status?: SessionStatus | 'all';
  
  /** 客室IDフィルタ */
  roomId?: number;
  
  /** ページ番号 */
  page?: number;
  
  /** 1ページあたりの件数 */
  limit?: number;
}

/** セッション一覧レスポンス */
export interface ListSessionsResponse {
  success: true;
  data: {
    items: CheckinSession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  traceId: string;
}

/** セッション引き渡しリクエスト */
export interface SessionHandoffRequest {
  /** 引き渡し先システム */
  targetSystem: 'hotel-pms' | 'hotel-saas';
  
  /** メタデータ */
  metadata?: Record<string, any>;
}

/** セッション引き渡しレスポンス */
export interface SessionHandoffResponse {
  success: true;
  data: {
    sessionId: string;
    tenantId: string;
    roomId: number;
    expiresAt: string;
    /** 引き渡し専用短命トークン（5分有効） */
    handoffToken: string;
    /** 引き渡し先URL */
    targetUrl: string;
  };
  traceId: string;
}

/** セッション受け取りリクエスト */
export interface SessionReceiveRequest {
  /** 引き渡しトークン */
  handoffToken: string;
}

/** セッション受け取りレスポンス */
export interface SessionReceiveResponse {
  success: true;
  data: CheckinSession;
  traceId: string;
}

/** エラー詳細 */
export interface ErrorDetails {
  [key: string]: any;
}

/** エラーレスポンス */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
  traceId: string;
}

/** APIレスポンス共通型 */
export type ApiResponse<T> = 
  | (T & { success: true; traceId: string })
  | ErrorResponse;

/** エラーコード型定義 */
export type SessionErrorCode =
  | 'INVALID_SESSION_ID'
  | 'INVALID_ROOM_ID'
  | 'INVALID_DEVICE_ID'
  | 'INVALID_EXPIRES_IN'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_CONFLICT'
  | 'SESSION_EXPIRED'
  | 'SESSION_TERMINATED'
  | 'INTERNAL_SERVER_ERROR';

/** 
 * セッションバリデーション関数の型
 */
export interface SessionValidator {
  /** セッションIDの形式を検証 */
  validateSessionId(sessionId: string): boolean;
  
  /** 客室IDの妥当性を検証 */
  validateRoomId(roomId: number): boolean;
  
  /** デバイスIDの形式を検証 */
  validateDeviceId(deviceId: string): boolean;
  
  /** 有効期限の範囲を検証 */
  validateExpiresIn(expiresIn: number): boolean;
  
  /** セッションが有効期限内かを判定 */
  isSessionExpired(expiresAt: string): boolean;
}

/**
 * セッションサービスインターフェース
 * 各システム（hotel-saas, hotel-pms）での実装時に使用
 */
export interface CheckinSessionService {
  /** セッション作成 */
  createSession(
    tenantId: string,
    request: CreateSessionRequest
  ): Promise<CreateSessionResponse>;
  
  /** セッション検証 */
  validateSession(
    tenantId: string,
    sessionId: string
  ): Promise<ValidateSessionResponse>;
  
  /** セッション更新（有効期限延長） */
  extendSession(
    tenantId: string,
    sessionId: string,
    request: ExtendSessionRequest
  ): Promise<ExtendSessionResponse>;
  
  /** セッション終了 */
  terminateSession(
    tenantId: string,
    sessionId: string
  ): Promise<TerminateSessionResponse>;
  
  /** セッション一覧取得 */
  listSessions(
    tenantId: string,
    query: ListSessionsQuery
  ): Promise<ListSessionsResponse>;
  
  /** セッション引き渡し */
  handoffSession(
    tenantId: string,
    sessionId: string,
    request: SessionHandoffRequest
  ): Promise<SessionHandoffResponse>;
  
  /** セッション受け取り */
  receiveSession(
    tenantId: string,
    request: SessionReceiveRequest
  ): Promise<SessionReceiveResponse>;
}

/**
 * データベースエンティティ型（内部使用）
 * Prisma等のORMで使用する型
 */
export interface CheckinSessionEntity {
  id: string;
  tenant_id: string;
  room_id: number;
  device_id: string;
  status: SessionStatus;
  expires_at: Date;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * エンティティからAPIレスポンス型への変換関数型
 */
export type EntityToResponse = (entity: CheckinSessionEntity) => CheckinSession;

/**
 * APIリクエストからエンティティへの変換関数型
 */
export type RequestToEntity = (
  tenantId: string,
  request: CreateSessionRequest
) => Omit<CheckinSessionEntity, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
