import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260227200000 extends Migration {

  override async up(): Promise<void> {
    // Make json columns nullable (keep defaults for backward compat)
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "seo_keywords" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "structured_data_json" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "hreflang_entries" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "aeo_faqs" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "aeo_howto_steps" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "geo_citations" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "geo_key_attributes" DROP NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "sxo_internal_links" DROP NOT NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "seo_keywords" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "structured_data_json" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "hreflang_entries" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "aeo_faqs" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "aeo_howto_steps" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "geo_citations" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "geo_key_attributes" SET NOT NULL;`);
    this.addSql(`ALTER TABLE "seo_metadata" ALTER COLUMN "sxo_internal_links" SET NOT NULL;`);
  }

}
