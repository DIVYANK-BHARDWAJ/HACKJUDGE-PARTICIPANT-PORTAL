const { Client } = require('pg');

async function test() {
  const client = new Client({ 
    user: 'postgres',
    host: '2406:da1a:b00:1302:4b72:1eaf:e8b0:c92b',
    database: 'postgres',
    password: 'RtdoXFXJiH4npIto',
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    }
  });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL via direct IPv6!');
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'submissions'
    `);
    console.log('Columns in submissions table:', res.rows);
  } catch (err) {
    console.error('Error connecting/querying PostgreSQL:', err);
  } finally {
    await client.end();
  }
}

test();
