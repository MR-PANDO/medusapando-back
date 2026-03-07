import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260307180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "wompi_payment"
        ADD COLUMN IF NOT EXISTS "payment_method_detail" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "customer_name" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "customer_phone" TEXT NULL,
        ADD COLUMN IF NOT EXISTS "wompi_reference" TEXT NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "wompi_payment"
        DROP COLUMN IF EXISTS "payment_method_detail",
        DROP COLUMN IF EXISTS "customer_name",
        DROP COLUMN IF EXISTS "customer_phone",
        DROP COLUMN IF EXISTS "wompi_reference";
    `)
  }
}
