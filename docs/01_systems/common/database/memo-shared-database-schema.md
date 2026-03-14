# メモ機能共有システム データベース詳細設計書

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-common  
**機能**: メモ機能共有システム データベース詳細設計

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

## 🗄️ 完全データベーススキーマ

### 1. memos テーブル

```sql
CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 200),
    content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 10000),
    author_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    
    -- 分類・優先度
    tags JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category VARCHAR(50),
    
    -- ステータス管理
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    -- メタデータ
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    attachment_count INTEGER DEFAULT 0,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 作成者・更新者
    created_by UUID NOT NULL,
    updated_by UUID,
    archived_by UUID,
    deleted_by UUID,
    
    -- 制約
    CONSTRAINT fk_memos_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_memos_author_id FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memos_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memos_updated_by FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_memos_archived_by FOREIGN KEY (archived_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_memos_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id) ON DELETE SET NULL,
    
    -- チェック制約
    CONSTRAINT chk_memos_archived_at CHECK ((is_archived = true AND archived_at IS NOT NULL AND archived_by IS NOT NULL) OR (is_archived = false)),
    CONSTRAINT chk_memos_deleted_at CHECK ((is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted = false)),
    CONSTRAINT chk_memos_counts CHECK (view_count >= 0 AND comment_count >= 0 AND attachment_count >= 0)
);
```

### 2. memo_comments テーブル

```sql
CREATE TABLE memo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    parent_comment_id UUID, -- NULL for top-level comments
    author_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    
    -- コンテンツ
    content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
    
    -- ステータス
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    -- メタデータ
    reply_count INTEGER DEFAULT 0,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 作成者・更新者
    created_by UUID NOT NULL,
    updated_by UUID,
    deleted_by UUID,
    
    -- 制約
    CONSTRAINT fk_memo_comments_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_comments_parent_comment_id FOREIGN KEY (parent_comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_comments_author_id FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memo_comments_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memo_comments_updated_by FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_memo_comments_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id) ON DELETE SET NULL,
    
    -- チェック制約
    CONSTRAINT chk_memo_comments_deleted_at CHECK ((is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted = false)),
    CONSTRAINT chk_memo_comments_reply_count CHECK (reply_count >= 0),
    CONSTRAINT chk_memo_comments_no_self_parent CHECK (id != parent_comment_id)
);
```

### 3. memo_read_statuses テーブル

```sql
CREATE TABLE memo_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    
    -- 既読ステータス
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- 内容変更検知
    last_content_hash VARCHAR(64),
    last_read_version INTEGER DEFAULT 1,
    
    -- 読み込み統計
    read_count INTEGER DEFAULT 0,
    total_read_time_seconds INTEGER DEFAULT 0,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_memo_read_statuses_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_read_statuses_staff_id FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_memo_read_statuses_memo_staff_system UNIQUE(memo_id, staff_id, source_system),
    
    -- チェック制約
    CONSTRAINT chk_memo_read_statuses_read_at CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false)),
    CONSTRAINT chk_memo_read_statuses_counts CHECK (read_count >= 0 AND total_read_time_seconds >= 0),
    CONSTRAINT chk_memo_read_statuses_version CHECK (last_read_version >= 1)
);
```

### 4. comment_read_statuses テーブル

```sql
CREATE TABLE comment_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    
    -- 既読ステータス
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- 読み込み統計
    read_count INTEGER DEFAULT 0,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_comment_read_statuses_comment_id FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_read_statuses_staff_id FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_comment_read_statuses_comment_staff_system UNIQUE(comment_id, staff_id, source_system),
    
    -- チェック制約
    CONSTRAINT chk_comment_read_statuses_read_at CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false)),
    CONSTRAINT chk_comment_read_statuses_read_count CHECK (read_count >= 0)
);
```

### 5. memo_attachments テーブル

