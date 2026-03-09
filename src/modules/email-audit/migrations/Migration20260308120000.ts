import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260308120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "smtp_settings"
      ADD COLUMN IF NOT EXISTS "manager_email" TEXT NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "smtp_settings"
      DROP COLUMN IF EXISTS "manager_email";
    `)
  }
}
