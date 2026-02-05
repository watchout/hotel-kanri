-- ハンドオフテストデータ作成スクリプト
-- テナント: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7

-- 既存のテストデータを削除（冪等性確保）
DELETE FROM handoff_requests WHERE tenant_id = 'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' AND id LIKE 'handoff_test_%';

-- PENDING（未対応）リクエスト - 3件
INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at
) VALUES (
  'handoff_test_pending_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_001',
  'room_101',
  'front_desk',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "予約の変更をしたい", "timestamp": "2026-01-24T10:00:00Z"}], "currentTopic": "reservation_change", "guestInfo": {"roomNumber": "101", "guestName": "山田太郎"}}',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '5 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at
) VALUES (
  'handoff_test_pending_002',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_002',
  'room_203',
  'concierge',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "タクシーを予約したい", "timestamp": "2026-01-24T10:10:00Z"}], "currentTopic": "taxi_booking", "guestInfo": {"roomNumber": "203", "guestName": "佐藤花子"}}',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '3 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at
) VALUES (
  'handoff_test_pending_003',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_003',
  'room_305',
  'front_desk',
  'PENDING',
  '{"lastMessages": [{"role": "user", "content": "チェックアウトの時間を変更したい", "timestamp": "2026-01-24T10:20:00Z"}], "currentTopic": "checkout_time_change", "guestInfo": {"roomNumber": "305", "guestName": "鈴木一郎"}}',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '1 minutes'
);

-- ACCEPTED（対応中）リクエスト - 2件
INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_accepted_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_004',
  'room_102',
  'front_desk',
  'ACCEPTED',
  '{"lastMessages": [{"role": "user", "content": "ルームサービスを注文したい", "timestamp": "2026-01-24T09:30:00Z"}], "currentTopic": "room_service", "guestInfo": {"roomNumber": "102", "guestName": "田中美咲"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '10 minutes',
  '対応を開始しました',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '15 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_accepted_002',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_005',
  'room_204',
  'concierge',
  'ACCEPTED',
  '{"lastMessages": [{"role": "user", "content": "観光地の情報を知りたい", "timestamp": "2026-01-24T09:45:00Z"}], "currentTopic": "sightseeing_info", "guestInfo": {"roomNumber": "204", "guestName": "高橋健太"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '5 minutes',
  'コンシェルジュに確認中',
  NOW() + INTERVAL '60 seconds',
  NOW() - INTERVAL '8 minutes'
);

-- COMPLETED（完了済み）リクエスト - 5件
INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_completed_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_006',
  'room_301',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "WiFiのパスワードを教えて", "timestamp": "2026-01-23T15:00:00Z"}], "currentTopic": "wifi_password", "guestInfo": {"roomNumber": "301", "guestName": "伊藤春子"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '1 day' + INTERVAL '5 minutes',
  NOW() - INTERVAL '1 day',
  'WiFiパスワードを案内しました',
  NOW() - INTERVAL '1 day' + INTERVAL '60 seconds',
  NOW() - INTERVAL '1 day' + INTERVAL '10 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_completed_002',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_007',
  'room_103',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "追加のタオルが欲しい", "timestamp": "2026-01-23T16:00:00Z"}], "currentTopic": "towel_request", "guestInfo": {"roomNumber": "103", "guestName": "渡辺次郎"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '23 hours' + INTERVAL '5 minutes',
  NOW() - INTERVAL '23 hours',
  'タオルをお届けしました',
  NOW() - INTERVAL '23 hours' + INTERVAL '60 seconds',
  NOW() - INTERVAL '23 hours' + INTERVAL '10 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_completed_003',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_008',
  'room_205',
  'concierge',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "レストランの予約をしたい", "timestamp": "2026-01-23T18:00:00Z"}], "currentTopic": "restaurant_reservation", "guestInfo": {"roomNumber": "205", "guestName": "中村雅美"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '20 hours' + INTERVAL '5 minutes',
  NOW() - INTERVAL '20 hours',
  'レストランを予約しました',
  NOW() - INTERVAL '20 hours' + INTERVAL '60 seconds',
  NOW() - INTERVAL '20 hours' + INTERVAL '10 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_completed_004',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_009',
  'room_306',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "忘れ物をフロントに届けたい", "timestamp": "2026-01-23T14:00:00Z"}], "currentTopic": "lost_and_found", "guestInfo": {"roomNumber": "306", "guestName": "小林正義"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '25 hours' + INTERVAL '5 minutes',
  NOW() - INTERVAL '25 hours',
  '忘れ物を受け取りました',
  NOW() - INTERVAL '25 hours' + INTERVAL '60 seconds',
  NOW() - INTERVAL '25 hours' + INTERVAL '10 minutes'
);

INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, completed_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_completed_005',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_010',
  'room_104',
  'front_desk',
  'COMPLETED',
  '{"lastMessages": [{"role": "user", "content": "アーリーチェックインしたい", "timestamp": "2026-01-23T12:00:00Z"}], "currentTopic": "early_checkin", "guestInfo": {"roomNumber": "104", "guestName": "加藤美穂"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '28 hours' + INTERVAL '5 minutes',
  NOW() - INTERVAL '28 hours',
  'アーリーチェックインを承りました',
  NOW() - INTERVAL '28 hours' + INTERVAL '60 seconds',
  NOW() - INTERVAL '28 hours' + INTERVAL '10 minutes'
);

-- TIMEOUT（タイムアウト）リクエスト - 1件
INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, timeout_at, created_at
) VALUES (
  'handoff_test_timeout_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_011',
  'room_206',
  'front_desk',
  'TIMEOUT',
  '{"lastMessages": [{"role": "user", "content": "緊急の問い合わせです", "timestamp": "2026-01-23T10:00:00Z"}], "currentTopic": "urgent_inquiry", "guestInfo": {"roomNumber": "206", "guestName": "吉田太一"}}',
  NOW() - INTERVAL '30 hours' + INTERVAL '60 seconds',
  NOW() - INTERVAL '30 hours' + INTERVAL '10 minutes'
);

-- CANCELLED（キャンセル）リクエスト - 1件
INSERT INTO handoff_requests (
  id, tenant_id, session_id, room_id, channel, status, context, staff_id, accepted_at, notes, timeout_at, created_at
) VALUES (
  'handoff_test_cancelled_001',
  'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7',
  'chat_session_test_012',
  'room_307',
  'concierge',
  'CANCELLED',
  '{"lastMessages": [{"role": "user", "content": "問い合わせをキャンセルします", "timestamp": "2026-01-23T11:00:00Z"}], "currentTopic": "cancel_request", "guestInfo": {"roomNumber": "307", "guestName": "山口幸子"}}',
  'cmgq3prpz00005kc3xuh7q3t4',
  NOW() - INTERVAL '29 hours' + INTERVAL '5 minutes',
  'お客様がキャンセルされました',
  NOW() - INTERVAL '29 hours' + INTERVAL '60 seconds',
  NOW() - INTERVAL '29 hours' + INTERVAL '10 minutes'
);
