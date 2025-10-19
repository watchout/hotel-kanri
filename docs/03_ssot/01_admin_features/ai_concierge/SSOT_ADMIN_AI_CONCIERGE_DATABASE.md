# 🗄️ SSOT: AIコンシェルジュ - データベース設計

**親SSOT**: [SSOT_ADMIN_AI_CONCIERGE.md](./SSOT_ADMIN_AI_CONCIERGE.md)

---

## データベース設計

### 新規作成テーブル（8テーブル）

すべて **snake_case** 命名規則に準拠（[DATABASE_NAMING_STANDARD.md v3.0.0](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md)）

---

#### 1. tenant_ai_providers
**目的**: テナントごとのLLMプロバイダー設定（マルチプロバイダー対応）

**Prisma定義**:
```prisma
model TenantAiProvider {
  id                String    @id @default(cuid())
  tenantId          String    @map("tenant_id")
  provider          String    // "openai", "anthropic", "google", "azure_openai", "aws_bedrock", "cohere"
  displayName       String    @map("display_name")
  apiKeyPrimary     String    @map("api_key_primary")     // 暗号化必須
  apiKeySecondary   String?   @map("api_key_secondary")   // フォールバック用
  endpointUrl       String?   @map("endpoint_url")        // Azure等のカスタムエンドポイント
  organizationId    String?   @map("organization_id")     // OpenAI Organization ID等
  region            String?                                // AWS/Azure等のリージョン
  modelPreference   String    @map("model_preference")    // プロバイダー固有のモデル名
  priority          Int       @default(0)                  // 優先順位（0=最優先）
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")
  isDeleted         Boolean   @default(false) @map("is_deleted")
  
  @@unique([tenantId, provider], map: "uniq_tenant_ai_providers_tenant_provider")
  @@index([tenantId], map: "idx_tenant_ai_providers_tenant_id")
  @@index([tenantId, isActive, priority], map: "idx_tenant_ai_providers_active_priority")
  @@index([isDeleted], map: "idx_tenant_ai_providers_is_deleted")
  @@map("tenant_ai_providers")
}
```

**DDL**:
```sql
CREATE TABLE tenant_ai_providers (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  provider          TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  api_key_primary   TEXT NOT NULL,      -- 暗号化必須（crypto.encrypt()使用）
  api_key_secondary TEXT,
  endpoint_url      TEXT,
  organization_id   TEXT,
  region            TEXT,
  model_preference  TEXT NOT NULL,
  priority          INTEGER DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  deleted_at        TIMESTAMP,
  is_deleted        BOOLEAN DEFAULT false
);

CREATE UNIQUE INDEX uniq_tenant_ai_providers_tenant_provider 
  ON tenant_ai_providers(tenant_id, provider);
CREATE INDEX idx_tenant_ai_providers_tenant_id 
  ON tenant_ai_providers(tenant_id);
CREATE INDEX idx_tenant_ai_providers_active_priority 
  ON tenant_ai_providers(tenant_id, is_active, priority);
CREATE INDEX idx_tenant_ai_providers_is_deleted 
  ON tenant_ai_providers(is_deleted);
```

**暗号化要件**:
- `api_key_primary` と `api_key_secondary` は必ず暗号化
- 保存時: `crypto.encrypt(apiKey, process.env.ENCRYPTION_KEY)`
- 取得時: `crypto.decrypt(encryptedKey, process.env.ENCRYPTION_KEY)`

---

#### 2. tenant_ai_model_assignments
**目的**: 用途別AIモデル割り当て（concierge_chat/embedding/tree_generation等）

**Prisma定義**:
```prisma
model TenantAiModelAssignment {
  id                   String    @id @default(cuid())
  tenantId             String    @map("tenant_id")
  usageContext         String    @map("usage_context")  // "concierge_chat", "knowledge_embedding", "response_tree_generation"
  providerId           String    @map("provider_id")    // tenant_ai_providers.id
  modelName            String    @map("model_name")
  fallbackProviderId   String?   @map("fallback_provider_id")
  isActive             Boolean   @default(true) @map("is_active")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  
  @@unique([tenantId, usageContext], map: "uniq_tenant_ai_model_assignments_tenant_context")
  @@index([tenantId], map: "idx_tenant_ai_model_assignments_tenant_id")
  @@map("tenant_ai_model_assignments")
}
```

