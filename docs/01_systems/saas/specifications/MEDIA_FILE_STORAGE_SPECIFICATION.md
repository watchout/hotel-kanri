# 📁 メディアファイル保存パス統一仕様書

**Doc-ID**: SPEC-2025-006  
**Version**: 1.0  
**Status**: 🔴 **CRITICAL** - 統一実装必須  
**Owner**: 金子裕司  
**作成日**: 2025年1月28日  
**関連**: SPEC-2025-005 (メディアAPI永続化方針)

---

## 🎯 **統一ファイル保存パス仕様**

### **基本方針**
- **統一ストレージ**: 全システム共通の物理ストレージを使用
- **論理パス**: システム・エンティティ別の階層構造
- **公開URL**: 統一されたメディア配信URL
- **セキュリティ**: テナント分離とアクセス制御

---

## 🏗️ **ディレクトリ構造**

### **物理ストレージ構成**

```
/var/lib/hotel-unified/media/  (Docker Volume: unified_media_storage)
├── saas/                      # hotel-saas専用領域
│   ├── room-grades/           # 客室ランクメディア
│   │   └── {tenant_id}/       # テナント分離
│   │       └── {room_grade_id}/
│   │           ├── images/
│   │           │   ├── primary/        # プライマリ画像
│   │           │   │   └── room-grade-{id}-primary.{ext}
│   │           │   └── gallery/        # ギャラリー画像
│   │           │       ├── room-grade-{id}-gallery-1.{ext}
│   │           │       └── room-grade-{id}-gallery-2.{ext}
│   │           └── videos/
│   │               └── room-grade-{id}-video-1.{ext}
│   │
│   ├── articles/              # 記事メディア
│   │   └── {tenant_id}/
│   │       └── {article_id}/
│   │           ├── images/
│   │           │   ├── cover/          # カバー画像
│   │           │   └── content/        # 記事内画像
│   │           └── videos/
│   │
│   ├── menus/                 # メニューメディア
│   │   └── {tenant_id}/
│   │       └── {menu_id}/
│   │           ├── images/
│   │           └── videos/
│   │
│   └── layouts/               # レイアウトメディア
│       └── {tenant_id}/
│           └── {layout_id}/
│               ├── images/
│               └── assets/
│
├── pms/                       # hotel-pms専用領域
│   └── handover-notes/
│       └── {tenant_id}/
│           └── {note_id}/
│
├── member/                    # hotel-member専用領域
│   └── profiles/
│       └── {tenant_id}/
│           └── {member_id}/
│
└── shared/                    # 共有メディア
    ├── templates/
    ├── icons/
    └── defaults/
```

---

## 🔗 **パス生成ルール**

### **1. 論理パス生成**

```typescript
interface MediaPathContext {
  system: 'saas' | 'pms' | 'member' | 'shared'
  entityType: string  // 'room-grades', 'articles', 'menus', etc.
  tenantId: string
  entityId: string
  mediaType: 'images' | 'videos' | 'documents'
  category?: string   // 'primary', 'gallery', 'cover', 'content'
  filename: string
}

class MediaPathGenerator {
  /**
   * 論理パス生成
   * パターン: {system}/{entityType}/{tenantId}/{entityId}/{mediaType}/{category?}/{filename}
   */
  generateLogicalPath(context: MediaPathContext): string {
    const parts = [
      context.system,
      context.entityType,
      context.tenantId,
      context.entityId,
      context.mediaType
    ]
    
    if (context.category) {
      parts.push(context.category)
    }
    
    parts.push(context.filename)
    
    return parts.join('/')
  }

  /**
   * 物理パス生成
   */
  generatePhysicalPath(logicalPath: string): string {
    const baseStoragePath = process.env.UNIFIED_MEDIA_STORAGE_PATH || '/var/lib/hotel-unified/media'
    return path.join(baseStoragePath, logicalPath)
  }

  /**
   * 公開URL生成
   */
  generatePublicUrl(logicalPath: string): string {
    const mediaBaseUrl = process.env.MEDIA_BASE_URL || 'https://media.hotel-unified.com'
    return `${mediaBaseUrl}/media/${logicalPath}`
  }
}
```

### **2. ファイル名規則**

