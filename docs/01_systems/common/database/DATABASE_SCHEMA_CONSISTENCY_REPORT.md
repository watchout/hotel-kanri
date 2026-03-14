# データベーススキーマ整合性レポート

**生成日時**: 2025-09-01T09:11:38.867Z

## 概要

- **データベーステーブル数**: 41
- **Prismaモデル数**: [object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object],[object Object]
- **一致するテーブル数**: 41
- **データベースのみのテーブル数**: 0
- **Prismaのみのモデル数**: 0

## 整合性ステータス

✅ **完全に整合性が取れています**

## 一致するテーブル (41個)

- `DatabaseChangeLog`
- `Order`
- `OrderItem`
- `SystemPlanRestrictions`
- `Tenant`
- `TenantSystemPlan`
- `admin`
- `admin_log`
- `campaign_categories`
- `campaign_category_relations`
- `campaign_items`
- `campaign_translations`
- `campaign_usage_logs`
- `campaigns`
- `checkin_sessions`
- `customers`
- `device_rooms`
- `device_video_caches`
- `notification_templates`
- `page_histories`
- `pages`
- `payments`
- `reservations`
- `response_node_translations`
- `response_nodes`
- `response_tree_history`
- `response_tree_mobile_links`
- `response_tree_sessions`
- `response_tree_versions`
- `response_trees`
- `room_grades`
- `rooms`
- `schema_version`
- `service_plan_restrictions`
- `service_usage_statistics`
- `session_billings`
- `staff`
- `system_event`
- `tenant_access_logs`
- `tenant_services`
- `transactions`





## テーブル詳細


### `DatabaseChangeLog`

**カラム**:
- `id`: integer NOT NULL DEFAULT nextval('"DatabaseChangeLog_id_seq"'::regclass)
- `changeType`: text NOT NULL 
- `description`: text NOT NULL 
- `details`: jsonb NULL 
- `createdBy`: text NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP

**インデックス**:
- `DatabaseChangeLog_changeType_idx`: changeType 
- `DatabaseChangeLog_createdAt_idx`: createdAt 
- `DatabaseChangeLog_pkey`: id (UNIQUE)


### `Order`

**カラム**:
- `id`: integer NOT NULL DEFAULT nextval('"Order_id_seq"'::regclass)
- `tenantId`: text NOT NULL 
- `roomId`: text NOT NULL 
- `placeId`: integer NULL 
- `status`: text NOT NULL DEFAULT 'received'::text
- `items`: jsonb NOT NULL 
- `total`: integer NOT NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `paidAt`: timestamp without time zone NULL 
- `isDeleted`: boolean NOT NULL DEFAULT false
- `deletedAt`: timestamp without time zone NULL 
- `sessionId`: text NULL 
- `uuid`: text NULL 

**インデックス**:
- `Order_createdAt_idx`: createdAt 
- `Order_isDeleted_paidAt_idx`: isDeleted 
- `Order_isDeleted_paidAt_idx`: paidAt 
- `Order_pkey`: id (UNIQUE)
- `Order_sessionId_idx`: sessionId 
- `Order_status_idx`: status 
- `Order_tenantId_idx`: tenantId 
- `Order_uuid_key`: uuid (UNIQUE)


### `OrderItem`

**カラム**:
- `id`: integer NOT NULL DEFAULT nextval('"OrderItem_id_seq"'::regclass)
- `tenantId`: text NOT NULL 
- `orderId`: integer NOT NULL 
- `menuItemId`: integer NOT NULL 
- `name`: text NOT NULL 
- `price`: integer NOT NULL 
- `quantity`: integer NOT NULL 
- `status`: text NOT NULL DEFAULT 'pending'::text
- `notes`: text NULL 
- `deliveredAt`: timestamp without time zone NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `OrderItem_is_deleted_idx`: is_deleted 
- `OrderItem_orderId_idx`: orderId 
- `OrderItem_pkey`: id (UNIQUE)
- `OrderItem_status_idx`: status 
- `OrderItem_tenantId_idx`: tenantId 


### `SystemPlanRestrictions`

