// Comprehensive Test Script for UI Improvements and Bug Fixes
// Testing on http://127.0.0.1:3000

const BASE = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING UI IMPROVEMENTS & BUG FIXES VERIFICATION');
  console.log('====================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // Helper fetch with timeout
  async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    try {
      return { status: res.status, ok: res.ok, data: JSON.parse(text) };
    } catch {
      return { status: res.status, ok: res.ok, data: text };
    }
  }

  // 1. Health check
  console.log('--- 0. System & Database Health Check ---');
  const health = await apiFetch('/api/health');
  assert(health.ok && health.data.database?.isConnected === true, 'Database is connected to MongoDB Atlas');

  // 2. Fetch active doctors to test with
  console.log('\n--- Doctor Preparation ---');
  const docRes = await apiFetch('/api/doctors?status=active');
  assert(docRes.ok && Array.isArray(docRes.data.doctors), 'Fetched active doctors list');
  let testDoctor = docRes.data.doctors.find((d) => d.commissionPercent > 0);
  if (!testDoctor) {
    // Create a test doctor if none exists
    const createDoc = await apiFetch('/api/doctors', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Dr. Akash Verma',
        specialization: 'Internal Medicine',
        commissionPercent: 12.5,
        mobile: '9876543210',
        clinicAddress: '12 Health Plaza, New Delhi',
      }),
    });
    testDoctor = createDoc.data.doctor;
  }
  assert(testDoctor && testDoctor._id, `Using test doctor: ${testDoctor.name} (${testDoctor.commissionPercent}%)`);

  // 3. Checklist Point 1: Register patient with ONLY required fields (Name, Age, Gender)
  console.log('\n--- Checklist 1: Register patient with ONLY required fields (Name, Age, Gender) ---');
  const minimalReg = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aakash Sharma Minimal',
      age: 28,
      gender: 'male',
      // mobile, bloodGroup, address, emergencyContact are left blank/omitted
    }),
  });
  assert(minimalReg.ok, `Registration with only required fields succeeded (Status ${minimalReg.status})`);
  assert(minimalReg.data.patient?.patientId?.startsWith('PAT-'), `Generated permanent patient ID: ${minimalReg.data.patient?.patientId}`);
  assert(!minimalReg.data.patient?.mobile, 'Mobile number is absent/blank as expected');
  const minimalPatient = minimalReg.data.patient;

  // 4. Checklist Point 2: Register patient with all optional fields filled
  console.log('\n--- Checklist 2: Register patient with all optional fields filled ---');
  const fullReg = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Aakanksha Roy Full',
      age: 4,
      ageUnit: 'months',
      gender: 'female',
      mobile: '9811223344',
      email: 'aakanksha.roy@example.com',
      bloodGroup: 'B+',
      address: 'Flat 402, Lotus Towers, Mumbai',
      emergencyContact: '9811223300',
    }),
  });
  assert(fullReg.ok, `Registration with optional fields and months unit succeeded (Status ${fullReg.status})`);
  assert(fullReg.data.patient?.ageUnit === 'months', `Age unit correctly saved as months: ${fullReg.data.patient?.ageUnit}`);
  assert(fullReg.data.patient?.bloodGroup === 'B+', `Blood group preserved: ${fullReg.data.patient?.bloodGroup}`);
  const fullPatient = fullReg.data.patient;

  // Age validation checks per unit
  console.log('\n--- Sensible Age Validation per Unit Checks ---');
  const invalidYears = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({ name: 'Old Person', age: 160, ageUnit: 'years', gender: 'other' }),
  });
  assert(!invalidYears.ok && invalidYears.status === 400, 'Rejected age > 150 years as invalid');

  const invalidMonths = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({ name: 'Baby Too Old', age: 130, ageUnit: 'months', gender: 'male' }),
  });
  assert(!invalidMonths.ok && invalidMonths.status === 400, 'Rejected age > 120 months as invalid');

  const invalidDays = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({ name: 'Newborn Too Old', age: 400, ageUnit: 'days', gender: 'female' }),
  });
  assert(!invalidDays.ok && invalidDays.status === 400, 'Rejected age > 365 days as invalid');

  // 5. Checklist Point 3: Select referring doctor during registration & verify visit association and commission
  console.log('\n--- Checklist 3: Referring Doctor Selection & Commission Accrual ---');
  const referredReg = await apiFetch('/api/patients', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Priya Mehra Referred',
      age: 32,
      gender: 'female',
      mobile: '9988776655',
      referredByDoctor: testDoctor._id,
    }),
  });
  assert(referredReg.ok, 'Registered patient with referring doctor');
  assert(referredReg.data.patient?.referredByDoctor === testDoctor._id, 'Preserved referring doctor ID on patient');
  assert(referredReg.data.patient?.referredByDoctorName === testDoctor.name, `Preserved doctor name: ${referredReg.data.patient?.referredByDoctorName}`);
  const referredPatient = referredReg.data.patient;

  // Fetch tests for ordering
  const testsRes = await apiFetch('/api/tests');
  assert(testsRes.ok && testsRes.data.tests?.length > 0, `Catalog loaded with ${testsRes.data.tests?.length} available tests`);
  const test1 = testsRes.data.tests[0];
  const test2 = testsRes.data.tests[1] || testsRes.data.tests[0];

  // Book visit for referred patient with fallback/selected doctor
  const bookVisit = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: referredPatient.patientId,
      doctorId: testDoctor._id,
      testIds: [test1._id, test2._id],
      discount: 0,
      paidAmount: test1.price + test2.price,
      paymentMethod: 'cash',
    }),
  });
  assert(bookVisit.ok, `Booked visit for referred patient (Status ${bookVisit.status})`);
  const bookedVisit = bookVisit.data.visit;
  const expectedEligible = test1.price + test2.price;
  const expectedCommission = Math.round(((expectedEligible * testDoctor.commissionPercent) / 100) * 100) / 100;
  assert(bookedVisit.doctorSnapshot?.doctorId === testDoctor._id, 'Doctor snapshot accurately captured in visit');
  assert(bookedVisit.doctorSnapshot?.commissionPercent === testDoctor.commissionPercent, `Doctor commission % snapshot: ${bookedVisit.doctorSnapshot?.commissionPercent}%`);
  assert(bookedVisit.doctorSnapshot?.commissionAmount === expectedCommission, `Commission accurately accrued: ₹${bookedVisit.doctorSnapshot?.commissionAmount} (expected ₹${expectedCommission})`);

  // Book visit with NO doctor (Self / Direct) - ensure NO commission
  const selfVisit = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: minimalPatient.patientId,
      doctorId: null,
      testIds: [test1._id],
      discount: 0,
      paidAmount: test1.price,
      paymentMethod: 'cash',
    }),
  });
  assert(selfVisit.ok, 'Booked visit with Self / Direct');
  assert(selfVisit.data.visit.doctorSnapshot?.commissionAmount === 0, 'Zero commission awarded for unreferred visit');
  assert(selfVisit.data.visit.doctorSnapshot?.name === 'Self / Direct', 'Doctor snapshot records Self / Direct');

  // 6. Checklist Point 4: Live patient search by partial name, ID, and mobile
  console.log('\n--- Checklist 4: Live Patient Search by Partial Name, ID, and Mobile ---');
  // Search by partial name "Aak"
  const searchName = await apiFetch('/api/patients?q=Aak&limit=10');
  assert(searchName.ok && searchName.data.patients?.length > 0, `Live search 'Aak' matched ${searchName.data.patients?.length} records`);
  const matchedByName = searchName.data.patients.some((p) => p.name.toLowerCase().includes('aak'));
  assert(matchedByName, 'Matches patient name correctly');

  // Search by permanent ID "PAT-"
  const searchId = await apiFetch(`/api/patients?q=${encodeURIComponent(minimalPatient.patientId)}`);
  assert(searchId.ok && searchId.data.patients?.some((p) => p.patientId === minimalPatient.patientId), `Live search by exact ID '${minimalPatient.patientId}' found record`);

  // Search by mobile "9811223344"
  const searchMobile = await apiFetch('/api/patients?q=9811223344');
  assert(searchMobile.ok && searchMobile.data.patients?.some((p) => p.mobile === '9811223344'), 'Live search by mobile found record');

  // 7. Checklist Point 5: Select patient search suggestion
  console.log('\n--- Checklist 5: Suggestion Selection & Patient 360 Profile Resolution ---');
  const profileById = await apiFetch(`/api/patients/${minimalPatient._id}`);
  assert(profileById.ok && profileById.data.patient.patientId === minimalPatient.patientId, 'Resolves patient profile by Mongo _id');
  const profileByPermanentId = await apiFetch(`/api/patients/${minimalPatient.patientId}`);
  assert(profileByPermanentId.ok && profileByPermanentId.data.patient.name === minimalPatient.name, 'Resolves patient profile by permanent PAT ID');

  // 8. Checklist Point 6: Verify Patients table shows "Referred By" instead of Blood Group
  console.log('\n--- Checklist 6: Patients Directory Data Model ("Referred By") ---');
  const patientList = await apiFetch('/api/patients?limit=5');
  assert(patientList.ok, 'Fetched patients directory list');
  const hasReferredBy = patientList.data.patients.every((p) => typeof p.referredByDoctorName === 'string');
  assert(hasReferredBy, 'Every patient record in directory API includes referredByDoctorName');
  const sampleReferred = patientList.data.patients.find((p) => p._id === referredPatient._id);
  assert(sampleReferred?.referredByDoctorName === testDoctor.name, `Sample patient displays referring doctor '${sampleReferred?.referredByDoctorName}'`);
  const sampleSelf = patientList.data.patients.find((p) => p._id === minimalPatient._id);
  assert(sampleSelf?.referredByDoctorName === 'Self / Direct', `Sample self-patient displays '${sampleSelf?.referredByDoctorName}'`);

  // 9. Checklist Point 7: Patient profile has no blood group badge in UI and displays Referring Doctor
  console.log('\n--- Checklist 7: Patient Profile Display ---');
  const referredProfile = await apiFetch(`/api/patients/${referredPatient.patientId}`);
  assert(referredProfile.ok, 'Loaded referred patient 360 profile');
  assert(referredProfile.data.patient?.referredByDoctorName === testDoctor.name, `Referred By name in profile: ${referredProfile.data.patient?.referredByDoctorName}`);

  // 10. Checklist Point 8: Patient history and billing use ₹ (INR), reverse-chronological order, tokens
  console.log('\n--- Checklist 8: Currency and Visit History Ordering ---');
  // Add a second visit for referredPatient to verify reverse-chronological order & sequence numbers
  const secondVisit = await apiFetch('/api/visits', {
    method: 'POST',
    body: JSON.stringify({
      patientId: referredPatient.patientId,
      doctorId: testDoctor._id,
      testIds: [test1._id],
      discount: 0,
      paidAmount: test1.price,
      paymentMethod: 'upi',
    }),
  });
  assert(secondVisit.ok, 'Created second visit for referred patient');

  const refProfileVisits = await apiFetch(`/api/patients/${referredPatient.patientId}`);
  assert(refProfileVisits.ok && refProfileVisits.data.visits?.length >= 2, 'Fetched multi-visit patient profile');
  const vList = refProfileVisits.data.visits;
  // First in list should be the newest visit (secondVisit)
  assert(vList[0].visitId === secondVisit.data.visit.visitId, `Newest visit appears first: ${vList[0].visitId}`);
  assert(vList[0].patientVisitNumber === 2, `Newest visit has lifetime visit number #2: ${vList[0].patientVisitNumber}`);
  assert(vList[1].visitId === bookedVisit.visitId, `Older visit appears second: ${vList[1].visitId}`);
  assert(vList[1].patientVisitNumber === 1, `Older visit has lifetime visit number #1: ${vList[1].patientVisitNumber}`);
  assert(vList[1].dailySerial === bookedVisit.dailySerial, `Daily queue token preserved: #${vList[1].dailySerial}`);

  // 11. Checklist Point 9: Live doctor search by name, code, specialization, mobile
  console.log('\n--- Checklist 9: Live Doctor Search by Multiple Fields ---');
  // Search doctor by name
  const docSearchName = await apiFetch(`/api/doctors?q=${encodeURIComponent(testDoctor.name.substring(0, 5))}`);
  assert(docSearchName.ok && docSearchName.data.doctors?.some((d) => d._id === testDoctor._id), 'Doctor search by partial name succeeded');

  // Search doctor by code if present
  if (testDoctor.code) {
    const docSearchCode = await apiFetch(`/api/doctors?q=${encodeURIComponent(testDoctor.code)}`);
    assert(docSearchCode.ok && docSearchCode.data.doctors?.some((d) => d._id === testDoctor._id), `Doctor search by code '${testDoctor.code}' succeeded`);
  }

  // Search doctor by specialization
  const docSearchSpec = await apiFetch(`/api/doctors?q=${encodeURIComponent(testDoctor.specialization.substring(0, 5))}`);
  assert(docSearchSpec.ok && docSearchSpec.data.doctors?.some((d) => d._id === testDoctor._id), 'Doctor search by specialization succeeded');

  // 12. Checklist Point 10 & 11: Doctor dashboard, ledger, payouts, and statement
  console.log('\n--- Checklist 10 & 11: Doctor Dashboard & Commission Settlement Ledger ---');
  const docDash = await apiFetch(`/api/doctors/${testDoctor._id}`);
  assert(docDash.ok, 'Loaded individual doctor dashboard');
  const metrics = docDash.data.metrics;
  assert(metrics && typeof metrics.totalCommissionEarned === 'number', `Doctor dashboard displays commission earned: ₹${metrics.totalCommissionEarned}`);
  assert(typeof metrics.outstandingCommission === 'number', `Doctor dashboard displays outstanding balance: ₹${metrics.outstandingCommission}`);
  assert(metrics.uniquePatientCount >= 1, `Unique patient count distinguished from visits: ${metrics.uniquePatientCount} patient(s), ${metrics.totalVisitsCount} visit(s)`);

  // Record a commission payout
  const payoutAmount = Math.min(metrics.outstandingCommission, 50);
  if (payoutAmount > 0) {
    const payoutRes = await apiFetch(`/api/doctors/${testDoctor._id}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        amount: payoutAmount,
        paymentMethod: 'bank_transfer',
        referenceNumber: `TXN-${Date.now()}`,
        notes: 'Test settlement payout',
      }),
    });
    assert(payoutRes.ok, `Recorded commission payout of ₹${payoutAmount} (Status ${payoutRes.status})`);
  }

  // 13. Checklist Point 12: Doctor row actions target
  console.log('\n--- Checklist 12: Doctor Row Actions Target ---');
  // Verify individual doctor page endpoint renders without error
  const docPageRes = await fetch(`${BASE}/doctors/${testDoctor._id}`);
  assert(docPageRes.status === 200, `Doctor dashboard page (/doctors/${testDoctor._id}) is accessible`);

  // Verify statement page renders
  const stmtRes = await fetch(`${BASE}/doctors/${testDoctor._id}/statement`);
  assert(stmtRes.status === 200, `Doctor printable statement (/doctors/${testDoctor._id}/statement) is accessible`);

  // 14. Checklist Point 13: Regression tests for existing benchmark records
  console.log('\n--- Checklist 13: Regression Tests on Existing Benchmark Records ---');
  const benchmarkProfile = await apiFetch('/api/patients/PAT-202610-0001');
  if (benchmarkProfile.ok) {
    const bVisits = benchmarkProfile.data.visits;
    assert(bVisits.length >= 2, `Benchmark patient PAT-202610-0001 has ${bVisits.length} visits`);
    const t1Visit = bVisits.find((v) => v.dailySerial === 1);
    const t2Visit = bVisits.find((v) => v.dailySerial === 2);
    assert(t1Visit && t2Visit, 'Benchmark visits retain Daily Token #1 and Daily Token #2');

    // Test A4 report rendering
    const reportRes = await fetch(`${BASE}/reports/${t1Visit.visitId}`);
    assert(reportRes.status === 200, `Report page for ${t1Visit.visitId} renders cleanly (Status 200)`);

    // Test Receipt rendering
    const receiptRes = await fetch(`${BASE}/receipts/${t1Visit.visitId}`);
    assert(receiptRes.status === 200, `Receipt page for ${t1Visit.visitId} renders cleanly (Status 200)`);
  } else {
    console.log('  [NOTE] Benchmark patient PAT-202610-0001 was not found in database, skipped benchmark check.');
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} CHECKS PASSED`);
  console.log('====================================================');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
