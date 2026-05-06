import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, setDoc, doc, serverTimestamp, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { Database, ShieldAlert, Sparkles, AlertTriangle, Trash2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { useAuth } from '../hooks/useAuth';

export default function Admin() {
  const { profile } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const seedData = async (manual = false) => {
    if (!auth.currentUser) {
      setMsg('Error: No authenticated user found.');
      return;
    }

    setSeeding(true);
    setMsg('Phase 1: Establishing Administrative Privileges...');
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // 1. Set current user as Admin
      try {
        await setDoc(userRef, {
          uid: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Super Admin',
          email: auth.currentUser.email,
          role: UserRole.ADMIN,
          status: 'active',
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}`);
      }

      setMsg('Phase 2: Syncing credentials with security perimeter (Waiting 2s)...');
      // Give the rules engine time to see the new user document
      await new Promise(r => setTimeout(r, 2000));

      // Verification Step
      setMsg('Phase 3: Verifying authorization...');
      const verifySnap = await getDoc(userRef);
      if (!verifySnap.exists() || verifySnap.data().role !== 'admin') {
        throw new Error('Identity verification failed. Please try again.');
      }

      if (!manual) {
        setMsg('Phase 4: Seeding pharmaceutical inventory...');
        const drugs = [
          { name: 'Paracetamol 500mg', category: 'Analgesic', quantity: 150, unitPrice: 50, threshold: 20 },
          { name: 'Amoxicillin 250mg', category: 'Antibiotic', quantity: 5, unitPrice: 200, threshold: 10 },
          { name: 'Cough Syrup', category: 'Antitussive', quantity: 45, unitPrice: 450, threshold: 15 },
          { name: 'Vitamin C', category: 'Supplement', quantity: 300, unitPrice: 30, threshold: 50 },
        ];

        for (const drug of drugs) {
          const drugId = drug.name.toLowerCase().replace(/ /g, '_');
          try {
            await setDoc(doc(db, 'inventory', drugId), {
              ...drug,
              lastUpdated: serverTimestamp(),
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `inventory/${drugId}`);
          }
        }
      } else {
        setMsg('Phase 4: Manual Mode Selected. Skipping Demo Data...');
      }

      setMsg('System Initialized! Redirecting to Command Center...');
      setTimeout(() => navigate('/'), 2000);
    } catch (e: any) {
      console.error(e);
      let errorMsg = e.message;
      try {
        // Check if it's our JSON error
        const parsed = JSON.parse(e.message);
        errorMsg = `Permission Refused: ${parsed.operationType} on ${parsed.path}`;
      } catch {
        // Not JSON, use as is
      }
      setMsg('Critical Failure: ' + errorMsg);
    } finally {
      setSeeding(false);
    }
  };

  const clearData = async () => {
    if (!auth.currentUser) {
      setMsg('Error: User authentication required.');
      return;
    }
    
    if (!window.confirm('CRITICAL ACTION: This will permanently delete all pharmaceutical records, patient files, and clinical logs. Are you absolutely certain?')) {
      return;
    }

    setSeeding(true);
    setMsg('PHASE 1: Syncing Admin Privileges...');

    try {
      // Step A: Force Admin Role (Self-Correction)
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName || profile?.name || 'Super Admin',
        email: auth.currentUser.email,
        role: UserRole.ADMIN,
        status: 'active',
        lastInitialization: serverTimestamp(),
      }, { merge: true });

      setMsg('PHASE 2: Propagating Security Changes (Waiting 2s)...');
      await new Promise(r => setTimeout(r, 2000));

      const collections = [
        'inventory', 'patients', 'visits', 'prescriptions', 
        'labTests', 'invoices', 'attendance'
      ];
      
      for (const coll of collections) {
         setMsg(`PURGING: ${coll.toUpperCase()}...`);
         try {
           const collRef = collection(db, coll);
           const querySnapshot = await getDocs(collRef);
           
           if (!querySnapshot.empty) {
             const batches = [];
             // Delete in chunks if needed, but for MVP we delete all
             const deletePromises = querySnapshot.docs.map(document => deleteDoc(document.ref));
             await Promise.all(deletePromises);
             console.log(`[Wipe] Purged ${querySnapshot.size} from ${coll}`);
           }
         } catch (e: any) {
           console.warn(`[Wipe] Segment Error (${coll}):`, e.message);
           if (e.message.includes('permission')) {
             setMsg(`FATAL: Insufficient authority to purge ${coll}.`);
             throw e;
           }
           // Ignore other errors (like collection not existing)
         }
      }

      setMsg('SYSTEM WIPE SUCCESSFUL. Re-routing to Dashboard...');
      setTimeout(() => {
        window.location.href = '/'; // Hard reload to clear all states
      }, 2000);
    } catch (e: any) {
      console.error('Wipe Failure:', e);
      setMsg('CRITICAL ERROR: ' + (e.message || 'Unknown security blockage.'));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-12">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">System Administration</h2>
        <p className="text-slate-500 text-sm font-medium">Configure Divine Love Medical global settings and database segments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Initialization Tool */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
           <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-100">
              <Sparkles className="w-6 h-6 text-white" />
           </div>
           <h3 className="text-lg font-black text-slate-900 mb-2">Core Initializer</h3>
           <p className="text-sm text-slate-500 mb-6 font-medium">Use this tool to establish Administrative Privileges and optionally populate demo data.</p>
           
           <div className="space-y-3">
              <button 
                onClick={() => seedData(false)}
                disabled={seeding}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center text-sm shadow-md active:scale-[0.98]"
              >
                <Database className="w-4 h-4 mr-2" />
                {seeding ? 'Processing...' : 'Seed Demo Data'}
              </button>
              
              <button 
                onClick={() => seedData(true)}
                disabled={seeding}
                className="w-full py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center text-sm active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {seeding ? 'Initializing...' : 'Manual Entry (Blank Slate)'}
              </button>
           </div>
           {msg && <p className="mt-4 text-center text-[10px] font-black text-blue-700 bg-blue-50 p-2 rounded-lg uppercase tracking-widest">{msg}</p>}
        </div>

        {/* Safety & Logs */}
        <div className="bg-slate-900 p-8 rounded-2xl shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldAlert className="w-24 h-24 text-white" />
           </div>
           <h3 className="text-lg font-black text-white mb-2">Security Perimeter</h3>
           <p className="text-sm text-slate-400 mb-8 font-medium">Review secure access logs, unauthorized entry attempts, and clinical record modifications.</p>
           
           <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                 <span className="text-xs text-slate-300 font-bold uppercase tracking-widest" id="integrity-pulse-label">Integrity Pulse</span>
                 <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-green-400/30">Stable</span>
              </div>
              <button className="w-full py-3 border border-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center text-xs">
                 Review Audit Trails
              </button>
           </div>
        </div>
      </div>

      {/* Critical Actions */}
      <div className="bg-red-50 p-8 rounded-2xl border border-red-100 border-dashed">
         <div className="flex items-center space-x-4 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Danger Zone</h3>
         </div>
         <p className="text-sm text-red-700 mb-6 font-medium">Operations in this segment are irreversible and affect global clinical operations.</p>
         <div className="flex flex-wrap gap-4">
            <button 
              onClick={clearData}
              disabled={seeding}
              className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-50"
            >
              Emergency Database Wipe
            </button>
            <button className="bg-white border border-red-200 text-red-600 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-white/50">Reset Attendance Counters</button>
         </div>
      </div>
    </div>
  );
}
