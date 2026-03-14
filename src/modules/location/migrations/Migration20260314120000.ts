import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260314120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "neighborhood" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "shipping_price" INTEGER NOT NULL DEFAULT 0,
        "municipality_id" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "neighborhood_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_neighborhood_municipality_id" ON "neighborhood" ("municipality_id") WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_neighborhood_deleted_at" ON "neighborhood" ("deleted_at") WHERE deleted_at IS NULL;`)
    this.addSql(`ALTER TABLE "neighborhood" ADD CONSTRAINT "neighborhood_municipality_id_foreign" FOREIGN KEY ("municipality_id") REFERENCES "municipality" ("id") ON UPDATE CASCADE;`)
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "neighborhood" DROP CONSTRAINT IF EXISTS "neighborhood_municipality_id_foreign";`)
    this.addSql(`DROP TABLE IF EXISTS "neighborhood" CASCADE;`)
  }
}
