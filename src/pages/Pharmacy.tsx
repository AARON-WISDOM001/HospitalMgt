import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { InventoryItem } from '../types';
import { Pill, Search, AlertCircle, Plus, Sparkles, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { motion, AnimatePresence } from 'motion/react';

export default function Pharmacy() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unitPrice: 0,
    threshold: 10
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'inventory'), orderBy('name'));
      const snap = await getDocs(q);
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg('Registering drug entry...');
    try {
      const id = formData.name.toLowerCase().replace(/ /g, '_');
      await setDoc(doc(db, 'inventory', id), {
        ...formData,
        lastUpdated: serverTimestamp()
      });
      setFormMsg('Entry secured successfully!');
      setTimeout(() => {
        setShowAddModal(false);
        setFormMsg('');
        fetchItems();
      }, 1000);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'inventory');
    }
  };

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Pharmaceutical Inventory</h2>
          <p className="text-slate-500 text-sm font-medium">Verified stock levels and drug distribution records.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" /> Add New Entry
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by drug name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm transition-all font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Low Stock Alerts */}
         <div className="lg:col-span-1 space-y-4">
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
               <h3 className="text-amber-800 font-black flex items-center mb-4 uppercase text-[10px] tracking-widest">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 Depleted Stocks
               </h3>
               <div className="space-y-3">
                 {inventory.filter(i => i.quantity <= i.threshold).length === 0 ? (
                   <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest italic">All stocks verified stable.</p>
                 ) : (
                    inventory.filter(i => i.quantity <= i.threshold).map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="font-black text-amber-900 uppercase tracking-tight">{item.name}</span>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full font-black text-[9px] uppercase">{item.quantity} Low</span>
                      </div>
                    ))
                 )}
               </div>
            </div>
         </div>

         {/* Inventory List */}
         <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="p-4 px-6">Drug Blueprint</th>
                  <th className="p-4 px-6 text-center">In Stock</th>
                  <th className="p-4 px-6">Valuation</th>
                  <th className="p-4 px-6 text-right">Register</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {loading ? (
                   <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Syncing inventory segment...</td></tr>
                ) : filteredInventory.length === 0 ? (
                   <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No drug records found in current scope.</td></tr>
                ) : (
                  filteredInventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 px-6">
                        <p className="font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.category}</p>
                      </td>
                      <td className="p-4 px-6 text-center">
                        <span className={`px-2 py-1 rounded font-black text-xs ${item.quantity <= item.threshold ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-700 border border-slate-100'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-4 px-6 font-bold text-slate-600 text-xs">
                        ₦{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="p-4 px-6 text-right">
                        <button className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">Adjust</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
         </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
             >
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Register Pharmaceutical</h3>
                  <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
               </div>
               <form onSubmit={handleAddItem} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Drug Designation</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Category Registry</label>
                    <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stock</label>
                       <input type="number" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Valuation (₦)</label>
                       <input type="number" required value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
                     </div>
                  </div>
                  <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                    Initialize Entry
                  </button>
                  {formMsg && <p className="text-center text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">{formMsg}</p>}
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
