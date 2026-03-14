import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260314194544 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "neighborhood" ("id" text not null, "name" text not null, "slug" text not null, "shipping_price" integer not null default 0, "municipality_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "neighborhood_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_neighborhood_municipality_id" ON "neighborhood" ("municipality_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_neighborhood_deleted_at" ON "neighborhood" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table "neighborhood" add constraint "neighborhood_municipality_id_foreign" foreign key ("municipality_id") references "municipality" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "neighborhood" drop constraint if exists "neighborhood_municipality_id_foreign";`);
    this.addSql(`drop table if exists "neighborhood" cascade;`);
  }

}
