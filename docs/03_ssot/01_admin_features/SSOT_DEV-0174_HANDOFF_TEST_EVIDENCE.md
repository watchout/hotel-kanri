# SSOT_DEV-0174_HANDOFF_TEST_EVIDENCE.md

**バージョン**: 1.1.0
**最終更新**: 2026-01-24
**ドキュメントID**: SSOT-TEST-HANDOFF-001
**ステータス**: ✅ 確定

---

## 📋 概要

### 目的

DEV-0172（通知チャネル＆ハンドオフAPI実装）、DEV-0173（通知→電話CTA導線実装）の統合テスト実施とEvidence整備により、有人ハンドオフ機能の品質を保証する。

### スコープ

- **対象システム**: hotel-common-rebuild（API）、hotel-saas-rebuild（Admin UI）
- **対象機能**: ハンドオフリクエスト管理、スタッフ通知、ステータス更新
- **関連タスク**: [DEV-0174] [COM-246] 有人ハンドオフ テスト＆Evidence整備

### 関連SSOT

- `SSOT_GUEST_AI_HANDOFF.md`（ゲスト側ハンドオフ、DB設計）
- `SSOT_ADMIN_HANDOFF_NOTIFICATION.md`（スタッフ向けAPI・UI）
- `SSOT_GUEST_HANDOFF_PHONE_CTA_UI.md`（電話CTA導線）
- `SSOT_QUALITY_CHECKLIST.md`（品質基準）
- `SSOT_SAAS_MULTITENANT.md`（マルチテナント設計）

---

## 🎯 要件ID一覧

### テスト要件（HDF-TEST）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-TEST-001 | API統合テスト実施 | 🔴 必須 |
| HDF-TEST-002 | UI動作確認テスト実施 | 🔴 必須 |
| HDF-TEST-003 | エンドツーエンドシナリオテスト | 🔴 必須 |
| HDF-TEST-004 | セキュリティテスト（テナント分離） | 🔴 必須 |
| HDF-TEST-005 | パフォーマンステスト | 🟡 推奨 |

### Evidence要件（HDF-EVD）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-EVD-001 | テスト実行ログ保存 | 🔴 必須 |
| HDF-EVD-002 | スクリーンショット取得 | 🔴 必須 |
| HDF-EVD-003 | API応答例の記録 | 🔴 必須 |
| HDF-EVD-004 | エラーケースの記録 | 🔴 必須 |
| HDF-EVD-005 | テストサマリー作成 | 🔴 必須 |

---

## 🗄️ データベース設計

**注**: データベーススキーマは既存SSOT（`SSOT_GUEST_AI_HANDOFF.md`、`SSOT_ADMIN_HANDOFF_NOTIFICATION.md`）で定義済み。

### テストデータ要件

#### テストシナリオ用データ

**ファイル**: `/Users/kaneko/hotel-kanri/scripts/create-handoff-test-data.sql`