**カラム**:
- `id`: text NOT NULL 
- `systemType`: text NOT NULL 
- `businessType`: text NOT NULL 
- `planType`: text NOT NULL 
- `planCategory`: text NOT NULL 
- `monthlyPrice`: integer NOT NULL 
- `maxDevices`: integer NOT NULL DEFAULT 30
- `additionalDeviceCost`: integer NOT NULL DEFAULT 1200
- `roomTerminalCost`: integer NOT NULL DEFAULT 1200
- `frontDeskCost`: integer NOT NULL DEFAULT 5000
- `kitchenCost`: integer NOT NULL DEFAULT 2000
- `barCost`: integer NOT NULL DEFAULT 2000
- `housekeepingCost`: integer NOT NULL DEFAULT 2000
- `managerCost`: integer NOT NULL DEFAULT 5000
- `commonAreaCost`: integer NOT NULL DEFAULT 3500
- `enableAiConcierge`: boolean NOT NULL DEFAULT false
- `enableMultilingual`: boolean NOT NULL DEFAULT false
- `enableLayoutEditor`: boolean NOT NULL DEFAULT false
- `enableFacilityGuide`: boolean NOT NULL DEFAULT false
- `enableAiBusinessSupport`: boolean NOT NULL DEFAULT false
- `maxMonthlyOrders`: integer NOT NULL DEFAULT 1000
- `maxMonthlyAiRequests`: integer NOT NULL DEFAULT 0
- `maxStorageGB`: double precision NOT NULL DEFAULT 5.0
- `multilingualUpgradePrice`: integer NOT NULL DEFAULT 3000
- `description`: text NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `SystemPlanRestrictions_is_deleted_idx`: is_deleted 
- `SystemPlanRestrictions_pkey`: id (UNIQUE)
- `SystemPlanRestrictions_systemType_businessType_planType_planCat`: businessType (UNIQUE)
- `SystemPlanRestrictions_systemType_businessType_planType_planCat`: planCategory (UNIQUE)
- `SystemPlanRestrictions_systemType_businessType_planType_planCat`: planType (UNIQUE)
- `SystemPlanRestrictions_systemType_businessType_planType_planCat`: systemType (UNIQUE)


### `Tenant`

**カラム**:
- `id`: text NOT NULL 
- `name`: text NOT NULL 
- `domain`: text NULL 
- `planType`: text NULL 
- `status`: text NOT NULL DEFAULT 'active'::text
- `contactEmail`: text NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `features`: ARRAY NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false
- `settings`: jsonb NULL 

**インデックス**:
- `Tenant_domain_key`: domain (UNIQUE)
- `Tenant_is_deleted_idx`: is_deleted 
- `Tenant_pkey`: id (UNIQUE)


### `TenantSystemPlan`

**カラム**:
- `id`: text NOT NULL 
- `tenantId`: text NOT NULL 
- `systemType`: text NOT NULL 
- `planId`: text NOT NULL 
- `startDate`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `endDate`: timestamp without time zone NULL 
- `isActive`: boolean NOT NULL DEFAULT true
- `monthlyPrice`: integer NOT NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `TenantSystemPlan_isActive_idx`: isActive 
- `TenantSystemPlan_is_deleted_idx`: is_deleted 
- `TenantSystemPlan_pkey`: id (UNIQUE)
- `TenantSystemPlan_planId_idx`: planId 
- `TenantSystemPlan_systemType_idx`: systemType 
- `TenantSystemPlan_tenantId_idx`: tenantId 
- `TenantSystemPlan_tenantId_systemType_key`: systemType (UNIQUE)
- `TenantSystemPlan_tenantId_systemType_key`: tenantId (UNIQUE)


### `_prisma_migrations`

**カラム**:
- `id`: character varying(36) NOT NULL 
- `checksum`: character varying(64) NOT NULL 
- `finished_at`: timestamp with time zone NULL 
- `migration_name`: character varying(255) NOT NULL 
- `logs`: text NULL 
- `rolled_back_at`: timestamp with time zone NULL 
- `started_at`: timestamp with time zone NOT NULL DEFAULT now()
- `applied_steps_count`: integer NOT NULL DEFAULT 0

**インデックス**:
- `_prisma_migrations_pkey`: id (UNIQUE)


### `admin`

**カラム**:
- `id`: text NOT NULL 
- `email`: text NOT NULL 
- `username`: text NOT NULL 
- `display_name`: text NOT NULL 
- `password_hash`: text NOT NULL 
- `admin_level`: USER-DEFINED NOT NULL 
- `accessible_group_ids`: ARRAY NULL 
- `accessible_chain_ids`: ARRAY NULL 
- `accessible_tenant_ids`: ARRAY NULL 
- `last_login_at`: timestamp without time zone NULL 
- `login_attempts`: integer NOT NULL DEFAULT 0
- `locked_until`: timestamp without time zone NULL 
- `totp_secret`: text NULL 
- `totp_enabled`: boolean NOT NULL DEFAULT false
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 
- `created_by`: text NULL 
- `is_active`: boolean NOT NULL DEFAULT true
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `admin_email_key`: email (UNIQUE)
- `admin_is_deleted_idx`: is_deleted 
- `admin_pkey`: id (UNIQUE)
- `admin_username_key`: username (UNIQUE)