**DDL**:
```sql
CREATE TABLE tenant_ai_model_assignments (
  id                     TEXT PRIMARY KEY,
  tenant_id              TEXT NOT NULL,
  usage_context          TEXT NOT NULL,  -- "concierge_chat", "knowledge_embedding", "response_tree_generation"
  provider_id            TEXT NOT NULL,
  model_name             TEXT NOT NULL,
  fallback_provider_id   TEXT,
  is_active              BOOLEAN DEFAULT true,
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_tenant_ai_model_assignments_tenant_context 
  ON tenant_ai_model_assignments(tenant_id, usage_context);
CREATE INDEX idx_tenant_ai_model_assignments_tenant_id 
  ON tenant_ai_model_assignments(tenant_id);
```

---

#### 3. ai_knowledge_bases
**目的**: RAG用知識ベース管理（PDF/テキスト/画像）

**Prisma定義**:
```prisma
model AiKnowledgeBase {
  id              String    @id @default(cuid())
  tenantId        String    @map("tenant_id")
  title           String
  description     String?
  fileType        String    @map("file_type")     // "pdf", "text", "image", "info_article"
  filePath        String    @map("file_path")     // S3/ローカルパス
  fileSize        BigInt    @map("file_size")     // バイト
  language        String    @default("ja")
  vectorized      Boolean   @default(false)       // ベクトル化完了フラグ
  vectorDbId      String?   @map("vector_db_id")  // ベクトルDB内のID
  chunkCount      Int?      @map("chunk_count")   // チャンク数
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
  isDeleted       Boolean   @default(false) @map("is_deleted")
  
  @@index([tenantId], map: "idx_ai_knowledge_bases_tenant_id")
  @@index([tenantId, isActive], map: "idx_ai_knowledge_bases_tenant_active")
  @@index([tenantId, language], map: "idx_ai_knowledge_bases_tenant_language")
  @@index([isDeleted], map: "idx_ai_knowledge_bases_is_deleted")
  @@map("ai_knowledge_bases")
}
```

**DDL**:
```sql
CREATE TABLE ai_knowledge_bases (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  file_type     TEXT NOT NULL,  -- "pdf", "text", "image", "info_article"
  file_path     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  language      TEXT DEFAULT 'ja',
  vectorized    BOOLEAN DEFAULT false,
  vector_db_id  TEXT,
  chunk_count   INTEGER,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  deleted_at    TIMESTAMP,
  is_deleted    BOOLEAN DEFAULT false
);

CREATE INDEX idx_ai_knowledge_bases_tenant_id ON ai_knowledge_bases(tenant_id);
CREATE INDEX idx_ai_knowledge_bases_tenant_active ON ai_knowledge_bases(tenant_id, is_active);
CREATE INDEX idx_ai_knowledge_bases_tenant_language ON ai_knowledge_bases(tenant_id, language);
CREATE INDEX idx_ai_knowledge_bases_is_deleted ON ai_knowledge_bases(is_deleted);
```

---

#### 4. ai_conversations
**目的**: チャット型AI会話セッション管理

**Prisma定義**:
```prisma
model AiConversation {
  id          String       @id @default(cuid())
  tenantId    String       @map("tenant_id")
  sessionId   String       @map("session_id") @unique
  roomId      String?      @map("room_id")
  deviceId    Int?         @map("device_id")
  language    String       @default("ja")
  startedAt   DateTime     @default(now()) @map("started_at")
  endedAt     DateTime?    @map("ended_at")
  messageCount Int         @default(0) @map("message_count")
  totalTokens  Int         @default(0) @map("total_tokens")
  totalCost    Decimal      @default(0) @map("total_cost") @db.Decimal(10, 4)
  
  messages    AiMessage[]
  
  @@index([tenantId], map: "idx_ai_conversations_tenant_id")
  @@index([tenantId, startedAt], map: "idx_ai_conversations_tenant_started")
  @@index([roomId], map: "idx_ai_conversations_room_id")
  @@index([deviceId], map: "idx_ai_conversations_device_id")
  @@map("ai_conversations")
}
```

**DDL**:
```sql
CREATE TABLE ai_conversations (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  session_id    TEXT UNIQUE NOT NULL,
  room_id       TEXT,
  device_id     INTEGER,
  language      TEXT DEFAULT 'ja',
  started_at    TIMESTAMP DEFAULT NOW(),
  ended_at      TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  total_tokens  INTEGER DEFAULT 0,
  total_cost    DECIMAL(10, 4) DEFAULT 0
);

CREATE INDEX idx_ai_conversations_tenant_id ON ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_tenant_started ON ai_conversations(tenant_id, started_at);
CREATE INDEX idx_ai_conversations_room_id ON ai_conversations(room_id);
CREATE INDEX idx_ai_conversations_device_id ON ai_conversations(device_id);
```

