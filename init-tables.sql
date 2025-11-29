-- Create tables for colombia-geo module if they don't exist
-- These match the model definitions in src/modules/colombia-geo/models/

-- Colombia Shipping Zone table
CREATE TABLE IF NOT EXISTS "colombia_shipping_zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "base_price" NUMERIC NOT NULL DEFAULT 0,
    "express_price" NUMERIC,
    "same_day_price" NUMERIC,
    "estimated_days_min" INTEGER NOT NULL DEFAULT 1,
    "estimated_days_max" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "raw_base_price" JSONB,
    "raw_express_price" JSONB,
    "raw_same_day_price" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "colombia_shipping_zone_pkey" PRIMARY KEY ("id")
);

-- Departamento table
CREATE TABLE IF NOT EXISTS "departamento" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "iso_code" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "departamento_pkey" PRIMARY KEY ("id")
);

-- Municipio table
CREATE TABLE IF NOT EXISTS "municipio" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "departamento_code" TEXT NOT NULL,
    "shipping_zone" TEXT,
    "is_capital" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "municipio_pkey" PRIMARY KEY ("id")
);

-- Brand table (for brandModuleService)
CREATE TABLE IF NOT EXISTS "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_municipio_departamento_code" ON "municipio" ("departamento_code");
CREATE INDEX IF NOT EXISTS "idx_municipio_shipping_zone" ON "municipio" ("shipping_zone");
CREATE INDEX IF NOT EXISTS "idx_departamento_code" ON "departamento" ("code");
CREATE INDEX IF NOT EXISTS "idx_colombia_shipping_zone_code" ON "colombia_shipping_zone" ("code");
CREATE INDEX IF NOT EXISTS "idx_brand_handle" ON "brand" ("handle");