### `admin_log`

**カラム**:
- `id`: text NOT NULL 
- `admin_id`: text NOT NULL 
- `action`: text NOT NULL 
- `target_type`: text NULL 
- `target_id`: text NULL 
- `ip_address`: text NULL 
- `user_agent`: text NULL 
- `success`: boolean NOT NULL DEFAULT true
- `error_message`: text NULL 
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `admin_log_action_idx`: action 
- `admin_log_admin_id_idx`: admin_id 
- `admin_log_created_at_idx`: created_at 
- `admin_log_is_deleted_idx`: is_deleted 
- `admin_log_pkey`: id (UNIQUE)


### `campaign_categories`

**カラム**:
- `id`: text NOT NULL 
- `tenantId`: text NOT NULL 
- `code`: text NOT NULL 
- `name`: text NOT NULL 
- `description`: text NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `campaign_categories_code_key`: code (UNIQUE)
- `campaign_categories_is_deleted_idx`: is_deleted 
- `campaign_categories_pkey`: id (UNIQUE)
- `campaign_categories_tenantId_idx`: tenantId 


### `campaign_category_relations`

**カラム**:
- `id`: text NOT NULL 
- `campaignId`: text NOT NULL 
- `categoryId`: text NOT NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `campaign_category_relations_campaignId_categoryId_key`: campaignId (UNIQUE)
- `campaign_category_relations_campaignId_categoryId_key`: categoryId (UNIQUE)
- `campaign_category_relations_is_deleted_idx`: is_deleted 
- `campaign_category_relations_pkey`: id (UNIQUE)


### `campaign_items`

**カラム**:
- `id`: text NOT NULL 
- `campaignId`: text NOT NULL 
- `itemId`: text NOT NULL 
- `itemType`: text NOT NULL 
- `priority`: integer NOT NULL DEFAULT 0
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `campaign_items_campaignId_itemId_itemType_key`: campaignId (UNIQUE)
- `campaign_items_campaignId_itemId_itemType_key`: itemId (UNIQUE)
- `campaign_items_campaignId_itemId_itemType_key`: itemType (UNIQUE)
- `campaign_items_is_deleted_idx`: is_deleted 
- `campaign_items_pkey`: id (UNIQUE)


### `campaign_translations`

**カラム**:
- `id`: text NOT NULL 
- `campaignId`: text NOT NULL 
- `locale`: text NOT NULL 
- `title`: text NOT NULL 
- `description`: text NULL 
- `imageUrl`: text NULL 
- `languageCode`: text NULL 
- `name`: text NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `campaign_translations_campaignId_locale_key`: campaignId (UNIQUE)
- `campaign_translations_campaignId_locale_key`: locale (UNIQUE)
- `campaign_translations_is_deleted_idx`: is_deleted 
- `campaign_translations_languageCode_idx`: languageCode 
- `campaign_translations_pkey`: id (UNIQUE)


### `campaign_usage_logs`

**カラム**:
- `id`: text NOT NULL 
- `campaignId`: text NOT NULL 
- `userId`: text NULL 
- `deviceId`: text NULL 
- `action`: text NOT NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `campaign_usage_logs_campaignId_idx`: campaignId 
- `campaign_usage_logs_deviceId_idx`: deviceId 
- `campaign_usage_logs_is_deleted_idx`: is_deleted 
- `campaign_usage_logs_pkey`: id (UNIQUE)
- `campaign_usage_logs_userId_idx`: userId 


### `campaigns`

**カラム**:
- `id`: text NOT NULL 
- `tenantId`: text NOT NULL 
- `code`: text NOT NULL 
- `status`: USER-DEFINED NOT NULL DEFAULT 'DRAFT'::"CampaignStatus"
- `displayType`: USER-DEFINED NOT NULL 
- `startDate`: timestamp without time zone NULL 
- `endDate`: timestamp without time zone NULL 
- `priority`: integer NOT NULL DEFAULT 0
- `ctaType`: USER-DEFINED NOT NULL DEFAULT 'NONE'::"CampaignCtaType"
- `ctaAction`: text NULL 
- `ctaLabel`: text NULL 
- `discountType`: text NULL 
- `discountValue`: numeric NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `dayRestrictions`: jsonb NULL 
- `description`: text NULL 
- `displayPriority`: integer NOT NULL DEFAULT 0
- `maxUsageCount`: integer NULL 
- `name`: text NOT NULL 
- `timeRestrictions`: jsonb NULL 
- `welcomeSettings`: jsonb NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `campaigns_code_key`: code (UNIQUE)
- `campaigns_is_deleted_idx`: is_deleted 
- `campaigns_pkey`: id (UNIQUE)
- `campaigns_startDate_endDate_idx`: endDate 
- `campaigns_startDate_endDate_idx`: startDate 
- `campaigns_status_idx`: status 
- `campaigns_tenantId_idx`: tenantId 


