import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20251203070523 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "recipe" ("id" text not null, "title" text not null, "description" text not null, "image" text null, "source_url" text null, "diets" jsonb not null, "diet_names" jsonb not null, "prep_time" text not null, "cook_time" text not null, "servings" integer not null, "difficulty" text not null, "ingredients" jsonb not null, "instructions" jsonb not null, "nutrition" jsonb not null, "tips" text null, "spoonacular_id" integer null, "generated_at" timestamptz not null, "status" text not null default 'draft', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "recipe_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_recipe_deleted_at" ON "recipe" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "recipe_product" ("id" text not null, "recipe_id" text not null, "product_id" text not null, "variant_id" text not null, "product_title" text not null, "product_handle" text not null, "product_thumbnail" text null, "quantity" text not null default '1 unidad', "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "recipe_product_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_recipe_product_deleted_at" ON "recipe_product" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "recipe" cascade;`);

    this.addSql(`drop table if exists "recipe_product" cascade;`);
  }

}
