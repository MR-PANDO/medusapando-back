import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251207222412 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "analytics_page_view" ("id" text not null, "session_id" text not null, "page_path" text not null, "referrer" text null, "user_agent" text null, "country_code" text null, "customer_id" text null, "viewed_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_page_view_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_analytics_page_view_deleted_at" ON "analytics_page_view" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "analytics_page_view" cascade;`);
  }

}
