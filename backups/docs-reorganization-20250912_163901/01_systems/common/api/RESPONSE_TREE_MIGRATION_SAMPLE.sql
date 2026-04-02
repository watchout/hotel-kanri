-- レスポンスツリーセッション管理のためのマイグレーションサンプル
-- 既存のResponseTree, ResponseNode, ResponseNodeTranslation, ResponseTreeVersionテーブルは
-- 既に作成済みであるため、セッション管理に必要なテーブルのみ追加します

-- セッション管理テーブル
CREATE TABLE "ResponseTreeSession" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "deviceId" INTEGER,
  "roomId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "language" TEXT NOT NULL DEFAULT 'ja',
  "interfaceType" TEXT NOT NULL DEFAULT 'tv',
  "currentNodeId" TEXT,

  CONSTRAINT "ResponseTreeSession_pkey" PRIMARY KEY ("id")
);

-- セッション履歴テーブル
CREATE TABLE "ResponseTreeHistory" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT NOT NULL,

  CONSTRAINT "ResponseTreeHistory_pkey" PRIMARY KEY ("id")
);

-- モバイル連携テーブル
CREATE TABLE "ResponseTreeMobileLink" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "linkCode" TEXT NOT NULL,
  "deviceId" INTEGER,
  "roomId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isValid" BOOLEAN NOT NULL DEFAULT true,
  "connectionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "connectedAt" TIMESTAMP(3),
  "deviceInfo" JSONB,

  CONSTRAINT "ResponseTreeMobileLink_pkey" PRIMARY KEY ("id")
);

-- インデックス
CREATE UNIQUE INDEX "ResponseTreeSession_sessionId_key" ON "ResponseTreeSession"("sessionId");
CREATE INDEX "ResponseTreeSession_deviceId_idx" ON "ResponseTreeSession"("deviceId");
CREATE INDEX "ResponseTreeSession_roomId_idx" ON "ResponseTreeSession"("roomId");
CREATE INDEX "ResponseTreeSession_language_idx" ON "ResponseTreeSession"("language");
CREATE INDEX "ResponseTreeSession_interfaceType_idx" ON "ResponseTreeSession"("interfaceType");
CREATE INDEX "ResponseTreeSession_currentNodeId_idx" ON "ResponseTreeSession"("currentNodeId");

CREATE INDEX "ResponseTreeHistory_sessionId_idx" ON "ResponseTreeHistory"("sessionId");
CREATE INDEX "ResponseTreeHistory_nodeId_idx" ON "ResponseTreeHistory"("nodeId");
CREATE INDEX "ResponseTreeHistory_timestamp_idx" ON "ResponseTreeHistory"("timestamp");

CREATE UNIQUE INDEX "ResponseTreeMobileLink_linkCode_key" ON "ResponseTreeMobileLink"("linkCode");
CREATE INDEX "ResponseTreeMobileLink_sessionId_idx" ON "ResponseTreeMobileLink"("sessionId");
CREATE INDEX "ResponseTreeMobileLink_deviceId_idx" ON "ResponseTreeMobileLink"("deviceId");
CREATE INDEX "ResponseTreeMobileLink_roomId_idx" ON "ResponseTreeMobileLink"("roomId");
CREATE INDEX "ResponseTreeMobileLink_userId_idx" ON "ResponseTreeMobileLink"("userId");
CREATE INDEX "ResponseTreeMobileLink_status_idx" ON "ResponseTreeMobileLink"("status");

-- 外部キー制約
ALTER TABLE "ResponseTreeSession" ADD CONSTRAINT "ResponseTreeSession_deviceId_fkey" 
  FOREIGN KEY ("deviceId") REFERENCES "DeviceRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResponseTreeSession" ADD CONSTRAINT "ResponseTreeSession_currentNodeId_fkey" 
  FOREIGN KEY ("currentNodeId") REFERENCES "ResponseNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResponseTreeHistory" ADD CONSTRAINT "ResponseTreeHistory_sessionId_fkey" 
  FOREIGN KEY ("sessionId") REFERENCES "ResponseTreeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResponseTreeHistory" ADD CONSTRAINT "ResponseTreeHistory_nodeId_fkey" 
  FOREIGN KEY ("nodeId") REFERENCES "ResponseNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResponseTreeMobileLink" ADD CONSTRAINT "ResponseTreeMobileLink_sessionId_fkey" 
  FOREIGN KEY ("sessionId") REFERENCES "ResponseTreeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResponseTreeMobileLink" ADD CONSTRAINT "ResponseTreeMobileLink_deviceId_fkey" 
  FOREIGN KEY ("deviceId") REFERENCES "DeviceRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;