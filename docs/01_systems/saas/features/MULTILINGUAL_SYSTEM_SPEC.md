---
⚠️ **このドキュメントは非推奨です（DEPRECATED）**

**最新の仕様**: このドキュメントの内容は古くなっています。  
**参照すべきドキュメント**:
- **仕様書**: [SSOT_MULTILINGUAL_SYSTEM.md](/docs/03_ssot/00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)
- **実装ガイド**: [MULTILINGUAL_IMPLEMENTATION_GUIDE.md](/docs/03_ssot/00_foundation/MULTILINGUAL_IMPLEMENTATION_GUIDE.md)

**理由**: 多言語化システムはSSOT（Single Source of Truth）として統一管理されています。  
このドキュメントは履歴保存のために残されていますが、実装時は上記のSSOTドキュメントを参照してください。

**最終更新**: 2025-10-07（非推奨化）

---

# 多言語対応システム仕様書

## 📋 概要

Hotel SaaSプロジェクトにおける多言語対応システムの設計・実装方針を定義します。

**方針**: テキストベース多言語対応 + 管理画面一括翻訳 + バックグラウンド自動登録

## 🎯 基本方針

### **1. 段階的導入**
- **BASIC版**: 日英対応のみ（追加コスト¥0）
- **MULTILINGUAL版**: 15言語対応（+¥3,000/月）

### **2. 翻訳方式**
- **音声対応**: 将来のアップグレードオプション
- **テキストベース**: MVP版での実装方式
- **一括翻訳**: 管理画面での事前翻訳

### **3. コスト最適化**
- **従来案**: 月¥5,000/店舗（リアルタイム翻訳）
- **採用案**: 月¥150/店舗（事前翻訳）
- **削減率**: 97%のコスト削減

## 🏗️ システム設計

### **対応言語（15言語）**
```typescript
const SUPPORTED_LANGUAGES = [
  'ja',    // 日本語（ベース）
  'en',    // 英語
  'ko',    // 韓国語
  'zh-CN', // 中国語（簡体字）
  'zh-TW', // 中国語（繁体字）
  'th',    // タイ語
  'vi',    // ベトナム語
  'id',    // インドネシア語
  'ms',    // マレー語
  'tl',    // フィリピン語
  'es',    // スペイン語
  'fr',    // フランス語
  'de',    // ドイツ語
  'it',    // イタリア語
  'pt'     // ポルトガル語
] as const;
```

### **翻訳対象データ**
1. **メニュー商品**
   - 商品名
   - 商品説明
   - カテゴリ名
   - アレルギー情報

2. **ホテル情報**
   - 施設案内
   - サービス説明
   - 利用規約
   - 注意事項

3. **観光・案内情報**
   - 観光スポット情報
   - 交通案内
   - おすすめ情報
   - イベント情報

4. **システムUI**
   - ボタンテキスト
   - メッセージ
   - エラー表示
   - ヘルプテキスト

## 🗄️ データベース設計

### **多言語対応テーブル構造**

```sql
-- メニュー商品の多言語対応
ALTER TABLE MenuItem ADD COLUMN name_ja TEXT;
ALTER TABLE MenuItem ADD COLUMN name_en TEXT;
ALTER TABLE MenuItem ADD COLUMN name_ko TEXT;
ALTER TABLE MenuItem ADD COLUMN name_zh_cn TEXT;
ALTER TABLE MenuItem ADD COLUMN name_zh_tw TEXT;
ALTER TABLE MenuItem ADD COLUMN name_th TEXT;
ALTER TABLE MenuItem ADD COLUMN name_vi TEXT;
ALTER TABLE MenuItem ADD COLUMN name_id TEXT;
ALTER TABLE MenuItem ADD COLUMN name_ms TEXT;
ALTER TABLE MenuItem ADD COLUMN name_tl TEXT;
ALTER TABLE MenuItem ADD COLUMN name_es TEXT;
ALTER TABLE MenuItem ADD COLUMN name_fr TEXT;
ALTER TABLE MenuItem ADD COLUMN name_de TEXT;
ALTER TABLE MenuItem ADD COLUMN name_it TEXT;
ALTER TABLE MenuItem ADD COLUMN name_pt TEXT;

-- 説明文の多言語対応
ALTER TABLE MenuItem ADD COLUMN description_ja TEXT;
ALTER TABLE MenuItem ADD COLUMN description_en TEXT;
-- ... 他言語も同様

-- 翻訳管理テーブル
CREATE TABLE TranslationJobs (
  id TEXT PRIMARY KEY,
  targetTable TEXT NOT NULL,
  targetId TEXT NOT NULL,
  sourceLanguage TEXT DEFAULT 'ja',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  totalLanguages INTEGER DEFAULT 14,
  completedLanguages INTEGER DEFAULT 0,
  errorMessage TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Prismaスキーマ更新**

```prisma
model MenuItem {
  id          String   @id @default(cuid())
  
  // 多言語対応フィールド
  name_ja     String?
  name_en     String?
  name_ko     String?
  name_zh_cn  String?
  name_zh_tw  String?
  name_th     String?
  name_vi     String?
  name_id     String?
  name_ms     String?
  name_tl     String?
  name_es     String?
  name_fr     String?
  name_de     String?
  name_it     String?
  name_pt     String?
  
  description_ja  String?
  description_en  String?
  description_ko  String?
  description_zh_cn String?
  description_zh_tw String?
  description_th    String?
  description_vi    String?
  description_id    String?
  description_ms    String?
  description_tl    String?
  description_es    String?
  description_fr    String?
  description_de    String?
  description_it    String?
  description_pt    String?
  
  // 翻訳管理
  translationStatus String @default("pending")
  lastTranslatedAt  DateTime?
  
  // ... existing fields
}

