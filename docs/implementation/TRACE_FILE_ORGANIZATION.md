# 📁 トレースファイル配置ルール

**作成日**: 2025年10月2日  
**目的**: トレースファイルが本番ソースコードと混ざらないようにする

---

## 🎯 基本方針

### 原則

1. **トレースコードは開発環境のみで有効**
2. **本番ビルドには含めない**
3. **トレース専用ディレクトリで管理**
4. **既存ソースへの影響を最小化**

---

## 📁 推奨ディレクトリ構造

### hotel-kanri（管理リポジトリ）

```
/Users/kaneko/hotel-kanri/
├── scripts/
│   └── monitoring/
│       ├── trace-logger.js          ✅ トレースロガー本体
│       ├── run-trace.sh             ✅ 実行スクリプト
│       └── merge-trace-logs.sh      ✅ ログ統合スクリプト
├── composables/
│   └── useTraceLogger.ts            ❌ ここではなく下記の場所へ移動
└── tools/
    └── trace/                        ✅ 新規作成（推奨）
        ├── composables/
        │   └── useTraceLogger.ts    ✅ hotel-saas用
        └── utils/
            └── traceLogger.js       ✅ hotel-common用
```

---

### hotel-saas（フロントエンド）

#### パターンA: 開発用ディレクトリ分離（推奨）

```
/Users/kaneko/hotel-saas/
├── composables/
│   ├── useSessionAuth.ts            ✅ 本番コード（トレースなし）
│   └── useApiClient.ts              ✅ 本番コード（トレースなし）
├── dev/                              ✅ 新規作成（開発専用）
│   ├── composables/
│   │   └── useTraceLogger.ts        ✅ トレース専用
│   └── pages/
│       └── admin/
│           └── index.trace.vue      ✅ トレース版ページ（開発用）
└── pages/
    └── admin/
        └── index.vue                 ✅ 本番コード
```

**メリット**:
- 本番コードとトレースコードが完全分離
- `.gitignore`で`dev/`ディレクトリを除外可能
- ビルド設定で`dev/`を除外すれば本番に含まれない

---

#### パターンB: 環境変数で制御（シンプル）

```
/Users/kaneko/hotel-saas/
├── composables/
│   ├── useSessionAuth.ts            ✅ 本番コード（条件付きトレース）
│   ├── useApiClient.ts              ✅ 本番コード（条件付きトレース）
│   └── useTraceLogger.ts            ✅ トレースロガー
└── pages/
    └── admin/
        └── index.vue                 ✅ 本番コード（条件付きトレース）
```

**実装例**（useSessionAuth.ts）:
```typescript
import { useTraceLogger } from '~/composables/useTraceLogger';

export const useSessionAuth = () => {
  // トレース機能（開発環境のみ）
  const trace = process.env.NODE_ENV === 'development' && process.env.ENABLE_TRACE === 'true'
    ? useTraceLogger()
    : null;

  const login = async (email: string, password: string) => {
    trace?.traceLog('browser', 'useSessionAuth.ts:login()', 'ログイン開始');
    
    // 本番コード
    const response = await $fetch('/api/v1/auth/login', { ... });
    
    trace?.traceLog('browser', 'useSessionAuth.ts:login()', 'ログイン完了');
    
    return response;
  };
  
  return { login };
};
```

**メリット**:
- シンプルで導入しやすい
- 本番ビルドでは`useTraceLogger`が空関数になり、オーバーヘッドなし

**デメリット**:
- 本番コードにトレースコードが残る（無効化されているが）

---

### hotel-common（バックエンド）

#### パターンA: 開発用ディレクトリ分離（推奨）

```
/Users/kaneko/hotel-common/
├── src/
│   ├── routes/
│   │   └── systems/
│   │       └── saas/
│   │           └── admin-dashboard.routes.ts  ✅ 本番コード
│   └── utils/
│       └── logger.ts                           ✅ 本番用ロガー
└── dev/                                         ✅ 新規作成（開発専用）
    ├── utils/
    │   └── traceLogger.js                      ✅ トレース専用
    └── routes/
        └── admin-dashboard.trace.routes.ts     ✅ トレース版ルート
```

---

#### パターンB: 環境変数で制御（シンプル）

```
/Users/kaneko/hotel-common/
├── src/
│   ├── routes/
│   │   └── systems/
│   │       └── saas/
│   │           └── admin-dashboard.routes.ts  ✅ 本番コード（条件付き）
│   └── utils/
│       ├── logger.ts                           ✅ 本番用ロガー
│       └── traceLogger.js                      ✅ トレース専用（条件付き）
```

**実装例**（admin-dashboard.routes.ts）:
```typescript
// 条件付きインポート
const traceLogger = process.env.NODE_ENV === 'development' && process.env.ENABLE_TRACE === 'true'
  ? require('../../utils/traceLogger')
  : { traceLog: () => {}, traceDbQuery: () => {}, traceDbResult: () => {} };

const { traceLog, traceDbQuery, traceDbResult } = traceLogger;

router.get('/api/v1/admin/summary', requireAdmin(), async (req, res) => {
  traceLog('hotel-common', 'admin-dashboard.routes.ts:summary', 'API開始');
  
  // 本番コード
  const result = await db.order.count({ ... });
  
  traceLog('hotel-common', 'admin-dashboard.routes.ts:summary', 'API完了');
  
  res.json({ ... });
});
```

