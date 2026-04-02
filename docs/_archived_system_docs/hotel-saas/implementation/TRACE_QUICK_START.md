# 🚀 トレース機能 クイックスタートガイド

**作成日**: 2025年10月2日
**所要時間**: 約30分
**難易度**: 初級

---

## 🎯 このガイドの目的

トレース機能を最速で使い始めるための手順書です。

---

## ⚡ クイックスタート（3ステップ）

### Step 1: ブラウザでトレース準備（5分）

#### 1-1. ログディレクトリ作成

```bash
mkdir -p /Users/kaneko/hotel-kanri/logs/trace/dashboard_$(date +%Y%m%d_%H%M%S)
```

#### 1-2. 記録先を確認

```bash
TRACE_DIR=$(ls -td /Users/kaneko/hotel-kanri/logs/trace/dashboard_* | head -1)
echo "ログ保存先: ${TRACE_DIR}"
```

---

### Step 2: トレース実行（15分）

#### 2-1. hotel-saas起動（トレース有効化）

```bash
cd /Users/kaneko/hotel-saas
export NODE_ENV=development
export ENABLE_TRACE=true
npm run dev 2>&1 | tee ${TRACE_DIR}/hotel-saas.log
```

**確認ポイント**:
- サーバーが `http://0.0.0.0:3100` で起動
- コンソールに `[TRACE] トレース機能を有効化しました` が表示される

#### 2-2. ブラウザでトレース実行

1. **ブラウザで開発者ツールを開く**（F12 または Cmd+Option+I）

2. **Console タブを選択**

3. **"Preserve log" をON** にする
   - これにより、ページ遷移後もログが保持されます

4. **`http://localhost:3100/admin/login` にアクセス**

5. **ログイン実行**
   - メールアドレス: `admin@omotenasuai.com`
   - パスワード: `admin123`

6. **ダッシュボードが表示されるまで待つ**
   - 統計データの読み込みが完了するまで待機

7. **コンソールログを全て選択してコピー**
   - Ctrl+A（Cmd+A）で全選択
   - Ctrl+C（Cmd+C）でコピー

8. **テキストエディタに貼り付けて保存**
   ```bash
   # VS Code等のテキストエディタで開く
   code ${TRACE_DIR}/browser.log
   # 貼り付けて保存
   ```

**期待されるログ例**:
```
[TRACE] 実行トレース開始
[TRACE] 開始時刻: 2025-10-02T10:30:00.000Z
================================================================================
[TRACE] [T+0ms] [2025-10-02T10:30:00.000Z] [hotel-saas] admin/index.vue:onMounted()
[TRACE] [T+0ms]   └─ ダッシュボードマウント
[TRACE] [T+5ms] [2025-10-02T10:30:00.005Z] [hotel-saas] admin/index.vue:fetchStats()
[TRACE] [T+5ms]   └─ 統計取得開始
...
```

---

### Step 3: ログ統合と分析（5分）

#### 3-1. ログ統合スクリプト実行

```bash
cd /Users/kaneko/hotel-saas
./scripts/monitoring/merge-trace-logs.sh ${TRACE_DIR}
```

**処理内容**:
- `browser.log`, `hotel-saas.log` を時系列で統合
- `merged.log` を生成
- `analysis.md` 分析レポートを生成

#### 3-2. 結果確認

```bash
# 統合ログ確認
cat ${TRACE_DIR}/merged.log

# 分析レポート確認
cat ${TRACE_DIR}/analysis.md
```

---

## 📊 期待される結果

### 統合ログ（merged.log）

```
[TRACE] [T+0ms] [hotel-saas] admin/index.vue:onMounted()
[TRACE] [T+0ms]   └─ ダッシュボードマウント

[TRACE] [T+5ms] [hotel-saas] admin/index.vue:fetchStats()
[TRACE] [T+5ms]   └─ 統計取得開始
[TRACE] [T+5ms]      データ: {"isAuthenticated":"checking"}

[TRACE] [T+10ms] [hotel-saas] admin/index.vue:fetchStats()
[TRACE] [T+10ms]   └─ 認証初期化開始

[TRACE] [T+50ms] [hotel-saas] admin/index.vue:fetchStats()
[TRACE] [T+50ms]   └─ 認証成功、並列API開始

[TRACE] [T+55ms] [hotel-saas] API リクエスト
[TRACE] [T+55ms]   └─ GET /api/v1/admin/summary

[TRACE] [T+58ms] [hotel-saas] API リクエスト
[TRACE] [T+58ms]   └─ GET /api/v1/admin/devices/count

[TRACE] [T+61ms] [hotel-saas] API リクエスト
[TRACE] [T+61ms]   └─ GET /api/v1/admin/orders

[TRACE] [T+64ms] [hotel-saas] API リクエスト
[TRACE] [T+64ms]   └─ GET /api/v1/admin/orders/monthly-count

[TRACE] [T+150ms] [hotel-saas] admin/index.vue:fetchStats()
[TRACE] [T+150ms]   └─ 並列API完了

[TRACE] [T+155ms] [hotel-saas] API レスポンス
[TRACE] [T+155ms]   └─ Status: 200
[TRACE] [T+155ms]      データ: {"totalOrders":42,"totalRevenue":125400}

[TRACE] [T+160ms] [hotel-saas] admin/index.vue
[TRACE] [T+160ms]   └─ 変数変化: todayOrders
[TRACE] [T+160ms]      変更前: 0
[TRACE] [T+160ms]      変更後: 42

[TRACE] [T+165ms] [hotel-saas] admin/index.vue
[TRACE] [T+165ms]   └─ 変数変化: todaySales
[TRACE] [T+165ms]      変更前: 0
[TRACE] [T+165ms]      変更後: 125400

[TRACE] [T+200ms] [hotel-saas] admin/index.vue:fetchStats()
[TRACE] [T+200ms]   └─ 統計取得完了
```