model TranslationJob {
  id                String   @id @default(cuid())
  targetTable       String
  targetId          String
  sourceLanguage    String   @default("ja")
  status            String   @default("pending")
  totalLanguages    Int      @default(14)
  completedLanguages Int     @default(0)
  errorMessage      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([targetTable, targetId])
  @@index([status])
}
```

## ⚙️ 実装フロー

### **1. 管理画面での翻訳トリガー**

```typescript
// 管理画面での翻訳実行
interface TranslationTrigger {
  action: '商品登録・更新時に「15言語翻訳」ボタン表示';
  process: 'バックグラウンドジョブキューに翻訳タスク追加';
  notification: 'リアルタイム進捗通知';
}

// 実装例
const translateItem = async (itemId: string) => {
  // 翻訳ジョブを作成
  const job = await prisma.translationJob.create({
    data: {
      targetTable: 'MenuItem',
      targetId: itemId,
      status: 'pending'
    }
  });
  
  // バックグラウンドジョブキューに追加
  await addToQueue('translation', {
    jobId: job.id,
    itemId: itemId,
    languages: SUPPORTED_LANGUAGES.filter(lang => lang !== 'ja')
  });
  
  return { success: true, jobId: job.id };
};
```

### **2. バックグラウンド翻訳処理**

```typescript
// バックグラウンド翻訳ワーカー
interface TranslationWorker {
  process: 'Google Translate API を使用';
  batchSize: '5言語ずつ並列処理';
  errorHandling: '失敗時のリトライ機能';
  progress: 'リアルタイム進捗更新';
}

// 実装例
const processTranslationJob = async (jobData: TranslationJobData) => {
  const { jobId, itemId, languages } = jobData;
  
  try {
    // 元データを取得
    const sourceItem = await prisma.menuItem.findUnique({
      where: { id: itemId }
    });
    
    // 各言語に翻訳
    for (const lang of languages) {
      try {
        const translatedName = await translateText(sourceItem.name_ja, lang);
        const translatedDesc = await translateText(sourceItem.description_ja, lang);
        
        // データベースに保存
        await prisma.menuItem.update({
          where: { id: itemId },
          data: {
            [`name_${lang.replace('-', '_')}`]: translatedName,
            [`description_${lang.replace('-', '_')}`]: translatedDesc
          }
        });
        
        // 進捗更新
        await updateTranslationProgress(jobId, lang);
        
      } catch (error) {
        console.error(`Translation failed for ${lang}:`, error);
        await logTranslationError(jobId, lang, error);
      }
    }
    
    // ジョブ完了
    await completeTranslationJob(jobId);
    
  } catch (error) {
    await failTranslationJob(jobId, error);
  }
};
```

### **3. フロントエンド言語切り替え**

```typescript
// Vue I18n + データベース多言語データ
interface LanguageSwitching {
  staticContent: 'Vue I18n（locales/*.json）';
  dynamicContent: 'データベースから言語別フィールド取得';
  switching: 'リアルタイム言語切り替え';
}

// 実装例
const useMultiLanguage = () => {
  const currentLang = ref('ja');
  
  const getLocalizedText = (item: any, field: string) => {
    const langField = `${field}_${currentLang.value.replace('-', '_')}`;
    return item[langField] || item[`${field}_ja`] || item[field];
  };
  
  const switchLanguage = (lang: string) => {
    currentLang.value = lang;
    // UI言語も切り替え
    setLocale(lang);
  };
  
  return {
    currentLang,
    getLocalizedText,
    switchLanguage
  };
};
```

## 💰 コスト分析

### **翻訳コスト**

```typescript
interface TranslationCost {
  // Google Translate API料金
  apiCost: '$20 per 1M characters'; // 約¥3,000/100万文字
  
