import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Patient } from '../types';
import { Plus, Search, User, MoreVertical, Filter, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'male' as const,
    phone: '',
    address: '',
    bloodGroup: '',
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', dob: '', gender: 'male', phone: '', address: '', bloodGroup: '' });
      fetchPatients();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'patients');
    }
  };

  const filteredPatients = patients.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Patient Registry</h2>
          <p className="text-slate-500 text-sm">Secure record management for Divine Love Medical system.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-blue-100 transition-all active:scale-[0.98] text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Register Patient
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by name or Patient ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Advanced
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identification</th>
                <th className="p-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Info</th>
                <th className="p-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Details</th>
                <th className="p-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Safety Data</th>
                <th className="p-4 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-sm text-slate-400 font-medium">Validating registry stream...</td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-sm text-slate-400 font-medium">No patient records found in current segment.</td></tr>
              ) : (
                filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 px-6">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-xs mr-3 border border-blue-100">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none">{p.firstName} {p.lastName}</p>
                          <p className="text-[10px] text-blue-500 mt-1 font-mono font-bold tracking-tighter">#{p.id.slice(-6).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 px-6">
                      <p className="text-sm text-slate-600 font-semibold capitalize tracking-tight">{p.gender}</p>
                      <p className="text-[11px] text-slate-400">{new Date().getFullYear() - new Date(p.dob).getFullYear()} Years old</p>
                    </td>
                    <td className="p-4 px-6">
                      <p className="text-sm text-slate-600 font-bold">{p.phone}</p>
                      <p className="text-[11px] text-slate-400 truncate w-32 font-medium">{p.address}</p>
                    </td>
                    <td className="p-4 px-6 text-center">
                      <span className="px-2 py-1 bg-slate-900 text-white text-[9px] font-black rounded uppercase tracking-tighter shadow-sm">
                        {p.bloodGroup || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 px-6 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowModal(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
             >
               <div className="p-8">
                 <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Patient Entry System</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Divine Love Registry • Authorization Req.</p>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Legal Given Name</label>
                        <input
                          required
                          value={formData.firstName}
                          onChange={e => setFormData({...formData, firstName: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Family Name</label>
                        <input
                          required
                          value={formData.lastName}
                          onChange={e => setFormData({...formData, lastName: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Birth Registry</label>
                        <input
                          required
                          type="date"
                          value={formData.dob}
                          onChange={e => setFormData({...formData, dob: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Clinical Gender</label>
                        <select
                          value={formData.gender}
                          onChange={e => setFormData({...formData, gender: e.target.value as any})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Verified Phone Line</label>
                      <input
                        required
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        placeholder="+234 ..."
                      />
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button 
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all border border-slate-200 text-sm"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] text-sm"
                      >
                        Verify & Commit
                      </button>
                    </div>
                 </form>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
