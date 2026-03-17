/**
 * F-020: ハンドオフ（スタッフ引継）型定義
 */

export enum HandoffType {
  SHIFT_CHANGE = 'SHIFT_CHANGE',           // シフト交代
  GUEST_TRANSFER = 'GUEST_TRANSFER',       // 客室管理の引継
  TASK_DELEGATION = 'TASK_DELEGATION',     // タスク委譲
  EMERGENCY_TAKEOVER = 'EMERGENCY_TAKEOVER', // 緊急引継
  END_OF_SHIFT = 'END_OF_SHIFT',           // シフト終了時の全体引継
}

export enum HandoffStatus {
  PENDING = 'PENDING',                     // 未開始
  IN_PROGRESS = 'IN_PROGRESS',             // 進行中
  COMPLETED = 'COMPLETED',                 // 完了
  ACKNOWLEDGED = 'ACKNOWLEDGED',           // 確認完了
  CANCELED = 'CANCELED',                   // キャンセル
}

export enum TaskCategory {
  GUEST_INFO = 'GUEST_INFO',               // ゲスト情報・対応
  ROOM_STATUS = 'ROOM_STATUS',             // 客室状況
  MAINTENANCE = 'MAINTENANCE',             // メンテナンス・修繕
  CLEANING = 'CLEANING',                   // 清掃状況
  BILLING = 'BILLING',                     // 請求・決済
  EMERGENCY = 'EMERGENCY',                 // 緊急対応
  DOCUMENTATION = 'DOCUMENTATION',         // 書類・記録
  OTHER = 'OTHER',                         // その他
}

export enum TaskStatus {
  PENDING = 'PENDING',                     // 未着手
  IN_PROGRESS = 'IN_PROGRESS',             // 進行中
  PAUSED = 'PAUSED',                       // 一時中断
  COMPLETED = 'COMPLETED',                 // 完了
  DELEGATED = 'DELEGATED',                 // 他者に委譲
  CANCELED = 'CANCELED',                   // キャンセル
}

export enum AcknowledgeType {
  CHECK_IN = 'CHECK_IN',                   // チェックイン時の確認
  CHECK_OUT = 'CHECK_OUT',                 // チェックアウト時の確認
  PARTIAL_CONFIRM = 'PARTIAL_CONFIRM',     // 部分確認
}

export enum AcknowledgeStatus {
  PENDING = 'PENDING',                     // 未確認
  CONFIRMED = 'CONFIRMED',                 // 確認済み
  NEEDS_REVISION = 'NEEDS_REVISION',       // 修正必要
  DISPUTED = 'DISPUTED',                   // 異議あり
}

// ===== ハンドオフ情報 =====

export interface StaffHandoff {
  id: string
  tenantId: string
  handoffNumber: string
  fromUserId: string
  toUserId: string
  roomId?: string
  handoffType: HandoffType | string
  status: HandoffStatus | string
  priority: number
  description?: string
  estimatedDuration?: number
  actualDuration?: number
  startedAt?: Date | string
  completedAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string

  // Relations
  tasks?: HandoffTask[]
  acknowledgments?: HandoffAcknowledgment[]
}

export interface CreateHandoffRequest {
  tenantId: string
  fromUserId: string
  toUserId: string
  roomId?: string
  handoffType: HandoffType | string
  priority?: number
  description?: string
  estimatedDuration?: number
}

export interface UpdateHandoffRequest {
  status?: HandoffStatus | string
  priority?: number
  description?: string
  estimatedDuration?: number
  actualDuration?: number
  completedAt?: Date | string
}

// ===== ハンドオフタスク =====

export interface HandoffTask {
  id: string
  handoffId: string
  taskNumber: string
  title: string
  description?: string
  category: TaskCategory | string
  priority: number
  status: TaskStatus | string
  dueDate?: Date | string
  completedAt?: Date | string
  notes?: string
  attachmentUrls?: string[]
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  category: TaskCategory | string
  priority?: number
  dueDate?: Date | string
  notes?: string
  attachmentUrls?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: TaskStatus | string
  priority?: number
  dueDate?: Date | string
  completedAt?: Date | string
  notes?: string
  attachmentUrls?: string[]
}

// ===== ハンドオフ確認 =====

export interface HandoffAcknowledgment {
  id: string
  handoffId: string
  acknowledgedById: string
  acknowledgeType: AcknowledgeType | string
  status: AcknowledgeStatus | string
  checkedItems: number
  totalItems: number
  comments?: string
  signatureUrl?: string
  acknowledgedAt: Date | string
  createdAt: Date | string
}

export interface CreateAcknowledgmentRequest {
  acknowledgedById: string
  acknowledgeType: AcknowledgeType | string
  checkedItems?: number
  totalItems?: number
  comments?: string
  signatureUrl?: string
}

// ===== ハンドオフチェックリスト =====

export interface ChecklistItem {
  id?: string
  title: string
  description?: string
  isRequired: boolean
  displayOrder: number
}

export interface HandoffChecklist {
  id: string
  tenantId: string
  name: string
  category: TaskCategory | string
  description?: string
  items: ChecklistItem[]
  isDefault: boolean
  status: 'ACTIVE' | 'ARCHIVED' | 'DEPRECATED'
  usageCount: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateChecklistRequest {
  name: string
  category: TaskCategory | string
  description?: string
  items: ChecklistItem[]
  isDefault?: boolean
}

// ===== API Response Types =====

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

export interface HandoffListResponse extends ApiResponse<StaffHandoff[]> {}
export interface HandoffDetailResponse extends ApiResponse<StaffHandoff> {}
export interface TaskListResponse extends ApiResponse<HandoffTask[]> {}
export interface ChecklistListResponse extends ApiResponse<HandoffChecklist[]> {}