```sql
-- ============================================================
-- DEV-0174: ハンドオフテスト用データ作成スクリプト
-- ============================================================

-- テナント情報
-- テナントID: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7
-- スタッフユーザー: owner@test.omotenasuai.com
-- テスト用部屋: room_101, room_203, room_305

-- ============================================================
-- 1. PENDING状態のリクエスト（3件）
-- ============================================================

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at, updated_at
) VALUES (
  'handoff_test_pending_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_001',
  'room_101',
  'front_desk',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "予約の変更をしたい", "timestamp": "2026-01-24T10:00:00Z"}], "currentTopic": "reservation_change", "guestInfo": {"roomNumber": "101", "guestName": "山田太郎"}}',
  NOW() + INTERVAL '60 seconds',
  NOW(),
  NOW()
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at, updated_at
) VALUES (
  'handoff_test_pending_002',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_002',
  'room_203',
  'front_desk',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "チェックアウト時間の延長", "timestamp": "2026-01-24T10:05:00Z"}], "currentTopic": "checkout_extension", "guestInfo": {"roomNumber": "203", "guestName": "佐藤花子"}}',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '5 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at, updated_at
) VALUES (
  'handoff_test_pending_003',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_003',
  'room_305',
  'front_desk',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "ルームサービスの注文", "timestamp": "2026-01-24T10:10:00Z"}], "currentTopic": "room_service", "guestInfo": {"roomNumber": "305", "guestName": "鈴木一郎"}}',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes'
);

-- ============================================================
-- 2. ACCEPTED状態のリクエスト（2件）
-- ============================================================

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_accepted_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_004',
  'room_101',
  'front_desk',
  'ACCEPTED',
  '{"lastMessages": [{"role": "user", "content": "朝食の時間変更", "timestamp": "2026-01-24T09:00:00Z"}], "currentTopic": "breakfast_time", "guestInfo": {"roomNumber": "101", "guestName": "山田太郎"}}',
  'owner_123',
  NOW() - INTERVAL '15 minutes',
  NOW() + INTERVAL '45 seconds',
  NOW() - INTERVAL '20 minutes',
  NOW() - INTERVAL '15 minutes',
  '朝食時間変更対応中'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_accepted_002',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_005',
  'room_203',
  'front_desk',
  'ACCEPTED',
  '{"lastMessages": [{"role": "user", "content": "タクシーの手配", "timestamp": "2026-01-24T09:30:00Z"}], "currentTopic": "taxi_request", "guestInfo": {"roomNumber": "203", "guestName": "佐藤花子"}}',
  'owner_123',
  NOW() - INTERVAL '30 minutes',
  NOW() + INTERVAL '30 seconds',
  NOW() - INTERVAL '35 minutes',
  NOW() - INTERVAL '30 minutes',
  'タクシー手配中'
);

-- ============================================================
-- 3. COMPLETED状態のリクエスト（5件）
-- ============================================================

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_completed_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_006',
  'room_101',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "Wi-Fiパスワードの確認", "timestamp": "2026-01-24T08:00:00Z"}], "currentTopic": "wifi_password", "guestInfo": {"roomNumber": "101", "guestName": "山田太郎"}}',
  'owner_123',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour 55 minutes',
  NOW() - INTERVAL '1 hour 59 minutes',
  NOW() - INTERVAL '2 hours 5 minutes',
  NOW() - INTERVAL '1 hour 55 minutes',
  'Wi-Fiパスワードをお伝えしました'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_completed_002',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_007',
  'room_203',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "アメニティの追加依頼", "timestamp": "2026-01-24T07:00:00Z"}], "currentTopic": "amenity_request", "guestInfo": {"roomNumber": "203", "guestName": "佐藤花子"}}',
  'owner_123',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 hours 50 minutes',
  NOW() - INTERVAL '2 hours 59 minutes',
  NOW() - INTERVAL '3 hours 5 minutes',
  NOW() - INTERVAL '2 hours 50 minutes',
  'アメニティをお部屋にお届けしました'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_completed_003',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_008',
  'room_305',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "エアコンの調整", "timestamp": "2026-01-24T06:00:00Z"}], "currentTopic": "air_conditioner", "guestInfo": {"roomNumber": "305", "guestName": "鈴木一郎"}}',
  'owner_123',
  NOW() - INTERVAL '4 hours',
  NOW() - INTERVAL '3 hours 55 minutes',
  NOW() - INTERVAL '3 hours 59 minutes',
  NOW() - INTERVAL '4 hours 5 minutes',
  NOW() - INTERVAL '3 hours 55 minutes',
  'エアコンを調整しました'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_completed_004',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_009',
  'room_101',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "荷物の預かり", "timestamp": "2026-01-23T18:00:00Z"}], "currentTopic": "luggage_storage", "guestInfo": {"roomNumber": "101", "guestName": "山田太郎"}}',
  'owner_123',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '23 hours 55 minutes',
  NOW() - INTERVAL '23 hours 59 minutes',
  NOW() - INTERVAL '1 day 5 minutes',
  NOW() - INTERVAL '23 hours 55 minutes',
  '荷物をフロントでお預かりしました'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_completed_005',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_010',
  'room_203',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "周辺の観光情報", "timestamp": "2026-01-23T17:00:00Z"}], "currentTopic": "tourist_info", "guestInfo": {"roomNumber": "203", "guestName": "佐藤花子"}}',
  'owner_123',
  NOW() - INTERVAL '1 day 1 hour',
  NOW() - INTERVAL '1 day 55 minutes',
  NOW() - INTERVAL '1 day 59 minutes',
  NOW() - INTERVAL '1 day 1 hour 5 minutes',
  NOW() - INTERVAL '1 day 55 minutes',
  '観光マップをお渡ししました'
);

-- ============================================================
-- 4. TIMEOUT状態のリクエスト（1件）
-- ============================================================

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at, updated_at
) VALUES (
  'handoff_test_timeout_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_011',
  'room_305',
  'front_desk',
  'TIMEOUT',
  '{"lastMessages": [{"role": "user", "content": "深夜の問い合わせ", "timestamp": "2026-01-24T02:00:00Z"}], "currentTopic": "late_night_inquiry", "guestInfo": {"roomNumber": "305", "guestName": "鈴木一郎"}}',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours 5 minutes',
  NOW() - INTERVAL '6 hours'
);

-- ============================================================
-- 5. CANCELLED状態のリクエスト（1件）
-- ============================================================

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, timeout_at, created_at, updated_at, notes
) VALUES (
  'handoff_test_cancelled_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_012',
  'room_101',
  'front_desk',
  'CANCELLED',
  '{"lastMessages": [{"role": "user", "content": "問い合わせ取り消し", "timestamp": "2026-01-24T09:45:00Z"}], "currentTopic": "cancel_request", "guestInfo": {"roomNumber": "101", "guestName": "山田太郎"}}',
  'owner_123',
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '50 minutes',
  NOW() - INTERVAL '45 minutes',
  'ゲストが取り消しを希望されました'
);

-- ============================================================
-- 6. 他テナントのリクエスト（セキュリティテスト用）
-- ============================================================

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at, updated_at
) VALUES (
  'handoff_other_tenant_999',
  'other_tenant_999',
  'chat_session_other',
  'room_999',
  'front_desk',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "他テナントのリクエスト", "timestamp": "2026-01-24T10:00:00Z"}], "currentTopic": "other_tenant", "guestInfo": {"roomNumber": "999", "guestName": "他テナント"}}',
  NOW() + INTERVAL '60 seconds',
  NOW(),
  NOW()
);
```

