# メモ機能 既読未読ステータス仕様書

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-saas  
**機能**: メモ機能の既読未読ステータス追加

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

既存のメモ機能に、スタッフごとの既読未読ステータス管理機能を追加します。

### 対象範囲
- **メモ本体**: メモの作成・更新時の既読未読管理
- **コメント**: メモに対するコメントの既読未読管理
- **レス**: コメントに対するレスの既読未読管理

### 表示要件
- 未読がある場合のみ、未読アイコンを表示
- 未読数の表示（オプション）
- スタッフごとの個別管理

## 🎯 機能要件

### 1. 既読未読の対象

#### 1.1 メモ本体
```typescript
interface MemoReadStatus {
  memoId: string;
  staffId: string;
  isRead: boolean;
  readAt: Date | null;
  lastContentUpdate: Date; // メモ内容の最終更新日時
}
```

#### 1.2 コメント
```typescript
interface CommentReadStatus {
  commentId: string;
  staffId: string;
  isRead: boolean;
  readAt: Date | null;
}
```

#### 1.3 レス（コメントへの返信）
```typescript
interface ReplyReadStatus {
  replyId: string;
  staffId: string;
  isRead: boolean;
  readAt: Date | null;
}
```

### 2. 既読未読の判定ロジック

#### 2.1 メモ本体の未読判定
```typescript
const isMemoUnread = (memo: Memo, staff: Staff): boolean => {
  const readStatus = memo.readStatuses.find(rs => rs.staffId === staff.id);
  
  if (!readStatus) {
    return true; // 初回は未読
  }
  
  if (!readStatus.isRead) {
    return true; // 明示的に未読
  }
  
  // メモが更新された場合は未読扱い
  return memo.updatedAt > readStatus.readAt;
};
```

#### 2.2 コメント・レスの未読判定
```typescript
const hasUnreadComments = (memo: Memo, staff: Staff): boolean => {
  // コメントの未読チェック
  const unreadComments = memo.comments.filter(comment => {
    const readStatus = comment.readStatuses.find(rs => rs.staffId === staff.id);
    return !readStatus || !readStatus.isRead;
  });
  
  // レスの未読チェック
  const unreadReplies = memo.comments.flatMap(comment => 
    comment.replies.filter(reply => {
      const readStatus = reply.readStatuses.find(rs => rs.staffId === staff.id);
      return !readStatus || !readStatus.isRead;
    })
  );
  
  return unreadComments.length > 0 || unreadReplies.length > 0;
};
```

### 3. 既読処理のタイミング

#### 3.1 自動既読
- メモ詳細画面を開いた時点で既読
- コメント・レスが画面に表示された時点で既読

#### 3.2 既読処理の実装
```typescript
const markAsRead = async (targetType: 'memo' | 'comment' | 'reply', targetId: string, staffId: string) => {
  // ✅ エラーは隠蔽せず、適切に処理
  try {
    await api.markAsRead({
      targetType,
      targetId,
      staffId,
      readAt: new Date()
    });
  } catch (error) {
    console.error(`Failed to mark ${targetType} as read:`, error);
    throw new Error(`既読処理に失敗しました: ${error.message}`);
  }
};
```

## 🎨 UI/UX 仕様

### 1. 未読アイコンの表示

#### 1.1 メモ一覧画面
```vue
<template>
  <div class="memo-item" :class="{ 'has-unread': hasUnreadContent }">
    <div class="memo-title">
      {{ memo.title }}
      <!-- 未読アイコン -->
      <span v-if="hasUnreadContent" class="unread-indicator">
        <Icon name="unread" class="text-red-500" />
        <span class="unread-count">{{ unreadCount }}</span>
      </span>
    </div>
  </div>
</template>
```

