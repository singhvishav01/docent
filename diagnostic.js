// diagnostic.js - Run with: node diagnostic.js
// This helps debug the DATABASE_URL and Prisma connection issues

const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

async function runDiagnostics() {
  console.log('🔍 DOCENT Database Diagnostics\n');
  console.log('='.repeat(60));
  
  // 1. Check environment variables
  console.log('\n1️⃣  ENVIRONMENT VARIABLES:');
  console.log('-'.repeat(60));
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL value:', process.env.DATABASE_URL || '❌ NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  
  // 2. Parse DATABASE_URL
  console.log('\n2️⃣  DATABASE_URL PARSING:');
  console.log('-'.repeat(60));
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log('✅ Protocol:', url.protocol);
      console.log('✅ Host:', url.hostname);
      console.log('✅ Port:', url.port);
      console.log('✅ Database:', url.pathname.substring(1));
      console.log('✅ Username:', url.username);
      console.log('✅ Password:', url.password ? '***' : '(empty)');
    } catch (error) {
      console.error('❌ Invalid URL format:', error.message);
    }
  } else {
    console.log('❌ DATABASE_URL not found in environment');
  }
  
  // 3. Test Prisma Client creation
  console.log('\n3️⃣  PRISMA CLIENT CREATION:');
  console.log('-'.repeat(60));
  let prisma;
  try {
    // Method 1: Default (uses schema.prisma binding)
    console.log('Testing default PrismaClient...');
    const prismaDefault = new PrismaClient();
    console.log('✅ Default client created');
    
    // Method 2: With datasourceUrl (bypasses schema)
    console.log('Testing PrismaClient with datasourceUrl...');
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL
    });
    console.log('✅ Client with datasourceUrl created');
  } catch (error) {
    console.error('❌ Client creation failed:', error.message);
    process.exit(1);
  }
  
  // 4. Test database connection
  console.log('\n4️⃣  DATABASE CONNECTION TEST:');
  console.log('-'.repeat(60));
  try {
    console.log('Attempting to connect...');
    await prisma.$connect();
    console.log('✅ Successfully connected to PostgreSQL');
    
    // 5. Test query
    console.log('\n5️⃣  DATABASE QUERY TEST:');
    console.log('-'.repeat(60));
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ PostgreSQL version:', result[0].version);
    
    // 6. Check tables
    console.log('\n6️⃣  SCHEMA CHECK:');
    console.log('-'.repeat(60));
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in database:', tables.length);
    tables.forEach(t => console.log('  -', t.table_name));
    
    // 7. Check for artworks
    console.log('\n7️⃣  DATA CHECK:');
    console.log('-'.repeat(60));
    const artworkCount = await prisma.artwork.count();
    console.log('Artworks in database:', artworkCount);
    
    if (artworkCount > 0) {
      const sampleArtwork = await prisma.artwork.findFirst();
      console.log('Sample artwork:', {
        id: sampleArtwork?.id,
        title: sampleArtwork?.title,
        artist: sampleArtwork?.artist
      });
    } else {
      console.log('⚠️  No artworks found - run: npm run db:seed');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\nPossible causes:');
    console.error('  1. PostgreSQL is not running (check Docker)');
    console.error('  2. Wrong credentials in DATABASE_URL');
    console.error('  3. Database "docent" does not exist');
    console.error('  4. Prisma migrations not run');
    console.error('\nTry:');
    console.error('  docker-compose up -d');
    console.error('  npx prisma migrate dev');
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostics complete\n');
}

runDiagnostics().catch(console.error);