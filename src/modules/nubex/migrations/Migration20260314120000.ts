import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260314120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "nubex_settings" (
        "id" TEXT NOT NULL,
        "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
        "notification_email" TEXT NULL,
        "low_stock_enabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "nubex_settings_pkey" PRIMARY KEY ("id")
      );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "nubex_settings" CASCADE;`)
  }
}
