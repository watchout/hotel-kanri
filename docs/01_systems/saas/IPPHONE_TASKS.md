---
title: Phase-C – In‑house Phone (Tablet & Smartphone)
version: 1.1
---

# CONTEXT
INCLUDE docs/MVP_OVERVIEW.md

# GOAL
**2 方式対応**  
1. **タブレット直接通話** – 客室据置 Android タブレット → WebRTC でフロント着信  
2. **スマホ QR 通話**      – QR 読み取り → Wi‑Fi 接続案内 → WebRTC

# TASK LIST
| ID   | 内容                                         | DoD                            |
|------|----------------------------------------------|--------------------------------|
| C-1A | タブレット `/call` ページ (Vue)              | 呼出→応答 ≤ 0.5 s              |
| C-1B | QR 生成 `/qr/room/{id}` (SVG)                | 生成 < 300 ms                  |
| C-2  | Wi‑Fi ガイドページ (JA/EN)                   | 接続成功率 > 95 %              |
| C-3  | WebRTC Signaling (`socket.io`) 共通モジュール | 呼び→応 筆談                   |
| C-4  | 客室スマホ UI (PWA)                          | 着信 ≤ 0.5 s                   |
| C-5  | フロント着信 UI + 通話ボタン                 | 通話成功率 > 98 %              |
| C-6  | Playwright: タブレット & QR 呼出し E2E       | 両フロー緑                     |