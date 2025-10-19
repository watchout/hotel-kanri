# 🚀 トレース機能 クイックスタートガイド

**作成日**: 2025年10月2日  
**所要時間**: 約30分  
**難易度**: 初級

---

## 🎯 このガイドの目的

トレース機能を最速で使い始めるための手順書です。

---

## ⚡ クイックスタート（3ステップ）

### Step 1: トレースログを追加（10分）

#### 1-1. hotel-saas側

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/index.vue`

以下のコードを追加：

```vue
<script setup lang="ts">
// 先頭に追加
import { useTraceLogger } from '~/composables/useTraceLogger';

const { traceLog, traceVariableChange, traceApiRequest, traceApiResponse, startTrace } = useTraceLogger();

// onMounted内の先頭に追加
onMounted(() => {
  startTrace();
  traceLog('browser', 'admin/index.vue:onMounted()', 'ダッシュボードマウント');
});

// fetchStats関数内に追加
const fetchStats = async () => {
  traceLog('browser', 'admin/index.vue:fetchStats()', '統計取得開始', {
    isAuthenticated: isAuthenticated.value
  });
  
  // 既存のコード...
  
  traceLog('browser', 'admin/index.vue:fetchStats()', '並列API開始');
  
  const [statsResponse, deviceResponse, pendingResponse, monthlyResponse] = await Promise.all([...]);
  
  traceLog('browser', 'admin/index.vue:fetchStats()', '並列API完了');
  
  // データ設定前
  traceVariableChange('browser', 'admin/index.vue', 'todayOrders', todayOrders.value, statsResponse.data?.totalOrders || 0);
  
  // 既存のコード...
  
  traceLog('browser', 'admin/index.vue:fetchStats()', '統計取得完了');
};
</script>
```

#### 1-2. hotel-common側

**ファイル**: `/Users/kaneko/hotel-common/src/routes/systems/saas/admin-dashboard.routes.ts`

先頭に追加：

```typescript
const { traceLog, traceDbQuery, traceDbResult } = require('../../utils/traceLogger');
```

各API内に追加：

```typescript
router.get('/api/v1/admin/summary', requireAdmin(), async (req, res) => {
  traceLog('hotel-common', 'admin-dashboard.routes.ts:summary', 'API開始', {
    tenantId: req.user.tenant_id
  });
  
  traceDbQuery('postgresql', 'SELECT COUNT', 'Order');
  
  const result = await db.order.count({...});
  
  traceDbResult('postgresql', { count: result });
  
  traceLog('hotel-common', 'admin-dashboard.routes.ts:summary', 'レスポンス送信');
  
  res.json({...});
});
```

#### 1-3. useTraceLogger をhotel-saasにコピー

```bash
cp /Users/kaneko/hotel-kanri/composables/useTraceLogger.ts /Users/kaneko/hotel-saas/composables/
```

#### 1-4. trace-logger.js をhotel-commonにコピー

```bash
cp /Users/kaneko/hotel-kanri/scripts/monitoring/trace-logger.js /Users/kaneko/hotel-common/src/utils/traceLogger.js
```

---

### Step 2: トレース実行（10分）

#### 2-1. ログディレクトリ作成

```bash
mkdir -p /Users/kaneko/hotel-kanri/logs/trace/dashboard_$(date +%Y%m%d_%H%M%S)
```

記録先を確認：
```bash
TRACE_DIR=$(ls -td /Users/kaneko/hotel-kanri/logs/trace/dashboard_* | head -1)
echo "ログ保存先: ${TRACE_DIR}"
```

#### 2-2. ターミナル1: hotel-common起動

```bash
cd /Users/kaneko/hotel-common
export NODE_ENV=development
export ENABLE_TRACE=true
npm run dev 2>&1 | tee ${TRACE_DIR}/hotel-common.log
```

#### 2-3. ターミナル2: hotel-saas起動

```bash
cd /Users/kaneko/hotel-saas
export NODE_ENV=development
export ENABLE_TRACE=true
npm run dev 2>&1 | tee ${TRACE_DIR}/hotel-saas.log
```

#### 2-4. ブラウザでトレース実行

1. ブラウザで開発者ツールを開く（F12）
2. Console タブで "Preserve log" をON
3. `http://localhost:3000/admin/login` にアクセス
4. ログイン実行
5. ダッシュボードが表示されるまで待つ
6. コンソールログを全て選択してコピー
7. テキストエディタに貼り付けて `${TRACE_DIR}/browser.log` として保存