### テストケース用ステータスパターン

| ステータス | 件数 | 目的 |
|:---------|:-----|:-----|
| PENDING | 3件 | 未対応リクエストの表示確認 |
| ACCEPTED | 2件 | 対応中リクエストの表示確認 |
| COMPLETED | 5件 | 完了済みリクエストの履歴確認 |
| TIMEOUT | 1件 | タイムアウト処理の確認 |
| CANCELLED | 1件 | キャンセル処理の確認 |
| 他テナント | 1件 | テナント分離の確認（セキュリティテスト） |

---

## 🔌 API設計

### テスト対象エンドポイント

**スタッフ向けAPI（Session認証必須）**

| Method | Path | テスト内容 | 要件ID |
|:-------|:-----|:----------|:-------|
| GET | `/api/v1/admin/handoff/requests` | 一覧取得、フィルタリング、ページネーション | HDF-ADM-001 |
| GET | `/api/v1/admin/handoff/requests/:id` | 詳細取得、テナント分離 | HDF-ADM-002 |
| PATCH | `/api/v1/admin/handoff/requests/:id/status` | ステータス更新、遷移ルール | HDF-ADM-003 |

### 実装ファイル

**hotel-common-rebuild**:
- `/Users/kaneko/hotel-common-rebuild/src/routes/admin/handoff.routes.ts`
- `/Users/kaneko/hotel-common-rebuild/src/routes/admin/handoff/requests.get.ts`
- `/Users/kaneko/hotel-common-rebuild/src/routes/admin/handoff/requests-id.get.ts`
- `/Users/kaneko/hotel-common-rebuild/src/routes/admin/handoff/requests-id-status.patch.ts`
- `/Users/kaneko/hotel-common-rebuild/src/services/handoff-admin.service.ts`

**hotel-saas-rebuild**:
- `/Users/kaneko/hotel-saas-rebuild/pages/admin/handoff/index.vue`
- `/Users/kaneko/hotel-saas-rebuild/components/admin/handoff/*`

### API テストスクリプト

**ファイル**: `/Users/kaneko/hotel-kanri/scripts/test-handoff-admin.sh`

