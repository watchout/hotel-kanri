-- CreateTable "staff_handoffs"
CREATE TABLE "staff_handoffs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "handoff_number" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "room_id" TEXT,
    "handoff_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "description" TEXT,
    "estimated_duration" INTEGER,
    "actual_duration" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable "staff_handoff_tasks"
CREATE TABLE "staff_handoff_tasks" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "task_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "attachment_urls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_handoff_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable "staff_handoff_acknowledgments"
CREATE TABLE "staff_handoff_acknowledgments" (
    "id" TEXT NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "acknowledged_by_id" TEXT NOT NULL,
    "acknowledge_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checked_items" INTEGER NOT NULL DEFAULT 0,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "comments" TEXT,
    "signature_url" TEXT,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_handoff_acknowledgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable "staff_handoff_checklists"
CREATE TABLE "staff_handoff_checklists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_handoff_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_handoffs_tenant_id_handoff_number_key" ON "staff_handoffs"("tenant_id", "handoff_number");

-- CreateIndex
CREATE INDEX "staff_handoffs_tenant_id_idx" ON "staff_handoffs"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_handoffs_tenant_id_status_idx" ON "staff_handoffs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "staff_handoffs_from_user_id_to_user_id_idx" ON "staff_handoffs"("from_user_id", "to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_handoff_tasks_handoff_id_task_number_key" ON "staff_handoff_tasks"("handoff_id", "task_number");

-- CreateIndex
CREATE INDEX "staff_handoff_tasks_handoff_id_idx" ON "staff_handoff_tasks"("handoff_id");

-- CreateIndex
CREATE INDEX "staff_handoff_tasks_category_idx" ON "staff_handoff_tasks"("category");

-- CreateIndex
CREATE INDEX "staff_handoff_tasks_status_idx" ON "staff_handoff_tasks"("status");

-- CreateIndex
CREATE INDEX "staff_handoff_acknowledgments_handoff_id_idx" ON "staff_handoff_acknowledgments"("handoff_id");

-- CreateIndex
CREATE INDEX "staff_handoff_acknowledgments_acknowledge_type_idx" ON "staff_handoff_acknowledgments"("acknowledge_type");

-- CreateIndex
CREATE UNIQUE INDEX "staff_handoff_checklists_tenant_id_name_key" ON "staff_handoff_checklists"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "staff_handoff_checklists_tenant_id_category_idx" ON "staff_handoff_checklists"("tenant_id", "category");

-- AddForeignKey
ALTER TABLE "staff_handoffs" ADD CONSTRAINT "staff_handoffs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_handoff_tasks" ADD CONSTRAINT "staff_handoff_tasks_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "staff_handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_handoff_acknowledgments" ADD CONSTRAINT "staff_handoff_acknowledgments_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "staff_handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_handoff_checklists" ADD CONSTRAINT "staff_handoff_checklists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
