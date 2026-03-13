import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260312120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "nubex_sync_log" (
        "id" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'running',
        "trigger" TEXT NOT NULL DEFAULT 'scheduled',
        "total_erp_products" INTEGER NOT NULL DEFAULT 0,
        "matched_skus" INTEGER NOT NULL DEFAULT 0,
        "prices_updated" INTEGER NOT NULL DEFAULT 0,
        "inventory_updated" INTEGER NOT NULL DEFAULT 0,
        "inventory_created" INTEGER NOT NULL DEFAULT 0,
        "errors" INTEGER NOT NULL DEFAULT 0,
        "error_details" TEXT NULL,
        "duration_ms" INTEGER NOT NULL DEFAULT 0,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "finished_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "nubex_sync_log_pkey" PRIMARY KEY ("id")
      );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "nubex_sync_log" CASCADE;`)
  }
}