### `checkin_sessions`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `session_number`: text NOT NULL 
- `reservation_id`: text NULL 
- `room_id`: text NOT NULL 
- `guest_info`: jsonb NOT NULL 
- `adults`: integer NOT NULL DEFAULT 1
- `children`: integer NOT NULL DEFAULT 0
- `check_in_at`: timestamp without time zone NOT NULL 
- `check_out_at`: timestamp without time zone NULL 
- `planned_check_out`: timestamp without time zone NOT NULL 
- `status`: text NOT NULL DEFAULT 'ACTIVE'::text
- `special_requests`: text NULL 
- `notes`: text NULL 
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 

**インデックス**:
- `checkin_sessions_check_in_at_idx`: check_in_at 
- `checkin_sessions_pkey`: id (UNIQUE)
- `checkin_sessions_room_id_idx`: room_id 
- `checkin_sessions_session_number_idx`: session_number 
- `checkin_sessions_session_number_key`: session_number (UNIQUE)
- `checkin_sessions_status_idx`: status 
- `checkin_sessions_tenant_id_idx`: tenant_id 


### `customers`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `name`: text NOT NULL 
- `email`: text NULL 
- `phone`: text NULL 
- `address`: text NULL 
- `birth_date`: timestamp without time zone NULL 
- `member_id`: text NULL 
- `rank_id`: text NULL 
- `total_points`: integer NOT NULL DEFAULT 0
- `total_stays`: integer NOT NULL DEFAULT 0
- `pms_updatable_fields`: ARRAY NULL DEFAULT ARRAY['name'::text, 'phone'::text, 'address'::text]
- `origin_system`: text NOT NULL DEFAULT 'hotel-member'::text
- `synced_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_by_system`: text NOT NULL DEFAULT 'hotel-member'::text
- `preferences`: jsonb NOT NULL DEFAULT '{}'::jsonb
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `customers_email_idx`: email 
- `customers_is_deleted_idx`: is_deleted 
- `customers_member_id_idx`: member_id 
- `customers_pkey`: id (UNIQUE)
- `customers_tenant_id_idx`: tenant_id 


### `device_rooms`

**カラム**:
- `id`: integer NOT NULL DEFAULT nextval('device_rooms_id_seq'::regclass)
- `tenantId`: text NOT NULL 
- `roomId`: text NOT NULL 
- `roomName`: text NULL 
- `deviceId`: text NULL 
- `deviceType`: text NULL 
- `placeId`: text NULL 
- `status`: text NULL DEFAULT 'active'::text
- `ipAddress`: text NULL 
- `macAddress`: text NULL 
- `lastUsedAt`: timestamp without time zone NULL 
- `isActive`: boolean NOT NULL DEFAULT true
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 

**インデックス**:
- `device_rooms_deviceId_idx`: deviceId 
- `device_rooms_is_deleted_idx`: is_deleted 
- `device_rooms_pkey`: id (UNIQUE)
- `device_rooms_placeId_idx`: placeId 
- `device_rooms_roomId_idx`: roomId 
- `device_rooms_status_idx`: status 
- `device_rooms_tenantId_idx`: tenantId 


### `device_video_caches`

**カラム**:
- `id`: text NOT NULL 
- `deviceId`: text NOT NULL 
- `videoIds`: ARRAY NULL 
- `lastShownAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `lastViewedAt`: timestamp without time zone NULL 
- `userId`: text NULL 
- `viewed`: boolean NOT NULL DEFAULT false
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `device_video_caches_deviceId_userId_key`: deviceId (UNIQUE)
- `device_video_caches_deviceId_userId_key`: userId (UNIQUE)
- `device_video_caches_is_deleted_idx`: is_deleted 
- `device_video_caches_pkey`: id (UNIQUE)


### `notification_templates`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `type`: text NOT NULL 
- `code`: text NOT NULL 
- `subject`: text NULL 
- `content`: text NOT NULL 
- `variables`: ARRAY NULL 
- `is_active`: boolean NOT NULL DEFAULT true
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 
- `body`: text NOT NULL 
- `html`: boolean NOT NULL DEFAULT false
- `locale`: text NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `notification_templates_is_deleted_idx`: is_deleted 
- `notification_templates_pkey`: id (UNIQUE)
- `notification_templates_tenant_id_idx`: tenant_id 
- `notification_templates_tenant_id_type_code_locale_key`: code (UNIQUE)
- `notification_templates_tenant_id_type_code_locale_key`: locale (UNIQUE)
- `notification_templates_tenant_id_type_code_locale_key`: tenant_id (UNIQUE)
- `notification_templates_tenant_id_type_code_locale_key`: type (UNIQUE)
- `notification_templates_type_idx`: type 


### `page_histories`

**カラム**:
- `Id`: text NOT NULL 
- `PageId`: text NOT NULL 
- `Html`: text NULL 
- `Css`: text NULL 
- `Content`: text NULL 
- `Template`: text NULL 
- `Version`: integer NOT NULL 
- `CreatedAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `CreatedBy`: text NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `page_histories_PageId_idx`: PageId 
- `page_histories_Version_idx`: Version 
- `page_histories_is_deleted_idx`: is_deleted 
- `page_histories_pkey`: Id (UNIQUE)


