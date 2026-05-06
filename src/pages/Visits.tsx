import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { Visit, Patient, UserProfile, UserRole } from '../types';
import { Play, CheckCircle2, Clock, MapPin, User, ChevronRight, Stethoscope, ArrowRightCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Visits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'visits'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit));
      setVisits(data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'visits');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const pSnap = await getDocs(collection(db, 'patients'));
      setPatients(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));

      const dSnap = await getDocs(query(collection(db, 'users'), where('role', '==', UserRole.DOCTOR)));
      setDoctors(dSnap.docs.map(d => {
        const data = d.data();
        return { 
          uid: d.id, 
          ...data 
        } as UserProfile;
      }));
    } catch (err) {
       handleFirestoreError(err, OperationType.GET, 'patients/users');
    }
  };

  useEffect(() => {
    fetchVisits();
    fetchData();
  }, []);

  const [booking, setBooking] = useState({ patientId: '', reason: '', doctorId: '' });

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'visits'), {
        patientId: booking.patientId,
        reason: booking.reason,
        doctorId: booking.doctorId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowBookModal(false);
      setBooking({ patientId: '', reason: '', doctorId: '' });
      fetchVisits();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'visits');
    }
  };

  const updateStatus = async (visitId: string, nextStatus: string) => {
    try {
      await updateDoc(doc(db, 'visits', visitId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      fetchVisits();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `visits/${visitId}`);
    }
  };

  const statusColors: any = {
    'pending': 'bg-slate-100 text-slate-600 border-slate-200',
    'triage': 'bg-amber-50 text-amber-700 border-amber-100',
    'doctor': 'bg-blue-50 text-blue-700 border-blue-100',
    'lab': 'bg-purple-50 text-purple-700 border-purple-100',
    'pharmacy': 'bg-pink-50 text-pink-700 border-pink-100',
    'billing': 'bg-green-50 text-green-700 border-green-100',
    'completed': 'bg-slate-900 text-white border-slate-900',
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight antialiased">Clinical Queue</h2>
          <p className="text-slate-500 text-sm font-medium">Real-time patient flow management and triage oversight.</p>
        </div>
        <button 
          onClick={() => setShowBookModal(true)}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 mr-2 fill-current" />
          Initialize Visit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-24 text-center">
            <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] animate-pulse">Synchronizing Queue State...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Clinical Registry Empty</p>
          </div>
        ) : (
          visits.map((visit) => {
            const patient = patients.find(p => p.id === visit.patientId);
            const doctor = doctors.find(d => d.uid === visit.doctorId);
            return (
              <motion.div 
                layout
                key={visit.id}
                className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3">
                   <div className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">#{visit.id.slice(-6).toUpperCase()}</div>
                </div>

                <div>
                  <div className="mb-6">
                    <span className={cn("px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-widest border shadow-sm", statusColors[visit.status])}>
                      {visit.status}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight decoration-slate-300 group-hover:underline underline-offset-4">{patient?.firstName} {patient?.lastName}</h3>
                  <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                    <Stethoscope className="w-3 h-3 mr-2 text-blue-500" />
                    Resident: {doctor?.name || 'Awaiting Assignment'}
                  </div>

                  <div className="space-y-3 py-6 border-t border-slate-50 mb-6 font-medium">
                    <div className="flex items-center text-xs text-slate-600">
                       <Clock className="w-4 h-4 mr-3 text-slate-300" />
                       <span className="font-bold text-slate-400 uppercase text-[10px] mr-2 tracking-widest">Entry:</span> 
                       {visit.createdAt?.seconds ? new Date(visit.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                    </div>
                    <div className="flex items-start text-xs text-slate-600">
                       <MapPin className="w-4 h-4 mr-3 text-slate-300 mt-0.5" />
                       <span className="font-bold text-slate-400 uppercase text-[10px] mr-2 tracking-widest">Ailment:</span>
                       <span className="flex-1">{visit.reason}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex -space-x-2">
                     <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-slate-100">P</div>
                     {visit.doctorId && <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">D</div>}
                  </div>
                  <div className="flex gap-2">
                    {visit.status === 'pending' && (
                      <button 
                        onClick={() => updateStatus(visit.id, 'triage')}
                        className="bg-blue-600 text-white text-[10px] font-black py-2 px-4 rounded-lg hover:bg-blue-700 transition-all uppercase tracking-widest leading-none"
                      >
                        Initiate Triage
                      </button>
                    )}
                    {visit.status === 'triage' && (
                      <button 
                        onClick={() => updateStatus(visit.id, 'doctor')}
                        className="bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-lg hover:bg-black transition-all uppercase tracking-widest leading-none"
                      >
                        Route to Clinical
                      </button>
                    )}
                    {visit.status === 'doctor' && (
                      <button 
                        onClick={() => updateStatus(visit.id, 'lab')}
                        className="bg-purple-600 text-white text-[10px] font-black py-2 px-4 rounded-lg hover:bg-purple-700 transition-all uppercase tracking-widest leading-none"
                      >
                        Procure Diagnostics
                      </button>
                    )}
                    {['lab', 'pharmacy', 'billing'].includes(visit.status) && (
                       <button className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl p-10 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
              <ArrowRightCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight antialiased">Log New Visit</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">Record patient arrival and assign preliminary screening parameters.</p>
            
            <form onSubmit={handleBook} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Patient Identity</label>
                  <select
                    required
                    value={booking.patientId}
                    onChange={e => setBooking({...booking, patientId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Search Patient Registry...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.firstName.toUpperCase()} {p.lastName.toUpperCase()}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Primary Complaint / Rationale</label>
                  <textarea
                    required
                    value={booking.reason}
                    onChange={e => setBooking({...booking, reason: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 min-h-[100px] transition-all"
                    placeholder="Describe symptoms or clinical objective..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Resident</label>
                  <select
                    required
                    value={booking.doctorId}
                    onChange={e => setBooking({...booking, doctorId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  >
                    <option value="">Awaiting Triage Selection</option>
                    {doctors.map(d => <option key={d.uid} value={d.uid}>{d.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Terminate
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-xl hover:bg-black transition-all active:scale-[0.98]"
                >
                  Record Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
