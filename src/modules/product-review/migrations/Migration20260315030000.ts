import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260315030000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "product_review" ("id" text not null, "title" text null, "content" text not null, "rating" real not null, "first_name" text not null, "last_name" text not null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "product_id" text not null, "customer_id" text null, "ip_address" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "product_review_pkey" primary key ("id"), constraint "product_review_rating_check" check ("rating" >= 1 and "rating" <= 5));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_product_id" ON "product_review" ("product_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_customer_id" ON "product_review" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_status" ON "product_review" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_product_review_deleted_at" ON "product_review" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "product_review" cascade;`);
  }

}
