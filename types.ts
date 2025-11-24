// Accounting Types

export enum AccountGroup {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  INCOME = 'Income',
  EXPENSE = 'Expense',
}

export enum AccountSubGroup {
  CURRENT_ASSET = 'Current Asset',
  FIXED_ASSET = 'Fixed Asset',
  CASH_BANK = 'Cash & Bank',
  SUNDRY_DEBTOR = 'Sundry Debtor', // Customers
  SUNDRY_CREDITOR = 'Sundry Creditor', // Suppliers
  DUTIES_TAXES = 'Duties & Taxes',
  SALES_ACCOUNT = 'Sales Account',
  PURCHASE_ACCOUNT = 'Purchase Account',
  INDIRECT_EXPENSE = 'Indirect Expense',
  DIRECT_EXPENSE = 'Direct Expense',
  CAPITAL_ACCOUNT = 'Capital Account',
}

export interface Account {
  id: string;
  name: string;
  group: AccountGroup;
  subGroup: AccountSubGroup;
  openingBalance: number; // Dr is positive, Cr is negative generally, or handle via type
}

export interface Item {
  id: string;
  name: string;
  hsnCode: string;
  price: number;
  gstRate: number; // e.g., 18
  unit: string;
}

export enum VoucherType {
  SALES = 'Sales',
  PURCHASE = 'Purchase',
  PAYMENT = 'Payment',
  RECEIPT = 'Receipt',
  CONTRA = 'Contra',
  JOURNAL = 'Journal',
  DEBIT_NOTE = 'Debit Note',
  CREDIT_NOTE = 'Credit Note',
  EXPENSE = 'Expense',
}

export interface VoucherLineItem {
  id: string;
  itemId?: string; // Optional if direct ledger posting
  accountId: string;
  description: string;
  amount: number;
  qty: number;
  rate: number;
  gstRate: number;
  igst: number;
  cgst: number;
  sgst: number;
  isDebit: boolean;
}

export interface Voucher {
  id: string;
  date: string;
  type: VoucherType;
  voucherNumber: string;
  partyAccountId: string; // The main party (Dr for Sales, Cr for Purchase)
  lineItems: VoucherLineItem[];
  narration: string;
  totalAmount: number;
}

// Derived Types for Reporting
export interface LedgerEntry {
  id: string;
  date: string;
  voucherId: string;
  voucherType: VoucherType;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountName: string;
  debitTotal: number;
  creditTotal: number;
  netDebit: number;
  netCredit: number;
}

export interface GSTReportRow {
  gstin: string; // Dummy for now
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  type: 'Input' | 'Output';
}
