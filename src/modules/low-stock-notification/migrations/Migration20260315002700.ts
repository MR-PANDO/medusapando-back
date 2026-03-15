import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260315002700 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "low_stock_settings" ("id" text not null, "threshold" integer not null default 5, "notification_email" text null, "enabled" boolean not null default false, "morning_time" text not null default '08:00', "afternoon_time" text not null default '14:00', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "low_stock_settings_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_low_stock_settings_deleted_at" ON "low_stock_settings" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "low_stock_settings" cascade;`);
  }

}
