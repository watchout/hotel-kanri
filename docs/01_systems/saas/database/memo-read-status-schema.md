# メモ機能既読未読 データベーススキーマ設計書

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-saas  
**機能**: メモ機能既読未読ステータス データベース設計

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

**理由**:
- エラーの隠蔽により問題発見が困難
- 一時対応の恒久化による技術的負債
- システム整合性の破綻
- デバッグ困難化

### **✅ 必須事項**

**正面からの問題解決**
- ✅ エラーは必ず表面化させる
- ✅ 問題の根本原因を特定・解決
- ✅ 適切なエラーハンドリング（隠蔽ではない）
- ✅ 実装前の依存関係確認
- ✅ 段階的だが確実な実装

## 📋 概要

メモ機能の既読未読ステータス管理のためのデータベーススキーマ設計とマイグレーション計画です。

## 🗄️ テーブル設計

### 1. memo_read_statuses テーブル

メモ本体の既読未読ステータスを管理します。

```sql
CREATE TABLE memo_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    last_content_hash VARCHAR(64), -- メモ内容変更検知用
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_memo_read_statuses_memo_id 
        FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_memo_read_statuses_memo_staff 
        UNIQUE(memo_id, staff_id),
    
    -- チェック制約
    CONSTRAINT chk_memo_read_statuses_read_at 
        CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false))
);
```

### 2. comment_read_statuses テーブル

メモコメントの既読未読ステータスを管理します。

```sql
CREATE TABLE comment_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_comment_read_statuses_comment_id 
        FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_comment_read_statuses_comment_staff 
        UNIQUE(comment_id, staff_id),
    
    -- チェック制約
    CONSTRAINT chk_comment_read_statuses_read_at 
        CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false))
);
```

### 3. reply_read_statuses テーブル

コメントへのレス（返信）の既読未読ステータスを管理します。

```sql
CREATE TABLE reply_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_reply_read_statuses_reply_id 
        FOREIGN KEY (reply_id) REFERENCES memo_replies(id) ON DELETE CASCADE,
    CONSTRAINT fk_reply_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_reply_read_statuses_reply_staff 
        UNIQUE(reply_id, staff_id),
    
    -- チェック制約
    CONSTRAINT chk_reply_read_statuses_read_at 
        CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false))
);
```

## 📊 インデックス設計

### 1. パフォーマンス最適化インデックス

```sql
-- 未読検索用の部分インデックス（最も重要）
CREATE INDEX idx_memo_read_statuses_staff_unread 
    ON memo_read_statuses(staff_id, memo_id) 
    WHERE is_read = false;

CREATE INDEX idx_comment_read_statuses_staff_unread 
    ON comment_read_statuses(staff_id, comment_id) 
    WHERE is_read = false;

CREATE INDEX idx_reply_read_statuses_staff_unread 
    ON reply_read_statuses(staff_id, reply_id) 
    WHERE is_read = false;

-- 複合インデックス（検索・更新用）
CREATE INDEX idx_memo_read_statuses_memo_staff 
    ON memo_read_statuses(memo_id, staff_id);

CREATE INDEX idx_comment_read_statuses_comment_staff 
    ON comment_read_statuses(comment_id, staff_id);

CREATE INDEX idx_reply_read_statuses_reply_staff 
    ON reply_read_statuses(reply_id, staff_id);

-- 時系列検索用
CREATE INDEX idx_memo_read_statuses_read_at 
    ON memo_read_statuses(read_at DESC) 
    WHERE read_at IS NOT NULL;

CREATE INDEX idx_comment_read_statuses_read_at 
    ON comment_read_statuses(read_at DESC) 
    WHERE read_at IS NOT NULL;

CREATE INDEX idx_reply_read_statuses_read_at 
    ON reply_read_statuses(read_at DESC) 
    WHERE read_at IS NOT NULL;
```

### 2. 統計情報更新用インデックス

```sql
-- 集計クエリ最適化用
CREATE INDEX idx_memo_read_statuses_staff_is_read 
    ON memo_read_statuses(staff_id, is_read);

CREATE INDEX idx_comment_read_statuses_staff_is_read 
    ON comment_read_statuses(staff_id, is_read);

CREATE INDEX idx_reply_read_statuses_staff_is_read 
    ON reply_read_statuses(staff_id, is_read);
```

