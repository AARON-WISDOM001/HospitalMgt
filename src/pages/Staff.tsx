import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { UserPlus, Shield, Mail, Phone, Activity, MoreVertical, ShieldCheck, UserCog } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Staff() {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.NURSE,
    department: 'General Medicine',
    phone: '',
    uid: '' 
  });

  const fetchStaff = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const staffList = snap.docs.map(d => d.data() as UserProfile);
      setStaff(staffList);
      
      const current = staffList.find(s => s.uid === auth.currentUser?.uid);
      if (current) setCurrentUserProfile(current);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const isAdmin = currentUserProfile?.role === UserRole.ADMIN || ['aaronwisdom43@gmail.com', 'aaronwisdom77@gmail.com'].includes(auth.currentUser?.email || '');

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.uid) {
         alert("Operational Error: A unique UID is mandatory. Use the Firebase Auth UID for synchronization.");
         return;
    }
    try {
      await setDoc(doc(db, 'users', formData.uid), {
        ...formData,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setFormData({ name: '', email: '', role: UserRole.NURSE, department: 'General Medicine', phone: '', uid: '' });
      fetchStaff();
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, `users/${formData.uid}`);
    }
  };

  const toggleStatus = async (member: UserProfile) => {
    try {
      const newStatus = member.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', member.uid), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchStaff();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  const promoteToAdmin = async (member: UserProfile) => {
    if (!confirm(`Are you sure you want to promote ${member.name} to Admin?`)) return;
    try {
      await updateDoc(doc(db, 'users', member.uid), {
        role: UserRole.ADMIN,
        updatedAt: serverTimestamp()
      });
      fetchStaff();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${member.uid}`);
    }
  };

  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Clinical Staff Roster</h2>
          <p className="text-slate-500 text-sm font-medium">Manage hospital personnel profiles, authorization levels, and department assignments.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Enroll Professional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {staff.map((member) => (
           <div key={member.uid} className={`bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${member.status === 'inactive' ? 'opacity-70 grayscale-[0.5]' : ''}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 ${member.status === 'inactive' ? 'bg-amber-50/50' : 'bg-blue-50/50'}`} />
              
              <div className="flex items-start justify-between mb-6 relative">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${member.status === 'inactive' ? 'bg-slate-400' : 'bg-slate-900'} text-white`}>
                  {member.name[0]}
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                   <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full border ${
                     member.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                   }`}>
                     {member.role}
                   </span>
                   <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] rounded-full border ${
                     member.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                   }`}>
                     {member.status === 'active' ? 'Authorized' : 'Pending Approval'}
                   </span>
                </div>
              </div>
              
              <h3 className="font-black text-slate-900 mb-1 uppercase tracking-tight antialiased">{member.name}</h3>
              <p className="text-[10px] text-slate-400 mb-6 font-black uppercase tracking-[0.15em]">{member.department || 'General Clinical'}</p>
              
              <div className="space-y-3 pt-6 border-t border-slate-100 mt-auto">
                <div className="flex items-center text-[11px] text-slate-500 font-medium">
                   <div className="p-1.5 bg-slate-50 rounded-lg mr-3"><Mail className="w-3.5 h-3.5 text-slate-400" /></div>
                   {member.email}
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                  {isAdmin && (
                    <button 
                      onClick={() => toggleStatus(member)}
                      className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        member.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {member.status === 'active' ? 'Deauthorize' : 'Approve Staff'}
                    </button>
                  )}
                  {isAdmin && member.role !== UserRole.ADMIN && (
                    <button 
                      onClick={() => promoteToAdmin(member)}
                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                      title="Promote to admin"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  )}
                  {!isAdmin && (
                    <div className="w-full text-center py-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest italic">
                      Admin intervention required for modifications
                    </div>
                  )}
                </div>
              </div>
           </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-2xl p-10 shadow-2xl border border-slate-200">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-100">
                <UserCog className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Staff Enrollment</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Provision a new professional record in the hospital database.</p>
              
              <form onSubmit={handleAddStaff} className="space-y-5">
                <div className="space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Legal Full Name</label>
                     <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" placeholder="e.g. Dr. Sarah Jenkins" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Clinical Email Address</label>
                     <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="staff@hospital.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Assigned Role</label>
                      <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                         {Object.values(UserRole).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Auth Identifier (UID)</label>
                      <input required value={formData.uid} onChange={e => setFormData({...formData, uid: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="System UID" />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-8">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Abort</button>
                  <button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-black transition-all active:scale-[0.98]">Authorize Enrollment</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