```typescript
class MediaFilenameGenerator {
  /**
   * 統一ファイル名生成
   */
  generateFilename(context: {
    entityType: string
    entityId: string
    mediaType: 'image' | 'video' | 'document'
    category?: string
    originalFilename: string
    sequence?: number
  }): string {
    const ext = path.extname(context.originalFilename)
    const timestamp = Date.now()
    
    let filename = `${context.entityType}-${context.entityId}`
    
    if (context.category) {
      filename += `-${context.category}`
    }
    
    if (context.sequence) {
      filename += `-${context.sequence}`
    }
    
    filename += `-${timestamp}${ext}`
    
    return filename
  }

  /**
   * 安全なファイル名生成（サニタイズ）
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')  // 特殊文字を_に置換
      .replace(/_{2,}/g, '_')           // 連続する_を単一に
      .toLowerCase()                    // 小文字に統一
  }
}
```

---

## 🌐 **公開URL仕様**

### **URL構造**

```
https://media.hotel-unified.com/media/{logical_path}

例:
- 客室ランク画像: https://media.hotel-unified.com/media/saas/room-grades/tenant123/room456/images/primary/room-grade-456-primary-1643723400000.jpg
- 記事カバー画像: https://media.hotel-unified.com/media/saas/articles/tenant123/article789/images/cover/article-789-cover-1643723400000.jpg
- メニュー画像: https://media.hotel-unified.com/media/saas/menus/tenant123/menu101/images/menu-101-1643723400000.jpg
```

### **CDN設定**

```nginx
# nginx.conf - メディア配信設定
server {
    listen 80;
    server_name media.hotel-unified.com;
    
    location /media/ {
        alias /var/lib/hotel-unified/media/;
        
        # キャッシュ設定
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # セキュリティヘッダー
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        
        # CORS設定
        add_header Access-Control-Allow-Origin "https://*.hotel-unified.com";
        
        # ファイルタイプ別設定
        location ~* \.(jpg|jpeg|png|gif|webp)$ {
            expires 1y;
            add_header Vary Accept;
        }
        
        location ~* \.(mp4|webm|mov)$ {
            expires 6M;
            add_header Accept-Ranges bytes;
        }
    }
}
```

---

## 🔒 **セキュリティ仕様**

### **1. テナント分離**

```typescript
class MediaSecurityService {
  /**
   * テナントアクセス権限チェック
   */
  async validateTenantAccess(
    requestTenantId: string,
    mediaPath: string
  ): Promise<boolean> {
    const pathParts = mediaPath.split('/')
    const mediaTenantId = pathParts[2] // {system}/{entityType}/{tenantId}/...
    
    return requestTenantId === mediaTenantId
  }

  /**
   * メディアアクセス権限チェック
   */
  async validateMediaAccess(
    userId: string,
    tenantId: string,
    mediaPath: string
  ): Promise<boolean> {
    // 1. テナント分離チェック
    if (!await this.validateTenantAccess(tenantId, mediaPath)) {
      return false
    }
    
    // 2. ユーザー権限チェック
    const userPermissions = await this.getUserPermissions(userId, tenantId)
    const requiredPermission = this.getRequiredPermission(mediaPath)
    
    return userPermissions.includes(requiredPermission)
  }
}
```

### **2. ファイルタイプ制限**

```typescript
const ALLOWED_MEDIA_TYPES = {
  images: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif'
  ],
  videos: [
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ],
  documents: [
    'application/pdf',
    'text/plain'
  ]
} as const

const MAX_FILE_SIZES = {
  images: 5 * 1024 * 1024,    // 5MB
  videos: 50 * 1024 * 1024,   // 50MB
  documents: 10 * 1024 * 1024  // 10MB
} as const
```

---

## 🐳 **Docker設定**

### **docker-compose.unified.yml**

```yaml
services:
  # 統合メディアストレージ
  common:
    volumes:
      - unified_media_storage:/app/uploads
      - /Users/kaneko/hotel-common:/app
    environment:
      - UNIFIED_MEDIA_STORAGE_PATH=/app/uploads
      - MEDIA_BASE_URL=https://media.hotel-unified.com

  saas:
    volumes:
      - unified_media_storage:/app/uploads  # 共有ストレージ
      - /Users/kaneko/hotel-saas:/app
    environment:
      - HOTEL_COMMON_API_URL=http://common:3400
      - MEDIA_BASE_URL=https://media.hotel-unified.com

  pms:
    volumes:
      - unified_media_storage:/app/uploads  # 共有ストレージ
      - /Users/kaneko/hotel-pms:/app
    environment:
      - HOTEL_COMMON_API_URL=http://common:3400
      - MEDIA_BASE_URL=https://media.hotel-unified.com

  # メディア配信用Nginx
  media-server:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - unified_media_storage:/var/lib/hotel-unified/media:ro
      - ./config/nginx/media-server.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - common

volumes:
  unified_media_storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/hotel-unified/media
```

