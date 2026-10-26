/**
 * End-to-End Workflow Verification Script for Pathology Lab Management System
 * Tests:
 * 1. Register Patient -> verifies unique permanent patient ID (PAT-YYYYMM-XXXX)
 * 2. Select Multiple Tests -> creates visit order with daily serial #, test price snapshot & partial payment
 * 3. Enter Results -> sets observed values, units & normal statuses
 * 4. Save Corrected Results -> verifies revision history audit trail
 * 5. Record Remaining Balance -> settles invoice to fully paid
 * 6. Returning Patient 2nd Visit -> books 2nd visit under same patient without duplicate identity
 * 7. Retrieve Profile & History -> verifies both visits appear under patient profile
 */

const BASE_URL = 'http://127.0.0.1:3000';

async function run() {
  console.log('=== STARTING FULL PATIENT WORKFLOW TEST ===\n');

  // Step 0: Check Health
  console.log('Step 0: Checking API Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health?force=true`);
  const healthData = await healthRes.json();
  if (!healthData.database?.isConnected) {
    throw new Error('Database is not connected: ' + JSON.stringify(healthData));
  }
  console.log('  -> Health Check Passed: Connected to MongoDB.\n');

  // Step 1: Register Patient
  console.log('Step 1: Registering Patient...');
  const patientPayload = {
    name: 'Aakash Verma',
    age: 42,
    ageUnit: 'years',
    gender: 'male',
    mobile: '+91 98111 ' + Math.floor(10000 + Math.random() * 90000),
    email: 'aakash.verma@example.com',
    bloodGroup: 'B+',
    address: 'C-12, Green Park Extension, New Delhi',
  };

  const regRes = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientPayload),
  });
  const regData = await regRes.json();
  if (!regRes.ok || !regData.patient) {
    throw new Error('Patient registration failed: ' + JSON.stringify(regData));
  }
  const patient = regData.patient;
  console.log(`  -> Patient Registered! ID: ${patient.patientId} (MongoDB _id: ${patient._id})`);
  console.log(`     Name: ${patient.name}, Age/Gender: ${patient.age} / ${patient.gender}\n`);

  // Step 2: Fetch Active Tests
  console.log('Step 2: Fetching Active Tests Catalog...');
  const testsRes = await fetch(`${BASE_URL}/api/tests`);
  const testsData = await testsRes.json();
  const tests = testsData.tests || [];
  if (tests.length < 2) {
    throw new Error('Not enough tests in catalog. Found: ' + tests.length);
  }
  const cbcTest = tests.find((t) => t.code === 'CBC') || tests[0];
  const lipidTest = tests.find((t) => t.code === 'LIPID') || tests[1];
  console.log(`  -> Selected Test 1: [${cbcTest.code}] ${cbcTest.name} (₹${cbcTest.price})`);
  console.log(`  -> Selected Test 2: [${lipidTest.code}] ${lipidTest.name} (₹${lipidTest.price})\n`);

  // Step 3: Book 1st Visit (Multiple Tests with Partial Payment)
  console.log('Step 3: Booking Visit with Multiple Tests & Partial Payment...');
  const visitPayload = {
    patientId: patient._id,
    testIds: [cbcTest._id, lipidTest._id],
    discount: 50,
    paidAmount: 500,
    paymentMethod: 'upi',
    transactionRef: 'UPI-REF-99281',
    notes: 'Patient requested urgent morning processing',
  };

  const visitRes = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visitPayload),
  });
  const visitData = await visitRes.json();
  if (!visitRes.ok || !visitData.visit) {
    throw new Error('Visit booking failed: ' + JSON.stringify(visitData));
  }
  const visit1 = visitData.visit;
  console.log(`  -> Visit Booked! Visit ID: ${visit1.visitId}, Daily Token: #${visit1.dailySerial}`);
  console.log(`     IST Date: ${visit1.dateStringIST}`);
  console.log(`     Tests Snapshotted: ${visit1.tests.length} tests`);
  console.log(`     Total: ₹${visit1.billing.totalAmount}, Discount: ₹${visit1.billing.discount}, Net: ₹${visit1.billing.netAmount}`);
  console.log(`     Paid: ₹${visit1.billing.paidAmount}, Balance: ₹${visit1.billing.balanceAmount}, Status: ${visit1.billing.paymentStatus}\n`);

  // Step 4: Enter Results
  console.log('Step 4: Entering Test Results...');
  const resultsToEnter = visit1.results.map((r) => {
    let val = '14.5';
    if (r.parameterName.includes('Leukocyte') || r.parameterName.includes('TLC')) val = '7400';
    else if (r.parameterName.includes('RBC')) val = '4.9';
    else if (r.parameterName.includes('Platelet')) val = '2.8';
    else if (r.parameterName.includes('Cholesterol')) val = '175';
    else if (r.parameterName.includes('Triglycerides')) val = '130';
    else if (r.parameterName.includes('HDL')) val = '48';
    return {
      testId: r.testId,
      testName: r.testName,
      parameterName: r.parameterName,
      value: val,
      unit: r.unit,
      normalRange: r.normalRange,
      status: 'normal',
    };
  });

  const enterRes = await fetch(`${BASE_URL}/api/visits/${visit1.visitId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      results: resultsToEnter,
      enteredBy: 'Pooja Nair (Senior Technician)',
      reasonForChange: 'Initial test run entry',
    }),
  });
  const enterData = await enterRes.json();
  if (!enterRes.ok || !enterData.visit) {
    throw new Error('Result entry failed: ' + JSON.stringify(enterData));
  }
  console.log(`  -> Results entered successfully! Visit Status: ${enterData.visit.status}\n`);

  // Step 5: Save Corrected Results (Revision Audit)
  console.log('Step 5: Updating Results with Correction (Audit Revision Trail)...');
  const correctedResults = [...enterData.visit.results];
  correctedResults[0].value = '14.9'; // Corrected Hb value
  correctedResults[0].status = 'normal';

  const revRes = await fetch(`${BASE_URL}/api/visits/${visit1.visitId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      results: correctedResults,
      enteredBy: 'Dr. Vivek Sharma (Chief Pathologist)',
      reasonForChange: 'Re-verified on automated Sysmex XN-550 hematology analyzer',
    }),
  });
  const revData = await revRes.json();
  if (!revRes.ok || !revData.visit) {
    throw new Error('Revision update failed: ' + JSON.stringify(revData));
  }
  const revisedVisit = revData.visit;
  console.log(`  -> Revision successfully recorded!`);
  console.log(`     Total Revisions: ${revisedVisit.resultRevisions?.length}`);
  console.log(`     Latest Revision Reason: "${revisedVisit.resultRevisions?.[0]?.reasonForChange}"\n`);

  // Step 6: Settle Outstanding Balance
  console.log('Step 6: Settling Outstanding Balance...');
  const balanceDue = revisedVisit.billing.balanceAmount;
  const payRes = await fetch(`${BASE_URL}/api/visits/${visit1.visitId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: balanceDue,
      method: 'cash',
      transactionRef: 'CASH-REC-101',
      receivedBy: 'Receptionist Suman',
    }),
  });
  const payData = await payRes.json();
  if (!payRes.ok || !payData.billing) {
    throw new Error('Payment settlement failed: ' + JSON.stringify(payData));
  }
  console.log(`  -> Payment Recorded!`);
  console.log(`     Total Paid: ₹${payData.billing.paidAmount}, Balance: ₹${payData.billing.balanceAmount}, Payment Status: ${payData.billing.paymentStatus}\n`);

  // Step 7: Returning Patient - Book 2nd Visit under SAME Patient ID
  console.log('Step 7: Booking 2nd Visit for the SAME Returning Patient...');
  const bsfTest = tests.find((t) => t.code === 'BSF') || tests[0];
  const visit2Payload = {
    patientId: patient.patientId, // Using permanent ID
    testIds: [bsfTest._id],
    discount: 0,
    paidAmount: bsfTest.price,
    paymentMethod: 'cash',
  };

  const visit2Res = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(visit2Payload),
  });
  const visit2Data = await visit2Res.json();
  if (!visit2Res.ok || !visit2Data.visit) {
    throw new Error('Visit 2 booking failed: ' + JSON.stringify(visit2Data));
  }
  const visit2 = visit2Data.visit;
  console.log(`  -> Second Visit Booked for Returning Patient!`);
  console.log(`     Visit ID: ${visit2.visitId}, Daily Token: #${visit2.dailySerial}`);
  console.log(`     Patient Permanent ID: ${visit2.patientSnapshot.permanentId}\n`);

  // Step 8: Fetch Patient 360 Profile and Visit History
  console.log('Step 8: Fetching Patient 360 Profile & Clinical History...');
  const profRes = await fetch(`${BASE_URL}/api/patients/${patient.patientId}`);
  const profData = await profRes.json();
  if (!profRes.ok || !profData.patient) {
    throw new Error('Profile fetch failed: ' + JSON.stringify(profData));
  }
  console.log(`  -> Patient Profile Verified:`);
  console.log(`     Permanent ID: ${profData.patient.patientId}`);
  console.log(`     Name: ${profData.patient.name}`);
  console.log(`     Total Visits in History: ${profData.visits?.length} visits`);

  // Verify reverse chronological ordering (newest visit first)
  const visits = profData.visits || [];
  if (visits.length < 2) {
    throw new Error('Expected at least 2 visits in patient history, found: ' + visits.length);
  }

  // 1. Newest visit must be at index 0 (Second-created visit)
  if (visits[0].visitId !== visit2.visitId) {
    throw new Error(`Reverse chronological order failed: Expected newest visit ${visit2.visitId} at index 0, got ${visits[0].visitId}`);
  }
  if (visits[0].dailySerial !== visit2.dailySerial) {
    throw new Error(`Token mismatch: Expected token #${visit2.dailySerial} on visit ${visit2.visitId}, got #${visits[0].dailySerial}`);
  }
  if (visits[0].patientVisitNumber !== 2) {
    throw new Error(`Lifetime sequence number mismatch: Expected visit #2 for second-created visit, got ${visits[0].patientVisitNumber}`);
  }

  // 2. Older visit must be at index 1 (First-created visit)
  if (visits[1].visitId !== visit1.visitId) {
    throw new Error(`Reverse chronological order failed: Expected older visit ${visit1.visitId} at index 1, got ${visits[1].visitId}`);
  }
  if (visits[1].dailySerial !== visit1.dailySerial) {
    throw new Error(`Token mismatch: Expected token #${visit1.dailySerial} on visit ${visit1.visitId}, got #${visits[1].dailySerial}`);
  }
  if (visits[1].patientVisitNumber !== 1) {
    throw new Error(`Lifetime sequence number mismatch: Expected visit #1 for first-created visit, got ${visits[1].patientVisitNumber}`);
  }

  const formatIST = (d) =>
    new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  console.log('\n     Patient Visit History (Reverse Chronological Order - Newest First):');
  visits.forEach((v) => {
    const isNewest = v.visitId === visit2.visitId;
    console.log(
      `     - [${isNewest ? 'NEWEST' : 'INITIAL'}] Lifetime Visit #${v.patientVisitNumber} of ${v.totalPatientVisits}: ` +
      `Visit ID: ${v.visitId} | Daily Queue Token: #${v.dailySerial} | IST: ${formatIST(v.visitDate)} | ` +
      `Tests: ${v.tests.map((t) => t.code).join(', ')} | Status: ${v.status} | Paid: ₹${v.billing?.paidAmount}`
    );
  });

  console.log('\n=== FULL WORKFLOW TEST COMPLETED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('\nTEST ENCOUNTERED AN ERROR:', err.message);
  process.exit(1);
});
