/**
 * Post-Import Script for Tags, Brands, and Categories
 *
 * Run this AFTER the CSV import to:
 * 1. Create tags from WooCommerce and link them to imported products
 * 2. Create brands from WooCommerce and link them to imported products
 * 3. Create categories from WooCommerce and link them to imported products
 *
 * Products are matched by external_id (WooCommerce product ID)
 *
 * Usage: node import-tags-brands.js
 */

const { Client } = require('pg');
const https = require('https');
const crypto = require('crypto');

// WooCommerce API Configuration
const WOO_CONFIG = {
  baseUrl: 'https://vitaintegral.co/wp-json/wc/v3',
  consumerKey: 'ck_1285484ef490acc42e92bdd6926709cf38f10b3c',
  consumerSecret: 'cs_0c30bddfb70c0d7a0564ff925fe69a0b24b8a3de',
  perPage: 100
};

// PostgreSQL Configuration
const DATABASE_URL = 'postgres://postgres:h17yFs2z47Lg0x0uZJUXtBFiNyj4JKsu3M5rTrjrn4VaK2wFMLwieKaVZGpe3QbM@192.168.111.6:5432/postgres';

/**
 * Fetch from WooCommerce API
 */
function fetchWooCommerce(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(WOO_CONFIG.baseUrl + endpoint);
    url.searchParams.set('consumer_key', WOO_CONFIG.consumerKey);
    url.searchParams.set('consumer_secret', WOO_CONFIG.consumerSecret);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1');
          const totalItems = parseInt(res.headers['x-wp-total'] || '0');
          resolve({ data: JSON.parse(data), totalPages, totalItems });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch all products from WooCommerce
 */
async function fetchAllWooProducts() {
  const products = [];
  let page = 1;
  let totalPages = 1;

  console.log('Fetching products from WooCommerce...');

  while (page <= totalPages) {
    const result = await fetchWooCommerce('/products', {
      per_page: WOO_CONFIG.perPage,
      page: page.toString(),
      status: 'publish'
    });

    products.push(...result.data);
    totalPages = result.totalPages;

    console.log(`  Page ${page}/${totalPages} - ${products.length} products`);
    page++;
  }

  return products;
}

/**
 * Generate unique ID for tags and brands
 */
function generateId(prefix) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}_${timestamp}${random}`.substring(0, 30);
}

/**
 * Create slug/handle from name
 */
function createHandle(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  console.log('='.repeat(60));
  console.log('Import Tags and Brands from WooCommerce');
  console.log('='.repeat(60));

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('\nConnected to database');

    // Fetch all WooCommerce products
    const wooProducts = await fetchAllWooProducts();
    console.log(`\nFetched ${wooProducts.length} products from WooCommerce`);

    // Build mapping of WooCommerce ID to Medusa product ID
    console.log('\nBuilding product ID mapping...');
    const productMapping = new Map();
    const productRows = await client.query(
      'SELECT id, external_id FROM product WHERE external_id IS NOT NULL'
    );
    productRows.rows.forEach(row => {
      productMapping.set(row.external_id, row.id);
    });
    console.log(`Found ${productMapping.size} products with external IDs`);

    // Collect unique tags, brands, and categories from WooCommerce
    const tagsMap = new Map(); // tag name -> { id, name, slug }
    const brandsMap = new Map(); // brand name -> { id, name, slug }
    const categoriesMap = new Map(); // category name -> { id, name, slug }
    const productTags = []; // [{ wooProductId, tagName }]
    const productBrands = []; // [{ wooProductId, brandName }]
    const productCategories = []; // [{ wooProductId, categoryName }]

    console.log('\nCollecting tags, brands, and categories from WooCommerce products...');

    for (const product of wooProducts) {
      // Collect tags
      if (product.tags && product.tags.length > 0) {
        for (const tag of product.tags) {
          if (!tagsMap.has(tag.name)) {
            tagsMap.set(tag.name, {
              id: tag.id,
              name: tag.name,
              slug: tag.slug
            });
          }
          productTags.push({
            wooProductId: String(product.id),
            tagName: tag.name
          });
        }
      }

      // Collect brands
      if (product.brands && product.brands.length > 0) {
        for (const brand of product.brands) {
          if (!brandsMap.has(brand.name)) {
            brandsMap.set(brand.name, {
              id: brand.id,
              name: brand.name,
              slug: brand.slug
            });
          }
          productBrands.push({
            wooProductId: String(product.id),
            brandName: brand.name
          });
        }
      }

      // Collect categories
      if (product.categories && product.categories.length > 0) {
        for (const category of product.categories) {
          if (!categoriesMap.has(category.name)) {
            categoriesMap.set(category.name, {
              id: category.id,
              name: category.name,
              slug: category.slug
            });
          }
          productCategories.push({
            wooProductId: String(product.id),
            categoryName: category.name
          });
        }
      }
    }

    console.log(`Found ${tagsMap.size} unique tags`);
    console.log(`Found ${brandsMap.size} unique brands`);
    console.log(`Found ${categoriesMap.size} unique categories`);
    console.log(`Found ${productTags.length} product-tag associations`);
    console.log(`Found ${productBrands.length} product-brand associations`);
    console.log(`Found ${productCategories.length} product-category associations`);

    // ===== IMPORT TAGS =====
    console.log('\n' + '='.repeat(40));
    console.log('Importing Tags');
    console.log('='.repeat(40));

    // Get existing tags
    const existingTagsResult = await client.query('SELECT id, value FROM product_tag');
    const existingTags = new Map();
    existingTagsResult.rows.forEach(row => {
      existingTags.set(row.value.toUpperCase(), row.id);
    });
    console.log(`Existing tags in database: ${existingTags.size}`);

    // Create new tags
    const tagIdMap = new Map(); // tag name -> medusa tag id
    let tagsCreated = 0;

    for (const [tagName, tagData] of tagsMap) {
      const normalizedName = tagName.toUpperCase();

      if (existingTags.has(normalizedName)) {
        tagIdMap.set(tagName, existingTags.get(normalizedName));
      } else {
        const tagId = generateId('ptag');
        await client.query(
          'INSERT INTO product_tag (id, value, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
          [tagId, tagName]
        );
        tagIdMap.set(tagName, tagId);
        tagsCreated++;
      }
    }
    console.log(`Created ${tagsCreated} new tags`);

    // Link products to tags
    console.log('Linking products to tags...');
    let tagLinksCreated = 0;
    let tagLinksSkipped = 0;

    for (const { wooProductId, tagName } of productTags) {
      const medusaProductId = productMapping.get(wooProductId);
      const medusaTagId = tagIdMap.get(tagName);

      if (!medusaProductId) {
        tagLinksSkipped++;
        continue;
      }

      // Check if link already exists
      const existingLink = await client.query(
        'SELECT 1 FROM product_tags WHERE product_id = $1 AND product_tag_id = $2',
        [medusaProductId, medusaTagId]
      );

      if (existingLink.rows.length === 0) {
        await client.query(
          'INSERT INTO product_tags (product_id, product_tag_id) VALUES ($1, $2)',
          [medusaProductId, medusaTagId]
        );
        tagLinksCreated++;
      }
    }
    console.log(`Created ${tagLinksCreated} product-tag links`);
    console.log(`Skipped ${tagLinksSkipped} (product not found)`);

    // ===== IMPORT BRANDS =====
    console.log('\n' + '='.repeat(40));
    console.log('Importing Brands');
    console.log('='.repeat(40));

    // Get existing brands
    const existingBrandsResult = await client.query('SELECT id, name FROM brand');
    const existingBrands = new Map();
    existingBrandsResult.rows.forEach(row => {
      existingBrands.set(row.name.toUpperCase(), row.id);
    });
    console.log(`Existing brands in database: ${existingBrands.size}`);

    // Create new brands
    const brandIdMap = new Map(); // brand name -> medusa brand id
    let brandsCreated = 0;

    for (const [brandName, brandData] of brandsMap) {
      const normalizedName = brandName.toUpperCase();

      if (existingBrands.has(normalizedName)) {
        brandIdMap.set(brandName, existingBrands.get(normalizedName));
      } else {
        const brandId = generateId('brand');
        const handle = createHandle(brandName);
        await client.query(
          'INSERT INTO brand (id, name, handle, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [brandId, brandName, handle]
        );
        brandIdMap.set(brandName, brandId);
        brandsCreated++;
      }
    }
    console.log(`Created ${brandsCreated} new brands`);

    // Link products to brands
    console.log('Linking products to brands...');
    let brandLinksCreated = 0;
    let brandLinksSkipped = 0;

    for (const { wooProductId, brandName } of productBrands) {
      const medusaProductId = productMapping.get(wooProductId);
      const medusaBrandId = brandIdMap.get(brandName);

      if (!medusaProductId) {
        brandLinksSkipped++;
        continue;
      }

      // Check if link already exists
      const existingLink = await client.query(
        'SELECT 1 FROM product_product_brandmodule_brand WHERE product_id = $1 AND brand_id = $2',
        [medusaProductId, medusaBrandId]
      );

      if (existingLink.rows.length === 0) {
        const linkId = generateId('pbrand');
        await client.query(
          'INSERT INTO product_product_brandmodule_brand (id, product_id, brand_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
          [linkId, medusaProductId, medusaBrandId]
        );
        brandLinksCreated++;
      }
    }
    console.log(`Created ${brandLinksCreated} product-brand links`);
    console.log(`Skipped ${brandLinksSkipped} (product not found)`);

    // ===== IMPORT CATEGORIES =====
    console.log('\n' + '='.repeat(40));
    console.log('Importing Categories');
    console.log('='.repeat(40));

    // Get existing categories
    const existingCategoriesResult = await client.query('SELECT id, name, handle FROM product_category');
    const existingCategories = new Map();
    const existingCategoriesByHandle = new Map();
    existingCategoriesResult.rows.forEach(row => {
      existingCategories.set(row.name.toUpperCase(), row.id);
      existingCategoriesByHandle.set(row.handle, row.id);
    });
    console.log(`Existing categories in database: ${existingCategories.size}`);

    // Create new categories
    const categoryIdMap = new Map(); // category name -> medusa category id
    let categoriesCreated = 0;

    for (const [categoryName, categoryData] of categoriesMap) {
      const normalizedName = categoryName.toUpperCase();
      const handle = createHandle(categoryName);

      if (existingCategories.has(normalizedName)) {
        categoryIdMap.set(categoryName, existingCategories.get(normalizedName));
      } else if (existingCategoriesByHandle.has(handle)) {
        categoryIdMap.set(categoryName, existingCategoriesByHandle.get(handle));
      } else {
        const categoryId = generateId('pcat');
        // Decode HTML entities in category name
        const decodedName = categoryName
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        // mpath is the materialized path, for root categories it's just the ID
        const mpath = categoryId;

        await client.query(
          `INSERT INTO product_category (id, name, handle, description, mpath, is_active, is_internal, rank, created_at, updated_at)
           VALUES ($1, $2, $3, '', $4, true, false, 0, NOW(), NOW())`,
          [categoryId, decodedName, handle, mpath]
        );
        categoryIdMap.set(categoryName, categoryId);
        categoriesCreated++;
      }
    }
    console.log(`Created ${categoriesCreated} new categories`);

    // Link products to categories
    console.log('Linking products to categories...');
    let categoryLinksCreated = 0;
    let categoryLinksSkipped = 0;

    for (const { wooProductId, categoryName } of productCategories) {
      const medusaProductId = productMapping.get(wooProductId);
      const medusaCategoryId = categoryIdMap.get(categoryName);

      if (!medusaProductId || !medusaCategoryId) {
        categoryLinksSkipped++;
        continue;
      }

      // Check if link already exists
      const existingLink = await client.query(
        'SELECT 1 FROM product_category_product WHERE product_id = $1 AND product_category_id = $2',
        [medusaProductId, medusaCategoryId]
      );

      if (existingLink.rows.length === 0) {
        await client.query(
          'INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2)',
          [medusaProductId, medusaCategoryId]
        );
        categoryLinksCreated++;
      }
    }
    console.log(`Created ${categoryLinksCreated} product-category links`);
    console.log(`Skipped ${categoryLinksSkipped} (product or category not found)`);

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(60));
    console.log('Import Summary');
    console.log('='.repeat(60));
    console.log(`Tags: ${tagsCreated} created, ${tagLinksCreated} links`);
    console.log(`Brands: ${brandsCreated} created, ${brandLinksCreated} links`);
    console.log(`Categories: ${categoriesCreated} created, ${categoryLinksCreated} links`);
    console.log('\nDone!');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
