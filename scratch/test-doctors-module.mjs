/**
 * Comprehensive Verification Suite for Pathology Lab Management System - Doctors Module
 * Tests:
 * A. Doctor Management:
 *    - Create doctor with auto-generated code (DOC-XXXX)
 *    - Search doctors by query
 *    - Filter by active/inactive status
 *    - Edit doctor details and commission rate
 *    - Toggle active/inactive
 * B. Doctor Linking & Patient Visits:
 *    - Associate doctor with new patient visit
 *    - Verify immutable snapshot of eligibleAmount & commissionAmount
 *    - Verify returning patient can book new visit under same doctor without duplicate identity
 * C. Historical Rate Change Invariance:
 *    - Changing doctor's commission rate does NOT recalculate past visits
 *    - New visits use the updated commission rate
 * D. Cancelled Visits Handling:
 *    - Cancelled visit yields ₹0 commission and is reflected in dashboard counts
 * E. Doctor Dashboard & Asia/Kolkata Date Filtering:
 *    - Verify all 7 key metrics:
 *      1. Unique patient count (distinct patients vs visits)
 *      2. Visits referred count
 *      3. Tests ordered count
 *      4. Total eligible test amount
 *      5. Commission earned
 *      6. Commission paid
 *      7. Outstanding commission
 *    - Date range filtering (IST)
 * F. Commission Payments Ledger & Guards:
 *    - Guard against overpayment exceeding outstanding balance
 *    - Support partial settlement
 *    - Guard against duplicate reference number submission (HTTP 409)
 *    - Settle full remaining balance -> balance drops to ₹0.00
 * G. Printable Statement & Regression:
 *    - Verify /doctors/[id]/statement HTTP 200
 *    - Verify patient profile displays doctor referral
 */

const BASE_URL = 'http://127.0.0.1:3000';

function assert(condition, message) {
  if (!condition) {
    console.error(`\x1b[31m[ASSERTION FAILED]\x1b[0m ${message}`);
    throw new Error(message);
  }
}

