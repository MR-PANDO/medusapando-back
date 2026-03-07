import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260307200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "email_audit" (
        "id" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        "from" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "email_type" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'queued',
        "error" TEXT NULL,
        "metadata" JSONB NULL,
        "sent_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "email_audit_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_email_audit_status"
        ON "email_audit" ("status") WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_email_audit_email_type"
        ON "email_audit" ("email_type") WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_email_audit_created_at"
        ON "email_audit" ("created_at") WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_email_audit_to"
        ON "email_audit" ("to") WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_email_audit_deleted_at"
        ON "email_audit" ("deleted_at") WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "email_audit" CASCADE;`)
  }
}
