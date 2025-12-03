import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20251203120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "recipe" (
        "id" text NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "image" text NULL,
        "source_url" text NULL,
        "diets" jsonb NOT NULL DEFAULT '[]',
        "diet_names" jsonb NOT NULL DEFAULT '[]',
        "prep_time" text NOT NULL,
        "cook_time" text NOT NULL,
        "servings" integer NOT NULL,
        "difficulty" text NOT NULL,
        "ingredients" jsonb NOT NULL DEFAULT '[]',
        "instructions" jsonb NOT NULL DEFAULT '[]',
        "nutrition" jsonb NOT NULL DEFAULT '{}',
        "tips" text NULL,
        "spoonacular_id" integer NULL,
        "generated_at" timestamptz NOT NULL,
        "status" text NOT NULL DEFAULT 'draft',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "recipe_product" (
        "id" text NOT NULL,
        "recipe_id" text NOT NULL,
        "product_id" text NOT NULL,
        "variant_id" text NOT NULL,
        "product_title" text NOT NULL,
        "product_handle" text NOT NULL,
        "product_thumbnail" text NULL,
        "quantity" text NOT NULL DEFAULT '1 unidad',
        "notes" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "recipe_product_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`CREATE INDEX IF NOT EXISTS "recipe_status_idx" ON "recipe" ("status");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "recipe_spoonacular_id_idx" ON "recipe" ("spoonacular_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "recipe_product_recipe_id_idx" ON "recipe_product" ("recipe_id");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "recipe_deleted_at_idx" ON "recipe" ("deleted_at");`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "recipe_product_deleted_at_idx" ON "recipe_product" ("deleted_at");`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "recipe_product";`)
    this.addSql(`DROP TABLE IF EXISTS "recipe";`)
  }
}