---

## 🎯 トレース結果の活用

### 1. パフォーマンス分析

統合ログから以下を分析できます：

- **並列API呼び出しの効果**: T+150ms - T+55ms = **95ms**（4本のAPIを並列実行）
- **認証初期化時間**: T+50ms - T+10ms = **40ms**
- **データ設定時間**: T+200ms - T+150ms = **50ms**
- **合計所要時間**: **200ms**

### 2. SSOTへの反映

トレース結果を `/Users/kaneko/hotel-kanri/docs/03_ssot/01_core_features/SSOT_SAAS_DASHBOARD.md` に追加：

```markdown
## 🎯 ダッシュボード読み込みフロー（実行トレース結果）

**実行日時**: 2025年10月2日 XX:XX:XX
**テストケース**: ログイン直後のダッシュボード表示

[完全なトレース結果を貼り付け]

**パフォーマンス分析**:
- 合計所要時間: 200ms
- 並列API呼び出し: 95ms（4本）
- 認証初期化: 40ms
- データ設定: 50ms

**最適化の余地**:
- インデックス追加でクエリを50%削減可能
- Redisキャッシュで初回以降90%削減可能
```

### 3. ボトルネック特定

トレースログから以下のボトルネックを特定できます：

- 遅いAPIエンドポイント
- 認証処理の遅延
- データベースクエリの遅延
- 不要な処理の特定

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

# サーバー再起動
npm run dev
```

### ブラウザコンソールにログが表示されない

**確認項目**:
1. 開発者ツールが開いているか
2. Console タブが選択されているか
3. "Preserve log" がONになっているか
4. フィルタリングされていないか（"All levels" を選択）

**解決方法**:
```javascript
// ブラウザコンソールで直接確認
window.ENABLE_TRACE = true;
```

### ログファイルが見つからない

```bash
# ログディレクトリを確認
ls -la /Users/kaneko/hotel-kanri/logs/trace/

# 最新のログディレクトリを確認
ls -td /Users/kaneko/hotel-kanri/logs/trace/dashboard_* | head -1

# ログディレクトリの内容確認
ls -la ${TRACE_DIR}
```

### merge-trace-logs.shが実行できない

```bash
# 実行権限を確認
ls -l /Users/kaneko/hotel-saas/scripts/monitoring/merge-trace-logs.sh

# 実行権限を付与
chmod +x /Users/kaneko/hotel-saas/scripts/monitoring/merge-trace-logs.sh

# 再実行
./scripts/monitoring/merge-trace-logs.sh ${TRACE_DIR}
```

---

## 📚 詳細ガイド

より詳細な実装方法は以下を参照：

- **実装完了レポート**: `/Users/kaneko/hotel-saas/docs/implementation/TRACE_IMPLEMENTATION_COMPLETE.md`
- **実行トレース駆動SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md`
- **dev/README.md**: `/Users/kaneko/hotel-saas/dev/README.md`

---

## 🚀 次のステップ

### 1. hotel-common側のトレース実装

hotel-common側のAPIエンドポイントにもトレースログを追加すると、より詳細な分析が可能になります。

詳細は `/Users/kaneko/hotel-saas/docs/implementation/TRACE_IMPLEMENTATION_COMPLETE.md` の「次のステップ」を参照。

### 2. 他のページへのトレース追加

ダッシュボード以外のページ（注文管理、メニュー管理等）にもトレースログを追加できます。

```vue
<script setup lang="ts">
import { useTraceLogger } from '~/dev/composables/useTraceLogger'

const { traceLog, startTrace } = useTraceLogger()

onMounted(() => {
  startTrace()
  traceLog('hotel-saas', 'orders/index.vue:onMounted()', '注文管理ページマウント')
})
</script>
```

### 3. 自動テストへの統合

トレース機能を自動テストに統合すると、継続的なパフォーマンス監視が可能になります。

---

## ✅ チェックリスト

トレース実行前の確認：

- [ ] hotel-saasサーバーが起動している
- [ ] `ENABLE_TRACE=true` が設定されている
- [ ] ブラウザ開発者ツールが開いている
- [ ] "Preserve log" がONになっている
- [ ] ログ保存先ディレクトリが作成されている

トレース実行後の確認：

- [ ] browser.logにトレースログが記録されている
- [ ] hotel-saas.logにサーバーログが記録されている
- [ ] merge-trace-logs.shが正常に実行できる
- [ ] merged.logに統合ログが生成されている
- [ ] analysis.mdに分析レポートが生成されている

---

**最終更新**: 2025年10月2日
**作成者**: AI Assistant (Sun)
**ステータス**: 実行準備完了 ✅

