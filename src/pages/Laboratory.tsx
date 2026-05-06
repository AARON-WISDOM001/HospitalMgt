import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { LabTest } from '../types';
import { FlaskConical, CheckCircle, Clock, X, Save, AlertCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Laboratory() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTest, setProcessingTest] = useState<LabTest | null>(null);
  const [resultsText, setResultsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTestData, setNewTestData] = useState({
    patientId: '',
    testName: '',
    visitId: 'direct-order'
  });
  const [patients, setPatients] = useState<any[]>([]);

  const fetchTests = async () => {
    try {
      const q = query(collection(db, 'labTests'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LabTest)));
    } catch (e) { 
      handleFirestoreError(e, OperationType.GET, 'labTests');
    }
    finally { setLoading(false); }
  };

  const fetchPatients = async () => {
    try {
      const snap = await getDocs(collection(db, 'patients'));
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn('Silent skip patients fetch');
    }
  };

  useEffect(() => { 
    fetchTests(); 
    fetchPatients();
  }, []);

  const handleCreateTest = async () => {
    if (!newTestData.patientId || !newTestData.testName) return;
    setSaving(true);
    try {
      const { addDoc, collection: firestoreColl } = await import('firebase/firestore');
      await addDoc(firestoreColl(db, 'labTests'), {
        ...newTestData,
        status: 'pending',
        doctorId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
      setShowNewModal(false);
      setNewTestData({ patientId: '', testName: '', visitId: 'direct-order' });
      fetchTests();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'labTests');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResults = async () => {
    if (!processingTest || !resultsText.trim()) return;
    setSaving(true);
    try {
      const testRef = doc(db, 'labTests', processingTest.id);
      await updateDoc(testRef, {
        results: resultsText,
        status: 'completed',
        labTechnicianId: auth.currentUser?.uid,
        updatedAt: serverTimestamp()
      });
      setProcessingTest(null);
      setResultsText('');
      fetchTests();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `labTests/${processingTest.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Laboratory Register</h2>
        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          <FlaskConical className="w-3 h-3" />
          New Lab Order
        </button>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
         {loading ? (
            <div className="p-16 text-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Diagnostics...</p>
            </div>
         ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-4 px-6">Test Designation</th>
                  <th className="p-4 px-6">Patient Identifier</th>
                  <th className="p-4 px-6">Current Status</th>
                  <th className="p-4 px-6 text-right">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {tests.length === 0 ? (
                  <tr><td colSpan={4} className="p-16 text-center text-xs text-slate-400 font-bold uppercase tracking-widest italic">No active requests in peripheral registry.</td></tr>
                ) : (
                  tests.map(test => (
                    <tr key={test.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 px-6 font-black text-slate-900 uppercase tracking-tight">{test.testName}</td>
                      <td className="p-4 px-6 text-[10px] text-slate-500 font-black tracking-widest uppercase">PN-{test.patientId.slice(-6)}</td>
                      <td className="p-4 px-6">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-widest shadow-sm border ${
                          test.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {test.status}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-right">
                        {test.status === 'pending' ? (
                          <button 
                            onClick={() => {
                              setProcessingTest(test);
                              setResultsText('');
                            }}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-all active:scale-95"
                          >
                            Process Results
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archived</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
         )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">New Lab Order</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Initialize Diagnostic Protocol</p>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={saving}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Source Patient</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  value={newTestData.patientId}
                  onChange={(e) => setNewTestData({...newTestData, patientId: e.target.value})}
                  disabled={saving}
                >
                  <option value="">Select Patient from Registry...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.firstName} {p.lastName} (PN-{p.id.slice(-6)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Diagnostic Procedure</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300"
                  placeholder="e.g. Complete Blood Count, Malaria Parasite..."
                  value={newTestData.testName}
                  onChange={(e) => setNewTestData({...newTestData, testName: e.target.value})}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
              <button 
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 rounded-2xl transition-all"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTest}
                disabled={saving || !newTestData.patientId || !newTestData.testName}
                className="flex-1 px-4 py-3 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <FlaskConical className="w-3 h-3" />
                )}
                Initiate Test
              </button>
            </div>
          </div>
        </div>
      )}

      {processingTest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Upload Diagnostics</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{processingTest.testName}</p>
              </div>
              <button 
                onClick={() => setProcessingTest(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={saving}
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">
                  Warning: Saving these results will immediately verify the clinical registry and authorize discharge/billing procedures.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Clinical Observations</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 min-h-[160px]"
                  placeholder="Enter detailed laboratory findings, biometric markers, and anomalies..."
                  value={resultsText}
                  onChange={(e) => setResultsText(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-3 border-t border-slate-100">
              <button 
                onClick={() => setProcessingTest(null)}
                className="flex-1 px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 rounded-2xl transition-all"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveResults}
                disabled={saving || !resultsText.trim()}
                className="flex-1 px-4 py-3 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Commit Findings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