```sql
CREATE TABLE memo_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    comment_id UUID, -- NULL if attached to memo, not comment
    
    -- ファイル情報
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    
    -- メタデータ
    is_image BOOLEAN DEFAULT false,
    image_width INTEGER,
    image_height INTEGER,
    
    -- ステータス
    is_deleted BOOLEAN DEFAULT false,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 作成者
    created_by UUID NOT NULL,
    deleted_by UUID,
    
    -- 制約
    CONSTRAINT fk_memo_attachments_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_attachments_comment_id FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_attachments_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memo_attachments_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id) ON DELETE SET NULL,
    
    -- チェック制約
    CONSTRAINT chk_memo_attachments_file_size CHECK (file_size > 0 AND file_size <= 52428800), -- 50MB max
    CONSTRAINT chk_memo_attachments_deleted_at CHECK ((is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted = false)),
    CONSTRAINT chk_memo_attachments_image_dimensions CHECK ((is_image = true AND image_width > 0 AND image_height > 0) OR (is_image = false))
);
```

### 6. memo_access_logs テーブル

```sql
CREATE TABLE memo_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    
    -- アクセス情報
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'comment', 'attach')),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- 詳細情報
    details JSONB DEFAULT '{}'::jsonb,
    
    -- 日時
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_memo_access_logs_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_access_logs_staff_id FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
```

### 7. memo_notifications テーブル

```sql
CREATE TABLE memo_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_staff_id UUID NOT NULL,
    memo_id UUID NOT NULL,
    comment_id UUID, -- NULL for memo-level notifications
    
    -- 通知情報
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('memo_created', 'memo_updated', 'comment_added', 'reply_added', 'mention')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- ステータス
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    
    -- 送信方法
    send_email BOOLEAN DEFAULT false,
    send_push BOOLEAN DEFAULT false,
    send_websocket BOOLEAN DEFAULT true,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- 作成者
    created_by UUID NOT NULL,
    
    -- 制約
    CONSTRAINT fk_memo_notifications_recipient_staff_id FOREIGN KEY (recipient_staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_notifications_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_notifications_comment_id FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_notifications_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    
    -- チェック制約
    CONSTRAINT chk_memo_notifications_read_at CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false)),
    CONSTRAINT chk_memo_notifications_sent_at CHECK ((is_sent = true AND sent_at IS NOT NULL) OR (is_sent = false))
);
```

## 📊 インデックス設計

### パフォーマンス最適化インデックス

