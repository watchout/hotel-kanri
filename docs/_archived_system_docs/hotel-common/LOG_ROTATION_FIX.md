# ログローテーション機能とEPIPEエラー修正

## 📅 修正日時
2025-10-09

## 🐛 問題の概要

### 発生した問題
1. **ディスク容量逼迫**: `server-monitoring.log`が153GBまで肥大化
2. **プロセス暴走**: integration-serverプロセスが複数起動してCPU 90%以上を消費
3. **無限ループ**: EPIPEエラーがconsole出力時に再発生し、ログが無限に書き込まれる

### 根本原因
```typescript
// 問題のあったコード
process.on('SIGPIPE', () => {
  this.logToFile('SIGNAL_RECEIVED', {...})
  console.log(`シグナル受信: SIGPIPE`)  // ← これがEPIPEエラーを再発生させる
})

process.on('uncaughtException', (error) => {
  console.error(`未処理例外:`, error)    // ← EPIPEエラー時にまたエラー発生
  this.logToFile('UNCAUGHT_EXCEPTION', error)
})
```

**無限ループの流れ:**
1. EPIPEエラー発生
2. `uncaughtException`ハンドラーが`console.error`実行
3. console出力がEPIPEエラーを再発生（パイプが壊れているため）
4. 再び`uncaughtException`がトリガー
5. 無限ループ → 153GBのログファイル

## ✅ 実施した修正

### 1. EPIPEエラーの無限ループ防止

```typescript
process.on('uncaughtException', (error) => {
  // EPIPEエラーの場合はconsole出力をスキップ
  const isEPIPE = error.message && error.message.includes('EPIPE')

  if (!isEPIPE) {
    try {
      console.error(`🚨 未処理例外:`, error)
    } catch (consoleError) {
      // console出力自体が失敗した場合は無視
    }
  }

  // ログファイルには記録（console出力なし）
  this.logToFile('UNCAUGHT_EXCEPTION', error)
})
```

### 2. SIGPIPEシグナルの適切な処理

```typescript
process.on('SIGPIPE', () => {
  // ログファイルには記録
  this.logToFile('SIGNAL_RECEIVED', {...})

  // console出力はスキップ（EPIPEエラー防止）
  // console.log を実行しない
})
```

### 3. ログローテーション機能の追加

#### 日付別ログファイル
```typescript
// 変更前: server-monitoring.log（単一ファイル、無制限）
// 変更後: server-monitoring-2025-10-09.log（日付別）
const dateStr = new Date().toISOString().split('T')[0]
const logFile = path.join(process.cwd(), 'logs', `server-monitoring-${dateStr}.log`)
```

#### ファイルサイズ制限（100MB）
```typescript
const maxSize = 100 * 1024 * 1024 // 100MB
if (fs.existsSync(logFile)) {
  const stats = fs.statSync(logFile)
  if (stats.size > maxSize) {
    // サイズ超過時はアーカイブ
    const archiveFile = logFile.replace('.log', `-${Date.now()}.log`)
    fs.renameSync(logFile, archiveFile)
  }
}
```

#### 古いログの自動削除（7日以上前）
```typescript
private cleanupOldLogs(): void {
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7日
  files.forEach((file: string) => {
    if (file.startsWith('server-monitoring-') && file.endsWith('.log')) {
      const age = now - stats.mtime.getTime()
      if (age > maxAge) {
        fs.unlinkSync(filePath) // 7日以上前のログを削除
      }
    }
  })
}
```

## 📊 修正効果

### 応急処置（即時効果）
- ✅ 暴走プロセス停止: 8個のintegration-serverプロセスを全て停止
- ✅ ログファイル削除: 152GB削減（153GB → 112KB）
- ✅ ディスク容量回復: 99%使用 → 6%使用（175GB空き容量確保）

### 根本対策（再発防止）
- ✅ EPIPEエラー無限ループ防止: console出力を安全にラップ
- ✅ ログファイル肥大化防止: 日付別ローテーション + 100MB制限
- ✅ ディスク容量管理: 7日以上前のログ自動削除
- ✅ システム安定性向上: エラー処理の堅牢化

## 🔍 ログファイル命名規則

```
logs/
├── server-monitoring-2025-10-09.log          # 今日のログ
├── server-monitoring-2025-10-08.log          # 昨日のログ
├── server-monitoring-2025-10-07.log          # 2日前のログ
├── server-monitoring-2025-10-07-1728234567.log  # サイズ超過でアーカイブ
└── ... (7日以上前は自動削除)
```

## 🚀 運用ガイド

### 正常なプロセス起動
```bash
cd /Users/kaneko/hotel-common
npm run dev  # 開発モード
# または
npm start    # 本番モード
```

### プロセス確認
```bash
ps aux | grep integration-server
```

### ログ確認
```bash
# 今日のログ
tail -f logs/server-monitoring-$(date +%Y-%m-%d).log

# ログサイズ確認
du -sh logs/
```

### 定期メンテナンス（不要）
- ログローテーション: 自動実行（日次）
- ログ削除: 自動実行（7日以上前）
- 手動介入: 不要

## ⚠️ 注意事項

1. **複数プロセス起動の防止**
   - integration-serverは常に1プロセスのみ起動
   - 起動前に既存プロセスを確認: `ps aux | grep integration-server`
   - 必要に応じて停止: `pkill -f integration-server`

2. **バックグラウンド実行時の注意**
   - 標準出力/エラーをファイルにリダイレクト
   - 例: `npm run dev > logs/server.log 2>&1 &`
   - または、PM2などのプロセスマネージャー使用を推奨

3. **ログ監視**
   - ログファイルが100MBに近づいたら自動アーカイブ
   - 異常な肥大化が見られたら調査が必要

## 🔗 関連ファイル

- `/Users/kaneko/hotel-common/src/server/integration-server.ts` - 修正対象ファイル
- `/Users/kaneko/hotel-common/logs/` - ログディレクトリ
- `/Users/kaneko/hotel-common/README.md` - システム概要

## 📚 参考情報

### EPIPEエラーとは
- **EPIPE (Broken Pipe)**: パイプの受信側が閉じられた状態で書き込みを試みた際に発生
- 原因: プロセスの標準出力/エラーのパイプが切断された状態
- 対策: console出力をtry-catchで保護し、EPIPEエラー時は出力をスキップ

### 今回のケースでの発生原因
- 複数のintegration-serverプロセスが同時に起動
- バックグラウンド実行でパイプが不安定
- EPIPE発生時のconsole出力が再度EPIPEを引き起こす無限ループ

---

**修正完了日**: 2025-10-09
**修正者**: AI Assistant (☀️ Sun)
**検証状態**: ✅ TypeScriptコンパイル成功、Lintエラーなし

