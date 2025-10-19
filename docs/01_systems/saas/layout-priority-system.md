# レイアウト表示優先順位管理システム 提案書

## 概要

現在のレイアウトシステムでは、同一カテゴリに複数のレイアウトが存在する場合の表示優先順位が曖昧です。この文書では、明確な優先順位管理システムを提案し、ユーザーが意図したレイアウトが確実に表示される仕組みを定義します。

## 現在の問題点

### 1. 優先順位の曖昧さ
```sql
-- 例：TOPページカテゴリに複数のレイアウト
SELECT * FROM Layout WHERE category = 'top' AND status = 'published';
-- 結果：複数件のレイアウトが返される
-- 問題：どれが実際に表示されるかが不明
```

### 2. タイプ定義の不明確さ
現在の3つのタイプ（page、template、component）の用途と相違点が明確でない：

**現在の曖昧な状況：**
- `type: 'page'` - 通常のページ？
- `type: 'template'` - テンプレート？何に使う？
- `type: 'component'` - コンポーネント？どう活用？

### 3. 公開制御の不備
- 複数の公開済みレイアウトが競合する可能性
- A/Bテストやリリース管理ができない
- 緊急時の切り替えが困難

## 提案解決策

### 1. 優先順位管理システム

#### 1.1 データベーススキーマの拡張
```sql
-- Layoutテーブルに追加するフィールド
ALTER TABLE Layout ADD COLUMN priority INTEGER DEFAULT 0;
ALTER TABLE Layout ADD COLUMN isActive BOOLEAN DEFAULT false;
ALTER TABLE Layout ADD COLUMN activatedAt DATETIME NULL;
ALTER TABLE Layout ADD COLUMN activatedBy STRING NULL;

-- インデックス追加
CREATE INDEX idx_layout_category_priority ON Layout(category, priority DESC, isActive);
CREATE INDEX idx_layout_active ON Layout(category, isActive, status);
```

#### 1.2 優先順位ルール
```typescript
interface LayoutPriorityRule {
  // 基本優先順位
  priority: number;           // 数値が大きいほど優先（0-100）
  isActive: boolean;          // アクティブフラグ
  
  // 条件による自動優先順位
  autoRules: {
    publishedBonus: 10;       // 公開済みの場合 +10
    recentUpdateBonus: 5;     // 7日以内更新 +5
    templatePenalty: -20;     // テンプレートの場合 -20
    draftPenalty: -50;        // 下書きの場合 -50
  };
}
```

#### 1.3 表示選択ロジック
```typescript
const getActiveLayout = async (category: string): Promise<Layout | null> => {
  return await prisma.layout.findFirst({
    where: {
      category,
      isDeleted: false,
      isActive: true,
      status: 'published'
    },
    orderBy: [
      { priority: 'desc' },
      { updatedAt: 'desc' }
    ]
  });
};
```

### 2. タイプ定義の明確化

#### 2.1 Page（ページ）
```typescript
interface PageLayout {
  type: 'page';
  purpose: '実際にユーザーに表示される完成したページ';
  usage: {
    description: 'エンドユーザーが直接アクセスするページ';
    examples: [
      'ホテルTOPページ',
      'お知らせ一覧ページ', 
      'サービス紹介ページ'
    ];
    characteristics: [
      '完全なページ構成',
      'SEO設定あり',
      'URL公開される',
      '実際のコンテンツ表示'
    ];
  };
}
```

#### 2.2 Template（テンプレート）
```typescript
interface TemplateLayout {
  type: 'template';
  purpose: '新しいページ作成時のベーステンプレート';
  usage: {
    description: '効率的なページ作成のための雛形';
    examples: [
      'シンプルページテンプレート',
      '情報ページテンプレート',
      'イベントページテンプレート'
    ];
    characteristics: [
      'サンプルコンテンツ',
      'カスタマイズ前提',
      'URL公開されない',
      '作成効率化が目的'
    ];
  };
}
```

