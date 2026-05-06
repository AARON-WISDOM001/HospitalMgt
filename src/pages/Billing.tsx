import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Invoice } from '../types';
import { CreditCard, DollarSign, Download, Plus, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const stats = {
    todayRevenue: invoices
      .filter(inv => {
        if (!inv.createdAt?.seconds) return false;
        const date = new Date(inv.createdAt.seconds * 1000);
        const today = new Date();
        return date.toDateString() === today.toDateString();
      })
      .reduce((sum, inv) => sum + inv.totalAmount, 0),
    pendingCount: invoices.filter(inv => inv.status === 'unpaid').length,
    verificationRate: invoices.length > 0 
      ? Math.round((invoices.filter(inv => inv.status === 'paid').length / invoices.length) * 100)
      : 0
  };

  const fetchInvoices = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF() as any;
    doc.setFontSize(18);
    doc.text('DIVINE LOVE MEDICAL CENTER', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('SETTLEMENT RECEIPT', 105, 28, { align: 'center' });
    doc.line(20, 35, 190, 35);
    
    doc.text(`Receipt ID: #${invoice.id.slice(-6).toUpperCase()}`, 20, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 45);
    doc.text(`Patient ID: ${invoice.patientId}`, 20, 52);
    
    const tableData = invoice.items.map(item => [item.description, `NGN ${item.amount.toLocaleString()}`]);
    doc.autoTable({
      startY: 65,
      head: [['Description', 'Valuation (NGN)']],
      body: tableData,
      theme: 'grid'
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: NGN ${invoice.totalAmount.toLocaleString()}`, 190, finalY, { align: 'right' });
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, finalY);
    
    doc.save(`Receipt_${invoice.id.slice(-6)}.pdf`);
  };

  const formatDate = (ts: any) => {
    if (!ts || !ts.seconds) return '--/--/----';
    return new Date(ts.seconds * 1000).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">Fiscal Management</h2>
          <p className="text-slate-500 text-sm font-medium">Review patient settlements, track fiscal inflow, and export digital receipts.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold flex items-center text-[10px] uppercase tracking-widest shadow-sm hover:bg-slate-50 active:scale-[0.98]">
            <Filter className="w-3.5 h-3.5 mr-2" /> Segment
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98]">
            <Plus className="w-3.5 h-3.5 mr-2" /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-600">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiscal Flux Today</p>
           <h3 className="text-2xl font-black text-slate-900">₦{stats.todayRevenue.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500 shadow-amber-50/50">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Settlements</p>
           <h3 className="text-2xl font-black text-slate-900">{stats.pendingCount} Invoices</h3>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border-l-4 border-l-white">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Verification</p>
           <h3 className="text-2xl font-black text-white">{stats.verificationRate}% Verified</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <tr>
               <th className="p-4 px-6">Invoice Blueprint</th>
               <th className="p-4 px-6">Settlement</th>
               <th className="p-4 px-6">Verification</th>
               <th className="p-4 px-6">Temporal Stamp</th>
               <th className="p-4 px-6 text-right">Registry</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {invoices.length === 0 ? (
               <tr><td colSpan={5} className="p-16 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">No fiscal records detected in registry.</td></tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                   <td className="p-4 px-6">
                      <p className="font-black text-slate-900 uppercase tracking-tight">INV-{inv.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{inv.items[0]?.category || 'General'} Service</p>
                   </td>
                   <td className="p-4 px-6 font-black text-slate-700 text-xs">₦{inv.totalAmount.toLocaleString()}</td>
                   <td className="p-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border ${
                        inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {inv.status}
                      </span>
                   </td>
                   <td className="p-4 px-6 text-[10px] text-slate-500 font-black tracking-widest uppercase">{formatDate(inv.createdAt)}</td>
                   <td className="p-4 px-6 text-right">
                      <button 
                        onClick={() => generatePDF(inv)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all active:scale-90"
                        title="Download Receipt"
                      >
                         <Download className="w-4 h-4" />
                      </button>
                   </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
