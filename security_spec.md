# Security Specification for Divine Love HMS

## Data Invariants
1. A **Visit** must belong to an existing **Patient**.
2. A **Prescription** or **LabTest** must be linked to a specific **Visit**.
3. Only **Doctors** can create prescriptions and lab requests.
4. Only **Pharmacists** can update prescription status to 'dispensed'.
5. Only **Nurses** or **Doctors** can record vitals in a Visit.
6. A user cannot modify their own **Role**.
7. **Invoices** are immutable once paid (except for payment details).

## The Dirty Dozen Payloads (Red Team Tests)

1. **Identity Spoofing**: Attempt to create a Patient as an unauthenticated user.
2. **Privilege Escalation**: A Nurse attempting to update their own role to 'admin' in `/users/{userId}`.
3. **Ghost Prescribing**: A Pharmacist attempting to create a new Prescription (only Doctors allowed).
4. **Illegal Dispensing**: A Doctor attempting to update a Prescription status to 'dispensed' (only Pharmacists allowed).
5. **Orphaned Visit**: Creating a Visit with a non-existent `patientId`.
6. **Shadow Field Injection**: Adding `isVerified: true` to a Patient document.
7. **Negative Inventory**: Updating drug quantity to a negative number.
8. **Unauthorized Bill Access**: A Doctor trying to view detailed financial `Invoices` (only Accountants/Admins).
9. **Role Bypass**: Attempting to register as a staff member with `role: 'admin'` without being an admin.
10. **Data Poisoning**: Injecting 1MB of junk data into a patient's `lastName`.
11. **Double Payment**: Attempting to update a 'paid' invoice back to 'unpaid'.
12. **Future Clock-In**: Attempting to set `clockIn` to a future timestamp.

## Test Runner
Testing will be performed against `firestore.rules` using the emulator or local test scripts.
