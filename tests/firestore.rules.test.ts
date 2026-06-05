import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'hospital-mgt-test';

// Authenticated contexts keyed by uid
function ctx(uid: string, email?: string) {
  return testEnv.authenticatedContext(uid, email ? { email } : undefined).firestore();
}

// Seed a user profile with a given role/status (bypasses rules)
async function seedUser(uid: string, role: string, status: 'active' | 'inactive' = 'active') {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), 'users', uid), {
      uid,
      name: 'Test User',
      email: `${uid}@example.com`,
      role,
      status,
    });
  });
}

// Seed an arbitrary document (bypasses rules)
async function seedDoc(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (c) => {
    const [coll, id] = path.split('/');
    await setDoc(doc(c.firestore(), coll, id), data);
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Dirty Dozen — attacks must be blocked', () => {
  it('1. Identity Spoofing: unauthenticated user cannot create a patient', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'patients', 'p1'), { firstName: 'A', lastName: 'B', gender: 'male' })
    );
  });

  it('2. Privilege Escalation: nurse cannot change own role to admin', async () => {
    await seedUser('nurse1', 'nurse');
    const db = ctx('nurse1');
    await assertFails(
      updateDoc(doc(db, 'users', 'nurse1'), { name: 'Test User', role: 'admin', status: 'active' })
    );
  });

  it('3. Ghost Prescribing: pharmacist cannot create a prescription', async () => {
    await seedUser('pharm1', 'pharmacist');
    const db = ctx('pharm1');
    await assertFails(
      setDoc(doc(db, 'prescriptions', 'rx1'), { doctorId: 'pharm1', status: 'pending' })
    );
  });

  it('4. Illegal Dispensing: doctor cannot set prescription to dispensed', async () => {
    await seedUser('doc1', 'doctor');
    await seedDoc('prescriptions/rx1', { doctorId: 'doc1', status: 'pending' });
    const db = ctx('doc1');
    await assertFails(
      updateDoc(doc(db, 'prescriptions', 'rx1'), { doctorId: 'doc1', status: 'dispensed' })
    );
  });

  it('6. Shadow Field Injection: oversized lastName is rejected', async () => {
    await seedUser('staff1', 'doctor');
    const db = ctx('staff1');
    await assertFails(
      setDoc(doc(db, 'patients', 'p1'), {
        firstName: 'A',
        lastName: 'X'.repeat(500),
        gender: 'male',
      })
    );
  });

  it('7. Negative Inventory: quantity cannot go negative', async () => {
    await seedUser('pharm1', 'pharmacist');
    const db = ctx('pharm1');
    await assertFails(
      setDoc(doc(db, 'inventory', 'drug1'), { name: 'Paracetamol', quantity: -5, unitPrice: 10 })
    );
  });

  it('8. Unauthorized Bill Creation: doctor cannot create an invoice', async () => {
    await seedUser('doc1', 'doctor');
    const db = ctx('doc1');
    await assertFails(
      setDoc(doc(db, 'invoices', 'inv1'), { status: 'unpaid', totalAmount: 100 })
    );
  });

  it('9. Role Bypass: inactive staff cannot create patients', async () => {
    await seedUser('staff1', 'staff', 'inactive');
    const db = ctx('staff1');
    await assertFails(
      setDoc(doc(db, 'patients', 'p1'), { firstName: 'A', lastName: 'B', gender: 'male' })
    );
  });

  it('10. Data Poisoning: junk-sized firstName is rejected', async () => {
    await seedUser('doc1', 'doctor');
    const db = ctx('doc1');
    await assertFails(
      setDoc(doc(db, 'patients', 'p1'), {
        firstName: 'Z'.repeat(2000),
        lastName: 'B',
        gender: 'male',
      })
    );
  });

  it('11. Double Payment: paid invoice cannot revert to unpaid', async () => {
    await seedUser('acc1', 'accountant');
    await seedDoc('invoices/inv1', { status: 'paid', totalAmount: 100 });
    const db = ctx('acc1');
    await assertFails(
      updateDoc(doc(db, 'invoices', 'inv1'), { status: 'unpaid', totalAmount: 100 })
    );
  });

  it('Attendance spoofing: cannot clock in as another user', async () => {
    await seedUser('staff1', 'nurse');
    const db = ctx('staff1');
    await assertFails(
      setDoc(doc(db, 'attendance', 'a1'), { userId: 'someoneElse', date: '2026-01-01' })
    );
  });

  it('Cross-user attendance read is blocked', async () => {
    await seedUser('staff1', 'nurse');
    await seedDoc('attendance/a1', { userId: 'otherUser', date: '2026-01-01' });
    const db = ctx('staff1');
    await assertFails(getDoc(doc(db, 'attendance', 'a1')));
  });
});

