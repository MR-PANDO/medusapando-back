import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode: process.env.WORKER_MODE as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: process.env.DISABLE_ADMIN === "true",
    backendUrl: process.env.BACKEND_URL,
  },
  modules: [
    // Brand Module
    {
      resolve: "./src/modules/brand",
    },
    // Recipe Module
    {
      resolve: "./src/modules/recipe",
    },
    // Nutrition Module - Product nutrition label scanning
    {
      resolve: "./src/modules/nutrition",
    },
    // Analytics Module - Page views and sales tracking
    {
      resolve: "./src/modules/analytics",
    },
    // SEO Module - SEO/AEO/GEO/SXO metadata management
    {
      resolve: "./src/modules/seo",
    },
    // Content Translation Module - per-entity, per-locale translations
    {
      resolve: "./src/modules/content-translation",
    },
    // MinIO/S3 File Storage
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.MINIO_CDN_URL,
              access_key_id: process.env.MINIO_ACCESS_KEY,
              secret_access_key: process.env.MINIO_SECRET_KEY,
              region: process.env.MINIO_REGION || "us-east-1",
              bucket: process.env.MINIO_BUCKET,
              endpoint: process.env.MINIO_ENDPOINT,
              // Required for MinIO - forces path-style URLs
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
    // SMTP Notification Provider
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/smtp-notification",
            id: "notification-smtp",
            options: {
              channels: ["email"],
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT) || 465,
              secure: process.env.SMTP_SECURE === "true",
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
              from: process.env.SMTP_FROM,
              storefront_url:
                process.env.STOREFRONT_URL || "https://nutrimercados.com",
            },
          },
        ],
      },
    },
    // Meilisearch
    {
      resolve: "@rokmohar/medusa-plugin-meilisearch",
      options: {
        config: {
          host: process.env.MEILISEARCH_HOST,
          apiKey: process.env.MEILISEARCH_API_KEY,
        },
        settings: {
          products: {
            indexSettings: {
              searchableAttributes: [
                "title",
                "title_en",
                "description",
                "description_en",
                "variant_sku",
                "handle",
              ],
              displayedAttributes: [
                "id",
                "title",
                "title_en",
                "description",
                "description_en",
                "variant_sku",
                "thumbnail",
                "handle",
                "variant_id",
              ],
            },
            primaryKey: "id",
            fields: [
              "id",
              "title",
              "description",
              "thumbnail",
              "handle",
              "variants.id",
              "variants.sku",
            ],
            transformer: async (product: any, defaultTransformer: any, options: any) => {
              const transformed = defaultTransformer(product, options);
              // Extract first variant ID for add-to-cart functionality
              if (product.variants && product.variants.length > 0) {
                transformed.variant_id = product.variants[0].id;
                transformed.variant_sku = product.variants[0].sku;
              }
              // Add English translations for locale-aware search
              try {
                const { Client } = await import("pg");
                const client = new Client({ connectionString: process.env.DATABASE_URL || "" });
                await client.connect();
                const result = await client.query(
                  `SELECT title, description FROM content_translation
                   WHERE entity_type = 'product' AND entity_id = $1 AND locale = 'en' AND deleted_at IS NULL
                   LIMIT 1`,
                  [product.id]
                );
                await client.end();
                if (result.rows.length > 0) {
                  transformed.title_en = result.rows[0].title || null;
                  transformed.description_en = result.rows[0].description || null;
                }
              } catch (e) {
                // Translation lookup failed — index without translations
              }
              return transformed;
            },
          },
        },
      },
    },
  ],
  
});