```sql
-- memos テーブル
CREATE INDEX idx_memos_tenant_id ON memos(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_memos_author_id ON memos(author_id) WHERE is_deleted = false;
CREATE INDEX idx_memos_source_system ON memos(source_system) WHERE is_deleted = false;
CREATE INDEX idx_memos_created_at ON memos(created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memos_updated_at ON memos(updated_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memos_priority ON memos(priority) WHERE is_deleted = false;
CREATE INDEX idx_memos_is_pinned ON memos(is_pinned) WHERE is_deleted = false AND is_pinned = true;
CREATE INDEX idx_memos_tags ON memos USING GIN(tags) WHERE is_deleted = false;
CREATE INDEX idx_memos_category ON memos(category) WHERE is_deleted = false AND category IS NOT NULL;

-- 複合インデックス
CREATE INDEX idx_memos_tenant_system_created ON memos(tenant_id, source_system, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memos_tenant_priority_created ON memos(tenant_id, priority, created_at DESC) WHERE is_deleted = false;

-- memo_comments テーブル
CREATE INDEX idx_memo_comments_memo_id ON memo_comments(memo_id) WHERE is_deleted = false;
CREATE INDEX idx_memo_comments_parent_comment_id ON memo_comments(parent_comment_id) WHERE is_deleted = false AND parent_comment_id IS NOT NULL;
CREATE INDEX idx_memo_comments_author_id ON memo_comments(author_id) WHERE is_deleted = false;
CREATE INDEX idx_memo_comments_created_at ON memo_comments(created_at DESC) WHERE is_deleted = false;

-- 複合インデックス
CREATE INDEX idx_memo_comments_memo_created ON memo_comments(memo_id, created_at DESC) WHERE is_deleted = false;

-- memo_read_statuses テーブル
CREATE INDEX idx_memo_read_statuses_staff_unread ON memo_read_statuses(staff_id, memo_id) WHERE is_read = false;
CREATE INDEX idx_memo_read_statuses_memo_staff ON memo_read_statuses(memo_id, staff_id);
CREATE INDEX idx_memo_read_statuses_staff_system ON memo_read_statuses(staff_id, source_system);
CREATE INDEX idx_memo_read_statuses_read_at ON memo_read_statuses(read_at DESC) WHERE read_at IS NOT NULL;

-- comment_read_statuses テーブル
CREATE INDEX idx_comment_read_statuses_staff_unread ON comment_read_statuses(staff_id, comment_id) WHERE is_read = false;
CREATE INDEX idx_comment_read_statuses_comment_staff ON comment_read_statuses(comment_id, staff_id);

-- memo_access_logs テーブル
CREATE INDEX idx_memo_access_logs_memo_id ON memo_access_logs(memo_id);
CREATE INDEX idx_memo_access_logs_staff_id ON memo_access_logs(staff_id);
CREATE INDEX idx_memo_access_logs_created_at ON memo_access_logs(created_at DESC);
CREATE INDEX idx_memo_access_logs_action ON memo_access_logs(action);

-- 複合インデックス
CREATE INDEX idx_memo_access_logs_memo_staff_created ON memo_access_logs(memo_id, staff_id, created_at DESC);
CREATE INDEX idx_memo_access_logs_staff_action_created ON memo_access_logs(staff_id, action, created_at DESC);

-- memo_notifications テーブル
CREATE INDEX idx_memo_notifications_recipient_unread ON memo_notifications(recipient_staff_id) WHERE is_read = false;
CREATE INDEX idx_memo_notifications_memo_id ON memo_notifications(memo_id);
CREATE INDEX idx_memo_notifications_created_at ON memo_notifications(created_at DESC);
CREATE INDEX idx_memo_notifications_unsent ON memo_notifications(id) WHERE is_sent = false;

-- memo_attachments テーブル
CREATE INDEX idx_memo_attachments_memo_id ON memo_attachments(memo_id) WHERE is_deleted = false;
CREATE INDEX idx_memo_attachments_comment_id ON memo_attachments(comment_id) WHERE is_deleted = false AND comment_id IS NOT NULL;
CREATE INDEX idx_memo_attachments_created_at ON memo_attachments(created_at DESC) WHERE is_deleted = false;
```

## 🔄 マイグレーションスクリプト

### Migration: 20250916_001_create_memo_shared_tables.sql

