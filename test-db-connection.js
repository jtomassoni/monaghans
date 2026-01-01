const { PrismaClient } = require('@prisma/client');

// Get DATABASE_URL from command line argument or environment
const dbUrl = process.argv[2] || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Please provide DATABASE_URL');
  console.error('');
  console.error('Usage: node test-db-connection.js "postgresql://user:password@localhost:5432/monaghans"');
  console.error('   Or set DATABASE_URL in your .env file and run: node test-db-connection.js');
  process.exit(1);
}

async function testConnection() {
  // Hide password in output
  const safeUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`🔍 Testing connection to: ${safeUrl}`);
  console.log('');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  try {
    // Try to connect and run a simple query
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Database query successful');
    console.log('');
    console.log('🎉 Your DATABASE_URL is working correctly!');
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('');
    console.error('Error details:');
    console.error(error.message);
    console.error('');
    
    if (error.message.includes('password authentication failed')) {
      console.log('💡 The username or password is incorrect.');
      console.log('   Common solutions:');
      console.log('   1. Try using your macOS username (jamestomassoni) without a password:');
      console.log('      postgresql://jamestomassoni@localhost:5432/monaghans');
      console.log('   2. Or use the default postgres user:');
      console.log('      postgresql://postgres@localhost:5432/monaghans');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 The database "monaghans" does not exist.');
      console.log('   Create it with: createdb monaghans');
    } else if (error.message.includes('connection refused') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 PostgreSQL server is not running or not accessible.');
      console.log('   Start PostgreSQL with: brew services start postgresql@14');
      console.log('   Or check which version: brew services list | grep postgresql');
    } else if (error.message.includes('role') && error.message.includes('does not exist')) {
      console.log('💡 The PostgreSQL user does not exist.');
      console.log('   Common solutions:');
      console.log('   1. Use your macOS username: jamestomassoni');
      console.log('   2. Or create the user: createuser -s user');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
