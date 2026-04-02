# 実行トレースログ

## 記録日時
20251002_145452

## 目的
ログイン機能の完全なトレースを記録し、SSOT作成の精度を向上させる

## ログファイル

- `hotel-common.log`: hotel-common（バックエンド）のログ
- `hotel-saas.log`: hotel-saas（フロントエンド）のログ
- `redis.log`: Redisの操作ログ
- `browser.log`: ブラウザコンソールのログ
- `merged.log`: 統合された時系列ログ（merge-trace-logs.shで生成）

## ログの見方

各ログは以下の形式で出力されます：

```
[TRACE] [T+XXXms] [system] location
[TRACE] [T+XXXms]   └─ action
[TRACE] [T+XXXms]      データ: {...}
```

- `T+XXXms`: トレース開始からの経過時間
- `system`: システム名（browser, hotel-saas, hotel-common, redis, postgresql）
- `location`: 処理場所（ファイル名:行番号、関数名等）
- `action`: アクション内容
- `データ`: 追加データ（オプション）

## 次のステップ

1. ログを確認し、処理フローを理解する
2. トレース結果をSSOTに反映する
3. 問題点や落とし穴を明確化する

## 参考ドキュメント

- [実行トレース駆動型SSOT作成手法](/Users/kaneko/hotel-kanri/docs/03_ssot/EXECUTION_TRACE_DRIVEN_SSOT.md)
- [SSOT作成ルール](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md)