```sql
-- メモ共有システム テーブル作成
-- 作成者: kaneko (hotel-kanri)
-- 作成日: 2025年9月16日

BEGIN;

-- 1. memos テーブル作成
CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 200),
    content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 10000),
    author_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    tags JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category VARCHAR(50),
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    attachment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    updated_by UUID,
    archived_by UUID,
    deleted_by UUID,
    
    CONSTRAINT fk_memos_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_memos_author_id FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memos_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memos_updated_by FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_memos_archived_by FOREIGN KEY (archived_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_memos_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT chk_memos_archived_at CHECK ((is_archived = true AND archived_at IS NOT NULL AND archived_by IS NOT NULL) OR (is_archived = false)),
    CONSTRAINT chk_memos_deleted_at CHECK ((is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted = false)),
    CONSTRAINT chk_memos_counts CHECK (view_count >= 0 AND comment_count >= 0 AND attachment_count >= 0)
);

-- 2. memo_comments テーブル作成
CREATE TABLE memo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    parent_comment_id UUID,
    author_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    content TEXT NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    updated_by UUID,
    deleted_by UUID,
    
    CONSTRAINT fk_memo_comments_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_comments_parent_comment_id FOREIGN KEY (parent_comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_comments_author_id FOREIGN KEY (author_id) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memo_comments_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memo_comments_updated_by FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT fk_memo_comments_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT chk_memo_comments_deleted_at CHECK ((is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted = false)),
    CONSTRAINT chk_memo_comments_reply_count CHECK (reply_count >= 0),
    CONSTRAINT chk_memo_comments_no_self_parent CHECK (id != parent_comment_id)
);

-- 3. memo_read_statuses テーブル作成
CREATE TABLE memo_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    last_content_hash VARCHAR(64),
    last_read_version INTEGER DEFAULT 1,
    read_count INTEGER DEFAULT 0,
    total_read_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_memo_read_statuses_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_read_statuses_staff_id FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_memo_read_statuses_memo_staff_system UNIQUE(memo_id, staff_id, source_system),
    CONSTRAINT chk_memo_read_statuses_read_at CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false)),
    CONSTRAINT chk_memo_read_statuses_counts CHECK (read_count >= 0 AND total_read_time_seconds >= 0),
    CONSTRAINT chk_memo_read_statuses_version CHECK (last_read_version >= 1)
);

-- 4. comment_read_statuses テーブル作成
CREATE TABLE comment_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    read_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_comment_read_statuses_comment_id FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_read_statuses_staff_id FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_comment_read_statuses_comment_staff_system UNIQUE(comment_id, staff_id, source_system),
    CONSTRAINT chk_comment_read_statuses_read_at CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false)),
    CONSTRAINT chk_comment_read_statuses_read_count CHECK (read_count >= 0)
);

-- 5. memo_attachments テーブル作成
CREATE TABLE memo_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    comment_id UUID,
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    is_image BOOLEAN DEFAULT false,
    image_width INTEGER,
    image_height INTEGER,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    deleted_by UUID,
    
    CONSTRAINT fk_memo_attachments_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_attachments_comment_id FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_attachments_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT fk_memo_attachments_deleted_by FOREIGN KEY (deleted_by) REFERENCES staff(id) ON DELETE SET NULL,
    CONSTRAINT chk_memo_attachments_file_size CHECK (file_size > 0 AND file_size <= 52428800),
    CONSTRAINT chk_memo_attachments_deleted_at CHECK ((is_deleted = true AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted = false)),
    CONSTRAINT chk_memo_attachments_image_dimensions CHECK ((is_image = true AND image_width > 0 AND image_height > 0) OR (is_image = false))
);

-- 6. memo_access_logs テーブル作成
CREATE TABLE memo_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'comment', 'attach')),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_memo_access_logs_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_access_logs_staff_id FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- 7. memo_notifications テーブル作成
CREATE TABLE memo_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_staff_id UUID NOT NULL,
    memo_id UUID NOT NULL,
    comment_id UUID,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('memo_created', 'memo_updated', 'comment_added', 'reply_added', 'mention')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    send_email BOOLEAN DEFAULT false,
    send_push BOOLEAN DEFAULT false,
    send_websocket BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    
    CONSTRAINT fk_memo_notifications_recipient_staff_id FOREIGN KEY (recipient_staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_notifications_memo_id FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_notifications_comment_id FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_notifications_created_by FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE RESTRICT,
    CONSTRAINT chk_memo_notifications_read_at CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false)),
    CONSTRAINT chk_memo_notifications_sent_at CHECK ((is_sent = true AND sent_at IS NOT NULL) OR (is_sent = false))
);

COMMIT;
```

### Migration: 20250916_002_create_memo_indexes.sql

