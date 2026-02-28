import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260228200000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "content_translation" ("id" text not null, "entity_type" text not null, "entity_id" text not null, "locale" text not null, "title" text null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_translation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_translation_deleted_at" ON "content_translation" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_translation_entity" ON "content_translation" ("entity_type", "entity_id");`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_translation_unique" ON "content_translation" ("entity_type", "entity_id", "locale") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "content_translation" cascade;`);
  }

}
