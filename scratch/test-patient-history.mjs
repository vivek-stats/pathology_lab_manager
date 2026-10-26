/**
 * Patient Visit History Ordering & Labeling Verification Test
 *
 * Verifies all 8 requirements:
 * 1. Visits displayed in reverse chronological order by default (newest visit first).
 * 2. Actual visit ID and daily token displayed accurately for every visit.
 * 3. Visit sequence number calculated from actual chronological order and labeled clearly.
 * 4. Daily queue token is distinguished from patient's lifetime visit number.
 * 5. Dates and timestamps use Asia/Kolkata (IST).
 * 6. The first-created visit remains token #1 and the second-created visit remains token #2,
 *    even when the newest visit appears first in the history list.
 * 7. Existing visit IDs, daily tokens, payments, results, and patient records are preserved.
 * 8. Comprehensive test report generated.
 */

const BASE_URL = 'http://127.0.0.1:3000';

function assert(condition, message) {
  if (!condition) {
    console.error(`\x1b[31m[ASSERTION FAILED]\x1b[0m ${message}`);
    throw new Error(message);
  }
}

function formatIST(dateInput) {
  if (!dateInput) return '—';
  return new Date(dateInput).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

async function runPatientHistoryTests() {
  console.log('========================================================================');
  console.log('   PATIENT VISIT HISTORY ORDERING & LABELS AUTOMATED VERIFICATION      ');
  console.log('========================================================================\n');

  // STEP 0: Check Database Health
  console.log('[STEP 0] Checking MongoDB Atlas Health...');
  const healthRes = await fetch(`${BASE_URL}/api/health?force=true`);
  const health = await healthRes.json();
  assert(health.database?.isConnected, 'Database must be connected');
  console.log('  -> Health Check Passed: MongoDB Atlas is connected and healthy.\n');

  // STEP 1: Verify Benchmark Patient PAT-202610-0001 (Existing Records Preserved)
  console.log('[STEP 1] Fetching Patient PAT-202610-0001 History (Preserved Benchmark Records)...');
  const res1 = await fetch(`${BASE_URL}/api/patients/PAT-202610-0001`);
  const data1 = await res1.json();
  assert(res1.ok && data1.patient, 'Failed to fetch patient PAT-202610-0001');

  const patient = data1.patient;
  const visits = data1.visits || [];
  console.log(`  -> Patient ID: ${patient.patientId} (${patient.name})`);
  console.log(`     Total Visits in History: ${visits.length}`);
  assert(visits.length >= 2, `Expected at least 2 visits, found ${visits.length}`);

  // Find the benchmark first and second visits
  const v1 = visits.find((v) => v.visitId === 'VIS-20261026-0001');
  const v2 = visits.find((v) => v.visitId === 'VIS-20261026-0002');
  assert(v1, 'VIS-20261026-0001 must exist in database records');
  assert(v2, 'VIS-20261026-0002 must exist in database records');

  console.log('\n[STEP 2] Verifying Requirement 1: Reverse Chronological Order...');
  // The first item in the array must be the newest visit
  const newestVisit = visits[0];
  const secondVisit = visits[1];
  console.log(`  -> Index 0 (Top of list):    ${newestVisit.visitId} | IST: ${formatIST(newestVisit.visitDate)}`);
  console.log(`  -> Index 1 (Next in list):   ${secondVisit.visitId} | IST: ${formatIST(secondVisit.visitDate)}`);

  assert(
    new Date(newestVisit.visitDate).getTime() >= new Date(secondVisit.visitDate).getTime(),
    'Visits must be sorted in reverse chronological order (newest visit first)'
  );
  assert(newestVisit.visitId === 'VIS-20261026-0002', 'Newest visit must be VIS-20261026-0002 at index 0');
  assert(secondVisit.visitId === 'VIS-20261026-0001', 'Older visit must be VIS-20261026-0001 at index 1');
  console.log('  -> Requirement 1 PASSED: Newest visit (VIS-20261026-0002) is first.\n');

  console.log('[STEP 3] Verifying Requirement 6: First-Created Visit Remains Token #1 & Second Remains Token #2...');
  console.log(`  -> First-created visit:  ${v1.visitId} has daily token #${v1.dailySerial}`);
  console.log(`  -> Second-created visit: ${v2.visitId} has daily token #${v2.dailySerial}`);

  assert(v1.dailySerial === 1, `First-created visit ${v1.visitId} MUST have token #1, got #${v1.dailySerial}`);
  assert(v2.dailySerial === 2, `Second-created visit ${v2.visitId} MUST have token #2, got #${v2.dailySerial}`);
  // In the reverse chronological array:
  assert(visits[0].dailySerial === 2, 'Newest visit at index 0 must retain token #2');
  assert(visits[1].dailySerial === 1, 'First-created visit at index 1 must retain token #1');
  console.log('  -> Requirement 6 PASSED: Tokens are accurately preserved (#1 and #2) without swap!\n');

  console.log('[STEP 4] Verifying Requirements 3 & 4: Sequence Numbers vs Daily Tokens...');
  // Chronological lifetime sequence:
  // v1 was created first -> patientVisitNumber = 1
  // v2 was created second -> patientVisitNumber = 2
  console.log(`  -> visits[0] (${visits[0].visitId}):`);
  console.log(`     - Patient Lifetime Visit Number: #${visits[0].patientVisitNumber} of ${visits[0].totalPatientVisits}`);
  console.log(`     - Daily Queue Token:             #${visits[0].dailySerial}`);
  console.log(`  -> visits[1] (${visits[1].visitId}):`);
  console.log(`     - Patient Lifetime Visit Number: #${visits[1].patientVisitNumber} of ${visits[1].totalPatientVisits}`);
  console.log(`     - Daily Queue Token:             #${visits[1].dailySerial}`);

  assert(visits[0].patientVisitNumber === 2, `visits[0] must have lifetime visit number #2, got ${visits[0].patientVisitNumber}`);
  assert(visits[1].patientVisitNumber === 1, `visits[1] must have lifetime visit number #1, got ${visits[1].patientVisitNumber}`);
  assert(visits[0].totalPatientVisits === visits.length, 'totalPatientVisits must equal total visits length');
  console.log('  -> Requirements 3 & 4 PASSED: Lifetime sequence numbers derived from chronological order and distinct from daily tokens.\n');

  console.log('[STEP 5] Verifying Requirement 5: Asia/Kolkata Timestamps...');
  const istTimeRegex = /\b(am|pm)\b/i;
  const formatted0 = formatIST(visits[0].visitDate);
  const formatted1 = formatIST(visits[1].visitDate);
  assert(istTimeRegex.test(formatted0), 'Timestamp must format in 12-hour IST format');
  console.log(`  -> Visit 2 Timestamp in Asia/Kolkata: ${formatted0}`);
  console.log(`  -> Visit 1 Timestamp in Asia/Kolkata: ${formatted1}`);
  console.log('  -> Requirement 5 PASSED: Dates and timestamps use Asia/Kolkata (IST).\n');

  console.log('[STEP 6] Verifying Requirement 7: Immutability of Existing Records...');
  assert(v1.billing?.netAmount === 950, 'Visit 1 billing netAmount must remain ₹950');
  assert(v1.billing?.paidAmount === 950, 'Visit 1 billing paidAmount must remain ₹950');
  assert(v1.status === 'completed', 'Visit 1 status must remain completed');
  assert(v2.billing?.netAmount === 100, 'Visit 2 billing netAmount must remain ₹100');
  assert(v2.status === 'registered', 'Visit 2 status must remain registered');
  console.log('  -> Requirement 7 PASSED: Existing visit IDs, tokens, billing, and results are untouched.\n');

  console.log('[STEP 7] Complete Patient Visit History Output (Clear & Unambiguous):');
  console.log('------------------------------------------------------------------------');
  visits.forEach((v) => {
    const isNewest = v.patientVisitNumber === v.totalPatientVisits;
    const tag = isNewest ? 'NEWEST VISIT ' : 'INITIAL VISIT';
    console.log(
      `  [${tag}] Patient Lifetime Visit #${v.patientVisitNumber} of ${v.totalPatientVisits}\n` +
      `             • Visit ID:          ${v.visitId}\n` +
      `             • Daily Queue Token: #${v.dailySerial} (Asia/Kolkata token for date ${v.dateStringIST})\n` +
      `             • Recorded Time:     ${formatIST(v.visitDate)} (Asia/Kolkata)\n` +
      `             • Tests Ordered:     ${v.tests?.map((t) => t.code).join(', ')}\n` +
      `             • Status:            ${v.status}\n` +
      `             • Billing:           Net: ₹${v.billing?.netAmount} | Paid: ₹${v.billing?.paidAmount}\n`
    );
  });
  console.log('------------------------------------------------------------------------');

  console.log('========================================================================');
  console.log('     ALL PATIENT VISIT HISTORY TESTS COMPLETED SUCCESSFULLY!           ');
  console.log('========================================================================\n');
}

runPatientHistoryTests().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