---

## 🎯 推奨アプローチ

### 開発初期・学習目的 → **パターンB（環境変数制御）**

**理由**:
- シンプルで導入しやすい
- すぐに使い始められる
- トレースコードの追加・削除が容易

**注意点**:
- 本番コードにトレースコードが残る（無効化されているが）
- コードレビューで混乱する可能性

---

### 本格運用・チーム開発 → **パターンA（ディレクトリ分離）**

**理由**:
- 本番コードが汚染されない
- トレースコードの管理が明確
- ビルド設定で完全に除外可能

**注意点**:
- 初期セットアップがやや複雑
- トレース版と本番版の同期が必要

---

## 🛠️ 実装手順

### パターンB（環境変数制御）を採用する場合

#### 1. hotel-kanriでファイル再配置

```bash
# トレース専用ディレクトリ作成
mkdir -p /Users/kaneko/hotel-kanri/tools/trace/{composables,utils}

# ファイル移動
mv /Users/kaneko/hotel-kanri/composables/useTraceLogger.ts \
   /Users/kaneko/hotel-kanri/tools/trace/composables/

cp /Users/kaneko/hotel-kanri/scripts/monitoring/trace-logger.js \
   /Users/kaneko/hotel-kanri/tools/trace/utils/
```

#### 2. hotel-saasへのインストール

```bash
# トレースロガーをコピー
cp /Users/kaneko/hotel-kanri/tools/trace/composables/useTraceLogger.ts \
   /Users/kaneko/hotel-saas/composables/
```

#### 3. hotel-commonへのインストール

```bash
# トレースロガーをコピー
cp /Users/kaneko/hotel-kanri/tools/trace/utils/traceLogger.js \
   /Users/kaneko/hotel-common/src/utils/
```

#### 4. .gitignoreに追加（オプション）

hotel-saasの`.gitignore`:
```
# トレース機能（開発用）
composables/useTraceLogger.ts
```

hotel-commonの`.gitignore`:
```
# トレース機能（開発用）
src/utils/traceLogger.js
```

---

### パターンA（ディレクトリ分離）を採用する場合

#### 1. 開発用ディレクトリ作成

```bash
# hotel-saas
mkdir -p /Users/kaneko/hotel-saas/dev/composables

# hotel-common
mkdir -p /Users/kaneko/hotel-common/dev/utils
```

#### 2. トレースファイルを配置

```bash
# hotel-saas
cp /Users/kaneko/hotel-kanri/tools/trace/composables/useTraceLogger.ts \
   /Users/kaneko/hotel-saas/dev/composables/

# hotel-common
cp /Users/kaneko/hotel-kanri/tools/trace/utils/traceLogger.js \
   /Users/kaneko/hotel-common/dev/utils/
```

#### 3. .gitignoreに追加

hotel-saasの`.gitignore`:
```
# 開発用ディレクトリ（トレース等）
/dev/
```

hotel-commonの`.gitignore`:
```
# 開発用ディレクトリ（トレース等）
/dev/
```

#### 4. ビルド設定で除外

`nuxt.config.ts`（hotel-saas）:
```typescript
export default defineNuxtConfig({
  build: {
    // dev/ディレクトリを本番ビルドから除外
    exclude: ['dev/**']
  }
});
```

---

## 📋 チェックリスト

### 本番環境への混入防止

- [ ] トレースファイルが専用ディレクトリに配置されている
- [ ] `.gitignore`でトレースファイルを除外している
- [ ] `ENABLE_TRACE`環境変数が本番環境で`false`
- [ ] ビルド設定でトレースファイルを除外している
- [ ] 本番ビルド後、トレースコードが含まれていないことを確認

### 確認コマンド

```bash
# 本番ビルドを実行
npm run build

# トレース関連ファイルが含まれていないか確認
find .nuxt -name "*trace*" -o -name "*Trace*"
find dist -name "*trace*" -o -name "*Trace*"

# 結果が空なら OK
```

---

## 🎯 まとめ

### 推奨構成

```
hotel-kanri（管理リポジトリ）
├── tools/trace/          ✅ トレースツール配置場所
│   ├── composables/
│   └── utils/
└── scripts/monitoring/   ✅ 実行スクリプト

hotel-saas & hotel-common
├── dev/                  ✅ 開発専用（パターンA）
│   └── ...
または
├── composables/          ✅ 条件付きトレース（パターンB）
│   └── useTraceLogger.ts （ENABLE_TRACE制御）
```

### 本番環境での安全性

- ✅ 環境変数`ENABLE_TRACE=false`で完全無効化
- ✅ `.gitignore`でトレースファイル除外
- ✅ ビルド設定で除外
- ✅ トレースコードのオーバーヘッドなし

---

**最終更新**: 2025年10月2日  
**作成者**: AI Assistant (Luna)  
**ステータス**: 完成

