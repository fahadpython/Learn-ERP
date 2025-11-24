import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, BookOpen, Receipt, TrendingUp, Settings, 
  Plus, Save, RefreshCw, Calculator, HelpCircle, FileText,
  CreditCard, ArrowLeftRight, CheckCircle, AlertTriangle, Info,
  MoreVertical, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { 
  Account, Item, Voucher, VoucherType, AccountGroup, 
  VoucherLineItem, LedgerEntry, AccountSubGroup
} from './types';
import { DEFAULT_ACCOUNTS, DEFAULT_ITEMS } from './constants';
import { postVoucherToLedger } from './services/accountingEngine';
import { explainTransaction, askAccountingTutor } from './services/geminiService';
import { TrialBalanceView, ProfitLossView, GSTReportView, LedgerBookView } from './components/Reports';

// --- Helper Components ---

const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void; 
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reportSubTab, setReportSubTab] = useState<'tb' | 'pl' | 'ledger'>('tb');
  
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [isExplaining, setIsExplaining] = useState(false);
  
  // Voucher Entry State
  const [currentVoucherType, setCurrentVoucherType] = useState<VoucherType>(VoucherType.SALES);
  const [voucherParty, setVoucherParty] = useState('');
  const [lineItems, setLineItems] = useState<VoucherLineItem[]>([]);
  
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorAnswer, setTutorAnswer] = useState("");

  // Recalculate Ledger whenever vouchers change
  useEffect(() => {
    let allEntries: LedgerEntry[] = [];
    vouchers.forEach(v => {
      allEntries = [...allEntries, ...postVoucherToLedger(v, accounts)];
    });
    setLedgerEntries(allEntries);
  }, [vouchers, accounts]);

  // Derived State for "Live Preview"
  const currentTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.amount + item.cgst + item.sgst + item.igst, 0);
  }, [lineItems]);

  const previewLedgerEntries = useMemo(() => {
      if (!voucherParty || lineItems.length === 0) return [];

      const tempVoucher: Voucher = {
          id: 'temp-preview',
          date: new Date().toISOString(),
          type: currentVoucherType,
          voucherNumber: 'PREVIEW',
          partyAccountId: voucherParty,
          lineItems: lineItems,
          narration: 'Preview',
          totalAmount: currentTotal
      };
      return postVoucherToLedger(tempVoucher, accounts);
  }, [voucherParty, lineItems, currentVoucherType, currentTotal, accounts]);

  const handleAddLineItem = () => {
    const newItem: VoucherLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      accountId: accounts.find(a => a.group === AccountGroup.INCOME || a.group === AccountGroup.EXPENSE)?.id || '',
      description: '',
      amount: 0,
      qty: 1,
      rate: 0,
      gstRate: 18,
      igst: 0,
      cgst: 0,
      sgst: 0,
      isDebit: currentVoucherType === VoucherType.PURCHASE || currentVoucherType === VoucherType.PAYMENT // Default logic
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (id: string, field: keyof VoucherLineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };

      // Auto-calc logic
      if (field === 'itemId') {
        const selectedItem = items.find(i => i.id === value);
        if (selectedItem) {
          updated.description = selectedItem.name;
          updated.rate = selectedItem.price;
          updated.gstRate = selectedItem.gstRate;
          // Map to default Sales/Purchase account based on context
          if (currentVoucherType === VoucherType.SALES) updated.accountId = 'acc_sales';
          if (currentVoucherType === VoucherType.PURCHASE) updated.accountId = 'acc_purchase';
        }
      }

      if (['qty', 'rate', 'gstRate'].includes(field) || field === 'itemId') {
        const baseAmt = updated.qty * updated.rate;
        updated.amount = baseAmt;
        
        // Simple GST Logic (Assuming intra-state for demo unless IGST flag set)
        const taxAmount = baseAmt * (updated.gstRate / 100);
        updated.cgst = taxAmount / 2;
        updated.sgst = taxAmount / 2;
        updated.igst = 0; // Keeping simple
      }
      return updated;
    }));
  };

  const saveVoucher = () => {
    if (!voucherParty || lineItems.length === 0) {
      alert("Please select a party and add items.");
      return;
    }

    const newVoucher: Voucher = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type: currentVoucherType,
      voucherNumber: `${currentVoucherType.toUpperCase().substring(0,3)}-${vouchers.length + 100}`,
      partyAccountId: voucherParty,
      lineItems: lineItems,
      narration: `Being ${currentVoucherType} entry made manually`,
      totalAmount: currentTotal
    };

    setVouchers([...vouchers, newVoucher]);
    setLineItems([]);
    setVoucherParty('');
    // Auto explain
    handleExplain(newVoucher);
    setActiveTab('dashboard'); // Redirect to dashboard to see the new entry
  };

  const handleExplain = async (voucher: Voucher) => {
    setIsExplaining(true);
    setExplanation("Thinking...");
    const text = await explainTransaction(voucher, accounts, "User just created this voucher.");
    setExplanation(text);
    setIsExplaining(false);
  };

  const generateDummyTransaction = () => {
    // Auto-generate a Sales Transaction
    const customer = accounts.find(a => a.subGroup === 'Sundry Debtor');
    const item = items[0];
    
    if(!customer) return;

    const dummyLine: VoucherLineItem = {
      id: Math.random().toString(),
      itemId: item.id,
      accountId: 'acc_sales',
      description: item.name,
      qty: 2,
      rate: item.price,
      amount: item.price * 2,
      gstRate: item.gstRate,
      cgst: (item.price * 2 * 0.09),
      sgst: (item.price * 2 * 0.09),
      igst: 0,
      isDebit: false
    };

    setLineItems([dummyLine]);
    setVoucherParty(customer.id);
    setCurrentVoucherType(VoucherType.SALES);
  };
  
  const handleTutorAsk = async () => {
      setTutorAnswer("Thinking...");
      const ans = await askAccountingTutor(tutorQuestion);
      setTutorAnswer(ans);
  }
  
  // --- Transaction Linking Logic ---
  const handleLinkTransaction = (voucher: Voucher, linkType: 'RECEIPT' | 'PAYMENT' | 'CN' | 'DN') => {
      let targetType = VoucherType.JOURNAL;
      let targetParty = ''; // Usually Cash/Bank for payments
      let lineAccount = voucher.partyAccountId; // The party to be cleared

      if (linkType === 'RECEIPT') {
          targetType = VoucherType.RECEIPT;
          // In receipt, Header = Bank (Dr), Line = Customer (Cr)
          // Find a bank account to default to
          targetParty = accounts.find(a => a.subGroup === AccountSubGroup.CASH_BANK)?.id || '';
      } else if (linkType === 'PAYMENT') {
          targetType = VoucherType.PAYMENT;
          // In payment, Header = Bank (Cr), Line = Vendor (Dr)
          targetParty = accounts.find(a => a.subGroup === AccountSubGroup.CASH_BANK)?.id || '';
      } else if (linkType === 'CN') {
          targetType = VoucherType.CREDIT_NOTE;
          targetParty = voucher.partyAccountId; // Same customer
      } else if (linkType === 'DN') {
          targetType = VoucherType.DEBIT_NOTE;
          targetParty = voucher.partyAccountId; // Same vendor
      }

      setCurrentVoucherType(targetType);
      setVoucherParty(targetParty);
      
      // Create a line item clearing the amount
      const newLine: VoucherLineItem = {
          id: Math.random().toString(),
          accountId: lineAccount, // The original party
          description: `Against ${voucher.type} #${voucher.voucherNumber}`,
          amount: voucher.totalAmount, // Default to full amount
          qty: 0, rate: 0, gstRate: 0, cgst: 0, sgst: 0, igst: 0,
          isDebit: linkType === 'PAYMENT' || linkType === 'DN' // Payment debits the party
      };

      setLineItems([newLine]);
      setActiveTab('voucher');
  };

  // --- Helpers for Educational UI ---
  const getRuleForAccount = (acc: Account, isDebit: boolean) => {
      // Basic Ind AS / Modern Approach
      if (acc.group === AccountGroup.ASSET) return isDebit ? "Asset Increasing ↑" : "Asset Decreasing ↓";
      if (acc.group === AccountGroup.LIABILITY) return isDebit ? "Liability Decreasing ↓" : "Liability Increasing ↑";
      if (acc.group === AccountGroup.EQUITY) return isDebit ? "Capital Decreasing ↓" : "Capital Increasing ↑";
      if (acc.group === AccountGroup.EXPENSE) return isDebit ? "Expense Increasing ↑" : "Expense Decreasing ↓";
      if (acc.group === AccountGroup.INCOME) return isDebit ? "Income Decreasing ↓" : "Income Increasing ↑";
      return "General Rule";
  };

  // --- Render Views ---

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <h4 className="text-indigo-100 font-medium mb-1">Total Transactions</h4>
          <p className="text-3xl font-bold">{vouchers.length}</p>
          <button onClick={() => setActiveTab('voucher')} className="mt-4 bg-white/20 hover:bg-white/30 text-sm py-1 px-3 rounded transition">
            + New Entry
          </button>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h4 className="text-slate-500 font-medium mb-1">Last Entry</h4>
          <p className="text-xl font-semibold text-slate-800">
            {vouchers.length > 0 ? vouchers[vouchers.length - 1].voucherNumber : "No Entries"}
          </p>
          <p className="text-sm text-slate-400">
            {vouchers.length > 0 ? vouchers[vouchers.length - 1].narration : "-"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h4 className="text-slate-500 font-medium mb-1">Learning Goal</h4>
          <p className="text-sm text-slate-600">
            Try creating a <b>Purchase</b>, then a <b>Sale</b>, then a <b>Payment</b> to see how money flows through the Balance Sheet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Vouchers</h3>
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Voucher #</th>
                            <th className="p-3">Type</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vouchers.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-400">No transactions yet.</td></tr>
                        ) : (
                            vouchers.slice().reverse().slice(0, 5).map(v => (
                                <tr key={v.id} className="border-t hover:bg-slate-50">
                                    <td className="p-3">{v.date}</td>
                                    <td className="p-3 font-mono text-indigo-600">{v.voucherNumber}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold 
                                            ${v.type === VoucherType.SALES ? 'bg-green-100 text-green-700' : 
                                              v.type === VoucherType.PURCHASE ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {v.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-mono">₹{v.totalAmount.toFixed(2)}</td>
                                    <td className="p-3 flex items-center gap-2">
                                        <button onClick={() => handleExplain(v)} className="text-xs text-indigo-600 hover:underline">Explain</button>
                                        
                                        {v.type === VoucherType.SALES && (
                                            <>
                                                <button title="Receive Payment" onClick={() => handleLinkTransaction(v, 'RECEIPT')} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                    <ArrowDownLeft size={16} />
                                                </button>
                                                <button title="Credit Note" onClick={() => handleLinkTransaction(v, 'CN')} className="p-1 text-slate-500 hover:bg-slate-100 rounded">
                                                    <FileText size={16} />
                                                </button>
                                            </>
                                        )}
                                        {v.type === VoucherType.PURCHASE && (
                                            <>
                                                <button title="Make Payment" onClick={() => handleLinkTransaction(v, 'PAYMENT')} className="p-1 text-orange-600 hover:bg-orange-50 rounded">
                                                    <ArrowUpRight size={16} />
                                                </button>
                                                <button title="Debit Note" onClick={() => handleLinkTransaction(v, 'DN')} className="p-1 text-slate-500 hover:bg-slate-100 rounded">
                                                    <FileText size={16} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* AI Explanation Box */}
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 h-fit sticky top-6">
            <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-amber-800">AI Tutor Insight</h3>
            </div>
            <div className="text-sm text-amber-900 leading-relaxed space-y-2 max-h-[400px] overflow-y-auto">
                {isExplaining ? (
                    <div className="animate-pulse">Analyzing transaction flow...</div>
                ) : explanation ? (
                    <div className="prose prose-sm prose-amber whitespace-pre-line">{explanation}</div>
                ) : (
                    <p>Select a transaction or create a new one to see the accounting logic, Golden Rules, and GST effects explained here.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );

  const renderVoucherEntry = () => {
    // Dynamic Compliance Logic
    const gstTax = lineItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0);
    const taxableValue = lineItems.reduce((s, i) => s + i.amount, 0);
    
    // E-Way Bill Rule: Consignment value > 50,000
    const needsEWayBill = currentTotal > 50000 && (currentVoucherType === VoucherType.SALES || currentVoucherType === VoucherType.PURCHASE);
    
    // E-Invoice Rule: B2B transaction (Simplified: assume Sundry Debtor is B2B)
    const party = accounts.find(a => a.id === voucherParty);
    const isB2B = party?.subGroup === AccountSubGroup.SUNDRY_DEBTOR || party?.subGroup === AccountSubGroup.SUNDRY_CREDITOR;
    const needsEInvoice = isB2B && (currentVoucherType === VoucherType.SALES || currentVoucherType === VoucherType.CREDIT_NOTE);

    return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">New Transaction</h2>
        <div className="flex gap-2">
            <button onClick={generateDummyTransaction} className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                <RefreshCw className="w-4 h-4" /> Auto-Fill Dummy
            </button>
            <button onClick={saveVoucher} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm">
                <Save className="w-4 h-4" /> Post Voucher
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Inputs */}
        <div className="lg:col-span-2 space-y-6">
            <Card title="Header Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Voucher Type</label>
                    <select 
                    value={currentVoucherType} 
                    onChange={(e) => {
                        setCurrentVoucherType(e.target.value as VoucherType);
                        setLineItems([]); // Clear lines on type switch for safety
                    }}
                    className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                    {Object.values(VoucherType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {currentVoucherType === VoucherType.SALES || currentVoucherType === VoucherType.RECEIPT ? 'Customer / Payer' : 'Supplier / Payee'}
                    </label>
                    <select 
                    value={voucherParty}
                    onChange={(e) => setVoucherParty(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                    >
                    <option value="">Select Party</option>
                    {accounts
                        .filter(a => {
                            if (currentVoucherType === VoucherType.SALES || currentVoucherType === VoucherType.RECEIPT) return a.subGroup === 'Sundry Debtor' || a.subGroup === 'Cash & Bank';
                            return a.subGroup === 'Sundry Creditor' || a.group === 'Expense' || a.subGroup === 'Cash & Bank';
                        })
                        .map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                    }
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input type="date" className="w-full p-2 rounded-lg border border-slate-300" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                </div>
            </Card>

            <Card title="Line Items">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="p-3 w-48">Item / Ledger</th>
                                <th className="p-3 w-20">Qty</th>
                                <th className="p-3 w-24">Rate</th>
                                <th className="p-3 w-32 text-right">Amount</th>
                                <th className="p-3 w-16 text-center">GST %</th>
                                <th className="p-3 w-24 text-right">Tax</th>
                                <th className="p-3 w-32 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lineItems.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="p-2">
                                        <select 
                                            className="w-full p-1 border rounded"
                                            value={item.itemId || item.accountId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Check if it's an item or account
                                                if (val.startsWith('item')) handleUpdateLineItem(item.id, 'itemId', val);
                                                else handleUpdateLineItem(item.id, 'accountId', val);
                                            }}
                                        >
                                            <option value="">Select Item / Account</option>
                                            <optgroup label="Items">
                                                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </optgroup>
                                            <optgroup label="Ledgers">
                                                 {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </optgroup>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="number" className="w-full p-1 border rounded text-right"
                                            value={item.qty}
                                            onChange={(e) => handleUpdateLineItem(item.id, 'qty', parseFloat(e.target.value))}
                                            disabled={!item.itemId} // Disable Qty for direct ledger lines usually
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="number" className="w-full p-1 border rounded text-right"
                                            value={item.rate || item.amount} // Fallback to amount if rate is 0
                                            onChange={(e) => {
                                                if(item.itemId) handleUpdateLineItem(item.id, 'rate', parseFloat(e.target.value));
                                                else handleUpdateLineItem(item.id, 'amount', parseFloat(e.target.value));
                                            }}
                                        />
                                    </td>
                                    <td className="p-2 text-right font-mono text-slate-600">
                                        {item.amount.toFixed(2)}
                                    </td>
                                    <td className="p-2 text-center text-xs text-slate-500">
                                        {item.gstRate}%
                                    </td>
                                    <td className="p-2 text-right text-xs text-slate-500">
                                        {(item.cgst + item.sgst + item.igst).toFixed(2)}
                                    </td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-800">
                                        {(item.amount + item.cgst + item.sgst + item.igst).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {lineItems.length === 0 && (
                                <tr><td colSpan={7} className="p-4 text-center text-slate-400">No items added.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <button onClick={handleAddLineItem} className="mt-4 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    <Plus className="w-4 h-4" /> Add Line Item
                </button>
            </Card>
        </div>

        {/* Right Side: Learning & Impact Analysis */}
        <div className="space-y-6">
             {/* 1. Live Journal Preview */}
             <div className="bg-slate-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BookOpen size={100} />
                </div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
                    Live Journal Preview
                </h3>
                
                {previewLedgerEntries.length > 0 ? (
                    <div className="space-y-3 font-mono text-sm relative z-10">
                        {/* Group Debits first */}
                        {previewLedgerEntries.filter(e => e.debit > 0).map(e => {
                            const acc = accounts.find(a => a.id === e.accountId);
                            return (
                                <div key={e.id} className="flex justify-between items-start group relative cursor-help">
                                    <div className="flex flex-col">
                                        <span className="text-emerald-300 font-semibold">{acc?.name || e.accountId}</span>
                                        <span className="text-[10px] text-slate-400">Dr</span>
                                    </div>
                                    <span className="text-emerald-300">₹{e.debit.toFixed(2)}</span>
                                    
                                    {/* Tooltip for why */}
                                    {acc && (
                                        <div className="absolute left-0 bottom-full mb-1 w-48 p-2 bg-black text-xs text-white rounded hidden group-hover:block z-20 shadow-xl border border-slate-600">
                                            <p className="font-bold text-emerald-400">Why Debit?</p>
                                            {getRuleForAccount(acc, true)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {/* Group Credits */}
                        {previewLedgerEntries.filter(e => e.credit > 0).map(e => {
                            const acc = accounts.find(a => a.id === e.accountId);
                            return (
                                <div key={e.id} className="flex justify-between items-start pl-8 group relative cursor-help">
                                    <div className="flex flex-col">
                                        <span className="text-slate-200">To {acc?.name || e.accountId}</span>
                                        <span className="text-[10px] text-slate-400">Cr</span>
                                    </div>
                                    <span className="text-slate-200">₹{e.credit.toFixed(2)}</span>

                                    {/* Tooltip for why */}
                                    {acc && (
                                        <div className="absolute right-0 bottom-full mb-1 w-48 p-2 bg-black text-xs text-white rounded hidden group-hover:block z-20 shadow-xl border border-slate-600">
                                            <p className="font-bold text-red-400">Why Credit?</p>
                                            {getRuleForAccount(acc, false)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        <div className="pt-3 border-t border-slate-600 mt-2 flex justify-between text-xs text-slate-400">
                            <span>Total</span>
                            <span>₹{currentTotal.toFixed(2)}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-400 text-sm italic">Add items to see the accounting entry in real-time.</p>
                )}
            </div>

            {/* 2. Compliance & Tax Checker */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> Compliance Check
                </h3>
                
                <div className="space-y-4">
                     {/* E-Way Bill Status */}
                     <div className={`p-3 rounded-lg border flex items-start gap-3 ${needsEWayBill ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                        {needsEWayBill ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> : <CheckCircle className="w-5 h-5 text-slate-400 shrink-0" />}
                        <div>
                            <p className={`text-sm font-semibold ${needsEWayBill ? 'text-amber-800' : 'text-slate-600'}`}>
                                E-Way Bill: {needsEWayBill ? 'Required' : 'Not Required'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Threshold is ₹50,000 for Goods. Current Value: ₹{currentTotal.toFixed(0)}.
                            </p>
                        </div>
                     </div>

                     {/* E-Invoice Status */}
                     <div className={`p-3 rounded-lg border flex items-start gap-3 ${needsEInvoice ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                        <Info className={`w-5 h-5 shrink-0 ${needsEInvoice ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div>
                            <p className={`text-sm font-semibold ${needsEInvoice ? 'text-indigo-800' : 'text-slate-600'}`}>
                                E-Invoice: {needsEInvoice ? 'Applicable' : 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Mandatory for B2B transactions if turnover &gt; Limit.
                            </p>
                        </div>
                     </div>

                     {/* Tax Summary */}
                     <div className="border-t pt-4 mt-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Taxable Value</span>
                            <span className="font-mono">₹{taxableValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-600">Total Tax (GST)</span>
                            <span className="font-mono text-red-600">+ ₹{gstTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800 mt-2 pt-2 border-t border-dashed">
                            <span>Grand Total</span>
                            <span className="font-mono">₹{currentTotal.toFixed(2)}</span>
                        </div>
                     </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )};

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">L</div>
          <span className="font-bold text-xl text-slate-800">LearnERP</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'voucher'} onClick={() => setActiveTab('voucher')} icon={<Receipt size={20} />} label="Vouchers" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<BookOpen size={20} />} label="Financial Reports" />
          <NavItem active={activeTab === 'gst'} onClick={() => setActiveTab('gst')} icon={<Calculator size={20} />} label="GST Reports" />
          <NavItem active={activeTab === 'masters'} onClick={() => setActiveTab('masters')} icon={<Settings size={20} />} label="Masters" />
          <NavItem active={activeTab === 'tutor'} onClick={() => setActiveTab('tutor')} icon={<HelpCircle size={20} />} label="AI Tutor Chat" />
        </nav>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
           <p className="text-xs text-slate-400 text-center">Ind AS Learning Edition v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800 capitalize">
              {activeTab === 'gst' ? 'GST Analysis' : activeTab}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
                {activeTab === 'voucher' ? 'Create, View and Learn Transactions' : 'Real-time Accounting Effects'}
            </span>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'voucher' && renderVoucherEntry()}
          {activeTab === 'reports' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                  <div className="flex space-x-2 border-b border-slate-200 mb-6">
                      <button 
                        onClick={() => setReportSubTab('tb')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reportSubTab === 'tb' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
                      >
                          Trial Balance
                      </button>
                      <button 
                        onClick={() => setReportSubTab('pl')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reportSubTab === 'pl' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
                      >
                          Profit & Loss
                      </button>
                      <button 
                        onClick={() => setReportSubTab('ledger')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${reportSubTab === 'ledger' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
                      >
                          Ledger Book
                      </button>
                  </div>

                  {reportSubTab === 'tb' && <TrialBalanceView entries={ledgerEntries} accounts={accounts} />}
                  {reportSubTab === 'pl' && <ProfitLossView entries={ledgerEntries} accounts={accounts} />}
                  {reportSubTab === 'ledger' && <LedgerBookView entries={ledgerEntries} accounts={accounts} />}
              </div>
          )}
          {activeTab === 'gst' && (
              <div className="max-w-4xl mx-auto">
                  <GSTReportView entries={ledgerEntries} accounts={accounts} />
              </div>
          )}
          {activeTab === 'tutor' && (
             <div className="max-w-2xl mx-auto h-[600px] flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                 <div className="bg-indigo-600 p-4 text-white">
                     <h3 className="font-bold flex items-center gap-2"><HelpCircle/> Accounting Tutor</h3>
                     <p className="text-xs opacity-80">Ask about Journal entries, GST rules, or Ind AS standards.</p>
                 </div>
                 <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
                     {tutorAnswer && (
                         <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                             <span className="text-xs font-bold text-indigo-600 block mb-1">Tutor:</span>
                             <p className="text-slate-800 whitespace-pre-wrap">{tutorAnswer}</p>
                         </div>
                     )}
                 </div>
                 <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
                     <input 
                        className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., What is the journal entry for depreciation?"
                        value={tutorQuestion}
                        onChange={e => setTutorQuestion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTutorAsk()}
                     />
                     <button onClick={handleTutorAsk} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700">Ask</button>
                 </div>
             </div>
          )}
          
          {/* Simple Masters View */}
          {activeTab === 'masters' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card title="Ledger Accounts">
                      <ul className="divide-y divide-slate-100 h-96 overflow-y-auto">
                          {accounts.map(a => (
                              <li key={a.id} className="py-3 flex justify-between items-center text-sm">
                                  <div>
                                      <p className="font-medium text-slate-800">{a.name}</p>
                                      <p className="text-xs text-slate-500">{a.group} &gt; {a.subGroup}</p>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  </Card>
                  <Card title="Stock Items">
                      <ul className="divide-y divide-slate-100 h-96 overflow-y-auto">
                          {items.map(i => (
                              <li key={i.id} className="py-3 flex justify-between items-center text-sm">
                                  <div>
                                      <p className="font-medium text-slate-800">{i.name}</p>
                                      <p className="text-xs text-slate-500">HSN: {i.hsnCode} | GST: {i.gstRate}%</p>
                                  </div>
                                  <span className="font-mono">₹{i.price}</span>
                              </li>
                          ))}
                      </ul>
                  </Card>
              </div>
          )}
        </div>
      </main>
    </div>
  );
}