import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260307120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "wompi_payment" (
        "id" TEXT NOT NULL,
        "order_id" TEXT NOT NULL,
        "wompi_payment_link_id" TEXT NULL,
        "wompi_transaction_id" TEXT NULL,
        "wompi_checkout_url" TEXT NULL,
        "reference" TEXT NOT NULL,
        "wompi_status" TEXT NOT NULL DEFAULT 'link_generating',
        "amount_in_cents" INTEGER NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'COP',
        "payment_method_type" TEXT NULL,
        "customer_email" TEXT NULL,
        "link_generated_at" TIMESTAMPTZ NULL,
        "finalized_at" TIMESTAMPTZ NULL,
        "last_webhook_payload" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "wompi_payment_pkey" PRIMARY KEY ("id")
      );
    `)

    // Index for webhook lookups by payment_link_id
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_wompi_payment_link_id"
        ON "wompi_payment" ("wompi_payment_link_id")
        WHERE "deleted_at" IS NULL;
    `)

    // Index for order lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_wompi_payment_order_id"
        ON "wompi_payment" ("order_id")
        WHERE "deleted_at" IS NULL;
    `)

    // Index for status filtering (admin panel queries)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_wompi_payment_status"
        ON "wompi_payment" ("wompi_status")
        WHERE "deleted_at" IS NULL;
    `)

    // Soft delete index
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_wompi_payment_deleted_at"
        ON "wompi_payment" ("deleted_at")
        WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "wompi_payment" CASCADE;`)
  }
}