---

#### 5. ai_messages
**目的**: チャット型AIメッセージ履歴

**Prisma定義**:
```prisma
model AiMessage {
  id              String         @id @default(cuid())
  conversationId  String         @map("conversation_id")
  role            String         // "user", "assistant", "system"
  content         String         @db.Text
  timestamp       DateTime       @default(now())
  modelUsed       String?        @map("model_used")
  promptTokens    Int?           @map("prompt_tokens")
  completionTokens Int?          @map("completion_tokens")
  totalTokens     Int?           @map("total_tokens")
  cost            Decimal?       @db.Decimal(10, 6)
  
  conversation    AiConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId], map: "idx_ai_messages_conversation_id")
  @@index([timestamp], map: "idx_ai_messages_timestamp")
  @@map("ai_messages")
}
```

**DDL**:
```sql
CREATE TABLE ai_messages (
  id                 TEXT PRIMARY KEY,
  conversation_id    TEXT NOT NULL,
  role               TEXT NOT NULL,  -- "user", "assistant", "system"
  content            TEXT NOT NULL,
  timestamp          TIMESTAMP DEFAULT NOW(),
  model_used         TEXT,
  prompt_tokens      INTEGER,
  completion_tokens  INTEGER,
  total_tokens       INTEGER,
  cost               DECIMAL(10, 6)
);

CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_timestamp ON ai_messages(timestamp);

ALTER TABLE ai_messages 
  ADD CONSTRAINT fk_ai_messages_conversation 
  FOREIGN KEY (conversation_id) 
  REFERENCES ai_conversations(id) 
  ON DELETE CASCADE;
```

---

#### 6. ai_characters
**目的**: AIキャラクター設定（プロンプト・パーソナリティ）

**Prisma定義**:
```prisma
model AiCharacter {
  id              String    @id @default(cuid())
  tenantId        String    @map("tenant_id")
  name            String
  imageUrl        String?   @map("image_url")
  friendly        Int       @default(70)          // 0-100
  humor           Int       @default(50)          // 0-100
  politeness      Int       @default(60)          // 0-100
  toneTemplate    String    @map("tone_template") @default("敬語")
  endingPhrase    String    @map("ending_phrase") @default("です。")
  rawDescription  String?   @map("raw_description") @db.Text
  promptSummary   String    @map("prompt_summary") @db.Text
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  @@unique([tenantId], map: "uniq_ai_characters_tenant_id")  // テナントごとに1キャラクター
  @@index([tenantId], map: "idx_ai_characters_tenant_id")
  @@map("ai_characters")
}
```

**DDL**:
```sql
CREATE TABLE ai_characters (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL,
  name             TEXT NOT NULL,
  image_url        TEXT,
  friendly         INTEGER DEFAULT 70,
  humor            INTEGER DEFAULT 50,
  politeness       INTEGER DEFAULT 60,
  tone_template    TEXT DEFAULT '敬語',
  ending_phrase    TEXT DEFAULT 'です。',
  raw_description  TEXT,
  prompt_summary   TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_ai_characters_tenant_id ON ai_characters(tenant_id);
CREATE INDEX idx_ai_characters_tenant_id ON ai_characters(tenant_id);
```

---

#### 7. ai_credit_transactions
**目的**: AIクレジット使用履歴・チャージ履歴

**Prisma定義**:
```prisma
model AiCreditTransaction {
  id              String    @id @default(cuid())
  tenantId        String    @map("tenant_id")
  transactionType String    @map("transaction_type")  // "charge", "usage", "refund"
  amount          Decimal   @db.Decimal(10, 4)
  balanceAfter    Decimal   @map("balance_after") @db.Decimal(10, 4)
  modelName       String?   @map("model_name")
  conversationId  String?   @map("conversation_id")
  description     String?
  createdAt       DateTime  @default(now()) @map("created_at")
  
  @@index([tenantId], map: "idx_ai_credit_transactions_tenant_id")
  @@index([tenantId, createdAt], map: "idx_ai_credit_transactions_tenant_created")
  @@index([transactionType], map: "idx_ai_credit_transactions_type")
  @@map("ai_credit_transactions")
}
```

**DDL**:
```sql
CREATE TABLE ai_credit_transactions (
  id                TEXT PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  transaction_type  TEXT NOT NULL,  -- "charge", "usage", "refund"
  amount            DECIMAL(10, 4) NOT NULL,
  balance_after     DECIMAL(10, 4) NOT NULL,
  model_name        TEXT,
  conversation_id   TEXT,
  description       TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_credit_transactions_tenant_id ON ai_credit_transactions(tenant_id);
CREATE INDEX idx_ai_credit_transactions_tenant_created ON ai_credit_transactions(tenant_id, created_at);
CREATE INDEX idx_ai_credit_transactions_type ON ai_credit_transactions(transaction_type);
```

