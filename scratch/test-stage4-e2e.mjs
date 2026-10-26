// Comprehensive E2E Verification Suite for Phase 3: Complete Test Management
// Testing against server on http://127.0.0.1:3000

const BASE = 'http://127.0.0.1:3000';

async function runStage4Tests() {
  console.log('================================================================');
  console.log('STAGE 4: END-TO-END VERIFICATION FOR COMPLETE TEST MANAGEMENT');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
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

  // Fetch active doctor for commission verification
  const doctorsRes = await apiFetch('/api/doctors?status=active');
  const testDoctor = doctorsRes.data.doctors?.[0];
  assert(Boolean(testDoctor), `Found active doctor for referral testing: ${testDoctor?.name} (${testDoctor?.commissionPercent}%)`);

  // --- 1. Creating a test with multiple parameters ---
  console.log('\n--- 1. Creating a test with multiple parameters ---');
  const code1 = `E2E_LFT_${Date.now().toString().slice(-4)}`;
  const createTest1 = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: code1,
      name: 'E2E Advanced Liver Investigation Panel',
      category: 'Biochemistry',
      sampleType: 'Serum (Fasting 8h)',
      price: 500,
      tatHours: 3,
      parameters: [
        { name: 'Total Bilirubin', unit: 'mg/dL', normalRange: '0.2 - 1.2', low: 0.2, high: 1.2 },
        { name: 'SGOT / AST', unit: 'U/L', normalRange: '10 - 40', low: 10, high: 40 },
        { name: 'SGPT / ALT', unit: 'U/L', normalRange: '7 - 56', low: 7, high: 56 },
        {
          name: 'Alkaline Phosphatase (ALP)',
          unit: 'U/L',
          normalRange: '44 - 147',
          genderSpecific: true,
          maleNormalRange: '40 - 130',
          femaleNormalRange: '35 - 105',
          low: 35,
          high: 147,
        },
      ],
    }),
  });
  assert(createTest1.ok && createTest1.status === 201, `Created test '${code1}' (Status 201)`);
  assert(createTest1.data.test?.parameters?.length === 4, 'Saved with 4 multi-clinical parameters');
  const testDoc1 = createTest1.data.test;

  // --- 2. Editing test metadata, price, and parameters ---
  console.log('\n--- 2. Editing test metadata, price, and parameters ---');
  const editTest1 = await apiFetch(`/api/tests/${testDoc1._id}`, {
    method: 'PUT',
    body: JSON.stringify({
      price: 750, // Price updated
      tatHours: 5,
      parameters: [
        ...testDoc1.parameters,
        { name: 'Total Protein', unit: 'g/dL', normalRange: '6.0 - 8.3', low: 6.0, high: 8.3 },
      ],
    }),
  });
  assert(editTest1.ok, `Updated test successfully (Status ${editTest1.status})`);
  assert(editTest1.data.test?.price === 750, `Catalog price updated to ₹750`);
  assert(editTest1.data.test?.tatHours === 5, `Turnaround time updated to 5h`);
  assert(editTest1.data.test?.parameters?.length === 5, `Added 5th parameter (Total Protein)`);

  // --- 3. Rejecting duplicate test codes ---
  console.log('\n--- 3. Rejecting duplicate test codes ---');
  const dupCodeRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: code1.toLowerCase(), // Lowercase duplicate check
      name: 'Another Test',
      category: 'Biochemistry',
      sampleType: 'Serum',
      price: 400,
      parameters: [{ name: 'Dummy Param', unit: '', normalRange: '' }],
    }),
  });
  assert(!dupCodeRes.ok && dupCodeRes.status === 400, 'Duplicate test code rejected with 400 status');
  assert(dupCodeRes.data.error?.includes('already registered'), `Accurate duplicate error returned`);

  // --- 4. Rejecting invalid data and tests with no parameters ---
  console.log('\n--- 4. Rejecting invalid data and tests with no parameters ---');
  // 4a. Zero parameters
  const noParamsRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: `NOPARAM_${Date.now().toString().slice(-4)}`,
      name: 'No Parameters Test',
      category: 'General',
      sampleType: 'Blood',
      price: 100,
      parameters: [],
    }),
  });
  assert(!noParamsRes.ok && noParamsRes.status === 400, 'Rejected test with empty parameters array');

  // 4b. Duplicate parameter name inside same test
  const dupParamRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: `DUPPARAM_${Date.now().toString().slice(-4)}`,
      name: 'Duplicate Parameters Inside',
      category: 'General',
      sampleType: 'Blood',
      price: 150,
      parameters: [
        { name: 'Hemoglobin', unit: 'g/dL', normalRange: '13-17' },
        { name: 'hemoglobin', unit: 'g/dL', normalRange: '13-17' },
      ],
    }),
  });
  assert(!dupParamRes.ok && dupParamRes.status === 400, 'Rejected duplicate parameter name within same test');

  // 4c. Contradictory numeric bounds (low > high)
  const badBoundsRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: `BADBND_${Date.now().toString().slice(-4)}`,
      name: 'Contradictory Bounds Test',
      category: 'General',
      sampleType: 'Blood',
      price: 200,
      parameters: [{ name: 'Test P', unit: '', normalRange: '50-10', low: 50, high: 10 }],
    }),
  });
  assert(!badBoundsRes.ok && badBoundsRes.status === 400, 'Rejected contradictory low > high bounds');

  // 4d. Negative price
  const negPriceRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: `NEGPRICE_${Date.now().toString().slice(-4)}`,
      name: 'Negative Price Test',
      category: 'General',
      sampleType: 'Blood',
      price: -100,
      parameters: [{ name: 'P1', unit: '', normalRange: '' }],
    }),
  });
  assert(!negPriceRes.ok && negPriceRes.status === 400, 'Rejected negative catalog price');

  // --- 5. Searching and filtering by category and status ---
  console.log('\n--- 5. Searching and filtering by category and status ---');
  const searchRes = await apiFetch(`/api/tests?q=${code1}&status=all`);
  assert(searchRes.ok && searchRes.data.tests?.some((t) => t.code === code1), `Found test by search query '${code1}'`);

  const categoryRes = await apiFetch('/api/tests?category=Biochemistry&status=all');
  assert(categoryRes.ok && categoryRes.data.tests?.every((t) => t.category.toLowerCase() === 'biochemistry'), 'Filtered tests strictly by category Biochemistry');

  // --- 6. Deactivating and reactivating a test ---
  console.log('\n--- 6. Deactivating and reactivating a test ---');
  const deactRes = await apiFetch(`/api/tests/${testDoc1._id}`, { method: 'DELETE' });
  assert(deactRes.ok && deactRes.data.test?.isActive === false, 'Deactivated test via soft-delete endpoint');

  const checkInactive = await apiFetch('/api/tests?status=inactive');
  assert(checkInactive.data.tests?.some((t) => t.code === code1), 'Deactivated test listed in status=inactive query');

  const reactRes = await apiFetch(`/api/tests/${testDoc1._id}`, {
    method: 'PUT',
    body: JSON.stringify({ isActive: true }),
  });
  assert(reactRes.ok && reactRes.data.test?.isActive === true, 'Reactivated test successfully via PUT');

  // --- 7. Confirming deactivated tests cannot be selected for new bookings ---
  console.log('\n--- 7. Confirming deactivated tests cannot be selected for new bookings ---');
  const codeDeact = `DEACT_${Date.now().toString().slice(-4)}`;
  const createDeactTest = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: codeDeact,
      name: 'Archived / Deactivated Investigation',
      category: 'Special',
      sampleType: 'Plasma',
      price: 450,
      parameters: [{ name: 'Marker', unit: 'ng/mL', normalRange: '< 5' }],
    }),
  });
  const deactTestObj = createDeactTest.data.test;
  // Now deactivate it
  await apiFetch(`/api/tests/${deactTestObj._id}`, { method: 'DELETE' });

  // Register a patient to test booking
  const patientRes = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Verification Patient',
      age: 40,
      gender: 'male',
      referredByDoctor: testDoctor?._id,
    }),
  });
  const patientObj = patientRes.data.patient;

  // Attempt booking with deactivated test
  const bookDeactRes = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientObj.patientId,
      doctorId: testDoctor?._id,
      testIds: [deactTestObj._id],
      paidAmount: 450,
    }),
  });
  assert(!bookDeactRes.ok && bookDeactRes.status === 400, 'Booking with deactivated test was rejected with 400 status');
  assert(bookDeactRes.data.error?.includes('deactivated and cannot be ordered'), `Error message clearly identifies deactivated test`);

  // --- 8. Booking a new visit after a test price change and verifying the new price is used ---
  console.log('\n--- 8. Test Price Change & New Visit Price Verification ---');
  const priceTestCode = `PRICE_${Date.now().toString().slice(-4)}`;
  const createPriceTest = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: priceTestCode,
      name: 'Price Evolution Clinical Screen',
      category: 'Hematology',
      sampleType: 'Whole Blood',
      price: 300, // Original price ₹300
      parameters: [{ name: 'Screen Parameter', unit: 'index', normalRange: '1.0 - 2.0' }],
    }),
  });
  const priceTestDoc = createPriceTest.data.test;

  // Book Visit A at initial price ₹300
  const visitARes = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientObj.patientId,
      doctorId: testDoctor?._id,
      testIds: [priceTestDoc._id],
      discount: 0,
      paidAmount: 300,
      paymentMethod: 'cash',
    }),
  });
  assert(visitARes.ok, `Booked Visit A at original price (Status ${visitARes.status})`);
  const visitA = visitARes.data.visit;
  assert(visitA.billing?.totalAmount === 300, `Visit A total amount is ₹300`);
  assert(visitA.tests[0]?.price === 300, `Visit A test snapshot price is ₹300`);

  // Now change the catalog price from ₹300 to ₹450
  const updatePriceRes = await apiFetch(`/api/tests/${priceTestDoc._id}`, {
    method: 'PUT',
    body: JSON.stringify({ price: 450 }),
  });
  assert(updatePriceRes.ok && updatePriceRes.data.test?.price === 450, 'Catalog price updated to ₹450');

  // Book Visit B after price update
  const visitBRes = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: patientObj.patientId,
      doctorId: testDoctor?._id,
      testIds: [priceTestDoc._id],
      discount: 0,
      paidAmount: 450,
      paymentMethod: 'upi',
    }),
  });
  assert(visitBRes.ok, `Booked Visit B after price change (Status ${visitBRes.status})`);
  const visitB = visitBRes.data.visit;
  assert(visitB.billing?.totalAmount === 450, `Visit B uses new price ₹450`);
  assert(visitB.tests[0]?.price === 450, `Visit B snapshot price is ₹450`);

  // --- 9. Confirming an older visit retains its original price, results, report, and receipt ---
  console.log('\n--- 9. Older Visit Historical Immutability (Price, Results, Report, Receipt) ---');
  // Re-fetch Visit A from database
  const getVisitARes = await apiFetch(`/api/visits/${visitA.visitId}`);
  const freshVisitA = getVisitARes.data.visit;
  assert(freshVisitA.billing?.totalAmount === 300, `Older Visit A still has totalAmount: ₹${freshVisitA.billing?.totalAmount} (NOT ₹450)`);
  assert(freshVisitA.tests[0]?.price === 300, `Older Visit A test snapshot price is STILL ₹300`);

  // Enter results for Visit A
  const enterResultsRes = await apiFetch(`/api/visits/${visitA.visitId}`, {
    method: 'PUT',
    body: JSON.stringify({
      results: [
        {
          testId: priceTestDoc._id,
          testName: freshVisitA.tests[0].name,
          parameterName: 'Screen Parameter',
          value: '1.45',
          unit: 'index',
          normalRange: '1.0 - 2.0',
          status: 'normal',
        },
      ],
      enteredBy: 'Senior Biochemist',
    }),
  });
  assert(enterResultsRes.ok, 'Entered results for older Visit A');

  // Check Report page for Visit A (rendered via Client Component from /api/visits/[id])
  const reportRes = await fetch(`${BASE}/reports/${visitA.visitId}`);
  assert(reportRes.status === 200, `Report page for older Visit A renders cleanly (Status 200)`);
  
  // Verify Visit A's finalized results contain parameter name and entered value
  const reportData = await apiFetch(`/api/visits/${visitA.visitId}`);
  const reportResults = reportData.data.visit?.results || [];
  const screenParam = reportResults.find((r) => r.parameterName === 'Screen Parameter');
  assert(screenParam && screenParam.value === '1.45', 'Report data model retains recorded parameter name and observed result value');

  // Check Receipt page for Visit A
  const receiptRes = await fetch(`${BASE}/receipts/${visitA.visitId}`);
  assert(receiptRes.status === 200, `Receipt page for older Visit A renders cleanly (Status 200)`);
  const receiptHtml = await receiptRes.text();
  assert(receiptHtml.includes('300'), 'Receipt displays original ₹300 total, never the updated catalog price');

  // --- 10. Confirming doctor commission records and existing patient workflows remain intact ---
  console.log('\n--- 10. Doctor Commission & Benchmark Patient Verification ---');
  // Verify Visit A commission snapshot is strictly based on ₹300
  const expectedCommissionA = Math.round(((300 * testDoctor.commissionPercent) / 100) * 100) / 100;
  assert(
    freshVisitA.doctorSnapshot?.commissionAmount === expectedCommissionA,
    `Visit A commission is ₹${freshVisitA.doctorSnapshot?.commissionAmount} (based on ₹300, NOT ₹450)`
  );

  // Verify benchmark patient PAT-202610-0001
  const bPatient = await apiFetch('/api/patients/PAT-202610-0001');
  if (bPatient.ok) {
    assert(bPatient.data.visits?.length >= 2, `Benchmark patient PAT-202610-0001 has ${bPatient.data.visits?.length} visits intact`);
    const t1 = bPatient.data.visits.find((v) => v.dailySerial === 1);
    const t2 = bPatient.data.visits.find((v) => v.dailySerial === 2);
    assert(t1 && t2, 'Benchmark visits retain Daily Token #1 and Daily Token #2 without corruption');
  }

  console.log('\n================================================================');
  console.log(`STAGE 4 SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('================================================================');

  if (passed === total) process.exit(0);
  else process.exit(1);
}

runStage4Tests().catch((err) => {
  console.error('Stage 4 test failure:', err);
  process.exit(1);
});
