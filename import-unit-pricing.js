/**
 * Import Unit Pricing from WooCommerce
 *
 * This script imports weight/unit data from WooCommerce products
 * and stores it in Medusa product metadata as unit_pricing
 *
 * WooCommerce has:
 * - weight: numeric value (e.g., 375, 450, 900)
 * - attributes "Presentación": "375 gr", "450 ml", etc.
 *
 * Usage: node import-unit-pricing.js
 */

const { Client } = require('pg');
const https = require('https');

// WooCommerce API Configuration
const WOO_CONFIG = {
  baseUrl: 'https://vitaintegral.co/wp-json/wc/v3',
  consumerKey: 'ck_1285484ef490acc42e92bdd6926709cf38f10b3c',
  consumerSecret: 'cs_0c30bddfb70c0d7a0564ff925fe69a0b24b8a3de',
  perPage: 100
};

// PostgreSQL Configuration
const DATABASE_URL = 'postgres://postgres:ACvOM05Mcw8ILPDhprD3FOW67PYTcjGFxQTXro1TpSYSzQNRg4hcf8s13Tgi6q2L@192.168.111.16:5432/medusa?sslmode=disable';

// Unit type mapping
const UNIT_PATTERNS = [
  { pattern: /\b(\d+(?:\.\d+)?)\s*kg\b/i, unit: 'kg', multiplier: 1000 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*g(?:r|ramos?)?\b/i, unit: 'g', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*mg\b/i, unit: 'mg', multiplier: 0.001 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*L(?:itros?)?\b/i, unit: 'L', multiplier: 1000 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*ml\b/i, unit: 'ml', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*oz\b/i, unit: 'oz', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*lb\b/i, unit: 'lb', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:caps?|cápsulas?)\b/i, unit: 'capsule', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:tabs?|tabletas?)\b/i, unit: 'tablet', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:und?|unid(?:ad)?(?:es)?)\b/i, unit: 'unit', multiplier: 1 },
  { pattern: /\b(\d+(?:\.\d+)?)\s*(?:porci(?:ó|o)n(?:es)?|servings?)\b/i, unit: 'serving', multiplier: 1 },
];

// Default base amounts for price display
const BASE_AMOUNTS = {
  'g': 100,      // Price per 100g
  'kg': 1,       // Price per kg
  'mg': 1000,    // Price per 1000mg (1g)
  'ml': 100,     // Price per 100ml
  'L': 1,        // Price per L
  'oz': 1,       // Price per oz
  'lb': 1,       // Price per lb
  'capsule': 1,  // Price per capsule
  'tablet': 1,   // Price per tablet
  'unit': 1,     // Price per unit
  'serving': 1,  // Price per serving
};

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
 * Parse unit information from product data
 */
function parseUnitInfo(product) {
  // Try to get from "Presentación" attribute first
  const presentacion = product.attributes?.find(a =>
    a.name.toLowerCase() === 'presentación' ||
    a.name.toLowerCase() === 'presentacion'
  );

  let searchText = '';

  if (presentacion && presentacion.options && presentacion.options.length > 0) {
    searchText = presentacion.options[0];
  }

  // Also try product name
  if (!searchText) {
    searchText = product.name;
  }

  // Try to match unit patterns
  for (const { pattern, unit, multiplier } of UNIT_PATTERNS) {
    const match = searchText.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (!isNaN(amount) && amount > 0) {
        return {
          unit_type: unit,
          unit_amount: amount,
          base_unit_amount: BASE_AMOUNTS[unit] || 1
        };
      }
    }
  }

  // Fallback: use weight field if available (assume grams)
  if (product.weight && parseFloat(product.weight) > 0) {
    const weight = parseFloat(product.weight);
    return {
      unit_type: 'g',
      unit_amount: weight,
      base_unit_amount: 100
    };
  }

  return null;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Import Unit Pricing from WooCommerce');
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
      'SELECT id, external_id, metadata FROM product WHERE external_id IS NOT NULL'
    );
    productRows.rows.forEach(row => {
      productMapping.set(row.external_id, {
        id: row.id,
        metadata: row.metadata || {}
      });
    });
    console.log(`Found ${productMapping.size} products with external IDs`);

    // Process products and extract unit info
    console.log('\nProcessing unit pricing...');
    let updated = 0;
    let skipped = 0;
    let noUnitInfo = 0;

    for (const wooProduct of wooProducts) {
      const wooId = String(wooProduct.id);
      const medusaProduct = productMapping.get(wooId);

      if (!medusaProduct) {
        skipped++;
        continue;
      }

      const unitInfo = parseUnitInfo(wooProduct);

      if (!unitInfo) {
        noUnitInfo++;
        continue;
      }

      // Merge unit_pricing into existing metadata
      const newMetadata = {
        ...medusaProduct.metadata,
        unit_pricing: unitInfo
      };

      // Update the product
      await client.query(
        'UPDATE product SET metadata = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(newMetadata), medusaProduct.id]
      );

      updated++;

      if (updated % 100 === 0) {
        console.log(`  Processed ${updated} products...`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Import Summary');
    console.log('='.repeat(60));
    console.log(`Updated: ${updated} products with unit pricing`);
    console.log(`Skipped: ${skipped} (product not found in Medusa)`);
    console.log(`No unit info: ${noUnitInfo} (couldn't parse unit from WooCommerce)`);
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