## 🔄 マイグレーションスクリプト

### Migration: 20250916_001_create_memo_read_statuses.sql

```sql
-- メモ既読未読機能のテーブル作成
-- 作成者: kaneko (hotel-kanri)
-- 作成日: 2025年9月16日

BEGIN;

-- 1. memo_read_statuses テーブル作成
CREATE TABLE memo_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    last_content_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_memo_read_statuses_memo_id 
        FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_memo_read_statuses_memo_staff 
        UNIQUE(memo_id, staff_id),
    CONSTRAINT chk_memo_read_statuses_read_at 
        CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false))
);

-- 2. comment_read_statuses テーブル作成
CREATE TABLE comment_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_comment_read_statuses_comment_id 
        FOREIGN KEY (comment_id) REFERENCES memo_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_comment_read_statuses_comment_staff 
        UNIQUE(comment_id, staff_id),
    CONSTRAINT chk_comment_read_statuses_read_at 
        CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false))
);

-- 3. reply_read_statuses テーブル作成
CREATE TABLE reply_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_reply_read_statuses_reply_id 
        FOREIGN KEY (reply_id) REFERENCES memo_replies(id) ON DELETE CASCADE,
    CONSTRAINT fk_reply_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_reply_read_statuses_reply_staff 
        UNIQUE(reply_id, staff_id),
    CONSTRAINT chk_reply_read_statuses_read_at 
        CHECK ((is_read = true AND read_at IS NOT NULL) OR (is_read = false))
);

COMMIT;
```

### Migration: 20250916_002_create_memo_read_indexes.sql

```sql
-- メモ既読未読機能のインデックス作成
-- 作成者: kaneko (hotel-kanri)
-- 作成日: 2025年9月16日

BEGIN;

-- パフォーマンス最適化インデックス
CREATE INDEX idx_memo_read_statuses_staff_unread 
    ON memo_read_statuses(staff_id, memo_id) 
    WHERE is_read = false;

CREATE INDEX idx_comment_read_statuses_staff_unread 
    ON comment_read_statuses(staff_id, comment_id) 
    WHERE is_read = false;

CREATE INDEX idx_reply_read_statuses_staff_unread 
    ON reply_read_statuses(staff_id, reply_id) 
    WHERE is_read = false;

-- 複合インデックス
CREATE INDEX idx_memo_read_statuses_memo_staff 
    ON memo_read_statuses(memo_id, staff_id);

CREATE INDEX idx_comment_read_statuses_comment_staff 
    ON comment_read_statuses(comment_id, staff_id);

CREATE INDEX idx_reply_read_statuses_reply_staff 
    ON reply_read_statuses(reply_id, staff_id);

-- 時系列検索用
CREATE INDEX idx_memo_read_statuses_read_at 
    ON memo_read_statuses(read_at DESC) 
    WHERE read_at IS NOT NULL;

CREATE INDEX idx_comment_read_statuses_read_at 
    ON comment_read_statuses(read_at DESC) 
    WHERE read_at IS NOT NULL;

CREATE INDEX idx_reply_read_statuses_read_at 
    ON reply_read_statuses(read_at DESC) 
    WHERE read_at IS NOT NULL;

-- 統計情報用
CREATE INDEX idx_memo_read_statuses_staff_is_read 
    ON memo_read_statuses(staff_id, is_read);

CREATE INDEX idx_comment_read_statuses_staff_is_read 
    ON comment_read_statuses(staff_id, is_read);

CREATE INDEX idx_reply_read_statuses_staff_is_read 
    ON reply_read_statuses(staff_id, is_read);

COMMIT;
```

## 🔧 トリガー設計

### 1. 自動更新トリガー

