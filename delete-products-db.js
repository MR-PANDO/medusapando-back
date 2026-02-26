/**
 * Script to delete all products directly from PostgreSQL database
 */

const { Client } = require('pg');

const DATABASE_URL = 'postgres://postgres:ACvOM05Mcw8ILPDhprD3FOW67PYTcjGFxQTXro1TpSYSzQNRg4hcf8s13Tgi6q2L@192.168.111.6:5432/medusa';

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    // Get product count before deletion
    const countBefore = await client.query('SELECT COUNT(*) FROM product');
    console.log(`\nProducts before deletion: ${countBefore.rows[0].count}`);

    if (parseInt(countBefore.rows[0].count) === 0) {
      console.log('No products to delete.');
      return;
    }

    console.log('\nDeleting products and related data...');

    // Delete in order respecting foreign key constraints
    const deleteQueries = [
      'DELETE FROM product_variant_inventory_item',
      'DELETE FROM inventory_item',
      'DELETE FROM product_variant_price_set',
      'DELETE FROM product_option_value',
      'DELETE FROM product_variant',
      'DELETE FROM product_option',
      'DELETE FROM product_image',
      'DELETE FROM product_tag',
      'DELETE FROM product_sales_channel',
      'DELETE FROM product_category_product',
      'DELETE FROM product',
    ];

    for (const query of deleteQueries) {
      try {
        const result = await client.query(query);
        const tableName = query.split('FROM ')[1];
        console.log(`  Deleted from ${tableName}: ${result.rowCount} rows`);
      } catch (err) {
        // Table might not exist or might have different name in Medusa v2
        console.log(`  Skipped: ${query.split('FROM ')[1]} (${err.message.split('\n')[0]})`);
      }
    }

    // Verify deletion
    const countAfter = await client.query('SELECT COUNT(*) FROM product');
    console.log(`\nProducts after deletion: ${countAfter.rows[0].count}`);

    console.log('\nDone! You can now re-import the products.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