#### 1.2 メモ詳細画面
```vue
<template>
  <div class="memo-detail">
    <!-- メモ本体の未読表示 -->
    <div class="memo-content" :class="{ 'unread': isMemoUnread }">
      <!-- メモ内容 -->
    </div>
    
    <!-- コメント一覧 -->
    <div class="comments-section">
      <div 
        v-for="comment in comments" 
        :key="comment.id"
        class="comment-item"
        :class="{ 'unread': isCommentUnread(comment) }"
      >
        <!-- コメント内容 -->
        
        <!-- レス一覧 -->
        <div class="replies">
          <div 
            v-for="reply in comment.replies"
            :key="reply.id"
            class="reply-item"
            :class="{ 'unread': isReplyUnread(reply) }"
          >
            <!-- レス内容 -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2. 未読数の計算

```typescript
const calculateUnreadCount = (memo: Memo, staff: Staff): number => {
  let count = 0;
  
  // メモ本体の未読
  if (isMemoUnread(memo, staff)) {
    count += 1;
  }
  
  // コメントの未読
  memo.comments.forEach(comment => {
    if (isCommentUnread(comment, staff)) {
      count += 1;
    }
    
    // レスの未読
    comment.replies.forEach(reply => {
      if (isReplyUnread(reply, staff)) {
        count += 1;
      }
    });
  });
  
  return count;
};
```

## 🗄️ データベース設計

### 1. 既読ステータステーブル

```sql
-- メモ既読ステータス
CREATE TABLE memo_read_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(memo_id, staff_id)
);

-- コメント既読ステータス
CREATE TABLE comment_read_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES memo_comments(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(comment_id, staff_id)
);

-- レス既読ステータス
CREATE TABLE reply_read_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES memo_replies(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(reply_id, staff_id)
);
```

### 2. インデックス設計

```sql
-- パフォーマンス最適化のためのインデックス
CREATE INDEX idx_memo_read_statuses_staff_unread ON memo_read_statuses(staff_id) WHERE is_read = false;
CREATE INDEX idx_comment_read_statuses_staff_unread ON comment_read_statuses(staff_id) WHERE is_read = false;
CREATE INDEX idx_reply_read_statuses_staff_unread ON reply_read_statuses(staff_id) WHERE is_read = false;

-- 複合インデックス
CREATE INDEX idx_memo_read_statuses_memo_staff ON memo_read_statuses(memo_id, staff_id);
CREATE INDEX idx_comment_read_statuses_comment_staff ON comment_read_statuses(comment_id, staff_id);
CREATE INDEX idx_reply_read_statuses_reply_staff ON reply_read_statuses(reply_id, staff_id);
```

## 📡 API 仕様

### 1. 既読処理API

```typescript
// POST /api/v1/memos/read-status
interface MarkAsReadRequest {
  targetType: 'memo' | 'comment' | 'reply';
  targetId: string;
  staffId: string;
}

interface MarkAsReadResponse {
  success: boolean;
  readAt: string; // ISO 8601 format
}
```

### 2. 未読数取得API

```typescript
// GET /api/v1/memos/unread-count?staffId={staffId}
interface UnreadCountResponse {
  totalUnread: number;
  memoUnread: number;
  commentUnread: number;
  replyUnread: number;
  details: Array<{
    memoId: string;
    memoTitle: string;
    unreadCount: number;
    hasUnreadMemo: boolean;
    hasUnreadComments: boolean;
    hasUnreadReplies: boolean;
  }>;
}
```

### 3. メモ一覧取得API（既読情報付き）

```typescript
// GET /api/v1/memos?includeReadStatus=true&staffId={staffId}
interface MemoWithReadStatus {
  id: string;
  title: string;
  content: string;
  // ... 既存のメモフィールド
  
