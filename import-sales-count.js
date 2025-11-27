/**
 * Import Sales Count from WooCommerce
 *
 * This script imports total_sales from WooCommerce products
 * and stores it in Medusa product metadata as sales_count
 *
 * WooCommerce has:
 * - total_sales: number of times the product has been sold
 *
 * Usage: node import-sales-count.js
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

async function main() {
  console.log('='.repeat(60));
  console.log('Import Sales Count from WooCommerce');
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

    // Process products and add sales_count
    console.log('\nProcessing sales count...');
    let updated = 0;
    let skipped = 0;

    for (const wooProduct of wooProducts) {
      const wooId = String(wooProduct.id);
      const medusaProduct = productMapping.get(wooId);

      if (!medusaProduct) {
        skipped++;
        continue;
      }

      const salesCount = parseInt(wooProduct.total_sales) || 0;

      // Merge sales_count into existing metadata
      const newMetadata = {
        ...medusaProduct.metadata,
        sales_count: salesCount
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
    console.log(`Updated: ${updated} products with sales count`);
    console.log(`Skipped: ${skipped} (product not found in Medusa)`);
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