#### 2.3 Component（コンポーネント）
```typescript
interface ComponentLayout {
  type: 'component';
  purpose: '他のページに埋め込み可能な部品';
  usage: {
    description: '複数ページで共通利用される要素';
    examples: [
      'ヘッダーコンポーネント',
      'フッターコンポーネント',
      'サイドバーコンポーネント'
    ];
    characteristics: [
      '部分的な要素',
      '他ページに埋め込み',
      '一括変更可能',
      '統一性の確保'
    ];
  };
}
```

### 3. アクティブレイアウト管理

#### 3.1 カテゴリ別アクティブ管理
```typescript
interface CategoryActiveLayout {
  category: string;
  activeLayoutId: number;
  previousLayoutId?: number;
  activatedAt: Date;
  activatedBy: string;
  reason: string;
}

// カテゴリごとに1つのアクティブレイアウトのみ
const activateLayout = async (layoutId: number, activatedBy: string, reason: string) => {
  const layout = await prisma.layout.findUnique({ where: { id: layoutId } });
  
  // 同カテゴリの他のレイアウトを非アクティブ化
  await prisma.layout.updateMany({
    where: { 
      category: layout.category,
      isActive: true 
    },
    data: { 
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy: activatedBy
    }
  });
  
  // 新しいレイアウトをアクティブ化
  await prisma.layout.update({
    where: { id: layoutId },
    data: {
      isActive: true,
      activatedAt: new Date(),
      activatedBy,
      activationReason: reason
    }
  });
};
```

#### 3.2 A/Bテスト対応（将来実装）
```typescript
interface ABTestConfig {
  id: string;
  category: string;
  variants: [
    { layoutId: number, weight: number }, // 50%
    { layoutId: number, weight: number }  // 50%
  ];
  startDate: Date;
  endDate: Date;
  metrics: ['conversion_rate', 'bounce_rate', 'time_on_page'];
}
```

### 4. UI/UX改善案

#### 4.1 レイアウト一覧での優先順位表示
```typescript
// レイアウト一覧での表示項目拡張
interface LayoutListItem {
  id: number;
  name: string;
  category: string;
  type: 'page' | 'template' | 'component';
  status: 'draft' | 'published' | 'archived';
  
  // 新規追加項目
  priority: number;
  isActive: boolean;
  displayOrder: number;        // 実際の表示優先順位
  conflictCount: number;       // 同カテゴリの競合数
  lastActivated?: Date;
  
  // 表示用補助情報
  badges: Array<{
    type: 'active' | 'conflict' | 'priority' | 'template';
    label: string;
    color: string;
  }>;
}
```

#### 4.2 アクティブ化管理UI
```typescript
// アクティブ化ダイアログ
interface ActivationDialog {
  layoutId: number;
  currentActive?: Layout;
  conflictingLayouts: Layout[];
  
  form: {
    reason: string;              // アクティブ化理由
    scheduledAt?: Date;          // スケジュール公開
    notifyUsers: boolean;        // ユーザー通知
    backupPrevious: boolean;     // 前バージョンバックアップ
  };
}
```

#### 4.3 カテゴリ管理ダッシュボード
```vue
<template>
  <div class="category-dashboard">
    <div v-for="category in categories" :key="category" class="category-card">
      <h3>{{ getCategoryLabel(category) }}</h3>
      
      <!-- アクティブレイアウト -->
      <div class="active-layout">
        <div class="layout-info">
          <span class="layout-name">{{ activeLayouts[category]?.name }}</span>
          <span class="badge active">ACTIVE</span>
        </div>
        <div class="activation-info">
          <span>{{ formatDate(activeLayouts[category]?.activatedAt) }}</span>
          <span>by {{ activeLayouts[category]?.activatedBy }}</span>
        </div>
      </div>
      
      <!-- 競合レイアウト -->
      <div v-if="conflictingLayouts[category].length > 0" class="conflicts">
        <h4>競合レイアウト ({{ conflictingLayouts[category].length }}件)</h4>
        <div v-for="layout in conflictingLayouts[category]" :key="layout.id" class="conflict-item">
          <span>{{ layout.name }}</span>
          <button @click="activateLayout(layout.id)" class="btn-activate">
            アクティブ化
          </button>
        </div>
      </div>
      
      <!-- クイックアクション -->
      <div class="quick-actions">
        <button @click="createNew(category)" class="btn-primary">新規作成</button>
        <button @click="manageCategory(category)" class="btn-secondary">管理</button>
      </div>
    </div>
  </div>
</template>
```