テストスクリプトは既に実装済み。以下の項目をテストします：

1. **Phase 0**: 前提条件確認（サーバー起動確認）
2. **Phase 1**: 認証（ログイン）
3. **Phase 2**: テナント切替
4. **Phase 3**: ハンドオフAPI テスト
   - HDF-ADM-001: リクエスト一覧取得
   - HDF-ADM-001: ステータスフィルタ
   - HDF-ADM-002: リクエスト詳細取得
   - HDF-ADM-003: ステータス更新（PENDING → ACCEPTED）
   - HDF-ADM-003: ステータス更新（ACCEPTED → COMPLETED）
5. **Phase 4**: セキュリティテスト（テナント分離）
6. **Phase 5**: エラーケーステスト（無効なステータス遷移）

---

## 🎨 UI設計

### UI テスト対象画面

| 画面名 | パス | テスト内容 | 要件ID |
|:-------|:-----|:----------|:-------|
| ハンドオフ管理画面 | `/admin/handoff` | リクエスト一覧表示、ステータスバッジ | HDF-ADM-001 |
| ハンドオフ詳細モーダル | - | 詳細表示、メモ入力、ステータス更新 | HDF-ADM-002, HDF-ADM-003 |
| 通知ポップアップ | - | 新規リクエスト通知（Phase 2） | HDF-ADM-004 |

### UI テストチェックリスト

#### 1. ハンドオフ管理画面（/admin/handoff）

**表示確認**:
- [ ] リクエスト一覧が表示される
- [ ] ステータスバッジが正しく色分けされている
  - PENDING: 赤（🔴）
  - ACCEPTED: 黄（🟡）
  - COMPLETED: 緑（🟢）
  - TIMEOUT: グレー（⚫）
  - CANCELLED: グレー（⚫）
- [ ] 未対応リクエストが上位に表示される
- [ ] ゲスト情報（部屋番号、氏名）が表示される
- [ ] 経過時間が表示される（例: 「45秒前」）

**操作確認**:
- [ ] フィルタ（ステータス別）が動作する
- [ ] 部屋番号検索が動作する
- [ ] リクエストカードをクリックすると詳細モーダルが開く
- [ ] ポーリング（5秒間隔）が動作する（Phase 1）
- [ ] 新規リクエストが自動的にリストに追加される

**レスポンシブ**:
- [ ] PC表示（1920x1080）で正常に表示される
- [ ] タブレット表示（768x1024）で正常に表示される
- [ ] モバイル表示（375x667）で正常に表示される

#### 2. ハンドオフ詳細モーダル

**表示確認**:
- [ ] ゲスト情報が表示される
- [ ] 会話履歴が表示される
- [ ] 現在のステータスが表示される
- [ ] スタッフメモが表示される（既存メモがある場合）

**操作確認**:
- [ ] スタッフメモを入力できる
- [ ] 「対応開始」ボタンでステータスが ACCEPTED に変わる
- [ ] 「完了」ボタンでステータスが COMPLETED に変わる
- [ ] 「キャンセル」ボタンでステータスが CANCELLED に変わる
- [ ] モーダルを閉じると一覧に戻る
- [ ] 更新後にリストが自動的にリフレッシュされる

**バリデーション**:
- [ ] メモは1000文字以内
- [ ] 無効なステータス遷移はエラーメッセージが表示される
- [ ] 完了済みリクエストは操作ボタンが無効化される

#### 3. 通知ポップアップ（Phase 2）

**表示確認**:
- [ ] 新規リクエスト発生時に画面右下に表示される
- [ ] ゲスト情報と問い合わせ内容が表示される
- [ ] 5秒後に自動的に消える

**操作確認**:
- [ ] 「詳細を見る」ボタンで詳細モーダルが開く
- [ ] 「後で対応」ボタンでポップアップが閉じる
- [ ] ブラウザ通知許可がある場合、ブラウザ通知も表示される

---

## ✅ Accept（合格条件）

### Phase 1: API統合テスト（HDF-TEST-001）

#### HDF-ADM-001: リクエスト一覧取得

