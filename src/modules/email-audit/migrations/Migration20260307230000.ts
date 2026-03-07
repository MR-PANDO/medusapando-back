import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260307230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "smtp_settings" (
        "id" TEXT NOT NULL,
        "host" TEXT NOT NULL,
        "port" INTEGER NOT NULL DEFAULT 465,
        "secure" BOOLEAN NOT NULL DEFAULT true,
        "user" TEXT NOT NULL,
        "pass" TEXT NOT NULL,
        "from" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "smtp_settings_pkey" PRIMARY KEY ("id")
      );
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "smtp_settings" CASCADE;`)
  }
}
