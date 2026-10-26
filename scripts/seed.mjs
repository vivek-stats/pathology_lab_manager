/**
 * Database Seed Script for Pathology Lab Management System
 * Run with: node scripts/seed.mjs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Load .env.local if present
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
  } catch (e) {
    // ignore
  }
}

const MONGODB_URI = envUri || 'mongodb://localhost:27017/pathology_lab';

function maskUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

async function seed() {
  console.log('Connecting to MongoDB at:', maskUri(MONGODB_URI));
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.error('Cannot connect to MongoDB.');
    console.error(err.message);
    process.exit(1);
  }

  const db = mongoose.connection.db;

  // 1. Seed Users
  console.log('Checking / Seeding Users...');
  const usersCollection = db.collection('users');
  const existingAdmin = await usersCollection.findOne({ email: 'admin@apexpathology.lab' });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    await usersCollection.insertOne({
      name: 'Dr. Vivek Sharma (Chief Pathologist & Admin)',
      email: 'admin@apexpathology.lab',
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  -> Created default admin user (email: admin@apexpathology.lab, pass: admin123)');
  } else {
    console.log('  -> Admin user already exists');
  }

  // 2. Seed Sample Tests
  console.log('Checking / Seeding Sample Tests...');
  const testsCollection = db.collection('tests');
  const testCount = await testsCollection.countDocuments();
  if (testCount === 0) {
    const sampleTests = [
      {
        code: 'CBC',
        name: 'Complete Blood Count (CBC) with Automated Differential',
        category: 'Hematology',
        sampleType: 'EDTA Whole Blood (2ml)',
        price: 350,
        tatHours: 3,
        isActive: true,
        parameters: [
          { name: 'Hemoglobin (Hb)', unit: 'g/dL', normalRange: '13.0 - 17.0', low: 13.0, high: 17.0, genderSpecific: true, maleNormalRange: '13.0 - 17.0', femaleNormalRange: '12.0 - 15.5' },
          { name: 'Total Leukocyte Count (TLC / WBC)', unit: 'cells/cu.mm', normalRange: '4,000 - 11,000', low: 4000, high: 11000 },
          { name: 'RBC Count', unit: 'million/cu.mm', normalRange: '4.5 - 5.9', low: 4.5, high: 5.9 },
          { name: 'Platelet Count', unit: 'lakhs/cu.mm', normalRange: '1.5 - 4.5', low: 1.5, high: 4.5 },
          { name: 'Packed Cell Volume (PCV / Hematocrit)', unit: '%', normalRange: '40 - 50', low: 40, high: 50 },
          { name: 'Neutrophils', unit: '%', normalRange: '40 - 70', low: 40, high: 70 },
          { name: 'Lymphocytes', unit: '%', normalRange: '20 - 45', low: 20, high: 45 },
          { name: 'Eosinophils', unit: '%', normalRange: '1 - 6', low: 1, high: 6 },
          { name: 'Monocytes', unit: '%', normalRange: '2 - 10', low: 2, high: 10 },
          { name: 'Basophils', unit: '%', normalRange: '0 - 1', low: 0, high: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'LIPID',
        name: 'Lipid Profile Screen',
        category: 'Biochemistry',
        sampleType: 'Serum (12h Fasting)',
        price: 650,
        tatHours: 4,
        isActive: true,
        parameters: [
          { name: 'Total Cholesterol', unit: 'mg/dL', normalRange: '125 - 200', low: 125, high: 200 },
          { name: 'Triglycerides', unit: 'mg/dL', normalRange: '60 - 150', low: 60, high: 150 },
          { name: 'HDL Cholesterol (Good)', unit: 'mg/dL', normalRange: '40 - 60', low: 40, high: 60 },
          { name: 'LDL Cholesterol (Calculated)', unit: 'mg/dL', normalRange: '< 100', low: 0, high: 100 },
          { name: 'VLDL Cholesterol', unit: 'mg/dL', normalRange: '5 - 30', low: 5, high: 30 },
          { name: 'Chol / HDL Ratio', unit: 'Ratio', normalRange: '3.3 - 4.4', low: 3.3, high: 4.4 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'LFT',
        name: 'Liver Function Test (LFT)',
        category: 'Biochemistry',
        sampleType: 'Serum',
        price: 750,
        tatHours: 4,
        isActive: true,
        parameters: [
          { name: 'Total Bilirubin', unit: 'mg/dL', normalRange: '0.2 - 1.2', low: 0.2, high: 1.2 },
          { name: 'Direct Bilirubin', unit: 'mg/dL', normalRange: '0.0 - 0.3', low: 0.0, high: 0.3 },
          { name: 'Indirect Bilirubin', unit: 'mg/dL', normalRange: '0.2 - 0.9', low: 0.2, high: 0.9 },
          { name: 'SGOT / AST', unit: 'U/L', normalRange: '10 - 40', low: 10, high: 40 },
          { name: 'SGPT / ALT', unit: 'U/L', normalRange: '7 - 56', low: 7, high: 56 },
          { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', normalRange: '44 - 147', low: 44, high: 147 },
          { name: 'Total Protein', unit: 'g/dL', normalRange: '6.0 - 8.3', low: 6.0, high: 8.3 },
          { name: 'Albumin', unit: 'g/dL', normalRange: '3.5 - 5.0', low: 3.5, high: 5.0 },
          { name: 'A/G Ratio', unit: 'Ratio', normalRange: '1.2 - 2.2', low: 1.2, high: 2.2 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'BSF',
        name: 'Blood Sugar Fasting (BSF)',
        category: 'Biochemistry',
        sampleType: 'Fluoride Plasma',
        price: 100,
        tatHours: 2,
        isActive: true,
        parameters: [
          { name: 'Fasting Plasma Glucose', unit: 'mg/dL', normalRange: '70 - 99', low: 70, high: 99 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'THYROID',
        name: 'Thyroid Function Test (Total T3, Total T4, TSH Ultrasensitive)',
        category: 'Endocrinology',
        sampleType: 'Serum',
        price: 550,
        tatHours: 6,
        isActive: true,
        parameters: [
          { name: 'Total Triiodothyronine (T3)', unit: 'ng/dL', normalRange: '60 - 200', low: 60, high: 200 },
          { name: 'Total Thyroxine (T4)', unit: 'µg/dL', normalRange: '4.5 - 12.0', low: 4.5, high: 12.0 },
          { name: 'Thyroid Stimulating Hormone (TSH)', unit: 'µIU/mL', normalRange: '0.35 - 4.94', low: 0.35, high: 4.94 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        code: 'URINE-RE',
        name: 'Urine Routine & Microscopic Examination',
        category: 'Clinical Pathology',
        sampleType: 'Fresh Spot Urine (15ml)',
        price: 180,
        tatHours: 2,
        isActive: true,
        parameters: [
          { name: 'Color', unit: '', normalRange: 'Pale Yellow' },
          { name: 'Appearance', unit: '', normalRange: 'Clear' },
          { name: 'Specific Gravity', unit: '', normalRange: '1.005 - 1.030' },
          { name: 'pH', unit: '', normalRange: '4.6 - 8.0' },
          { name: 'Protein (Albumin)', unit: '', normalRange: 'Nil / Negative' },
          { name: 'Glucose (Sugar)', unit: '', normalRange: 'Nil / Negative' },
          { name: 'Ketone Bodies', unit: '', normalRange: 'Negative' },
          { name: 'Pus Cells (WBCs)', unit: '/HPF', normalRange: '0 - 5' },
          { name: 'Epithelial Cells', unit: '/HPF', normalRange: '1 - 4' },
          { name: 'RBCs', unit: '/HPF', normalRange: 'Nil' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await testsCollection.insertMany(sampleTests);
    console.log(`  -> Inserted ${sampleTests.length} illustrative lab tests.`);
  } else {
    console.log(`  -> Found ${testCount} existing tests in catalog.`);
  }

  // 3. Seed Sample Referring Doctors
  console.log('Checking / Seeding Doctors...');
  const doctorsCollection = db.collection('doctors');
  const doctorCount = await doctorsCollection.countDocuments();
  if (doctorCount === 0) {
    const sampleDoctors = [
      {
        name: 'Dr. Rajesh Sharma, MD (Medicine)',
        code: 'DOC-RS01',
        qualification: 'MBBS, MD',
        specialization: 'Internal Medicine / Consultant Physician',
        mobile: '+91 98112 34567',
        email: 'dr.sharma@healthclinic.org',
        commissionPercent: 15,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Ananya Verma, MS (OBG)',
        code: 'DOC-AV02',
        qualification: 'MBBS, MS',
        specialization: 'Gynecologist & Obstetrician',
        mobile: '+91 98223 45678',
        email: 'dr.verma@carehospital.org',
        commissionPercent: 20,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Dr. Sunil Mehta, DNB (Pediatrics)',
        code: 'DOC-SM03',
        qualification: 'MBBS, DNB',
        specialization: 'Pediatrician & Child Specialist',
        mobile: '+91 98334 56789',
        email: 'dr.mehta@childcare.org',
        commissionPercent: 12,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await doctorsCollection.insertMany(sampleDoctors);
    console.log(`  -> Inserted ${sampleDoctors.length} sample referring doctors.`);
  } else {
    console.log(`  -> Found ${doctorCount} doctors.`);
  }

  console.log('Seed completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
