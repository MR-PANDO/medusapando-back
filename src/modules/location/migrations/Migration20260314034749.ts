import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260314034749 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "department" ("id" text not null, "name" text not null, "slug" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "department_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_department_slug_unique" ON "department" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_department_deleted_at" ON "department" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "municipality" ("id" text not null, "name" text not null, "slug" text not null, "department_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "municipality_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_municipality_department_id" ON "municipality" ("department_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_municipality_deleted_at" ON "municipality" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table "municipality" add constraint "municipality_department_id_foreign" foreign key ("department_id") references "department" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "municipality" drop constraint if exists "municipality_department_id_foreign";`);
    this.addSql(`drop table if exists "municipality" cascade;`);
    this.addSql(`drop table if exists "department" cascade;`);
  }

}
