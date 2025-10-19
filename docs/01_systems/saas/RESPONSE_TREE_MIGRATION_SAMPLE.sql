-- AIコンシェルジュ レスポンスツリー マイグレーションサンプル
-- hotel-common統合データベース用

-- レスポンスツリーテーブル
CREATE TABLE "ResponseTree" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'test-tenant-001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1
);

-- ノードテーブル
CREATE TABLE "ResponseNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "answer" JSONB,
    CONSTRAINT "ResponseNode_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "ResponseTree" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResponseNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResponseNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ノード翻訳テーブル
CREATE TABLE "ResponseNodeTranslation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "answer" JSONB,
    CONSTRAINT "ResponseNodeTranslation_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "ResponseNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ツリーバージョンテーブル
CREATE TABLE "ResponseTreeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "treeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "comment" TEXT,
    CONSTRAINT "ResponseTreeVersion_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "ResponseTree" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- インデックス
CREATE INDEX "ResponseTree_tenantId_idx" ON "ResponseTree"("tenantId");
CREATE INDEX "ResponseTree_isActive_idx" ON "ResponseTree"("isActive");
CREATE INDEX "ResponseNode_treeId_idx" ON "ResponseNode"("treeId");
CREATE INDEX "ResponseNode_parentId_idx" ON "ResponseNode"("parentId");
CREATE INDEX "ResponseNode_type_idx" ON "ResponseNode"("type");
CREATE INDEX "ResponseNodeTranslation_language_idx" ON "ResponseNodeTranslation"("language");
CREATE UNIQUE INDEX "ResponseNodeTranslation_nodeId_language_key" ON "ResponseNodeTranslation"("nodeId", "language");
CREATE UNIQUE INDEX "ResponseTreeVersion_treeId_version_key" ON "ResponseTreeVersion"("treeId", "version");

-- セッション管理テーブル
CREATE TABLE "ConciergeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL UNIQUE,
    "deviceId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ja',
    "currentNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConciergeSession_currentNodeId_fkey" FOREIGN KEY ("currentNodeId") REFERENCES "ResponseNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- セッションメッセージテーブル
CREATE TABLE "ConciergeSessionMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConciergeSessionMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConciergeSession" ("sessionId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- インデックス
CREATE INDEX "ConciergeSession_sessionId_idx" ON "ConciergeSession"("sessionId");
CREATE INDEX "ConciergeSession_deviceId_idx" ON "ConciergeSession"("deviceId");
CREATE INDEX "ConciergeSession_lastActiveAt_idx" ON "ConciergeSession"("lastActiveAt");
CREATE INDEX "ConciergeSessionMessage_sessionId_idx" ON "ConciergeSessionMessage"("sessionId");
CREATE INDEX "ConciergeSessionMessage_timestamp_idx" ON "ConciergeSessionMessage"("timestamp");