```sql
-- メモ共有システム インデックス作成
-- 作成者: kaneko (hotel-kanri)
-- 作成日: 2025年9月16日

BEGIN;

-- memos テーブルのインデックス
CREATE INDEX idx_memos_tenant_id ON memos(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_memos_author_id ON memos(author_id) WHERE is_deleted = false;
CREATE INDEX idx_memos_source_system ON memos(source_system) WHERE is_deleted = false;
CREATE INDEX idx_memos_created_at ON memos(created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memos_updated_at ON memos(updated_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memos_priority ON memos(priority) WHERE is_deleted = false;
CREATE INDEX idx_memos_is_pinned ON memos(is_pinned) WHERE is_deleted = false AND is_pinned = true;
CREATE INDEX idx_memos_tags ON memos USING GIN(tags) WHERE is_deleted = false;
CREATE INDEX idx_memos_category ON memos(category) WHERE is_deleted = false AND category IS NOT NULL;
CREATE INDEX idx_memos_tenant_system_created ON memos(tenant_id, source_system, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memos_tenant_priority_created ON memos(tenant_id, priority, created_at DESC) WHERE is_deleted = false;

-- memo_comments テーブルのインデックス
CREATE INDEX idx_memo_comments_memo_id ON memo_comments(memo_id) WHERE is_deleted = false;
CREATE INDEX idx_memo_comments_parent_comment_id ON memo_comments(parent_comment_id) WHERE is_deleted = false AND parent_comment_id IS NOT NULL;
CREATE INDEX idx_memo_comments_author_id ON memo_comments(author_id) WHERE is_deleted = false;
CREATE INDEX idx_memo_comments_created_at ON memo_comments(created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_memo_comments_memo_created ON memo_comments(memo_id, created_at DESC) WHERE is_deleted = false;

-- memo_read_statuses テーブルのインデックス
CREATE INDEX idx_memo_read_statuses_staff_unread ON memo_read_statuses(staff_id, memo_id) WHERE is_read = false;
CREATE INDEX idx_memo_read_statuses_memo_staff ON memo_read_statuses(memo_id, staff_id);
CREATE INDEX idx_memo_read_statuses_staff_system ON memo_read_statuses(staff_id, source_system);
CREATE INDEX idx_memo_read_statuses_read_at ON memo_read_statuses(read_at DESC) WHERE read_at IS NOT NULL;

-- comment_read_statuses テーブルのインデックス
CREATE INDEX idx_comment_read_statuses_staff_unread ON comment_read_statuses(staff_id, comment_id) WHERE is_read = false;
CREATE INDEX idx_comment_read_statuses_comment_staff ON comment_read_statuses(comment_id, staff_id);

-- memo_access_logs テーブルのインデックス
CREATE INDEX idx_memo_access_logs_memo_id ON memo_access_logs(memo_id);
CREATE INDEX idx_memo_access_logs_staff_id ON memo_access_logs(staff_id);
CREATE INDEX idx_memo_access_logs_created_at ON memo_access_logs(created_at DESC);
CREATE INDEX idx_memo_access_logs_action ON memo_access_logs(action);
CREATE INDEX idx_memo_access_logs_memo_staff_created ON memo_access_logs(memo_id, staff_id, created_at DESC);
CREATE INDEX idx_memo_access_logs_staff_action_created ON memo_access_logs(staff_id, action, created_at DESC);

-- memo_notifications テーブルのインデックス
CREATE INDEX idx_memo_notifications_recipient_unread ON memo_notifications(recipient_staff_id) WHERE is_read = false;
CREATE INDEX idx_memo_notifications_memo_id ON memo_notifications(memo_id);
CREATE INDEX idx_memo_notifications_created_at ON memo_notifications(created_at DESC);
CREATE INDEX idx_memo_notifications_unsent ON memo_notifications(id) WHERE is_sent = false;

-- memo_attachments テーブルのインデックス
CREATE INDEX idx_memo_attachments_memo_id ON memo_attachments(memo_id) WHERE is_deleted = false;
CREATE INDEX idx_memo_attachments_comment_id ON memo_attachments(comment_id) WHERE is_deleted = false AND comment_id IS NOT NULL;
CREATE INDEX idx_memo_attachments_created_at ON memo_attachments(created_at DESC) WHERE is_deleted = false;

COMMIT;
```

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 - hotel-common詳細データベース設計 (kaneko)