- [ ] `GET /api/v1/admin/handoff/requests`が正常に動作する
- [ ] ステータスフィルタが動作する（PENDING, ACCEPTED, COMPLETED, TIMEOUT, CANCELLED）
- [ ] 部屋番号フィルタが動作する
- [ ] 日付範囲フィルタが動作する
- [ ] ページネーション（limit/offset）が動作する
- [ ] テナント分離が正しく機能する（他テナントのデータは取得不可）
- [ ] レスポンス形式が仕様通り
- [ ] 空の結果でもエラーにならない
- [ ] PENDING優先のソート順が正しい

#### HDF-ADM-002: リクエスト詳細取得

- [ ] `GET /api/v1/admin/handoff/requests/:id`が正常に動作する
- [ ] 会話履歴（context.lastMessages）が正しく取得できる
- [ ] ゲスト情報が表示される
- [ ] スタッフ情報（staffId, staffName）が表示される
- [ ] 他テナントのリクエストは404を返す
- [ ] 存在しないIDは404を返す

#### HDF-ADM-003: ステータス更新

- [ ] `PATCH /api/v1/admin/handoff/requests/:id/status`が正常に動作する
- [ ] PENDING → ACCEPTED の遷移が成功する
- [ ] ACCEPTED → COMPLETED の遷移が成功する
- [ ] PENDING → CANCELLED の遷移が成功する
- [ ] 無効な遷移（COMPLETED → ACCEPTED）はエラーになる
- [ ] スタッフIDが自動的に記録される
- [ ] acceptedAt/completedAt のタイムスタンプが正しく設定される
- [ ] スタッフメモが保存される
- [ ] 他テナントのリクエストは404を返す

### Phase 2: UI動作確認テスト（HDF-TEST-002）

#### ハンドオフ管理画面

- [ ] `/admin/handoff`にアクセスできる
- [ ] リクエスト一覧が表示される
- [ ] ステータスバッジの色が正しい
- [ ] フィルタ操作が動作する
- [ ] リクエストカードをクリックすると詳細モーダルが開く
- [ ] ポーリング（5秒間隔）が動作する

#### ハンドオフ詳細モーダル

- [ ] ゲスト情報が表示される
- [ ] 会話履歴が表示される
- [ ] スタッフメモを入力できる
- [ ] 「対応開始」ボタンが機能する
- [ ] 「完了」ボタンが機能する
- [ ] 更新後にモーダルが閉じ、リストがリフレッシュされる

### Phase 3: エンドツーエンドシナリオテスト（HDF-TEST-003）

#### シナリオ1: 正常フロー

1. [ ] ゲストがハンドオフリクエストを作成（POST /api/v1/guest/handoff/requests）
2. [ ] スタッフ管理画面に新規リクエストが表示される
3. [ ] スタッフがリクエスト詳細を開く
4. [ ] 「対応開始」ボタンをクリック（PENDING → ACCEPTED）
5. [ ] ステータスが「対応中」に変わる
6. [ ] メモを入力して「完了」ボタンをクリック（ACCEPTED → COMPLETED）
7. [ ] ステータスが「完了」に変わる
8. [ ] 完了済みリクエストは操作ボタンが無効化される

#### シナリオ2: タイムアウト処理

1. [ ] ゲストがハンドオフリクエストを作成
2. [ ] 60秒待機（タイムアウト処理が実行される）
3. [ ] ステータスが自動的に TIMEOUT に変わる
4. [ ] ゲスト画面に電話CTA（内線番号）が表示される

#### シナリオ3: キャンセル処理

1. [ ] ゲストがハンドオフリクエストを作成
2. [ ] スタッフが「キャンセル」ボタンをクリック
3. [ ] ステータスが CANCELLED に変わる
4. [ ] キャンセル済みリクエストは操作ボタンが無効化される

### Phase 4: セキュリティテスト（HDF-TEST-004）

#### テナント分離

- [ ] 他テナントのリクエスト一覧を取得できない
- [ ] 他テナントのリクエスト詳細を取得できない（404を返す）
- [ ] 他テナントのリクエストステータスを更新できない（404を返す）
- [ ] 列挙攻撃耐性（403ではなく404を返す）

#### 認証・認可

- [ ] 未認証（Cookie なし）ではAPIにアクセスできない（401を返す）
- [ ] Session認証が必須
- [ ] スタッフロールのみアクセス可能

