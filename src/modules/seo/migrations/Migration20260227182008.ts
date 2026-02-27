import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260227182008 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seo_metadata" ("id" text not null, "resource_type" text not null, "resource_id" text not null, "seo_title" text null, "seo_description" text null, "seo_keywords" jsonb not null default '[]', "canonical_url" text null, "robots" text not null default 'index,follow', "og_title" text null, "og_description" text null, "og_image" text null, "og_type" text not null default 'product', "twitter_card" text not null default 'summary_large_image', "twitter_title" text null, "twitter_description" text null, "structured_data_type" text null, "structured_data_json" jsonb not null default '{}', "sitemap_priority" real not null default 0.5, "sitemap_changefreq" text not null default 'weekly', "hreflang_entries" jsonb not null default '[]', "aeo_faqs" jsonb not null default '[]', "aeo_howto_steps" jsonb not null default '[]', "aeo_short_answer" text null, "geo_entity_summary" text null, "geo_citations" jsonb not null default '[]', "geo_key_attributes" jsonb not null default '[]', "sxo_intent" text null, "sxo_cta_text" text null, "sxo_internal_links" jsonb not null default '[]', "sxo_cwv_notes" text null, "seo_score" integer not null default 0, "aeo_score" integer not null default 0, "geo_score" integer not null default 0, "sxo_score" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seo_metadata_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seo_metadata_resource_type_resource_id_unique" ON "seo_metadata" ("resource_type", "resource_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seo_metadata_deleted_at" ON "seo_metadata" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_metadata" cascade;`);
  }

}