### `pages`

**カラム**:
- `Id`: text NOT NULL 
- `TenantId`: text NOT NULL 
- `Slug`: text NOT NULL 
- `Title`: text NOT NULL 
- `Html`: text NULL 
- `Css`: text NULL 
- `Content`: text NULL 
- `Template`: text NULL 
- `IsPublished`: boolean NOT NULL DEFAULT false
- `PublishedAt`: timestamp without time zone NULL 
- `Version`: integer NOT NULL DEFAULT 1
- `CreatedAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `UpdatedAt`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `pages_IsPublished_idx`: IsPublished 
- `pages_Slug_idx`: Slug 
- `pages_TenantId_Slug_key`: Slug (UNIQUE)
- `pages_TenantId_Slug_key`: TenantId (UNIQUE)
- `pages_TenantId_idx`: TenantId 
- `pages_is_deleted_idx`: is_deleted 
- `pages_pkey`: Id (UNIQUE)


### `payments`

**カラム**:
- `id`: text NOT NULL DEFAULT (gen_random_uuid())::text
- `tenantId`: text NOT NULL 
- `transactionId`: text NULL 
- `paymentMethod`: text NOT NULL 
- `amount`: integer NOT NULL 
- `status`: text NULL DEFAULT 'PENDING'::text
- `reference`: text NULL 
- `metadata`: jsonb NULL 
- `processedAt`: timestamp without time zone NULL 
- `createdAt`: timestamp without time zone NULL DEFAULT now()
- `updatedAt`: timestamp without time zone NULL DEFAULT now()
- `createdBy`: text NULL 
- `isDeleted`: boolean NULL DEFAULT false
- `deletedAt`: timestamp without time zone NULL 
- `deletedBy`: text NULL 

**インデックス**:
- `idx_payments_createdat`: createdAt 
- `idx_payments_isdeleted`: isDeleted 
- `idx_payments_paymentmethod`: paymentMethod 
- `idx_payments_status`: status 
- `idx_payments_tenantid`: tenantId 
- `payments_pkey`: id (UNIQUE)


### `reservations`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `customer_id`: text NULL 
- `guest_name`: text NOT NULL 
- `guest_phone`: text NULL 
- `guest_email`: text NULL 
- `checkin_date`: timestamp without time zone NOT NULL 
- `checkout_date`: timestamp without time zone NOT NULL 
- `adult_count`: integer NOT NULL DEFAULT 1
- `child_count`: integer NOT NULL DEFAULT 0
- `room_type`: text NOT NULL 
- `room_number`: text NULL 
- `total_amount`: numeric NOT NULL 
- `deposit_amount`: numeric NOT NULL DEFAULT 0
- `status`: text NOT NULL DEFAULT 'PENDING'::text
- `origin`: text NOT NULL 
- `ota_id`: text NULL 
- `confirmation_number`: text NOT NULL 
- `special_requests`: text NULL 
- `internal_notes`: text NULL 
- `origin_system`: text NOT NULL DEFAULT 'hotel-pms'::text
- `synced_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_by_system`: text NOT NULL DEFAULT 'hotel-pms'::text
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 
- `deleted_at`: timestamp without time zone NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false
- `deleted_by`: text NULL 

**インデックス**:
- `reservations_checkin_date_idx`: checkin_date 
- `reservations_checkout_date_idx`: checkout_date 
- `reservations_is_deleted_idx`: is_deleted 
- `reservations_pkey`: id (UNIQUE)
- `reservations_status_idx`: status 
- `reservations_tenant_id_idx`: tenant_id 


### `response_node_translations`

**カラム**:
- `id`: text NOT NULL 
- `nodeId`: text NOT NULL 
- `locale`: text NOT NULL 
- `content`: text NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `answer`: jsonb NULL 
- `language`: text NULL 
- `title`: text NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `response_node_translations_is_deleted_idx`: is_deleted 
- `response_node_translations_nodeId_language_key`: language (UNIQUE)
- `response_node_translations_nodeId_language_key`: nodeId (UNIQUE)
- `response_node_translations_nodeId_locale_key`: locale (UNIQUE)
- `response_node_translations_nodeId_locale_key`: nodeId (UNIQUE)
- `response_node_translations_pkey`: id (UNIQUE)


### `response_nodes`

**カラム**:
- `id`: text NOT NULL 
- `treeId`: text NOT NULL 
- `nodeType`: text NOT NULL 
- `content`: text NULL 
- `metadata`: jsonb NULL 
- `isRoot`: boolean NOT NULL DEFAULT false
- `parentId`: text NULL 
- `position`: integer NOT NULL DEFAULT 0
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `answer`: jsonb NULL 
- `description`: text NULL 
- `icon`: text NULL 
- `order`: integer NOT NULL DEFAULT 0
- `title`: text NULL 
- `type`: text NULL 

**インデックス**:
- `response_nodes_isRoot_idx`: isRoot 
- `response_nodes_parentId_idx`: parentId 
- `response_nodes_pkey`: id (UNIQUE)
- `response_nodes_treeId_idx`: treeId 


### `response_tree_history`

**カラム**:
- `id`: text NOT NULL 
- `sessionId`: text NOT NULL 
- `nodeId`: text NOT NULL 
- `response`: text NULL 
- `metadata`: jsonb NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `action`: text NULL 
- `timestamp`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP

**インデックス**:
- `response_tree_history_pkey`: id (UNIQUE)
- `response_tree_history_sessionId_idx`: sessionId 


### `response_tree_mobile_links`

**カラム**:
- `id`: text NOT NULL 
- `sessionId`: text NOT NULL 
- `code`: text NOT NULL 
- `qrCodeData`: text NULL 
- `isActive`: boolean NOT NULL DEFAULT true
- `connectionId`: text NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `expiresAt`: timestamp without time zone NOT NULL 
- `connectedAt`: timestamp without time zone NULL 
- `deviceId`: integer NULL 

**インデックス**:
- `response_tree_mobile_links_code_idx`: code 
- `response_tree_mobile_links_code_key`: code (UNIQUE)
- `response_tree_mobile_links_isActive_idx`: isActive 
- `response_tree_mobile_links_pkey`: id (UNIQUE)


### `response_tree_sessions`

**カラム**:
- `id`: text NOT NULL 
- `treeId`: text NOT NULL 
- `userId`: text NULL 
- `deviceId`: text NULL 
- `currentNodeId`: text NULL 
- `metadata`: jsonb NULL 
- `isComplete`: boolean NOT NULL DEFAULT false
- `startedAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `completedAt`: timestamp without time zone NULL 
- `endedAt`: timestamp without time zone NULL 
- `interfaceType`: text NULL 
- `language`: text NULL 
- `lastActivityAt`: timestamp without time zone NULL 
- `roomId`: text NULL 
- `sessionId`: text NOT NULL 