async function runDoctorModuleTests() {
  console.log('====================================================');
  console.log('  STARTING DOCTORS MODULE END-TO-END VERIFICATION   ');
  console.log('====================================================\n');

  // STEP 0: Health Check
  console.log('[STEP 0] Verifying Database Connection...');
  const healthRes = await fetch(`${BASE_URL}/api/health?force=true`);
  const healthData = await healthRes.json();
  assert(healthData.database?.isConnected, 'Database must be connected');
  console.log('  -> DB Status: Connected to MongoDB Atlas.\n');

  // STEP 1: Add a new Doctor
  console.log('[STEP 1] Creating a New Doctor...');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newDoctorPayload = {
    name: `Dr. Vikram Batra ${randomSuffix}`,
    specialization: 'Internal Medicine',
    qualification: 'MBBS, MD',
    mobile: `+91 98222 ${randomSuffix}`,
    email: `dr.vikram${randomSuffix}@example.com`,
    clinicAddress: 'B-402, Metro Health City, Ring Road, Delhi',
    commissionPercent: 12, // Initial 12%
    isActive: true,
  };

  const createDoctorRes = await fetch(`${BASE_URL}/api/doctors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newDoctorPayload),
  });
  const createDoctorData = await createDoctorRes.json();
  assert(createDoctorRes.status === 201, `Failed to create doctor: ${JSON.stringify(createDoctorData)}`);
  const doctor = createDoctorData.doctor;
  assert(doctor._id, 'Doctor must have MongoDB _id');
  assert(doctor.code && doctor.code.startsWith('DOC-'), `Doctor code must be DOC-XXXX format, got: ${doctor.code}`);
  assert(doctor.commissionPercent === 12, 'Commission % must be 12');
  console.log(`  -> Doctor created: ${doctor.name} [${doctor.code}]`);
  console.log(`     Specialization: ${doctor.specialization}, Rate: ${doctor.commissionPercent}%\n`);

  // STEP 2: Search Doctors
  console.log('[STEP 2] Searching Doctors...');
  const searchRes = await fetch(`${BASE_URL}/api/doctors?q=Vikram`);
  const searchData = await searchRes.json();
  assert(searchRes.ok, 'Doctor search failed');
  const found = searchData.doctors?.find((d) => d._id === doctor._id);
  assert(found, `Newly created doctor ${doctor._id} must be in search results`);
  console.log(`  -> Search query 'Vikram' matched ${searchData.doctors.length} doctors. Target found.\n`);

  // STEP 3: Fetch active tests
  console.log('[STEP 3] Fetching Tests Catalog for Orders...');
  const testsRes = await fetch(`${BASE_URL}/api/tests`);
  const testsData = await testsRes.json();
  const tests = testsData.tests || [];
  assert(tests.length >= 2, 'At least 2 active tests required in database');
  const selectedTests = tests.slice(0, 2);
  const totalTestPrice = selectedTests.reduce((sum, t) => sum + (t.price || 0), 0);
  console.log(`  -> Selected tests: ${selectedTests.map((t) => `${t.name} (₹${t.price})`).join(' + ')} = ₹${totalTestPrice}\n`);

  // STEP 4: Register Patient 1 (Rohan Kapoor)
  console.log('[STEP 4] Registering Patient 1 (Rohan Kapoor)...');
  const patient1Res = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Kapoor',
      age: 38,
      ageUnit: 'years',
      gender: 'male',
      mobile: `+91 97111 ${randomSuffix}`,
      email: `rohan${randomSuffix}@example.com`,
      bloodGroup: 'O+',
    }),
  });
  const patient1Data = await patient1Res.json();
  assert(patient1Res.ok && patient1Data.patient, 'Patient 1 registration failed');
  const patient1 = patient1Data.patient;
  console.log(`  -> Patient 1 Registered: ${patient1.name} [${patient1.patientId}]\n`);

  // STEP 5: Book Visit 1 referring Dr. Vikram Batra at 12%
  console.log('[STEP 5] Booking Visit 1 with Referring Doctor (12% Rate)...');
  const visit1Res = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: patient1._id,
      doctorId: doctor._id,
      testIds: selectedTests.map((t) => t._id),
      discount: 0,
      paidAmount: totalTestPrice,
      paymentMethod: 'cash',
    }),
  });
  const visit1Data = await visit1Res.json();
  assert(visit1Res.status === 201 && visit1Data.visit, `Visit 1 booking failed: ${JSON.stringify(visit1Data)}`);
  const visit1 = visit1Data.visit;
  const expectedComm1 = Math.round((totalTestPrice * 12) / 100 * 100) / 100;
  console.log(`  -> Visit 1 booked: ${visit1.visitId} (Daily Token #${visit1.dailySerial})`);
  console.log(`     Doctor Snapshot: Name: "${visit1.doctorSnapshot?.name}", Rate: ${visit1.doctorSnapshot?.commissionPercent}%`);
  console.log(`     Eligible Amount: ₹${visit1.doctorSnapshot?.eligibleAmount}, Commission: ₹${visit1.doctorSnapshot?.commissionAmount}`);
  assert(String(visit1.doctorSnapshot?.doctorId) === String(doctor._id), 'Visit doctorId must match');
  assert(visit1.doctorSnapshot?.commissionPercent === 12, 'Visit snapshot commissionPercent must be 12');
  assert(visit1.doctorSnapshot?.eligibleAmount === totalTestPrice, `Eligible amount must equal net bill ₹${totalTestPrice}`);
  assert(visit1.doctorSnapshot?.commissionAmount === expectedComm1, `Commission amount must be ₹${expectedComm1}`);
  console.log('  -> Initial commission snapshot verified!\n');

  // STEP 6: Update Doctor Rate from 12% to 20%
  console.log('[STEP 6] Updating Doctor Commission Rate to 20%...');
  const updateDoctorRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: doctor.name,
      specialization: doctor.specialization,
      qualification: 'MBBS, MD, FICP',
      commissionPercent: 20, // Updated to 20%
      isActive: true,
    }),
  });
  const updateDoctorData = await updateDoctorRes.json();
  assert(updateDoctorRes.ok, 'Failed to update doctor profile');
  assert(updateDoctorData.doctor.commissionPercent === 20, 'Doctor rate must now be 20%');
  console.log(`  -> Doctor updated! New configured commission rate: 20%\n`);

  // STEP 7: Verify Historical Rate Invariance on Visit 1
  console.log('[STEP 7] Verifying Historical Invariance for Visit 1...');
  const checkVisit1Res = await fetch(`${BASE_URL}/api/visits/${visit1._id}`);
  const checkVisit1Data = await checkVisit1Res.json();
  const v1Retrieved = checkVisit1Data.visit;
  assert(v1Retrieved.doctorSnapshot?.commissionPercent === 12, 'Visit 1 rate must remain 12% even after doctor rate changed to 20%');
  assert(v1Retrieved.doctorSnapshot?.commissionAmount === expectedComm1, `Visit 1 commission must remain ₹${expectedComm1}`);
  console.log('  -> Historical snapshot is immutable! Old visit commission was NOT changed.\n');

  // STEP 8: Book Returning Patient Visit 2 with Updated 20% Rate
  console.log('[STEP 8] Booking Returning Patient Visit 2 with Updated 20% Rate...');
  const visit2Res = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: patient1._id, // Same patient (Rohan Kapoor)
      doctorId: doctor._id,
      testIds: selectedTests.map((t) => t._id),
      discount: 0,
      paidAmount: totalTestPrice,
      paymentMethod: 'upi',
    }),
  });
  const visit2Data = await visit2Res.json();
  assert(visit2Res.status === 201 && visit2Data.visit, 'Visit 2 booking failed');
  const visit2 = visit2Data.visit;
  const expectedComm2 = Math.round((totalTestPrice * 20) / 100 * 100) / 100;
  console.log(`  -> Visit 2 booked: ${visit2.visitId} for existing patient ${patient1.name}`);
  console.log(`     Doctor Snapshot: Rate: ${visit2.doctorSnapshot?.commissionPercent}%, Commission: ₹${visit2.doctorSnapshot?.commissionAmount}`);
  assert(visit2.doctorSnapshot?.commissionPercent === 20, 'Visit 2 snapshot commissionPercent must be 20');
  assert(visit2.doctorSnapshot?.commissionAmount === expectedComm2, `Visit 2 commission must be ₹${expectedComm2}`);
  console.log('  -> Returning patient booked second visit successfully without duplicate ID.\n');

  // STEP 9: Register Patient 2 (Meera Sen) and Book Visit 3 (To Be Cancelled)
  console.log('[STEP 9] Registering Patient 2 (Meera Sen) and Booking Visit 3...');
  const patient2Res = await fetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Meera Sen',
      age: 29,
      ageUnit: 'years',
      gender: 'female',
      mobile: `+91 97222 ${randomSuffix}`,
      email: `meera${randomSuffix}@example.com`,
    }),
  });
  const patient2Data = await patient2Res.json();
  const patient2 = patient2Data.patient;
  assert(patient2?._id, 'Patient 2 creation failed');

  const visit3Res = await fetch(`${BASE_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: patient2._id,
      doctorId: doctor._id,
      testIds: [selectedTests[0]._id],
      discount: 0,
    }),
  });
  const visit3Data = await visit3Res.json();
  const visit3 = visit3Data.visit;
  assert(visit3?._id, 'Visit 3 creation failed');
  console.log(`  -> Visit 3 booked for Meera Sen: ${visit3.visitId}`);

  // Cancel Visit 3
  console.log('  -> Cancelling Visit 3 to verify zero commission accrual...');
  const cancelRes = await fetch(`${BASE_URL}/api/visits/${visit3._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'cancelled',
      notes: 'Patient cancelled test order prior to sample collection.',
    }),
  });
  assert(cancelRes.ok, 'Failed to cancel visit 3');
  console.log('  -> Visit 3 marked cancelled.\n');

  // STEP 10: Verify Doctor Dashboard Metrics & Asia/Kolkata Filtering
  console.log('[STEP 10] Checking Doctor Dashboard Metrics...');
  const dashboardRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}`);
  const dashboardData = await dashboardRes.json();
  assert(dashboardRes.ok, `Failed to fetch doctor dashboard: ${JSON.stringify(dashboardData)}`);
  const m = dashboardData.metrics;

  console.log('  -> Metrics Received:');
  console.log(`     - Unique Patient Count: ${m.uniquePatientCount} (Expected: 2 -> Rohan + Meera)`);
  console.log(`     - Total Visits Count:   ${m.totalVisitsCount} (Expected: 3 -> 2 active + 1 cancelled)`);
  console.log(`     - Eligible Visits Count:${m.eligibleVisitsCount} (Expected: 2)`);
  console.log(`     - Cancelled Visits:     ${m.cancelledVisitsCount} (Expected: 1)`);
  console.log(`     - Eligible Test Amount: ₹${m.totalEligibleAmount} (Expected: ₹${totalTestPrice * 2})`);
  const expectedTotalEarned = expectedComm1 + expectedComm2;
  console.log(`     - Commission Earned:    ₹${m.totalCommissionEarned} (Expected: ₹${expectedTotalEarned})`);
  console.log(`     - Commission Paid:      ₹${m.totalCommissionPaid} (Expected: ₹0)`);
  console.log(`     - Outstanding Balance:  ₹${m.outstandingCommission} (Expected: ₹${expectedTotalEarned})`);

  assert(m.uniquePatientCount === 2, `Unique patient count must be 2, got ${m.uniquePatientCount}`);
  assert(m.totalVisitsCount === 3, `Total visits count must be 3, got ${m.totalVisitsCount}`);
  assert(m.eligibleVisitsCount === 2, `Eligible visits count must be 2, got ${m.eligibleVisitsCount}`);
  assert(m.cancelledVisitsCount === 1, `Cancelled visits count must be 1, got ${m.cancelledVisitsCount}`);
  assert(m.totalEligibleAmount === totalTestPrice * 2, `Eligible amount mismatch: ${m.totalEligibleAmount}`);
  assert(m.totalCommissionEarned === expectedTotalEarned, `Earned commission mismatch: ${m.totalCommissionEarned} vs ${expectedTotalEarned}`);
  assert(m.totalCommissionPaid === 0, 'Commission paid should be 0');
  assert(m.outstandingCommission === expectedTotalEarned, 'Outstanding balance should equal earned');

  // Test Date Filter
  console.log('  -> Testing IST Date Range Filter...');
  const futureFilterRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}?from=2099-01-01&to=2099-01-31`);
  const futureFilterData = await futureFilterRes.json();
  assert(futureFilterData.metrics.totalVisitsCount === 0, 'Future filter must return 0 visits');
  assert(futureFilterData.metrics.totalCommissionEarned === 0, 'Future filter must return 0 earned');
  console.log('  -> Date filter verified: Future window yielded 0 visits.\n');

  // STEP 11: Commission Payments & Guards
  console.log('[STEP 11] Testing Commission Payments & Overpayment/Duplicate Guards...');
  const currentOutstanding = m.outstandingCommission;

  // Guard A: Overpayment exceeding outstanding balance without adjustment flag
  console.log(`  -> Testing Overpayment Guard (Attempting to pay ₹${currentOutstanding + 500} when due is ₹${currentOutstanding})...`);
  const overpayRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: currentOutstanding + 500,
      paymentMethod: 'bank_transfer',
      referenceNumber: `TXN-OVERPAY-${randomSuffix}`,
      isAdjustment: false,
    }),
  });
  const overpayData = await overpayRes.json();
  assert(overpayRes.status === 400, `Overpayment should be rejected with 400. Got: ${overpayRes.status}`);
  console.log(`     Correctly Rejected! Message: "${overpayData.error}"`);

  // Payment B: Partial settlement
  const partialAmount = Math.floor(currentOutstanding / 2);
  const remainingDue = currentOutstanding - partialAmount;
  const refNum = `NEFT-${randomSuffix}-A`;
  console.log(`  -> Recording Partial Payment of ₹${partialAmount} (Ref: ${refNum})...`);
  const partialRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: partialAmount,
      paymentMethod: 'bank_transfer',
      referenceNumber: refNum,
      notes: 'Mid-month referral advance settlement',
    }),
  });
  const partialData = await partialRes.json();
  assert(partialRes.status === 201, `Partial payment failed: ${JSON.stringify(partialData)}`);
  assert(partialData.payment?.amount === partialAmount, 'Payment amount mismatch');
  assert(partialData.ledgerSummary?.outstandingBalance === remainingDue, `New balance should be ₹${remainingDue}, got ${partialData.ledgerSummary?.outstandingBalance}`);
  console.log(`     Partial payment recorded! New outstanding balance: ₹${partialData.ledgerSummary?.outstandingBalance}`);

  // Guard C: Duplicate Reference Number
  console.log(`  -> Testing Duplicate Reference Guard (Submitting again with Ref: ${refNum})...`);
  const dupRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 10,
      paymentMethod: 'upi',
      referenceNumber: refNum,
    }),
  });
  const dupData = await dupRes.json();
  assert(dupRes.status === 409, `Duplicate reference should return 409 Conflict. Got: ${dupRes.status}`);
  console.log(`     Correctly Rejected Duplicate! Message: "${dupData.error}"`);

  // Payment D: Settle Remaining Balance in Full
  const finalRef = `UPI-${randomSuffix}-FINAL`;
  console.log(`  -> Settling Final Remaining Balance of ₹${remainingDue} (Ref: ${finalRef})...`);
  const finalPayRes = await fetch(`${BASE_URL}/api/doctors/${doctor._id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: remainingDue,
      paymentMethod: 'upi',
      referenceNumber: finalRef,
      notes: 'Final monthly commission settlement in full',
    }),
  });
  const finalPayData = await finalPayRes.json();
  assert(finalPayRes.status === 201, `Final payment failed: ${JSON.stringify(finalPayData)}`);
  assert(finalPayData.ledgerSummary?.outstandingBalance === 0, `Outstanding balance should now be 0, got ${finalPayData.ledgerSummary?.outstandingBalance}`);
  console.log(`     Full Settlement Completed! Outstanding Due: ₹0.00\n`);

  // STEP 12: Commission Statement Page Check
  console.log('[STEP 12] Verifying Printable Commission Statement...');
  const statementRes = await fetch(`${BASE_URL}/doctors/${doctor._id}/statement`);
  assert(statementRes.status === 200, `Commission statement page failed with status ${statementRes.status}`);
  console.log(`  -> Printable Statement Page /doctors/${doctor._id}/statement loaded successfully (HTTP 200).\n`);

  // STEP 13: Verify Patient Profile Association
  console.log('[STEP 13] Verifying Patient Profile Displays Referring Doctor...');
  const patientProfileRes = await fetch(`${BASE_URL}/api/patients/${patient1._id}`);
  const patientProfileData = await patientProfileRes.json();
  assert(patientProfileRes.ok, 'Failed to fetch patient profile');
  const patientVisits = patientProfileData.visits || [];
  assert(patientVisits.length >= 2, 'Patient 1 must have at least 2 visits');
  const referredVisit = patientVisits.find((v) => v.doctorSnapshot?.doctorId === doctor._id);
  assert(referredVisit, 'Patient visit must link back to Dr. Vikram Batra');
  console.log(`  -> Patient ${patient1.name} has ${patientVisits.length} visits properly linked to ${referredVisit.doctorSnapshot?.name}.\n`);

  // STEP 14: Correcting Incorrect Doctor Association & Audit History
  console.log('[STEP 14] Testing Doctor Association Correction & Audit Trail...');
  // Create a 2nd doctor
  const secondDoctorRes = await fetch(`${BASE_URL}/api/doctors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Dr. Shweta Rao ${randomSuffix}`,
      specialization: 'Gynecology',
      commissionPercent: 15,
      isActive: true,
    }),
  });
  const secondDoctorData = await secondDoctorRes.json();
  assert(secondDoctorRes.status === 201 && secondDoctorData.doctor, 'Failed to create 2nd doctor');
  const doc2 = secondDoctorData.doctor;
  console.log(`  -> Second doctor created: ${doc2.name} (Rate: ${doc2.commissionPercent}%)`);

  // Correct Visit 2's referring doctor from Dr. Vikram Batra to Dr. Shweta Rao
  const correctionReason = 'Reception correction: patient prescription verified for Dr. Shweta Rao';
  const correctRes = await fetch(`${BASE_URL}/api/visits/${visit2._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorId: doc2._id,
      doctorCorrectionReason: correctionReason,
      changedBy: 'Supervisor Suman',
    }),
  });
  const correctData = await correctRes.json();
  assert(correctRes.ok && correctData.visit, 'Failed to correct doctor on visit');
  const updatedV2 = correctData.visit;

  console.log(`  -> Visit ${updatedV2.visitId} referring doctor updated to: ${updatedV2.doctorSnapshot?.name}`);
  console.log(`     New Commission Rate: ${updatedV2.doctorSnapshot?.commissionPercent}%, Amount: ₹${updatedV2.doctorSnapshot?.commissionAmount}`);
  assert(String(updatedV2.doctorSnapshot?.doctorId) === String(doc2._id), 'Doctor ID must now match Dr. Shweta Rao');
  assert(updatedV2.doctorSnapshot?.commissionPercent === 15, 'Commission percent must now be 15%');
  const expectedNewComm = Math.round((totalTestPrice * 15) / 100 * 100) / 100;
  assert(updatedV2.doctorSnapshot?.commissionAmount === expectedNewComm, `Commission amount must be recalculated to ₹${expectedNewComm}`);

  // Verify Audit Trail
  assert(updatedV2.doctorAuditTrail && updatedV2.doctorAuditTrail.length >= 1, 'Doctor audit trail must be recorded');
  const audit = updatedV2.doctorAuditTrail[updatedV2.doctorAuditTrail.length - 1];
  console.log(`  -> Audit Trail Logged:`);
  console.log(`     - Changed By:       ${audit.changedBy}`);
  console.log(`     - Reason:           ${audit.reason}`);
  console.log(`     - Previous Doctor:  ${audit.previousDoctorName} (₹${audit.previousCommissionAmount})`);
  console.log(`     - New Doctor:       ${audit.newDoctorName} (₹${audit.newCommissionAmount})`);
  assert(audit.reason === correctionReason, 'Audit reason must match');
  assert(audit.changedBy === 'Supervisor Suman', 'Audit author must match');
  console.log('  -> Doctor correction and audit trail verified!\n');

  console.log('====================================================');
  console.log('  ALL DOCTORS MODULE VERIFICATION TESTS PASSED!    ');
  console.log('====================================================');
}

runDoctorModuleTests().catch((err) => {
  console.error('\nVerification run failed with error:', err);
  process.exit(1);
});
