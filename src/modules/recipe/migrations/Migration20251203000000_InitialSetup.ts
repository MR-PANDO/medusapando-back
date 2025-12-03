import { Migration } from "@mikro-orm/migrations"

export class Migration20251203000000_InitialSetup extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "recipe" (
        "id" text not null,
        "title" text not null,
        "description" text not null,
        "image" text null,
        "source_url" text null,
        "diets" jsonb not null default '[]',
        "diet_names" jsonb not null default '[]',
        "prep_time" text not null,
        "cook_time" text not null,
        "servings" integer not null,
        "difficulty" text not null,
        "ingredients" jsonb not null default '[]',
        "instructions" jsonb not null default '[]',
        "nutrition" jsonb not null default '{}',
        "tips" text null,
        "spoonacular_id" integer null,
        "generated_at" timestamptz not null,
        "status" text not null default 'draft',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "recipe_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      create table if not exists "recipe_product" (
        "id" text not null,
        "recipe_id" text not null,
        "product_id" text not null,
        "variant_id" text not null,
        "product_title" text not null,
        "product_handle" text not null,
        "product_thumbnail" text null,
        "quantity" text not null default '1 unidad',
        "notes" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "recipe_product_pkey" primary key ("id")
      );
    `)

    this.addSql(`
      create index if not exists "recipe_status_idx" on "recipe" ("status");
    `)

    this.addSql(`
      create index if not exists "recipe_spoonacular_id_idx" on "recipe" ("spoonacular_id");
    `)

    this.addSql(`
      create index if not exists "recipe_product_recipe_id_idx" on "recipe_product" ("recipe_id");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "recipe_product";`)
    this.addSql(`drop table if exists "recipe";`)
  }
}
