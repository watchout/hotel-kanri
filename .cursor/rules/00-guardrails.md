## Evidence→Plan→Act（EPA）運用ガード
- 出力順は固定：**Evidence → Plan → Act**
- Evidence: 要点3つ＋引用（パス＋行範囲）で最大5行
- Plan: 最大5ステップ
- Act: 既定は **Diff only**（パッチのみ）
- 会話では Task 指定に **alias** を使ってよい（例: `Task: r1`）。
  アシスタントは ripgrep で alias→実カードを解決し、記録は id で行う
- カード全文は貼らない。必要時のみ /show-task で提示