**インデックス**:
- `response_tree_sessions_deviceId_idx`: deviceId 
- `response_tree_sessions_isComplete_idx`: isComplete 
- `response_tree_sessions_pkey`: id (UNIQUE)
- `response_tree_sessions_sessionId_key`: sessionId (UNIQUE)
- `response_tree_sessions_treeId_idx`: treeId 
- `response_tree_sessions_userId_idx`: userId 


### `response_tree_versions`

**カラム**:
- `id`: text NOT NULL 
- `treeId`: text NOT NULL 
- `version`: integer NOT NULL 
- `snapshot`: jsonb NOT NULL 
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `createdBy`: text NULL 
- `data`: jsonb NULL 

**インデックス**:
- `response_tree_versions_pkey`: id (UNIQUE)
- `response_tree_versions_treeId_version_key`: treeId (UNIQUE)
- `response_tree_versions_treeId_version_key`: version (UNIQUE)


### `response_trees`

**カラム**:
- `id`: text NOT NULL 
- `tenantId`: text NOT NULL 
- `name`: text NOT NULL 
- `description`: text NULL 
- `isPublished`: boolean NOT NULL DEFAULT false
- `publishedAt`: timestamp without time zone NULL 
- `version`: integer NOT NULL DEFAULT 1
- `createdAt`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updatedAt`: timestamp without time zone NOT NULL 
- `isActive`: boolean NOT NULL DEFAULT true
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `response_trees_isPublished_idx`: isPublished 
- `response_trees_is_deleted_idx`: is_deleted 
- `response_trees_pkey`: id (UNIQUE)
- `response_trees_tenantId_idx`: tenantId 


### `room_grades`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `code`: text NOT NULL 
- `name`: text NOT NULL 
- `description`: text NULL 
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 

**インデックス**:
- `room_grades_pkey`: id (UNIQUE)
- `room_grades_tenant_id_code_key`: code (UNIQUE)
- `room_grades_tenant_id_code_key`: tenant_id (UNIQUE)
- `room_grades_tenant_id_idx`: tenant_id 


### `rooms`

**カラム**:
- `id`: text NOT NULL DEFAULT (gen_random_uuid())::text
- `tenantId`: text NOT NULL 
- `roomNumber`: text NOT NULL 
- `roomType`: text NOT NULL 
- `floor`: integer NULL 
- `status`: text NULL DEFAULT 'AVAILABLE'::text
- `capacity`: integer NULL DEFAULT 2
- `amenities`: jsonb NULL 
- `notes`: text NULL 
- `lastCleaned`: timestamp without time zone NULL 
- `createdAt`: timestamp without time zone NULL DEFAULT now()
- `updatedAt`: timestamp without time zone NULL DEFAULT now()
- `isDeleted`: boolean NULL DEFAULT false
- `deletedAt`: timestamp without time zone NULL 
- `deletedBy`: text NULL 

**インデックス**:
- `idx_rooms_floor`: floor 
- `idx_rooms_isdeleted`: isDeleted 
- `idx_rooms_roomtype`: roomType 
- `idx_rooms_status`: status 
- `idx_rooms_tenantid`: tenantId 
- `rooms_pkey`: id (UNIQUE)
- `rooms_tenantId_roomNumber_key`: roomNumber (UNIQUE)
- `rooms_tenantId_roomNumber_key`: tenantId (UNIQUE)


### `schema_version`

**カラム**:
- `version`: text NOT NULL 
- `description`: text NOT NULL 
- `rollback_sql`: text NULL 
- `applied_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `applied_by`: text NULL 

