import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251203131500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_nutrition" ("id" text not null, "product_id" text not null, "serving_size" text null, "servings_per_container" text null, "nutrition_data" jsonb not null default '{}', "raw_text" text null, "label_image_url" text null, "scanned_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_nutrition_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_nutrition_product_id_unique" ON "product_nutrition" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_nutrition_deleted_at" ON "product_nutrition" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_nutrition" cascade;`);
  }

}
