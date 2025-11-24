import React, { useMemo, useState } from 'react';
import { LedgerEntry, Account, TrialBalanceRow, AccountGroup, VoucherType } from '../types';
import { generateTrialBalance, getProfitAndLoss } from '../services/accountingEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Search } from 'lucide-react';

interface ReportsProps {
  entries: LedgerEntry[];
  accounts: Account[];
}

export const TrialBalanceView: React.FC<ReportsProps> = ({ entries, accounts }) => {
  const data = useMemo(() => generateTrialBalance(entries, accounts), [entries, accounts]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Trial Balance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
            <tr>
              <th className="p-3">Account Name</th>
              <th className="p-3 text-right">Debit (₹)</th>
              <th className="p-3 text-right">Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.accountId} className="border-b hover:bg-slate-50">
                <td className="p-3">{row.accountName}</td>
                <td className="p-3 text-right font-mono text-emerald-600">
                  {row.netDebit > 0 ? row.netDebit.toFixed(2) : '-'}
                </td>
                <td className="p-3 text-right font-mono text-red-600">
                  {row.netCredit > 0 ? row.netCredit.toFixed(2) : '-'}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
              <td className="p-3">Total</td>
              <td className="p-3 text-right text-emerald-700">
                {data.reduce((s, r) => s + r.netDebit, 0).toFixed(2)}
              </td>
              <td className="p-3 text-right text-red-700">
                {data.reduce((s, r) => s + r.netCredit, 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ProfitLossView: React.FC<ReportsProps> = ({ entries, accounts }) => {
  const tb = useMemo(() => generateTrialBalance(entries, accounts), [entries, accounts]);
  const { income, expense, netProfit } = useMemo(() => getProfitAndLoss(tb, accounts), [tb, accounts]);

  const chartData = [
    { name: 'Income', value: income, fill: '#10b981' }, // emerald-500
    { name: 'Expense', value: expense, fill: '#ef4444' }, // red-500
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Profit & Loss Statement</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded text-emerald-900">
            <span className="font-semibold">Total Revenue (Income)</span>
            <span className="text-xl font-mono">₹{income.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded text-red-900">
            <span className="font-semibold">Total Expenses</span>
            <span className="text-xl font-mono">₹{expense.toFixed(2)}</span>
          </div>
          <hr />
          <div className={`flex justify-between items-center p-4 rounded-lg text-white ${netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
            <span className="font-bold text-lg">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
            <span className="text-2xl font-bold font-mono">₹{Math.abs(netProfit).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-80">
        <h3 className="text-lg font-semibold mb-4">Income vs Expense</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const LedgerBookView: React.FC<ReportsProps> = ({ entries, accounts }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const accountEntries = useMemo(() => {
    if (!selectedAccountId) return [];
    // Sort by date/id usually, here we assume entries are chronological
    return entries.filter(e => e.accountId === selectedAccountId);
  }, [entries, selectedAccountId]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  let runningBalance = selectedAccount?.openingBalance || 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 min-h-[500px]">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Ledger Book</h3>
            <p className="text-sm text-slate-500">View detailed transactions for a specific account</p>
          </div>
          <div className="relative w-full md:w-64">
             <select 
               className="w-full p-2 pl-3 border rounded-lg appearance-none bg-slate-50"
               value={selectedAccountId}
               onChange={(e) => setSelectedAccountId(e.target.value)}
             >
                <option value="">Select Account...</option>
                {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                ))}
             </select>
          </div>
       </div>

       {!selectedAccountId ? (
           <div className="text-center py-12 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-300">
               <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
               <p>Please select an account to view its ledger.</p>
           </div>
       ) : (
           <div className="overflow-x-auto">
               <div className="mb-4 p-3 bg-slate-50 rounded border border-slate-200 flex gap-6 text-sm">
                   <div>
                       <span className="text-slate-500 block">Group</span>
                       <span className="font-semibold text-slate-800">{selectedAccount?.group}</span>
                   </div>
                   <div>
                       <span className="text-slate-500 block">Sub-Group</span>
                       <span className="font-semibold text-slate-800">{selectedAccount?.subGroup}</span>
                   </div>
                   <div>
                       <span className="text-slate-500 block">Opening Balance</span>
                       <span className="font-semibold text-slate-800">₹{selectedAccount?.openingBalance.toFixed(2)}</span>
                   </div>
               </div>

               <table className="w-full text-sm text-left">
                   <thead className="bg-indigo-50 text-indigo-900 font-semibold border-b border-indigo-100">
                       <tr>
                           <th className="p-3">Date</th>
                           <th className="p-3">Particulars</th>
                           <th className="p-3">Vch Type</th>
                           <th className="p-3 text-right">Debit</th>
                           <th className="p-3 text-right">Credit</th>
                           <th className="p-3 text-right bg-indigo-100">Balance</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {/* Opening Balance Row */}
                       <tr className="bg-slate-50/50 italic text-slate-500">
                           <td className="p-3">-</td>
                           <td className="p-3">Opening Balance</td>
                           <td className="p-3">-</td>
                           <td className="p-3 text-right">{runningBalance > 0 ? runningBalance.toFixed(2) : '-'}</td>
                           <td className="p-3 text-right">{runningBalance < 0 ? Math.abs(runningBalance).toFixed(2) : '-'}</td>
                           <td className="p-3 text-right font-mono font-bold">{Math.abs(runningBalance).toFixed(2)} {runningBalance >= 0 ? 'Dr' : 'Cr'}</td>
                       </tr>
                       
                       {accountEntries.map(entry => {
                           // Basic running balance logic:
                           // Asset/Expense: Dr adds, Cr subs.
                           // Liability/Income: Cr adds, Dr subs.
                           // For simplicity in display: We track net value (Positive = Dr, Negative = Cr)
                           runningBalance = runningBalance + entry.debit - entry.credit;
                           
                           return (
                               <tr key={entry.id} className="hover:bg-slate-50">
                                   <td className="p-3 text-slate-600">{entry.date}</td>
                                   <td className="p-3 text-slate-800">{entry.description}</td>
                                   <td className="p-3">
                                       <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                           {entry.voucherType}
                                       </span>
                                   </td>
                                   <td className="p-3 text-right text-emerald-600">
                                       {entry.debit > 0 ? entry.debit.toFixed(2) : '-'}
                                   </td>
                                   <td className="p-3 text-right text-red-600">
                                       {entry.credit > 0 ? entry.credit.toFixed(2) : '-'}
                                   </td>
                                   <td className="p-3 text-right font-mono font-bold bg-slate-50">
                                       {Math.abs(runningBalance).toFixed(2)} 
                                       <span className="text-xs text-slate-400 ml-1">{runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                   </td>
                               </tr>
                           );
                       })}
                   </tbody>
               </table>
           </div>
       )}
    </div>
  );
}

export const GSTReportView: React.FC<ReportsProps> = ({ entries }) => {
  // Simple aggregation for GST
  const gstEntries = entries.filter(e => 
    e.accountId.includes('cgst') || e.accountId.includes('sgst') || e.accountId.includes('igst')
  );

  const inputTax = gstEntries
    .filter(e => e.accountId.includes('input') && e.debit > 0)
    .reduce((sum, e) => sum + e.debit, 0);

  const outputTax = gstEntries
    .filter(e => e.accountId.includes('output') && e.credit > 0)
    .reduce((sum, e) => sum + e.credit, 0);

  const payable = outputTax - inputTax;

  const chartData = [
    { name: 'Input Tax Credit', value: inputTax },
    { name: 'Output Liability', value: outputTax },
  ];
  const COLORS = ['#3b82f6', '#f59e0b'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h4 className="text-blue-800 font-semibold">Total Input Tax Credit (Asset)</h4>
          <p className="text-2xl font-mono text-blue-900">₹{inputTax.toFixed(2)}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded border border-amber-200">
          <h4 className="text-amber-800 font-semibold">Total Output Tax (Liability)</h4>
          <p className="text-2xl font-mono text-amber-900">₹{outputTax.toFixed(2)}</p>
        </div>
        <div className={`p-4 rounded border ${payable > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <h4 className={`${payable > 0 ? 'text-red-800' : 'text-green-800'} font-semibold`}>
            {payable > 0 ? 'Net GST Payable' : 'Net Refundable'}
          </h4>
          <p className="text-2xl font-mono">₹{Math.abs(payable).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded border border-slate-200">
        <h3 className="text-lg font-bold mb-2">GST Explanation</h3>
        <p className="text-slate-600 mb-4">
          GST is a destination-based tax. 
          <br/>- <b>Input Tax:</b> Tax paid on purchases. It is an Asset because you can set it off against liability.
          <br/>- <b>Output Tax:</b> Tax collected on sales. It is a Liability because you owe it to the government.
          <br/>- <b>Net Payable:</b> Output Tax - Input Tax.
        </p>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};