---

#### 8. ai_usage_limits
**目的**: AIコンシェルジュ利用制限設定

**Prisma定義**:
```prisma
model AiUsageLimit {
  id                  String    @id @default(cuid())
  tenantId            String    @map("tenant_id")
  maxQueriesPerHour   Int       @map("max_queries_per_hour") @default(50)
  maxQueriesPerDay    Int       @map("max_queries_per_day") @default(500)
  isActive            Boolean   @default(true) @map("is_active")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  @@unique([tenantId], map: "uniq_ai_usage_limits_tenant_id")
  @@index([tenantId], map: "idx_ai_usage_limits_tenant_id")
  @@map("ai_usage_limits")
}
```

**DDL**:
```sql
CREATE TABLE ai_usage_limits (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL,
  max_queries_per_hour  INTEGER DEFAULT 50,
  max_queries_per_day   INTEGER DEFAULT 500,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_ai_usage_limits_tenant_id ON ai_usage_limits(tenant_id);
CREATE INDEX idx_ai_usage_limits_tenant_id ON ai_usage_limits(tenant_id);
```

---

### 既存テーブル（レガシー・そのまま使用）

以下のテーブルは既に実装済みで、ResponseTree機能で使用します：

#### response_trees
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 835-856  
**命名規則**: snake_case（既存維持）  
**用途**: 質問＆回答ツリーのメタ情報管理

#### response_nodes
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 733-760  
**命名規則**: snake_case（既存維持）  
**用途**: ツリーノード（カテゴリ・質問）管理

#### response_node_translations
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 713-731  
**命名規則**: snake_case（既存維持）  
**用途**: ノードの多言語翻訳

#### response_tree_sessions
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 794-820  
**命名規則**: snake_case（既存維持）  
**用途**: TVセッション管理

#### response_tree_history
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 762-775  
**命名規則**: snake_case（既存維持）  
**用途**: ノード遷移履歴

#### response_tree_mobile_links
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 777-792  
**命名規則**: snake_case（既存維持）  
**用途**: QRコードモバイル連携

#### response_tree_versions
**定義**: `/Users/kaneko/hotel-common/prisma/schema.prisma` lines 822-833  
**命名規則**: snake_case（既存維持）  
**用途**: ツリーバージョン管理

---

## マイグレーション手順

### 1. Prismaスキーマに追加

`/Users/kaneko/hotel-common/prisma/schema.prisma` に上記8テーブルを追加

### 2. マイグレーション生成

```bash
cd /Users/kaneko/hotel-common
npx prisma migrate dev --name add_ai_concierge_tables
```

### 3. Prisma Client再生成

```bash
npx prisma generate
```

### 4. 暗号化キー設定

```.env
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### 5. 初期データ投入（オプション）

```sql
-- デフォルト利用制限を全テナントに設定
INSERT INTO ai_usage_limits (id, tenant_id, max_queries_per_hour, max_queries_per_day)
SELECT 
  gen_random_uuid()::text,
  id,
  50,
  500
FROM "Tenant"
WHERE is_deleted = false;
```

---

## テーブル関連図

```mermaid
erDiagram
    tenant_ai_providers ||--o{ tenant_ai_model_assignments : "provides"
    ai_conversations ||--|{ ai_messages : "contains"
    ai_knowledge_bases }o--|| Tenant : "belongs to"
    ai_conversations }o--|| Tenant : "belongs to"
    ai_characters }o--|| Tenant : "belongs to"
    ai_credit_transactions }o--|| Tenant : "belongs to"
    ai_usage_limits }o--|| Tenant : "belongs to"
    
    tenant_ai_providers {
        string id PK
        string tenant_id FK
        string provider
        string api_key_primary
        int priority
    }
    
    ai_conversations {
        string id PK
        string tenant_id FK
        string session_id UK
        string room_id
        int message_count
        decimal total_cost
    }
    
    ai_messages {
        string id PK
        string conversation_id FK
        string role
        text content
        int total_tokens
    }
    
    ai_knowledge_bases {
        string id PK
        string tenant_id FK
        string file_type
        boolean vectorized
        int chunk_count
    }
    
    ai_characters {
        string id PK
        string tenant_id FK UK
        int friendly
        int humor
        text prompt_summary
    }
```



