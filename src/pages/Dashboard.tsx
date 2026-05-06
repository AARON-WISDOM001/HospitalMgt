import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Activity, 
  Pill, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  FileText,
  Hospital,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    patientsToday: 0,
    pendingLabs: 0,
    lowStock: 0,
    revenueToday: 0,
    activeStaff: 0
  });
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { getDocs, collection, query, where, limit, orderBy } = await import('firebase/firestore');
        
        // 1. Fetch Stats
        const patientsSnap = await getDocs(collection(db, 'patients'));
        const pendingLabsSnap = await getDocs(query(collection(db, 'labTests'), where('status', '==', 'pending')));
        const inventorySnap = await getDocs(collection(db, 'inventory'));
        const invoicesSnap = await getDocs(collection(db, 'invoices'));
        const staffSnap = await getDocs(collection(db, 'users'));

        // Calculate low stock
        const lowStockCount = inventorySnap.docs.filter(d => {
          const item = d.data();
          return item.quantity <= (item.threshold || 10);
        }).length;

        // Calculate revenue (simple sum for demo)
        let totalRev = 0;
        invoicesSnap.docs.forEach(d => totalRev += (d.data().total || 0));

        setStats({
          patientsToday: patientsSnap.size,
          pendingLabs: pendingLabsSnap.size,
          lowStock: lowStockCount,
          revenueToday: totalRev,
          activeStaff: staffSnap.size
        });

        // 2. Fetch Live Queue
        const visitsSnap = await getDocs(query(
          collection(db, 'visits'), 
          where('status', 'in', ['waiting', 'in-session']),
          limit(5)
        ));
        
        setQueue(visitsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Dashboard Error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Hospital className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Systems Uninitialized</h2>
          <p className="text-slate-500 text-sm mb-8">
            You have successfully authenticated, but no staff profile was found. If this is a new installation, please proceed to initialize the system.
          </p>
          <Link 
            to="/admin" 
            className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] text-sm"
          >
            System Initialization
          </Link>
          <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Authorization Required • Access Logged
          </p>
        </motion.div>
      </div>
    );
  }

  const cards = [
    { name: 'Total Patients Today', value: stats.patientsToday, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Revenue Today (₦)', value: stats.revenueToday.toLocaleString(), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Pending Lab Tests', value: stats.pendingLabs, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Low Stock Drugs', value: stats.lowStock, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 overflow-hidden">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Patients</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{stats.patientsToday}</span>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+12% ↑</span>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Staff</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{stats.activeStaff}</span>
            <span className="text-xs text-slate-500">Live Registry</span>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Revenue</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">₦{stats.revenueToday.toLocaleString()}</span>
            <span className="text-xs text-blue-600 font-semibold tracking-tight">Real-time</span>
          </div>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md"
        >
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Lab</p>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">{stats.pendingLabs}</span>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">High ⚠️</span>
          </div>
        </motion.div>
      </div>

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Queue Display */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Live Patient Queue</h2>
            <span className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-full uppercase tracking-widest font-bold">Now Serving</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Queue #</th>
                  <th className="px-6 py-3 font-semibold">Patient Name</th>
                  <th className="px-6 py-3 font-semibold">Doctor Assigned</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                   <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Synchronizing queue...</td></tr>
                ) : queue.length === 0 ? (
                   <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No active queue records.</td></tr>
                ) : (
                  queue.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-blue-600 font-bold uppercase text-[11px]">{row.id.substring(0, 8)}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{row.patientName || 'Anonymous Patient'}</td>
                      <td className="px-6 py-4 text-slate-600 text-xs">Assigned Registry</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                          row.status === 'in-session' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Shift Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Critical Alerts */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Critical Alerts 
              <AlertCircle className="w-4 h-4 text-red-500" />
            </h2>
            <div className="space-y-4">
              {stats.lowStock > 0 && (
                <div className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="text-lg">💊</div>
                  <div>
                    <p className="text-xs font-bold text-red-800">Inventory Alert</p>
                    <p className="text-[11px] text-red-600">{stats.lowStock} drugs below critical threshold.</p>
                  </div>
                </div>
              )}
              {stats.pendingLabs > 0 && (
                <div className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="text-lg">🧪</div>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Pending Diagnostics</p>
                    <p className="text-[11px] text-amber-600">{stats.pendingLabs} tests awaiting verification.</p>
                  </div>
                </div>
              )}
              {stats.lowStock === 0 && stats.pendingLabs === 0 && (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Critical Alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Shift Details */}
          <div className="bg-slate-900 p-5 rounded-xl shadow-sm text-white flex-1 min-h-[180px] flex flex-col">
            <h2 className="text-sm font-bold mb-4 flex items-center justify-between">
              Active Shift Details
              <span className="text-[10px] text-green-400 border border-green-400/30 px-2 py-0.5 rounded font-bold uppercase">Ongoing</span>
            </h2>
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Current Supervisor</span>
                <span className="font-medium text-blue-400">{profile?.name || 'Dr. Robert Chen'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">On-duty Staff</span>
                <span className="font-medium">24 Active</span>
              </div>
              <div className="pt-2">
                <div className="w-full bg-slate-800 h-1 rounded-full mt-2">
                  <div className="bg-blue-500 h-full w-[65%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Shift Completion: 65% (Ends at 22:00)</p>
              </div>
            </div>
            <button className="w-full mt-6 py-2 border border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-800 transition-all text-slate-400 hover:text-white">
              View Shift Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