### 5. 実装フェーズ

#### Phase 1: 基本的な優先順位管理 (2週間)
- [ ] データベーススキーマ拡張
- [ ] アクティブレイアウト選択API
- [ ] 基本的な管理UI
- [ ] 既存データのマイグレーション

#### Phase 2: 高度な管理機能 (3週間)
- [ ] カテゴリ管理ダッシュボード
- [ ] アクティブ化履歴
- [ ] 競合検知・警告
- [ ] スケジュール公開

#### Phase 3: 最適化・自動化 (4週間)
- [ ] 自動優先順位計算
- [ ] A/Bテスト準備
- [ ] パフォーマンス監視
- [ ] 運用ツール

### 6. セキュリティ・運用考慮

#### 6.1 権限管理
```typescript
interface LayoutPermission {
  userId: string;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canActivate: boolean;     // アクティブ化権限
    canDeactivate: boolean;   // 非アクティブ化権限
    canDelete: boolean;
    canManagePriority: boolean; // 優先順位変更権限
  };
  categories: string[];       // 管理可能カテゴリ
}
```

#### 6.2 監査ログ
```typescript
interface LayoutAuditLog {
  id: string;
  layoutId: number;
  action: 'created' | 'updated' | 'activated' | 'deactivated' | 'deleted';
  userId: string;
  timestamp: Date;
  details: {
    oldValues?: any;
    newValues?: any;
    reason?: string;
    ipAddress: string;
    userAgent: string;
  };
}
```

#### 6.3 バックアップ・復旧
```typescript
interface LayoutBackup {
  id: string;
  layoutId: number;
  backupType: 'manual' | 'auto' | 'pre_activation';
  data: Layout;
  createdAt: Date;
  createdBy: string;
  retentionDays: number;
}
```

### 7. 運用ガイドライン

#### 7.1 カテゴリ命名規則
```typescript
const categoryNamingRules = {
  // 基本カテゴリ
  'top': 'TOPページ',
  'info': 'インフォメーション',
  'service': 'サービス紹介',
  'contact': 'お問い合わせ',
  
  // 機能別カテゴリ
  'order': 'オーダーシステム',
  'concierge': 'コンシェルジュ',
  'menu': 'メニュー表示',
  
  // 特殊カテゴリ
  'error': 'エラーページ',
  'maintenance': 'メンテナンス',
  'custom': 'カスタム'
};
```

#### 7.2 アクティブ化チェックリスト
```markdown
## アクティブ化前チェックリスト

### 必須確認項目
- [ ] レイアウトが正常に表示される
- [ ] レスポンシブ対応が適切
- [ ] 全てのリンクが動作する
- [ ] SEO設定が完了している
- [ ] アクセシビリティ要件を満たしている

### 推奨確認項目
- [ ] 他の関係者がレビュー済み
- [ ] バックアップが作成済み
- [ ] 緊急時の切り戻し手順を確認済み
- [ ] パフォーマンス影響を確認済み

### リリース後対応
- [ ] アクセス状況の監視
- [ ] エラーログの確認
- [ ] ユーザーフィードバックの収集
```

## まとめ

この優先順位管理システムにより、以下の課題が解決されます：

1. **明確な表示制御**: カテゴリごとに1つのアクティブレイアウトを管理
2. **競合の可視化**: 同カテゴリ内の競合状況を明確に表示
3. **安全な切り替え**: バックアップとロールバック機能
4. **運用効率化**: 直感的な管理UI
5. **将来拡張性**: A/Bテストやスケジュール公開への対応

このシステムにより、ホテルスタッフは安心してレイアウトを管理し、意図した通りのページをユーザーに提供できるようになります。