#### 入力バリデーション

- [ ] 無効なステータス値はエラーになる
- [ ] メモの最大長（1000文字）を超えるとエラーになる
- [ ] 無効なIDはエラーになる
- [ ] SQLインジェクション攻撃が防止されている
- [ ] XSS攻撃が防止されている（contextのサニタイズ）

### Phase 5: パフォーマンステスト（HDF-TEST-005）

- [ ] API応答時間が2秒以内（95パーセンタイル）
- [ ] 一覧取得が50件まで対応
- [ ] ポーリングによる負荷が許容範囲内（5秒間隔）
- [ ] 同時接続100リクエスト/分に対応

---

## 📁 Evidence 構造

### ディレクトリ構成

```
evidence/DEV-0174/
├── test-handoff-admin.log          # API テスト実行ログ
├── api-list-response.json          # GET /requests のレスポンス例
├── api-detail-response.json        # GET /requests/:id のレスポンス例
├── api-update-response.json        # PATCH /requests/:id/status のレスポンス例
├── api-error-response.json         # エラーレスポンス例
├── ui-handoff-list.png             # ハンドオフ管理画面スクリーンショット
├── ui-handoff-detail-modal.png     # 詳細モーダルスクリーンショット
├── ui-handoff-status-update.png    # ステータス更新後スクリーンショット
├── ui-handoff-filter.png           # フィルタ操作スクリーンショット
├── security-tenant-isolation.log   # テナント分離テスト結果
├── performance-test.log            # パフォーマンステスト結果
└── summary.md                      # テストサマリー
```

### Evidence作成コマンド