**インデックス**:
- `schema_version_pkey`: version (UNIQUE)


### `service_plan_restrictions`

**カラム**:
- `id`: text NOT NULL 
- `service_type`: text NOT NULL 
- `plan_type`: text NOT NULL 
- `plan_category`: text NOT NULL 
- `max_users`: integer NOT NULL DEFAULT 10
- `max_devices`: integer NOT NULL DEFAULT 5
- `max_monthly_orders`: integer NULL 
- `enable_ai_concierge`: boolean NULL 
- `enable_multilingual`: boolean NULL 
- `max_rooms`: integer NULL 
- `enable_revenue_management`: boolean NULL 
- `max_monthly_ai_requests`: integer NULL 
- `enable_ai_crm`: boolean NULL 
- `monthly_price`: integer NOT NULL DEFAULT 9800
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP

**インデックス**:
- `service_plan_restrictions_pkey`: id (UNIQUE)
- `service_plan_restrictions_service_type_plan_type_plan_category_`: plan_category (UNIQUE)
- `service_plan_restrictions_service_type_plan_type_plan_category_`: plan_type (UNIQUE)
- `service_plan_restrictions_service_type_plan_type_plan_category_`: service_type (UNIQUE)


### `service_usage_statistics`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `service_type`: text NOT NULL 
- `month`: text NOT NULL 
- `active_users_count`: integer NOT NULL DEFAULT 0
- `active_devices_count`: integer NOT NULL DEFAULT 0
- `usage_data`: jsonb NOT NULL DEFAULT '{}'::jsonb
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP

**インデックス**:
- `service_usage_statistics_pkey`: id (UNIQUE)
- `service_usage_statistics_tenant_id_service_type_month_key`: month (UNIQUE)
- `service_usage_statistics_tenant_id_service_type_month_key`: service_type (UNIQUE)
- `service_usage_statistics_tenant_id_service_type_month_key`: tenant_id (UNIQUE)


### `session_billings`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `session_id`: text NOT NULL 
- `billing_number`: text NOT NULL 
- `room_charges`: jsonb NOT NULL 
- `service_charges`: jsonb NOT NULL 
- `taxes`: jsonb NOT NULL 
- `discounts`: jsonb NOT NULL 
- `subtotal_amount`: integer NOT NULL 
- `tax_amount`: integer NOT NULL 
- `total_amount`: integer NOT NULL 
- `paid_amount`: integer NOT NULL DEFAULT 0
- `status`: text NOT NULL DEFAULT 'PENDING'::text
- `payment_method`: text NULL 
- `payment_date`: timestamp without time zone NULL 
- `due_date`: timestamp without time zone NOT NULL 
- `notes`: text NULL 
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 

