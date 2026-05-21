const { Client } = require('pg');

const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'sa-east-1',
  'ca-central-1'
];

async function testAll() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Trying ${region} (${host})...`);
    const client = new Client({ 
      user: 'postgres.npgydwqyjqwcixsxydse',
      host,
      database: 'postgres',
      password: 'RtdoXFXJiH4npIto',
      port: 6543,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000
    });
    try {
      await client.connect();
      console.log(`SUCCESS connected via ${region}!`);
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'submissions'
      `);
      console.log('Columns:', res.rows);
      await client.end();
      break;
    } catch (err) {
      console.log(`Failed for ${region}: ${err.message}`);
    }
  }
}

testAll();
