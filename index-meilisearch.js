/**
 * Index all products into MeiliSearch
 *
 * Fetches products from Medusa API and pushes them to MeiliSearch
 *
 * Usage: node index-meilisearch.js
 */

const https = require('https');
const http = require('http');

// Configuration
const MEDUSA_URL = 'https://api.nutrimercados.com';
const MEILISEARCH_HOST = 'http://192.168.111.16:7700';
const MEILISEARCH_API_KEY = 'YiNjlAlhstd3IohxfNnm0FmaEHwG7DrA';
const BATCH_SIZE = 100;

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;

    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Index Products to MeiliSearch');
  console.log('='.repeat(60));

  // Step 1: Check MeiliSearch health
  console.log('\nChecking MeiliSearch health...');
  const health = await fetch(`${MEILISEARCH_HOST}/health`);
  console.log('MeiliSearch status:', health.data.status);

  // Step 2: Create/update the products index with settings
  console.log('\nCreating products index...');
  const createIndex = await fetch(`${MEILISEARCH_HOST}/indexes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MEILISEARCH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: 'products',
      primaryKey: 'id',
    }),
  });
  console.log('Create index response:', createIndex.status, createIndex.data.taskUid ? `taskUid: ${createIndex.data.taskUid}` : '');

  // Wait for index creation
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: Update index settings
  console.log('\nUpdating index settings...');
  const settings = await fetch(`${MEILISEARCH_HOST}/indexes/products/settings`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${MEILISEARCH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      searchableAttributes: ['title', 'description', 'variant_sku', 'handle'],
      displayedAttributes: ['id', 'title', 'description', 'variant_sku', 'thumbnail', 'handle', 'variant_id', 'sales_count'],
      sortableAttributes: ['sales_count'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
        'sales_count:desc',
      ],
    }),
  });
  console.log('Settings response:', settings.status);

  // Step 4: Fetch all products from database
  console.log('\nFetching products from database...');

  const { Client } = require('pg');
  const DATABASE_URL = 'postgres://postgres:ACvOM05Mcw8ILPDhprD3FOW67PYTcjGFxQTXro1TpSYSzQNRg4hcf8s13Tgi6q2L@192.168.111.16:5432/medusa?sslmode=disable';

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Get all published products with their variants and sales count
  const productsResult = await client.query(`
    SELECT
      p.id,
      p.title,
      p.description,
      p.handle,
      p.thumbnail,
      COALESCE((p.metadata->>'sales_count')::int, 0) as sales_count
    FROM product p
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC
  `);

  console.log(`Found ${productsResult.rows.length} products`);

  // Get variants for all products
  const variantsResult = await client.query(`
    SELECT
      pv.id as variant_id,
      pv.product_id,
      pv.sku
    FROM product_variant pv
    WHERE pv.deleted_at IS NULL
    ORDER BY pv.product_id, pv.created_at ASC
  `);

  // Build variant map (product_id -> first variant)
  const variantMap = new Map();
  for (const v of variantsResult.rows) {
    if (!variantMap.has(v.product_id)) {
      variantMap.set(v.product_id, { variant_id: v.variant_id, sku: v.sku });
    }
  }

  await client.end();

  // Step 5: Transform products for MeiliSearch
  const documents = productsResult.rows.map(product => {
    const variant = variantMap.get(product.id);
    return {
      id: product.id,
      title: product.title,
      description: product.description || '',
      handle: product.handle,
      thumbnail: product.thumbnail || '',
      variant_id: variant ? variant.variant_id : '',
      variant_sku: variant ? variant.sku || '' : '',
      sales_count: parseInt(product.sales_count) || 0,
    };
  });

  // Step 6: Push to MeiliSearch in batches
  console.log(`\nIndexing ${documents.length} products to MeiliSearch...`);

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const result = await fetch(`${MEILISEARCH_HOST}/indexes/products/documents?primaryKey=id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products (taskUid: ${result.data.taskUid})`);
  }

  // Wait and check
  await new Promise(r => setTimeout(r, 3000));

  const stats = await fetch(`${MEILISEARCH_HOST}/indexes/products/stats`, {
    headers: { 'Authorization': `Bearer ${MEILISEARCH_API_KEY}` },
  });

  console.log(`\nDone! MeiliSearch products index: ${stats.data.numberOfDocuments} documents`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