**ファイル**: `/Users/kaneko/hotel-kanri/scripts/collect-handoff-evidence.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# === 設定 ===
EVIDENCE_DIR="/Users/kaneko/hotel-kanri/evidence/DEV-0174"
SAAS=http://localhost:3101
COOKIE=/tmp/saas_session.txt

# === ヘルパー関数 ===
step(){ echo -e "\n=== $* ==="; }
success(){ echo -e "\n✅ $*"; }

# === Evidenceディレクトリ作成 ===
step "Evidenceディレクトリ作成"
mkdir -p "$EVIDENCE_DIR"
success "ディレクトリ作成完了: $EVIDENCE_DIR"

# === APIテスト実行 ===
step "APIテスト実行"
cd /Users/kaneko/hotel-kanri/scripts
./test-handoff-admin.sh > "$EVIDENCE_DIR/test-handoff-admin.log" 2>&1 || true
success "APIテスト実行ログ保存完了"

# === API レスポンス例保存 ===
step "API レスポンス例保存"

# リクエスト一覧
curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests" | jq . > "$EVIDENCE_DIR/api-list-response.json"
success "リクエスト一覧レスポンス保存完了"

# リクエスト詳細（最初のリクエストID取得）
REQUEST_ID=$(curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests" | jq -r '.data.requests[0].id')
if [ "$REQUEST_ID" != "null" ] && [ -n "$REQUEST_ID" ]; then
  curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/$REQUEST_ID" | jq . > "$EVIDENCE_DIR/api-detail-response.json"
  success "リクエスト詳細レスポンス保存完了"
fi

# ステータス更新レスポンス（ログから抽出）
# 注: 実際のテストで生成されたレスポンスをログから抽出する

# エラーレスポンス（他テナントアクセス）
curl -sS -b "$COOKIE" "$SAAS/api/v1/admin/handoff/requests/handoff_other_tenant_999" | jq . > "$EVIDENCE_DIR/api-error-response.json"
success "エラーレスポンス保存完了"

# === スクリーンショット案内 ===
step "スクリーンショット取得"
echo "以下の画面のスクリーンショットを手動で取得してください："
echo "1. http://localhost:3101/admin/handoff （ハンドオフ管理画面）"
echo "2. 詳細モーダル（リクエストカードをクリック）"
echo "3. ステータス更新後の画面"
echo "4. フィルタ操作後の画面"
echo ""
echo "保存先: $EVIDENCE_DIR/"
echo "ファイル名："
echo "  - ui-handoff-list.png"
echo "  - ui-handoff-detail-modal.png"
echo "  - ui-handoff-status-update.png"
echo "  - ui-handoff-filter.png"

# === サマリーテンプレート作成 ===
step "サマリーテンプレート作成"
cat > "$EVIDENCE_DIR/summary.md" <<'EOF'
# DEV-0174: 有人ハンドオフ テスト＆Evidence整備 - サマリー

**テスト実施日**: $(date +%Y-%m-%d)
**実施者**: [実施者名]
**所要時間**: [X分]

---

## ✅ テスト結果サマリー

| カテゴリ | 合格 | 不合格 | スキップ | 合計 |
|:---------|:-----|:-------|:---------|:-----|
| API統合テスト | 0 | 0 | 0 | 0 |
| UI動作確認テスト | 0 | 0 | 0 | 0 |
| E2Eシナリオテスト | 0 | 0 | 0 | 0 |
| セキュリティテスト | 0 | 0 | 0 | 0 |
| パフォーマンステスト | 0 | 0 | 0 | 0 |
| **合計** | **0** | **0** | **0** | **0** |

---

## 📊 API統合テスト結果

### HDF-ADM-001: リクエスト一覧取得

- [ ] GET /api/v1/admin/handoff/requests - 正常動作
- [ ] ステータスフィルタ - 正常動作
- [ ] 部屋番号フィルタ - 正常動作
- [ ] ページネーション - 正常動作
- [ ] テナント分離 - 正常動作

**実行ログ**: `test-handoff-admin.log:65-74`
**レスポンス例**: `api-list-response.json`

### HDF-ADM-002: リクエスト詳細取得

- [ ] GET /api/v1/admin/handoff/requests/:id - 正常動作
- [ ] テナント分離（404） - 正常動作

**実行ログ**: `test-handoff-admin.log:89-103`
**レスポンス例**: `api-detail-response.json`

### HDF-ADM-003: ステータス更新

- [ ] PENDING → ACCEPTED - 正常動作
- [ ] ACCEPTED → COMPLETED - 正常動作
- [ ] 無効な遷移（エラー） - 正常動作

**実行ログ**: `test-handoff-admin.log:106-161`
**レスポンス例**: `api-update-response.json`

---

## 🎨 UI動作確認テスト結果

### ハンドオフ管理画面

- [ ] リクエスト一覧表示
- [ ] ステータスバッジ表示
- [ ] フィルタ操作
- [ ] ポーリング動作

**スクリーンショット**: `ui-handoff-list.png`

### ハンドオフ詳細モーダル

- [ ] ゲスト情報表示
- [ ] 会話履歴表示
- [ ] メモ入力
- [ ] ステータス更新

**スクリーンショット**: `ui-handoff-detail-modal.png`, `ui-handoff-status-update.png`

---

## 🔒 セキュリティテスト結果

### テナント分離

- [ ] 他テナントのリクエスト一覧取得 - 拒否（404）
- [ ] 他テナントのリクエスト詳細取得 - 拒否（404）
- [ ] 他テナントのステータス更新 - 拒否（404）

**実行ログ**: `test-handoff-admin.log:134-145`
**エラーレスポンス**: `api-error-response.json`

### 認証・認可

- [ ] 未認証でのアクセス - 拒否（401）
- [ ] Session認証必須 - 正常動作

---

## ⚡ パフォーマンステスト結果

| API | 平均応答時間 | 95パーセンタイル | 合否 |
|:----|:------------|:----------------|:-----|
| GET /requests | - | - | - |
| GET /requests/:id | - | - | - |
| PATCH /requests/:id/status | - | - | - |

**実行ログ**: `performance-test.log`

---

## 🐛 発見された問題

### 問題1: [問題タイトル]

- **重要度**: 高/中/低
- **説明**: [問題の詳細]
- **再現手順**: [手順]
- **期待される動作**: [期待]
- **実際の動作**: [実際]
- **対応方針**: [対応]

---

## 📝 所感・改善提案

[テスト実施後の所感、改善提案など]

---

## ✅ 総合判定

- [ ] **合格** - 全ての要件を満たし、本番デプロイ可能
- [ ] **条件付き合格** - 軽微な問題があるが、本番デプロイ可能（要監視）
- [ ] **不合格** - 重大な問題があり、修正が必要

**判定理由**: [判定理由を記載]
EOF

success "サマリーテンプレート作成完了"

# === 完了 ===
step "Evidence収集完了"
echo "Evidence保存先: $EVIDENCE_DIR"
echo ""
echo "次のステップ:"
echo "1. スクリーンショットを手動で取得"
echo "2. summary.md を編集してテスト結果を記入"
echo "3. パフォーマンステストを実施（オプション）"
```

