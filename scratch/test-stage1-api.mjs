// Targeted verification script for STAGE 1: Test Management API & Validation
const BASE = 'http://127.0.0.1:3000';

async function runStage1Tests() {
  console.log('==================================================');
  console.log('STAGE 1: VERIFYING TEST MANAGEMENT API & VALIDATION');
  console.log('==================================================\n');

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

  // 1. Create a test with multiple parameters
  console.log('--- 1. Create Test with Multiple Parameters & Gender-Specific Ranges ---');
  const uniqueCode = `KFT_${Date.now().toString().slice(-4)}`;
  const createRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: uniqueCode,
      name: 'Kidney Function Test (KFT / RFT)',
      category: 'Biochemistry',
      sampleType: 'Serum (2ml)',
      price: 550,
      tatHours: 4,
      parameters: [
        {
          name: 'Blood Urea',
          unit: 'mg/dL',
          normalRange: '15 - 40',
          low: 15,
          high: 40,
        },
        {
          name: 'Serum Creatinine',
          unit: 'mg/dL',
          normalRange: '0.6 - 1.2',
          genderSpecific: true,
          maleNormalRange: '0.7 - 1.3',
          femaleNormalRange: '0.5 - 1.1',
          low: 0.5,
          high: 1.3,
        },
        {
          name: 'Uric Acid',
          unit: 'mg/dL',
          normalRange: '3.5 - 7.2',
          low: 3.5,
          high: 7.2,
        },
      ],
    }),
  });
  assert(createRes.ok && createRes.status === 201, `Created new test '${uniqueCode}' (Status 201)`);
  assert(createRes.data.test?.parameters?.length === 3, `Has 3 parameters configured`);
  const createdTest = createRes.data.test;

  // 2. Reject Duplicate Test Code (case-insensitive)
  console.log('\n--- 2. Reject Duplicate Test Code ---');
  const dupRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: uniqueCode.toLowerCase(), // lower case version
      name: 'Duplicate KFT',
      category: 'Biochemistry',
      sampleType: 'Serum',
      price: 600,
      parameters: [{ name: 'Test Param', unit: 'mg/dL', normalRange: '10 - 20' }],
    }),
  });
  assert(!dupRes.ok && dupRes.status === 400, 'Duplicate test code rejected with 400 status');
  assert(dupRes.data.error?.includes('already registered'), `Helpful error returned: "${dupRes.data.error}"`);

  // 3. Reject Zero Parameters
  console.log('\n--- 3. Reject Zero Parameters ---');
  const zeroParamsRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: `NO_PARAM_${Date.now().toString().slice(-4)}`,
      name: 'Test with No Params',
      category: 'General',
      sampleType: 'Blood',
      price: 200,
      parameters: [],
    }),
  });
  assert(!zeroParamsRes.ok && zeroParamsRes.status === 400, 'Zero-parameter test rejected with 400 status');

  // 4. Reject Contradictory Low > High
  console.log('\n--- 4. Reject Contradictory Low > High Bounds ---');
  const invalidRangeRes = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify({
      code: `BAD_RNG_${Date.now().toString().slice(-4)}`,
      name: 'Bad Range Test',
      category: 'General',
      sampleType: 'Serum',
      price: 150,
      parameters: [{ name: 'Bad Parameter', unit: 'U/L', normalRange: '100 - 50', low: 100, high: 50 }],
    }),
  });
  assert(!invalidRangeRes.ok && invalidRangeRes.status === 400, 'Contradictory low > high bounds rejected with 400 status');

  // 5. Query /api/tests with filters
  console.log('\n--- 5. Query /api/tests with Filters ---');
  // Default (active tests)
  const defaultList = await apiFetch('/api/tests');
  assert(defaultList.ok && defaultList.data.tests?.every((t) => t.isActive === true), 'Default query returns only active tests');

  // Search by code
  const codeSearch = await apiFetch(`/api/tests?q=${uniqueCode}&status=all`);
  assert(codeSearch.ok && codeSearch.data.tests?.some((t) => t.code === uniqueCode), `Search by code '${uniqueCode}' succeeded`);

  // Filter by category
  const catSearch = await apiFetch('/api/tests?category=Biochemistry&status=all');
  assert(catSearch.ok && catSearch.data.tests?.every((t) => t.category.toLowerCase() === 'biochemistry'), 'Filter by category Biochemistry succeeded');
  assert(Array.isArray(catSearch.data.categories), `Returned categories list: [${catSearch.data.categories?.slice(0, 4).join(', ')}...]`);

  // 6. Get single test by ID
  console.log('\n--- 6. Get and Edit Test (/api/tests/[id]) ---');
  const getById = await apiFetch(`/api/tests/${createdTest._id}`);
  assert(getById.ok && getById.data.test?.code === uniqueCode, 'Retrieved test by Mongo _id');

  const getByCode = await apiFetch(`/api/tests/${uniqueCode}`);
  assert(getByCode.ok && getByCode.data.test?.name === createdTest.name, 'Retrieved test by unique code');

  // 7. Update test price and metadata
  const updateRes = await apiFetch(`/api/tests/${createdTest._id}`, {
    method: 'PUT',
    body: JSON.stringify({
      price: 620, // Updated price
      tatHours: 3,
      name: 'Comprehensive Kidney Function Profile (KFT)',
    }),
  });
  assert(updateRes.ok, `Updated test successfully (Status ${updateRes.status})`);
  assert(updateRes.data.test?.price === 620, `Price successfully updated to ₹620`);
  assert(updateRes.data.test?.tatHours === 3, `Turnaround time updated to 3h`);

  // 8. Soft Delete / Deactivate Test
  console.log('\n--- 7. Soft Delete & Reactivate Test ---');
  const deleteRes = await apiFetch(`/api/tests/${createdTest._id}`, {
    method: 'DELETE',
  });
  assert(deleteRes.ok, `Soft-deleted test (Status ${deleteRes.status})`);
  assert(deleteRes.data.test?.isActive === false, 'Test isActive flag is now false');

  // Verify deactivated test does NOT appear in active query
  const activeCheck = await apiFetch('/api/tests');
  assert(!activeCheck.data.tests?.some((t) => t.code === uniqueCode), 'Deactivated test does NOT appear in active tests list');

  // Verify deactivated test DOES appear in status=all and status=inactive
  const inactiveCheck = await apiFetch('/api/tests?status=inactive');
  assert(inactiveCheck.data.tests?.some((t) => t.code === uniqueCode), 'Deactivated test appears in status=inactive list');

  // Reactivate test via PUT
  const reactivateRes = await apiFetch(`/api/tests/${createdTest._id}`, {
    method: 'PUT',
    body: JSON.stringify({ isActive: true }),
  });
  assert(reactivateRes.ok && reactivateRes.data.test?.isActive === true, 'Test reactivated successfully via PUT');

  console.log('\n==================================================');
  console.log(`STAGE 1 SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('==================================================');

  if (passed === total) process.exit(0);
  else process.exit(1);
}

runStage1Tests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