---

### Step 3: ログ統合と分析（5分）

```bash
cd /Users/kaneko/hotel-kanri
./scripts/monitoring/merge-trace-logs.sh ${TRACE_DIR}
```

#### 結果確認

```bash
# 統合ログ
cat ${TRACE_DIR}/merged.log

# 分析レポート
cat ${TRACE_DIR}/analysis.md
```

---

## 📊 期待される結果

統合ログには以下のような時系列データが記録されます：

```
[TRACE] [T+0ms] [browser] admin/index.vue:onMounted()
[TRACE] [T+0ms]   └─ ダッシュボードマウント

[TRACE] [T+5ms] [browser] admin/index.vue:fetchStats()
[TRACE] [T+5ms]   └─ 統計取得開始

[TRACE] [T+20ms] [browser] admin/index.vue:fetchStats()
[TRACE] [T+20ms]   └─ 並列API開始

[TRACE] [T+45ms] [hotel-common] admin-dashboard.routes.ts:summary
[TRACE] [T+45ms]   └─ API開始

[TRACE] [T+50ms] [POSTGRESQL] クエリ実行
[TRACE] [T+50ms]   └─ SELECT COUNT Order

[TRACE] [T+85ms] [POSTGRESQL] クエリ結果
[TRACE] [T+85ms]   └─ 結果: {"count":42}

[TRACE] [T+105ms] [browser] admin/index.vue:fetchStats()
[TRACE] [T+105ms]   └─ 並列API完了

[TRACE] [T+110ms] [browser] admin/index.vue
[TRACE] [T+110ms]   └─ 変数変化: todayOrders
[TRACE] [T+110ms]      変更前: 0
[TRACE] [T+110ms]      変更後: 42

[TRACE] [T+135ms] [browser] admin/index.vue:fetchStats()
[TRACE] [T+135ms]   └─ 統計取得完了
```

---

## 🎯 トレース結果の活用

### 1. パフォーマンス分析

- 並列API呼び出しの効果: T+105ms - T+20ms = **85ms**
- PostgreSQLクエリ: T+85ms - T+50ms = **35ms**
- データ設定: T+135ms - T+105ms = **30ms**

### 2. SSOTへの反映

トレース結果を `/Users/kaneko/hotel-kanri/docs/03_ssot/01_core_features/SSOT_SAAS_DASHBOARD.md` に追加：

```markdown
## 🎯 ダッシュボード読み込みフロー（実行トレース結果）

**実行日時**: 2025年10月2日 XX:XX:XX
**テストケース**: ログイン直後のダッシュボード表示

[完全なトレース結果を貼り付け]

**パフォーマンス分析**:
- 合計所要時間: 135ms
- 並列API呼び出し: 85ms（4本）
- PostgreSQLクエリ平均: 35ms

**最適化の余地**:
- インデックス追加でクエリを50%削減可能
- Redisキャッシュで初回以降90%削減可能
```

---

## 🔧 トラブルシューティング

### トレースログが出力されない

**確認項目**:
```bash
# 環境変数が設定されているか確認
echo $NODE_ENV        # development
echo $ENABLE_TRACE    # true
```

**解決方法**:
```bash
# 再度環境変数を設定
export NODE_ENV=development
export ENABLE_TRACE=true
```

### ログファイルが見つからない

```bash
# ログディレクトリを確認
ls -la /Users/kaneko/hotel-kanri/logs/trace/

# 最新のログディレクトリを確認
ls -td /Users/kaneko/hotel-kanri/logs/trace/dashboard_* | head -1
```

---

## 📚 詳細ガイド

より詳細な実装方法は以下を参照：

- **認証機能**: `/Users/kaneko/hotel-kanri/docs/implementation/TRACE_IMPLEMENTATION_GUIDE.md`
- **ダッシュボード**: `/Users/kaneko/hotel-kanri/docs/implementation/DASHBOARD_TRACE_GUIDE.md`
- **実行トレース手法**: `/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md`

---

**最終更新**: 2025年10月2日  
**作成者**: AI Assistant (Luna)  
**ステータス**: 実行準備完了

