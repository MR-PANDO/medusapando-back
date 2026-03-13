import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260313130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "nubex_sync_detail" (
        "id" TEXT NOT NULL,
        "sync_log_id" TEXT NOT NULL,
        "product_id" TEXT NOT NULL,
        "product_title" TEXT NOT NULL DEFAULT '',
        "variant_id" TEXT NOT NULL,
        "variant_title" TEXT NOT NULL DEFAULT '',
        "sku" TEXT NOT NULL,
        "price_changed" BOOLEAN NOT NULL DEFAULT FALSE,
        "old_price" DOUBLE PRECISION NULL,
        "new_price" DOUBLE PRECISION NULL,
        "qty_changed" BOOLEAN NOT NULL DEFAULT FALSE,
        "old_qty" INTEGER NULL,
        "new_qty" INTEGER NULL,
        "status_changed" BOOLEAN NOT NULL DEFAULT FALSE,
        "old_status" TEXT NULL,
        "new_status" TEXT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "nubex_sync_detail_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "nubex_sync_detail_sync_log_fkey" FOREIGN KEY ("sync_log_id") REFERENCES "nubex_sync_log" ("id") ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS "idx_nubex_sync_detail_sync_log_id" ON "nubex_sync_detail" ("sync_log_id");
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "nubex_sync_detail" CASCADE;`)
  }
}