  // 既読情報
  readStatus: {
    isRead: boolean;
    readAt: string | null;
    hasUnreadComments: boolean;
    hasUnreadReplies: boolean;
    totalUnreadCount: number;
  };
}
```

## 🔄 実装フロー

### Phase 1: データベース準備
1. 既読ステータステーブルの作成
2. インデックスの設定
3. 既存データとの整合性確認

### Phase 2: API実装
1. 既読処理API
2. 未読数取得API
3. メモ取得APIの拡張

### Phase 3: フロントエンド実装
1. 既読未読状態管理
2. UI コンポーネントの更新
3. 自動既読処理の実装

### Phase 4: テスト・検証
1. 単体テスト
2. 統合テスト
3. パフォーマンステスト

## 🧪 テストケース

### 1. 既読未読判定テスト

```typescript
describe('既読未読判定', () => {
  test('新規メモは未読として判定される', () => {
    const memo = createMemo();
    const staff = createStaff();
    
    expect(isMemoUnread(memo, staff)).toBe(true);
  });
  
  test('既読後にメモが更新された場合は未読として判定される', () => {
    const memo = createMemo();
    const staff = createStaff();
    
    // 既読処理
    markMemoAsRead(memo.id, staff.id);
    
    // メモ更新
    updateMemo(memo.id, { content: 'updated content' });
    
    expect(isMemoUnread(memo, staff)).toBe(true);
  });
});
```

### 2. パフォーマンステスト

```typescript
describe('パフォーマンステスト', () => {
  test('大量のメモでも未読数計算が高速である', async () => {
    const memos = await createMemos(1000);
    const staff = createStaff();
    
    const startTime = Date.now();
    const unreadCount = await calculateTotalUnreadCount(staff.id);
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(100); // 100ms以内
  });
});
```

## 📊 パフォーマンス考慮事項

### 1. クエリ最適化

```sql
-- 効率的な未読数取得クエリ
WITH unread_counts AS (
  SELECT 
    m.id as memo_id,
    m.title,
    CASE WHEN mrs.is_read = false OR mrs.is_read IS NULL THEN 1 ELSE 0 END as memo_unread,
    COALESCE(comment_unread.count, 0) as comment_unread,
    COALESCE(reply_unread.count, 0) as reply_unread
  FROM memos m
  LEFT JOIN memo_read_statuses mrs ON m.id = mrs.memo_id AND mrs.staff_id = $1
  LEFT JOIN (
    SELECT 
      mc.memo_id,
      COUNT(*) as count
    FROM memo_comments mc
    LEFT JOIN comment_read_statuses crs ON mc.id = crs.comment_id AND crs.staff_id = $1
    WHERE crs.is_read = false OR crs.is_read IS NULL
    GROUP BY mc.memo_id
  ) comment_unread ON m.id = comment_unread.memo_id
  LEFT JOIN (
    SELECT 
      mc.memo_id,
      COUNT(*) as count
    FROM memo_comments mc
    JOIN memo_replies mr ON mc.id = mr.comment_id
    LEFT JOIN reply_read_statuses rrs ON mr.id = rrs.reply_id AND rrs.staff_id = $1
    WHERE rrs.is_read = false OR rrs.is_read IS NULL
    GROUP BY mc.memo_id
  ) reply_unread ON m.id = reply_unread.memo_id
)
SELECT 
  memo_id,
  title,
  (memo_unread + comment_unread + reply_unread) as total_unread
FROM unread_counts
WHERE (memo_unread + comment_unread + reply_unread) > 0;
```

### 2. キャッシュ戦略

```typescript
// Redis を使用した未読数キャッシュ
const getUnreadCountWithCache = async (staffId: string): Promise<number> => {
  const cacheKey = `unread_count:${staffId}`;
  
  // キャッシュから取得を試行
  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return parseInt(cached, 10);
  }
  
  // データベースから取得
  const count = await calculateUnreadCountFromDB(staffId);
  
  // キャッシュに保存（5分間）
  await redis.setex(cacheKey, 300, count.toString());
  
  return count;
};
```

## 🚀 デプロイメント計画

### 1. 段階的デプロイ

**Phase 1**: データベーススキーマ更新
- 既読ステータステーブル作成
- インデックス設定

**Phase 2**: API実装デプロイ
- 既読処理API
- 未読数取得API

**Phase 3**: フロントエンド更新
- UI コンポーネント更新
- 既読未読表示機能

### 2. ロールバック計画

```sql
-- 緊急時のロールバック用
DROP TABLE IF EXISTS reply_read_statuses;
DROP TABLE IF EXISTS comment_read_statuses;
DROP TABLE IF EXISTS memo_read_statuses;
```

## 📝 運用・保守

### 1. 監視項目

- 既読処理APIのレスポンス時間
- 未読数計算クエリの実行時間
- データベースの容量増加率

### 2. 定期メンテナンス

```sql
-- 古い既読ステータスの削除（6ヶ月以上前）
DELETE FROM memo_read_statuses 
WHERE read_at < NOW() - INTERVAL '6 months';

DELETE FROM comment_read_statuses 
WHERE read_at < NOW() - INTERVAL '6 months';

DELETE FROM reply_read_statuses 
WHERE read_at < NOW() - INTERVAL '6 months';
```

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 (kaneko)
