// Verification test script for Phase 5: Software Settings & Lab Branding
const BASE = 'http://127.0.0.1:3000';

async function runSettingsTests() {
  console.log('===============================================================');
  console.log('PHASE 5: VERIFYING SOFTWARE SETTINGS & LAB BRANDING SUBSYSTEM');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond, msg) {
    total++;
    if (cond) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
    }
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const text = await res.text();
    try {
      return { status: res.status, ok: res.ok, data: JSON.parse(text) };
    } catch {
      return { status: res.status, ok: res.ok, data: text };
    }
  }

  // --- 1. GET /api/settings initial fetch ---
  console.log('--- 1. Initial Lab Settings Retrieval ---');
  const initialGet = await apiFetch('/api/settings');
  assert(initialGet.status === 200, 'GET /api/settings returns HTTP 200');
  assert(initialGet.data && initialGet.data.settings, 'Settings object is returned in response');
  assert(typeof initialGet.data.settings.labName === 'string' && initialGet.data.settings.labName.length > 0, 'Default labName is present');
  assert(initialGet.data.settings.currency === 'INR', 'Default currency is INR');
  assert(initialGet.data.settings.timezone === 'Asia/Kolkata', 'Default timezone is Asia/Kolkata');
  console.log(`  Current Lab Name: "${initialGet.data.settings.labName}"`);

  // --- 2. Validation Checks: Rejection of Invalid Inputs ---
  console.log('\n--- 2. Validation Rejections (Invalid Data) ---');

  // 2a. Too short / empty labName
  const invalidNameRes = await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ labName: ' ' }),
  });
  assert(invalidNameRes.status === 400, 'PUT /api/settings rejects empty lab name with HTTP 400');

  // 2b. Invalid email format
  const invalidEmailRes = await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ email: 'not-an-email-at-all' }),
  });
  assert(invalidEmailRes.status === 400, 'PUT /api/settings rejects invalid email format with HTTP 400');

  // 2c. Invalid logo URL format (neither data URL nor http/https)
  const invalidLogoRes = await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({ logoUrl: 'ftp://bad-protocol.com/image.png' }),
  });
  assert(invalidLogoRes.status === 400, 'PUT /api/settings rejects invalid logo protocol with HTTP 400');

  // --- 3. Partial Update Test ---
  console.log('\n--- 3. Successful Partial Update & Preserved Fields ---');
  const updatePayload = {
    labName: 'Apex Advanced Diagnostic Centre & Research Lab',
    tagline: 'Leading Healthcare & Pathology Excellence',
    registrationNumber: 'DL-REG-2026-99120',
    accreditation: 'NABL Certified • ISO 15189:2022',
    primaryPhone: '+91 98111 22233',
    secondaryPhone: '+91 11 4455 6677',
    email: 'contact@apexdiagnostic.lab',
    website: 'https://apexdiagnostic.lab',
    whatsapp: '+91 98111 22233',
    reportHeader: 'Comprehensive Clinical & Pathology Investigation Report',
    reportFooter: 'Official diagnostic findings. Clinically correlate with clinical manifestations.',
    receiptFooter: 'Thank you for your visit. Retain this invoice receipt for report dispatch.',
    signatoryName: 'Dr. Vivek Sharma, MD',
    signatoryDesignation: 'Chief Consultant Pathologist & Lab Director',
  };

  const putRes = await apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(updatePayload),
  });

  assert(putRes.status === 200, 'PUT /api/settings returns HTTP 200 for valid configuration');
  assert(putRes.data.settings.labName === updatePayload.labName, 'Updated labName reflected in response');
  assert(putRes.data.settings.accreditation === updatePayload.accreditation, 'Updated accreditation reflected');
  assert(putRes.data.settings.primaryPhone === updatePayload.primaryPhone, 'Updated primary phone reflected');
  assert(putRes.data.settings.reportHeader === updatePayload.reportHeader, 'Updated report header reflected');
  assert(putRes.data.settings.signatoryName === updatePayload.signatoryName, 'Updated signatory name reflected');

  // Verify unchanged fields were preserved (not overwritten with blank/undefined)
  assert(putRes.data.settings.addressLine1 && putRes.data.settings.addressLine1.length > 0, 'Address Line 1 preserved');
  assert(putRes.data.settings.city && putRes.data.settings.city.length > 0, 'City preserved');
  assert(putRes.data.settings.country === 'India', 'Country preserved as India');
  assert(putRes.data.settings.currency === 'INR', 'Currency preserved as INR');
  assert(putRes.data.settings.timezone === 'Asia/Kolkata', 'Timezone preserved as Asia/Kolkata');

  // --- 4. Database Persistence Check ---
  console.log('\n--- 4. Database Persistence Verification (Independent GET) ---');
  const verifyGet = await apiFetch('/api/settings');
  assert(verifyGet.status === 200, 'Subsequent GET /api/settings returns HTTP 200');
  assert(verifyGet.data.settings.labName === updatePayload.labName, 'Persisted labName retrieved accurately from MongoDB');
  assert(verifyGet.data.settings.registrationNumber === updatePayload.registrationNumber, 'Persisted license retrieved accurately');
  assert(verifyGet.data.settings.reportFooter === updatePayload.reportFooter, 'Persisted report footer retrieved accurately');

  // --- 5. Frontend Navigation & Consumer Route Check ---
  console.log('\n--- 5. Consumer Views & Page Routes ---');

  // 5a. Settings page route
  const settingsPageRes = await apiFetch('/settings');
  assert(settingsPageRes.status === 200, 'GET /settings route responds with HTTP 200');

  // 5b. Find an existing visit to test reports and receipts
  const visitsRes = await apiFetch('/api/visits?limit=1');
  assert(visitsRes.status === 200 && visitsRes.data.visits?.length > 0, 'Existing visits retrieved for print validation');

  if (visitsRes.data.visits?.length > 0) {
    const testVisit = visitsRes.data.visits[0];
    const visitId = testVisit.visitId || testVisit._id;

    // Report page
    const reportRes = await apiFetch(`/reports/${visitId}`);
    assert(reportRes.status === 200, `GET /reports/${visitId} responds with HTTP 200`);

    // Receipt page
    const receiptRes = await apiFetch(`/receipts/${visitId}`);
    assert(receiptRes.status === 200, `GET /receipts/${visitId} responds with HTTP 200`);
  }

  // 5c. Find an existing doctor to test statement page
  const doctorsRes = await apiFetch('/api/doctors?limit=1');
  assert(doctorsRes.status === 200 && doctorsRes.data.doctors?.length > 0, 'Existing doctor found for statement validation');

  if (doctorsRes.data.doctors?.length > 0) {
    const testDoctor = doctorsRes.data.doctors[0];
    const docId = testDoctor._id;

    const statementRes = await apiFetch(`/doctors/${docId}/statement`);
    assert(statementRes.status === 200, `GET /doctors/${docId}/statement responds with HTTP 200`);
  }

  // 5d. Dashboard & Patients route integrity
  const dashboardRes = await apiFetch('/api/dashboard');
  assert(dashboardRes.status === 200, 'GET /api/dashboard responds with HTTP 200');

  const patientsRes = await apiFetch('/api/patients?limit=1');
  assert(patientsRes.status === 200, 'GET /api/patients responds with HTTP 200');

  // --- 6. Historical Data Integrity Check ---
  console.log('\n--- 6. Zero Regression on Existing Records ---');
  const benchmarkPatient = await apiFetch('/api/patients/PAT-202610-0001');
  assert(benchmarkPatient.status === 200, 'Benchmark patient PAT-202610-0001 is intact');
  assert(benchmarkPatient.data.patient?.name === 'Aakash Verma', 'Benchmark patient identity unaltered');

  // Check tests catalog
  const testsCatalogRes = await apiFetch('/api/tests');
  assert(testsCatalogRes.status === 200 && testsCatalogRes.data.tests?.length >= 8, 'Test catalog preserved intact');

  console.log('\n===============================================================');
  console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log(`SUCCESS RATE: ${Math.round((passed / total) * 100)}%`);
  console.log('===============================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSettingsTests().catch((err) => {
  console.error('Fatal error during settings verification:', err);
  process.exit(1);
});