**インデックス**:
- `session_billings_billing_number_idx`: billing_number 
- `session_billings_billing_number_key`: billing_number (UNIQUE)
- `session_billings_due_date_idx`: due_date 
- `session_billings_pkey`: id (UNIQUE)
- `session_billings_session_id_idx`: session_id 
- `session_billings_status_idx`: status 
- `session_billings_tenant_id_idx`: tenant_id 


### `staff`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `email`: text NOT NULL 
- `name`: text NOT NULL 
- `role`: text NOT NULL 
- `department`: text NULL 
- `is_active`: boolean NOT NULL DEFAULT true
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL 
- `failed_login_count`: integer NOT NULL DEFAULT 0
- `last_login_at`: timestamp without time zone NULL 
- `locked_until`: timestamp without time zone NULL 
- `password_hash`: text NULL 
- `deleted_at`: timestamp without time zone NULL 
- `deleted_by`: text NULL 
- `is_deleted`: boolean NOT NULL DEFAULT false

**インデックス**:
- `staff_email_idx`: email 
- `staff_is_deleted_idx`: is_deleted 
- `staff_pkey`: id (UNIQUE)
- `staff_role_idx`: role 
- `staff_tenant_id_email_key`: email (UNIQUE)
- `staff_tenant_id_email_key`: tenant_id (UNIQUE)
- `staff_tenant_id_idx`: tenant_id 


### `system_event`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `user_id`: text NULL 
- `event_type`: text NOT NULL 
- `source_system`: text NOT NULL 
- `target_system`: text NOT NULL 
- `entity_type`: text NOT NULL 
- `entity_id`: text NOT NULL 
- `action`: text NOT NULL 
- `event_data`: jsonb NULL 
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `processed_at`: timestamp without time zone NULL 
- `status`: text NOT NULL DEFAULT 'PENDING'::text

**インデックス**:
- `system_event_created_at_idx`: created_at 
- `system_event_event_type_idx`: event_type 
- `system_event_pkey`: id (UNIQUE)
- `system_event_status_idx`: status 
- `system_event_tenant_id_idx`: tenant_id 


### `tenant_access_logs`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `user_id`: text NULL 
- `action`: text NOT NULL 
- `resource`: text NULL 
- `ip_address`: text NULL 
- `user_agent`: text NULL 
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `source_system`: text NULL 

**インデックス**:
- `tenant_access_logs_created_at_idx`: created_at 
- `tenant_access_logs_pkey`: id (UNIQUE)
- `tenant_access_logs_tenant_id_idx`: tenant_id 
- `tenant_access_logs_user_id_idx`: user_id 


### `tenant_services`

**カラム**:
- `id`: text NOT NULL 
- `tenant_id`: text NOT NULL 
- `service_type`: text NOT NULL 
- `plan_type`: text NOT NULL 
- `is_active`: boolean NOT NULL DEFAULT true
- `activated_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `expires_at`: timestamp without time zone NULL 
- `service_config`: jsonb NOT NULL DEFAULT '{}'::jsonb
- `created_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at`: timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP

**インデックス**:
- `tenant_services_pkey`: id (UNIQUE)
- `tenant_services_tenant_id_service_type_key`: service_type (UNIQUE)
- `tenant_services_tenant_id_service_type_key`: tenant_id (UNIQUE)


### `transactions`

**カラム**:
- `id`: text NOT NULL DEFAULT (gen_random_uuid())::text
- `tenantId`: text NOT NULL 
- `invoiceId`: text NULL 
- `paymentId`: text NULL 
- `type`: text NOT NULL 
- `amount`: integer NOT NULL 
- `taxAmount`: integer NULL DEFAULT 0
- `totalAmount`: integer NOT NULL 
- `status`: text NULL DEFAULT 'PENDING'::text
- `description`: text NULL 
- `reference`: text NULL 
- `metadata`: jsonb NULL 
- `createdAt`: timestamp without time zone NULL DEFAULT now()
- `updatedAt`: timestamp without time zone NULL DEFAULT now()
- `createdBy`: text NULL 
- `isDeleted`: boolean NULL DEFAULT false
- `deletedAt`: timestamp without time zone NULL 
- `deletedBy`: text NULL 

**インデックス**:
- `idx_transactions_createdat`: createdAt 
- `idx_transactions_isdeleted`: isDeleted 
- `idx_transactions_status`: status 
- `idx_transactions_tenantid`: tenantId 
- `idx_transactions_type`: type 
- `transactions_pkey`: id (UNIQUE)


## 推奨アクション


### 整合性は完璧です ✅

現在のデータベースとPrismaスキーマは完全に整合性が取れています。


---

*このレポートは自動生成されました。最新の状態を確認するには、監査スクリプトを再実行してください。*