describe('Legitimate flows — must be allowed', () => {
  it('Active staff can create a valid patient', async () => {
    await seedUser('doc1', 'doctor');
    const db = ctx('doc1');
    await assertSucceeds(
      setDoc(doc(db, 'patients', 'p1'), { firstName: 'Jane', lastName: 'Doe', gender: 'female' })
    );
  });

  it('Doctor can create a prescription for self', async () => {
    await seedUser('doc1', 'doctor');
    const db = ctx('doc1');
    await assertSucceeds(
      setDoc(doc(db, 'prescriptions', 'rx1'), { doctorId: 'doc1', status: 'pending' })
    );
  });

  it('Pharmacist can dispense a prescription', async () => {
    await seedUser('pharm1', 'pharmacist');
    await seedDoc('prescriptions/rx1', { doctorId: 'doc1', status: 'pending' });
    const db = ctx('pharm1');
    await assertSucceeds(
      updateDoc(doc(db, 'prescriptions', 'rx1'), { doctorId: 'doc1', status: 'dispensed' })
    );
  });

  it('Doctor and nurse can both order lab tests', async () => {
    await seedUser('doc1', 'doctor');
    await seedUser('nurse1', 'nurse');
    await assertSucceeds(
      setDoc(doc(ctx('doc1'), 'labTests', 't1'), { patientId: 'p1', status: 'pending' })
    );
    await assertSucceeds(
      setDoc(doc(ctx('nurse1'), 'labTests', 't2'), { patientId: 'p1', status: 'pending' })
    );
  });

  it('Accountant can create and update an unpaid invoice', async () => {
    await seedUser('acc1', 'accountant');
    const db = ctx('acc1');
    await assertSucceeds(
      setDoc(doc(db, 'invoices', 'inv1'), { status: 'unpaid', totalAmount: 500 })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'invoices', 'inv1'), { status: 'paid', totalAmount: 500 })
    );
  });

  it('Pharmacist can add inventory with non-negative quantity', async () => {
    await seedUser('pharm1', 'pharmacist');
    const db = ctx('pharm1');
    await assertSucceeds(
      setDoc(doc(db, 'inventory', 'drug1'), { name: 'Paracetamol', quantity: 100, unitPrice: 50 })
    );
  });

  it('Admin can change another user role', async () => {
    await seedUser('admin1', 'admin');
    await seedUser('nurse1', 'nurse');
    const db = ctx('admin1');
    await assertSucceeds(
      updateDoc(doc(db, 'users', 'nurse1'), { name: 'Test User', role: 'doctor', status: 'active' })
    );
  });

  it('Whitelisted bootstrap admin (by email) is treated as admin', async () => {
    const db = ctx('boot1', 'aaronwisdom43@gmail.com');
    await assertSucceeds(
      setDoc(doc(db, 'inventory', 'drug1'), { name: 'Vitamin C', quantity: 10, unitPrice: 5 })
    );
  });

  it('User can clock in for self and read own attendance', async () => {
    await seedUser('staff1', 'nurse');
    const db = ctx('staff1');
    await assertSucceeds(
      setDoc(doc(db, 'attendance', 'a1'), { userId: 'staff1', date: '2026-01-01' })
    );
    await assertSucceeds(getDoc(doc(db, 'attendance', 'a1')));
  });

  it('Self can update own profile without touching role/status', async () => {
    await seedUser('doc1', 'doctor');
    const db = ctx('doc1');
    await assertSucceeds(
      updateDoc(doc(db, 'users', 'doc1'), { name: 'Dr. New Name', role: 'doctor', status: 'active' })
    );
  });
});
