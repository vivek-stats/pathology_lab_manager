// Read-only script to audit inventory of records and detect test/E2E artifacts
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Read MONGODB_URI from .env.local
let envUri = process.env.MONGODB_URI;
if (!envUri) {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('MONGODB_URI=')) {
          envUri = trimmed.substring('MONGODB_URI='.length).replace(/["']/g, '').trim();
          break;
        }
      }
    }
  } catch (e) {}
}

async function audit() {
  await mongoose.connect(envUri);
  const db = mongoose.connection.db;

  console.log('--- Database Collections Audit ---');
  const collections = await db.listCollections().toArray();
  console.log('Collections present:', collections.map((c) => c.name).join(', '));

  // 1. Audit Patients
  const patients = await db.collection('patients').find({}).toArray();
  console.log(`\nTotal Patients: ${patients.length}`);
  const testPatients = patients.filter(
    (p) =>
      p.name.includes('Test') ||
      p.name.includes('Minimal') ||
      p.name.includes('Full') ||
      p.name.includes('Referred') ||
      p.name.includes('Verification')
  );
  console.log(`Identified Test/E2E Patients: ${testPatients.length}`);
  testPatients.forEach((p) => {
    console.log(`  - [${p.patientId}] ${p.name} (Created: ${p.createdAt?.toISOString()})`);
  });

  // 2. Audit Visits
  const visits = await db.collection('visits').find({}).toArray();
  console.log(`\nTotal Visits: ${visits.length}`);
  const todayVisits = visits.filter((v) => v.dateStringIST === '2026-10-26');
  console.log(`Visits with dateStringIST 2026-10-26: ${todayVisits.length}`);

  // 3. Audit Tests in Catalog
  const tests = await db.collection('tests').find({}).toArray();
  console.log(`\nTotal Tests in Catalog: ${tests.length}`);
  const testCatalogArtifacts = tests.filter(
    (t) =>
      t.code.startsWith('KFT_') ||
      t.code.startsWith('E2E_') ||
      t.code.startsWith('DEACT_') ||
      t.code.startsWith('PRICE_') ||
      t.code.startsWith('BAD_') ||
      t.code.startsWith('TEST_')
  );
  console.log(`Identified Test/E2E Test Codes: ${testCatalogArtifacts.length}`);
  testCatalogArtifacts.forEach((t) => {
    console.log(`  - [${t.code}] ${t.name} (Active: ${t.isActive}, Price: ₹${t.price})`);
  });

  // Standard/Seed Tests
  const standardTests = tests.filter((t) => !testCatalogArtifacts.includes(t));
  console.log(`Standard/Production Catalog Tests: ${standardTests.length}`);
  standardTests.forEach((t) => {
    console.log(`  - [${t.code}] ${t.name} (Active: ${t.isActive}, Price: ₹${t.price}, Params: ${t.parameters?.length})`);
  });

  // 4. Audit Doctors
  const doctors = await db.collection('doctors').find({}).toArray();
  console.log(`\nTotal Doctors: ${doctors.length}`);
  doctors.forEach((d) => {
    console.log(`  - [${d.code || 'DOC'}] ${d.name} (${d.specialization}, ${d.commissionPercent}%, Active: ${d.isActive})`);
  });

  // 5. Audit Doctor Payments
  const payments = await db.collection('doctorpayments').find({}).toArray();
  console.log(`\nTotal Doctor Payments: ${payments.length}`);
  payments.forEach((p) => {
    console.log(`  - Doctor: ${p.doctor}, Amount: ₹${p.amount}, Date: ${p.dateStringIST}, Ref: ${p.referenceNumber || 'N/A'}`);
  });

  // 6. Audit Counters
  const counters = await db.collection('counters').find({}).toArray();
  console.log(`\nTotal Counters: ${counters.length}`);
  counters.forEach((c) => {
    console.log(`  - Key: '${c.id}' -> Seq: ${c.seq}`);
  });

  // 7. Audit Indexes across all collections
  console.log('\n--- Indexes per Collection ---');
  for (const c of ['patients', 'visits', 'tests', 'doctors', 'doctorpayments', 'counters', 'users']) {
    try {
      const idx = await db.collection(c).indexes();
      console.log(`Collection '${c}':`, idx.map((i) => `${i.name} (${JSON.stringify(i.key)})`).join('; '));
    } catch (e) {
      console.log(`Collection '${c}': none or error`);
    }
  }

  await mongoose.disconnect();
}

audit().catch(console.error);