```sql
-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにトリガー設定
CREATE TRIGGER update_memo_read_statuses_updated_at 
    BEFORE UPDATE ON memo_read_statuses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_read_statuses_updated_at 
    BEFORE UPDATE ON comment_read_statuses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reply_read_statuses_updated_at 
    BEFORE UPDATE ON reply_read_statuses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. 整合性チェックトリガー

```sql
-- メモ更新時の既読ステータスリセットトリガー
CREATE OR REPLACE FUNCTION reset_memo_read_status_on_content_change()
RETURNS TRIGGER AS $$
BEGIN
    -- メモ内容が変更された場合、全スタッフの既読ステータスをリセット
    IF OLD.content != NEW.content OR OLD.title != NEW.title THEN
        UPDATE memo_read_statuses 
        SET is_read = false, 
            read_at = NULL,
            last_content_hash = MD5(NEW.content || NEW.title),
            updated_at = NOW()
        WHERE memo_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER reset_memo_read_status_on_update 
    AFTER UPDATE ON memos 
    FOR EACH ROW EXECUTE FUNCTION reset_memo_read_status_on_content_change();
```

## 📈 パフォーマンス最適化クエリ

### 1. 効率的な未読数取得

```sql
-- スタッフの全未読数を効率的に取得
CREATE OR REPLACE FUNCTION get_staff_unread_count(p_staff_id UUID)
RETURNS TABLE(
    memo_unread_count BIGINT,
    comment_unread_count BIGINT,
    reply_unread_count BIGINT,
    total_unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH unread_counts AS (
        SELECT 
            (SELECT COUNT(*) FROM memo_read_statuses 
             WHERE staff_id = p_staff_id AND is_read = false) as memo_unread,
            (SELECT COUNT(*) FROM comment_read_statuses 
             WHERE staff_id = p_staff_id AND is_read = false) as comment_unread,
            (SELECT COUNT(*) FROM reply_read_statuses 
             WHERE staff_id = p_staff_id AND is_read = false) as reply_unread
    )
    SELECT 
        memo_unread,
        comment_unread,
        reply_unread,
        (memo_unread + comment_unread + reply_unread) as total_unread
    FROM unread_counts;
END;
$$ LANGUAGE plpgsql;
```

### 2. メモ一覧の既読情報付き取得

```sql
-- メモ一覧を既読情報付きで効率的に取得
CREATE OR REPLACE FUNCTION get_memos_with_read_status(
    p_staff_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    memo_id UUID,
    title TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_memo_read BOOLEAN,
    memo_read_at TIMESTAMP WITH TIME ZONE,
    unread_comment_count BIGINT,
    unread_reply_count BIGINT,
    total_unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.content,
        m.created_at,
        m.updated_at,
        COALESCE(mrs.is_read, false) as is_memo_read,
        mrs.read_at as memo_read_at,
        COALESCE(comment_unread.count, 0) as unread_comment_count,
        COALESCE(reply_unread.count, 0) as unread_reply_count,
        (CASE WHEN COALESCE(mrs.is_read, false) = false THEN 1 ELSE 0 END + 
         COALESCE(comment_unread.count, 0) + 
         COALESCE(reply_unread.count, 0)) as total_unread_count
    FROM memos m
    LEFT JOIN memo_read_statuses mrs ON m.id = mrs.memo_id AND mrs.staff_id = p_staff_id
    LEFT JOIN (
        SELECT 
            mc.memo_id,
            COUNT(*) as count
        FROM memo_comments mc
        LEFT JOIN comment_read_statuses crs ON mc.id = crs.comment_id AND crs.staff_id = p_staff_id
        WHERE crs.is_read IS NULL OR crs.is_read = false
        GROUP BY mc.memo_id
    ) comment_unread ON m.id = comment_unread.memo_id
    LEFT JOIN (
        SELECT 
            mc.memo_id,
            COUNT(*) as count
        FROM memo_comments mc
        JOIN memo_replies mr ON mc.id = mr.comment_id
        LEFT JOIN reply_read_statuses rrs ON mr.id = rrs.reply_id AND rrs.staff_id = p_staff_id
        WHERE rrs.is_read IS NULL OR rrs.is_read = false
        GROUP BY mc.memo_id
    ) reply_unread ON m.id = reply_unread.memo_id
    ORDER BY m.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

## 🧪 データ整合性チェック

### 1. 整合性検証クエリ

```sql
-- 孤立した既読ステータスレコードのチェック
SELECT 'memo_read_statuses' as table_name, COUNT(*) as orphaned_records
FROM memo_read_statuses mrs
LEFT JOIN memos m ON mrs.memo_id = m.id
LEFT JOIN staff s ON mrs.staff_id = s.id
WHERE m.id IS NULL OR s.id IS NULL

UNION ALL

SELECT 'comment_read_statuses' as table_name, COUNT(*) as orphaned_records
FROM comment_read_statuses crs
LEFT JOIN memo_comments mc ON crs.comment_id = mc.id
LEFT JOIN staff s ON crs.staff_id = s.id
WHERE mc.id IS NULL OR s.id IS NULL

UNION ALL

SELECT 'reply_read_statuses' as table_name, COUNT(*) as orphaned_records
FROM reply_read_statuses rrs
LEFT JOIN memo_replies mr ON rrs.reply_id = mr.id
LEFT JOIN staff s ON rrs.staff_id = s.id
WHERE mr.id IS NULL OR s.id IS NULL;
```

### 2. 制約違反チェック

```sql
-- 既読だが read_at が NULL のレコードチェック
SELECT 'memo_read_statuses' as table_name, COUNT(*) as invalid_records
FROM memo_read_statuses
WHERE is_read = true AND read_at IS NULL

UNION ALL

SELECT 'comment_read_statuses' as table_name, COUNT(*) as invalid_records
FROM comment_read_statuses
WHERE is_read = true AND read_at IS NULL

UNION ALL

SELECT 'reply_read_statuses' as table_name, COUNT(*) as invalid_records
FROM reply_read_statuses
WHERE is_read = true AND read_at IS NULL;
```

## 🗑️ データクリーンアップ

### 1. 古いデータの削除

```sql
-- 6ヶ月以上前の既読ステータスを削除
CREATE OR REPLACE FUNCTION cleanup_old_read_statuses()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- memo_read_statuses の古いデータ削除
    DELETE FROM memo_read_statuses 
    WHERE read_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- comment_read_statuses の古いデータ削除
    DELETE FROM comment_read_statuses 
    WHERE read_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- reply_read_statuses の古いデータ削除
    DELETE FROM reply_read_statuses 
    WHERE read_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

## 📊 統計情報とモニタリング

### 1. テーブルサイズ監視

```sql
-- 既読ステータステーブルのサイズ監視
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE tablename IN ('memo_read_statuses', 'comment_read_statuses', 'reply_read_statuses')
ORDER BY tablename, attname;
```

### 2. インデックス使用状況

```sql
-- インデックスの使用状況確認
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('memo_read_statuses', 'comment_read_statuses', 'reply_read_statuses')
ORDER BY tablename, idx_scan DESC;
```

## 🔄 ロールバック計画

### Rollback Script: rollback_memo_read_statuses.sql

```sql
-- メモ既読未読機能のロールバック
-- 実行者: kaneko (hotel-kanri)
-- 実行日: 必要時

BEGIN;

-- トリガー削除
DROP TRIGGER IF EXISTS reset_memo_read_status_on_update ON memos;
DROP TRIGGER IF EXISTS update_memo_read_statuses_updated_at ON memo_read_statuses;
DROP TRIGGER IF EXISTS update_comment_read_statuses_updated_at ON comment_read_statuses;
DROP TRIGGER IF EXISTS update_reply_read_statuses_updated_at ON reply_read_statuses;

-- 関数削除
DROP FUNCTION IF EXISTS reset_memo_read_status_on_content_change();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_staff_unread_count(UUID);
DROP FUNCTION IF EXISTS get_memos_with_read_status(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS cleanup_old_read_statuses();

-- テーブル削除（データも含めて完全削除）
DROP TABLE IF EXISTS reply_read_statuses CASCADE;
DROP TABLE IF EXISTS comment_read_statuses CASCADE;
DROP TABLE IF EXISTS memo_read_statuses CASCADE;

COMMIT;
```

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 (kaneko)
