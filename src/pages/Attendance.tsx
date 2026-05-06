import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { AttendanceRecord } from '../types';
import { Clock, CheckCircle2, History, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Attendance() {
  const { profile } = useAuth();
  const [currentAttendance, setCurrentAttendance] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'attendance'), 
        where('userId', '==', profile.uid),
        orderBy('date', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setHistory(records);
      
      const active = records.find(r => r.date === today && !r.clockOut);
      setCurrentAttendance(active || null);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [profile]);

  const handleClockIn = async () => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'attendance'), {
        userId: profile.uid,
        date: format(new Date(), 'yyyy-MM-dd'),
        clockIn: serverTimestamp(),
      });
      fetchAttendance();
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, 'attendance');
    }
  };

  const handleClockOut = async () => {
    if (!currentAttendance) return;
    try {
      await updateDoc(doc(db, 'attendance', currentAttendance.id), {
        clockOut: serverTimestamp(),
      });
      fetchAttendance();
    } catch (e) { 
      handleFirestoreError(e, OperationType.WRITE, `attendance/${currentAttendance.id}`);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts || !ts.seconds) return '--:--';
    return format(new Date(ts.seconds * 1000), 'hh:mm a');
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEEE, MMM do');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Shift Registry</h2>
        <p className="text-slate-500 mt-2 font-medium">Verify your daily presence and track operational hours.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-600 rounded-b-full opacity-20" />
        
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100 transition-all hover:scale-105 duration-300">
             <Clock className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">{format(new Date(), 'hh:m a')}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 max-w-sm mx-auto">
          {!currentAttendance ? (
             <button 
               onClick={handleClockIn}
               className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 text-sm uppercase tracking-widest"
             >
               Authorize Clock In
             </button>
          ) : (
            <button 
               onClick={handleClockOut}
               className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95 text-sm uppercase tracking-widest"
             >
               Terminal Clock Out
             </button>
          )}
        </div>

        {currentAttendance && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl inline-flex items-center space-x-3">
             <CheckCircle2 className="w-4 h-4 text-blue-600" />
             <p className="text-xs font-bold text-blue-700">ACTIVE: Verified Entry at {formatTimestamp(currentAttendance.clockIn)}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-black text-slate-900 mb-6 flex items-center uppercase text-sm tracking-widest">
          <History className="w-4 h-4 mr-3 text-slate-400" />
          Shift Timeline
        </h3>
        <div className="grid gap-4">
          {history.map((record) => (
             <div key={record.id} className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-blue-200 transition-all group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                     <Timer className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{formatDateLabel(record.date)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Segment: {record.clockOut ? 'Verified Close' : 'Live Session'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-700 tracking-tighter">IN: {formatTimestamp(record.clockIn).split(' ')[0]}</p>
                  <p className="text-[10px] font-black text-slate-400 tracking-tighter">OUT: {record.clockOut ? formatTimestamp(record.clockOut).split(' ')[0] : '--:--'}</p>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
