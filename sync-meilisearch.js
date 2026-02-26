/**
 * Manual Meilisearch Sync Script
 *
 * This script manually syncs all published products to Meilisearch
 * Run with: node sync-meilisearch.js
 */

const { Client } = require('pg');
const { MeiliSearch } = require('meilisearch');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:ACvOM05Mcw8ILPDhprD3FOW67PYTcjGFxQTXro1TpSYSzQNRg4hcf8s13Tgi6q2L@192.168.111.6:5432/medusa';
const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'https://search.nutrimercados.com';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || 'RlQ1EQ37q48yiOsBUt3GahLjyj6wm7Zg';

const BATCH_SIZE = 500;

async function main() {
  console.log('='.repeat(60));
  console.log('Manual Meilisearch Sync');
  console.log('='.repeat(60));

  const pgClient = new Client({ connectionString: DATABASE_URL });
  const meiliClient = new MeiliSearch({
    host: MEILISEARCH_HOST,
    apiKey: MEILISEARCH_API_KEY,
  });

  try {
    await pgClient.connect();
    console.log('\nConnected to PostgreSQL');

    // Get or create the products index
    const index = meiliClient.index('products');

    // Update index settings
    console.log('\nUpdating index settings...');
    await index.updateSettings({
      searchableAttributes: ['title', 'description', 'variant_sku', 'handle'],
      displayedAttributes: ['id', 'title', 'description', 'variant_sku', 'thumbnail', 'handle', 'variant_id'],
    });

    // Fetch all published products with their first variant
    console.log('\nFetching products from database...');
    const result = await pgClient.query(`
      SELECT
        p.id,
        p.title,
        p.description,
        p.handle,
        p.thumbnail,
        pv.id as variant_id,
        pv.sku as variant_sku
      FROM product p
      LEFT JOIN (
        SELECT DISTINCT ON (product_id) *
        FROM product_variant
        ORDER BY product_id, created_at ASC
      ) pv ON pv.product_id = p.id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
    `);

    const products = result.rows;
    console.log(`Found ${products.length} published products`);

    // Transform products for Meilisearch
    const documents = products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      handle: p.handle,
      thumbnail: p.thumbnail,
      variant_id: p.variant_id,
      variant_sku: p.variant_sku || '',
    }));

    // Delete all existing documents first
    console.log('\nClearing existing index...');
    await index.deleteAllDocuments();

    // Wait for the delete task to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add documents in batches
    console.log(`\nIndexing ${documents.length} products in batches of ${BATCH_SIZE}...`);
    let indexed = 0;

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const task = await index.addDocuments(batch, { primaryKey: 'id' });
      indexed += batch.length;
      console.log(`  Indexed ${indexed}/${documents.length} products (task: ${task.taskUid})`);
    }

    // Wait for indexing to complete
    console.log('\nWaiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify
    const stats = await index.getStats();
    console.log('\n' + '='.repeat(60));
    console.log('Sync Complete!');
    console.log('='.repeat(60));
    console.log(`Documents in index: ${stats.numberOfDocuments}`);
    console.log(`Is indexing: ${stats.isIndexing}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

main();
