import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260313120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "nubex_sync_log"
        ADD COLUMN IF NOT EXISTS "products_published" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "products_unpublished" INTEGER NOT NULL DEFAULT 0;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "nubex_sync_log"
        DROP COLUMN IF EXISTS "products_published",
        DROP COLUMN IF EXISTS "products_unpublished";
    `)
  }
}
