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
    // Meilisearch - temporarily disabled until routing is fixed
    /*{
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
                "description",
                "variant_sku",
                "handle",
              ],
              displayedAttributes: [
                "id",
                "title",
                "description",
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
            transformer: (product: any, defaultTransformer: any, options: any) => {
              const transformed = defaultTransformer(product, options);
              // Extract first variant ID for add-to-cart functionality
              if (product.variants && product.variants.length > 0) {
                transformed.variant_id = product.variants[0].id;
                transformed.variant_sku = product.variants[0].sku;
              }
              return transformed;
            },
          },
        },
      },
    },*/
  ],
  
});