---

## 🛠️ 実装チェックリスト

### Phase 1: テストデータ作成

- [ ] `/Users/kaneko/hotel-kanri/scripts/create-handoff-test-data.sql`作成
- [ ] PostgreSQLにテストデータを投入
- [ ] テストデータの確認（SELECT クエリ）

### Phase 2: APIテスト実行

- [ ] `/Users/kaneko/hotel-kanri/scripts/test-handoff-admin.sh`実行権限確認
- [ ] hotel-common-rebuild 起動確認
- [ ] hotel-saas-rebuild 起動確認
- [ ] テストスクリプト実行
- [ ] テスト結果確認（全テスト合格）

### Phase 3: Evidence収集

- [ ] `/Users/kaneko/hotel-kanri/scripts/collect-handoff-evidence.sh`作成
- [ ] 実行権限付与（`chmod +x collect-handoff-evidence.sh`）
- [ ] Evidence収集スクリプト実行
- [ ] APIレスポンス例の確認
- [ ] スクリーンショット取得

### Phase 4: UI動作確認

- [ ] `/admin/handoff` にアクセス
- [ ] リクエスト一覧表示確認
- [ ] ステータスバッジ確認
- [ ] フィルタ操作確認
- [ ] 詳細モーダル表示確認
- [ ] ステータス更新操作確認
- [ ] ポーリング動作確認

### Phase 5: E2Eシナリオテスト

- [ ] シナリオ1: 正常フロー実行
- [ ] シナリオ2: タイムアウト処理確認
- [ ] シナリオ3: キャンセル処理確認

### Phase 6: サマリー作成

- [ ] `evidence/DEV-0174/summary.md`編集
- [ ] テスト結果サマリー記入
- [ ] 発見された問題の記録
- [ ] 総合判定記入

### Phase 7: ドキュメント更新

- [ ] テスト結果をSSOTに反映
- [ ] 問題がある場合は関連SSOTを更新
- [ ] README.mdにテスト手順を追記（必要に応じて）

---

## 📊 Config設定（Marketing Injection対応）

| 設定項目 | デフォルト値 | 説明 |
|:---------|:------------|:-----|
| `test.handoff.timeout_seconds` | 60 | タイムアウトテストの待機時間 |
| `test.handoff.polling_interval` | 5000 | ポーリング間隔（ミリ秒） |
| `test.handoff.screenshot_dir` | `/evidence/DEV-0174` | スクリーンショット保存先 |

---

## 📈 Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| テスト開始 | `handoff-test-start` | DB必須 |
| テスト完了 | `handoff-test-complete` | DB必須 |
| テストエラー | `handoff-test-error` | DB必須 |
| スクリーンショット取得 | `handoff-test-screenshot` | DB必須 |

---

## 🔗 関連ドキュメント

- `SSOT_GUEST_AI_HANDOFF.md`（ゲスト側ハンドオフ機能）
- `SSOT_ADMIN_HANDOFF_NOTIFICATION.md`（スタッフ向けAPI・UI）
- `SSOT_GUEST_HANDOFF_PHONE_CTA_UI.md`（電話CTA導線）
- `SSOT_QUALITY_CHECKLIST.md`（品質基準）
- `SSOT_TEST_ENVIRONMENT.md`（テスト環境）
- `SSOT_API_REGISTRY.md`（APIエンドポイント一元管理）
- `SSOT_SAAS_MULTITENANT.md`（マルチテナント設計）

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2026-01-24 | 1.0.0 | 初版作成（DEV-0174: 有人ハンドオフ テスト＆Evidence整備） |
| 2026-01-24 | 1.1.0 | テストデータSQLスクリプト追加、Evidence収集スクリプト追加、実装ファイルパス明記 |

---

**作成者**: Claude Sonnet 4.5
**レビュー**: -
**承認**: -