---

## 📊 **使用例**

### **1. 客室ランクメディア**

```typescript
// アップロード時のパス生成例
const context: MediaPathContext = {
  system: 'saas',
  entityType: 'room-grades',
  tenantId: 'tenant_abc123',
  entityId: 'room_grade_456',
  mediaType: 'images',
  category: 'primary',
  filename: 'room-grade-456-primary-1643723400000.jpg'
}

// 生成されるパス
const logicalPath = 'saas/room-grades/tenant_abc123/room_grade_456/images/primary/room-grade-456-primary-1643723400000.jpg'
const physicalPath = '/var/lib/hotel-unified/media/saas/room-grades/tenant_abc123/room_grade_456/images/primary/room-grade-456-primary-1643723400000.jpg'
const publicUrl = 'https://media.hotel-unified.com/media/saas/room-grades/tenant_abc123/room_grade_456/images/primary/room-grade-456-primary-1643723400000.jpg'
```

### **2. 記事メディア**

```typescript
const context: MediaPathContext = {
  system: 'saas',
  entityType: 'articles',
  tenantId: 'tenant_abc123',
  entityId: 'article_789',
  mediaType: 'images',
  category: 'cover',
  filename: 'article-789-cover-1643723400000.jpg'
}

// 生成されるパス
const logicalPath = 'saas/articles/tenant_abc123/article_789/images/cover/article-789-cover-1643723400000.jpg'
const publicUrl = 'https://media.hotel-unified.com/media/saas/articles/tenant_abc123/article_789/images/cover/article-789-cover-1643723400000.jpg'
```

---

## ⚠️ **移行時の注意事項**

### **既存ファイルの移行**

```bash
#!/bin/bash
# 既存メディアファイル移行スクリプト

echo "🔄 メディアファイル移行開始..."

# 既存のuploads/info/から新しい構造に移行
OLD_PATH="/Users/kaneko/hotel-saas/uploads/info"
NEW_PATH="/var/lib/hotel-unified/media/saas"

if [ -d "$OLD_PATH" ]; then
  echo "📁 既存ファイルを移行中..."
  
  # 記事画像の移行
  if [ -d "$OLD_PATH/images" ]; then
    mkdir -p "$NEW_PATH/articles"
    # 具体的な移行ロジックを実装
  fi
  
  # 動画の移行
  if [ -d "$OLD_PATH/videos" ]; then
    mkdir -p "$NEW_PATH/articles"
    # 具体的な移行ロジックを実装
  fi
  
  echo "✅ ファイル移行完了"
else
  echo "ℹ️ 移行対象ファイルなし"
fi
```

### **URL更新**

```sql
-- 既存のメディアURLを新しい形式に更新
UPDATE articles 
SET content = REPLACE(
  content, 
  '/uploads/info/', 
  'https://media.hotel-unified.com/media/saas/articles/'
) 
WHERE content LIKE '%/uploads/info/%';
```

---

## 🔍 **実装確認チェックリスト**

### **ストレージ設定**
- [ ] Docker統合ストレージボリューム作成
- [ ] ディレクトリ権限設定
- [ ] Nginx メディアサーバー設定

### **パス生成機能**
- [ ] MediaPathGenerator実装
- [ ] MediaFilenameGenerator実装
- [ ] 公開URL生成機能実装

### **セキュリティ**
- [ ] テナント分離機能実装
- [ ] ファイルタイプ検証実装
- [ ] アクセス権限チェック実装

### **移行作業**
- [ ] 既存ファイル移行スクリプト実行
- [ ] データベース内URL更新
- [ ] 動作確認テスト

---

**緊急度**: 🔴 **CRITICAL** - 現在のメディア管理機能が動作しないため、統一ファイル保存パス仕様の即座実装が必要。