  // 1商品あたりの翻訳コスト
  perItem: {
    text: '商品名50文字 + 説明200文字 = 250文字';
    languages: '14言語翻訳 = 3,500文字';
    cost: '約¥10/商品（一回限り）';
  };
  
  // 月間推定コスト
  monthly: {
    newItems: '月10商品追加 × ¥10 = ¥100';
    updates: '月5商品更新 × ¥10 = ¥50';
    total: '月¥150程度';
  };
  
  // 年間コスト
  annual: '¥1,800/年';
  
  // 従来方式との比較
  comparison: {
    realTimeTranslation: '¥60,000/年',
    batchTranslation: '¥1,800/年',
    savings: '97%削減'
  };
}
```

### **料金プラン**

```typescript
interface PricingPlans {
  basic: {
    name: 'BASIC（日英対応）';
    monthlyFee: '¥19,800/月';
    languages: ['ja', 'en'];
    translationCost: '¥0';
    features: [
      '✅ 日英UI対応',
      '✅ 静的翻訳',
      '✅ 基本機能'
    ];
  };
  
  multilingual: {
    name: 'MULTILINGUAL（15言語対応）';
    monthlyFee: '¥22,800/月';
    languages: SUPPORTED_LANGUAGES;
    translationCost: '¥150/月（含む）';
    features: [
      '✅ 15言語UI対応',
      '✅ 管理画面一括翻訳',
      '✅ バックグラウンド自動登録',
      '✅ 翻訳費用込み',
      '✅ 進捗管理機能'
    ];
    profit: '月¥2,850の利益確保';
  };
}
```

## 🚀 実装スケジュール

### **Phase 1: 基本多言語システム（Week 1）**
- [ ] Vue I18n設定
- [ ] 言語切り替えUI実装
- [ ] 日英静的翻訳ファイル作成
- [ ] データベース多言語フィールド追加

### **Phase 2: 一括翻訳システム（Week 2）**
- [ ] 管理画面翻訳UI作成
- [ ] Google Translate API統合
- [ ] バックグラウンドジョブシステム
- [ ] 翻訳進捗管理機能

### **Phase 3: 15言語対応完成（Week 3）**
- [ ] 全言語UI翻訳
- [ ] 翻訳品質管理機能
- [ ] エラーハンドリング
- [ ] パフォーマンス最適化

## 🔧 技術仕様

### **使用技術**
- **フロントエンド**: Vue 3 + Vue I18n
- **バックエンド**: Nuxt 3 + Prisma
- **翻訳API**: Google Translate API
- **ジョブキュー**: Redis + Bull Queue（将来実装）
- **データベース**: SQLite（開発） / PostgreSQL（本番）

### **API仕様**

```typescript
// 翻訳実行API
POST /api/v1/admin/translations/translate
{
  "targetTable": "MenuItem",
  "targetId": "item_123",
  "sourceLanguage": "ja",
  "targetLanguages": ["en", "ko", "zh-CN", ...]
}

// 翻訳状況確認API
GET /api/v1/admin/translations/status/:jobId
{
  "jobId": "job_123",
  "status": "processing",
  "progress": {
    "total": 14,
    "completed": 8,
    "failed": 1
  }
}

// 多言語データ取得API
GET /api/v1/menu/items?lang=ko
{
  "items": [
    {
      "id": "item_123",
      "name": "김치찌개", // 韓国語
      "description": "매운 김치찌개입니다" // 韓国語
    }
  ]
}
```

## 📊 品質管理

### **翻訳品質確保**
1. **事前チェック**: 翻訳前のテキスト検証
2. **翻訳後確認**: 管理画面での翻訳結果確認・修正機能
3. **フォールバック**: 翻訳失敗時は日本語表示
4. **ログ管理**: 翻訳エラーの詳細ログ

### **パフォーマンス最適化**
1. **キャッシュ**: 翻訳結果のキャッシュ
2. **遅延読み込み**: 必要な言語のみ読み込み
3. **CDN**: 静的翻訳ファイルのCDN配信
4. **インデックス**: 多言語フィールドのデータベースインデックス

## 🎯 将来の拡張性

### **追加予定機能**
- **音声対応**: 将来のアップグレードオプション
- **AI翻訳**: より高精度な翻訳エンジン
- **地域対応**: 地域別の表現調整
- **翻訳メモリ**: 過去の翻訳結果活用

### **スケーラビリティ**
- **新言語追加**: 設定ファイルでの簡単追加
- **翻訳プロバイダー**: 複数翻訳サービス対応
- **分散処理**: 大量翻訳の並列処理
- **API制限**: レート制限対応

---

## 📝 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2025-01-09 | 初版作成 | AI Assistant |

---

**承認者**: プロジェクトマネージャー  
**実装開始日**: 2025-01-10  
**完了予定日**: 2025-01-31 