import { 
  Account, Voucher, VoucherType, LedgerEntry, TrialBalanceRow, AccountGroup 
} from '../types';

/**
 * Transforms a high-level Voucher into double-entry Ledger entries.
 * This is the "Posting" process in accounting.
 */
export const postVoucherToLedger = (voucher: Voucher, accounts: Account[]): LedgerEntry[] => {
  const entries: LedgerEntry[] = [];
  let entryIdCounter = 1;

  const createEntry = (accountId: string, dr: number, cr: number, desc: string): LedgerEntry => ({
    id: `${voucher.id}-${entryIdCounter++}`,
    date: voucher.date,
    voucherId: voucher.id,
    voucherType: voucher.type,
    accountId,
    description: desc,
    debit: dr,
    credit: cr,
  });

  // Logic based on Voucher Type
  if (voucher.type === VoucherType.SALES) {
    // 1. Party Account (Debtor) - DEBIT
    entries.push(createEntry(voucher.partyAccountId, voucher.totalAmount, 0, `Sales Invoice #${voucher.voucherNumber}`));

    // 2. Sales Accounts & GST Output (Credit)
    voucher.lineItems.forEach(item => {
      // Net Sales Amount to Sales Account
      entries.push(createEntry(item.accountId, 0, item.amount, `Sales: ${item.description}`));
      
      // Output Tax Duties
      if (item.igst > 0) entries.push(createEntry('acc_output_igst', 0, item.igst, `Output IGST on ${item.description}`));
      if (item.cgst > 0) entries.push(createEntry('acc_output_cgst', 0, item.cgst, `Output CGST on ${item.description}`));
      if (item.sgst > 0) entries.push(createEntry('acc_output_sgst', 0, item.sgst, `Output SGST on ${item.description}`));
    });

  } else if (voucher.type === VoucherType.PURCHASE) {
    // 1. Party Account (Creditor) - CREDIT
    entries.push(createEntry(voucher.partyAccountId, 0, voucher.totalAmount, `Purchase Invoice #${voucher.voucherNumber}`));

    // 2. Purchase Accounts & GST Input (Debit)
    voucher.lineItems.forEach(item => {
      entries.push(createEntry(item.accountId, item.amount, 0, `Purchase: ${item.description}`));
      
      if (item.igst > 0) entries.push(createEntry('acc_input_igst', item.igst, 0, `Input IGST on ${item.description}`));
      if (item.cgst > 0) entries.push(createEntry('acc_input_cgst', item.cgst, 0, `Input CGST on ${item.description}`));
      if (item.sgst > 0) entries.push(createEntry('acc_input_sgst', item.sgst, 0, `Input SGST on ${item.description}`));
    });

  } else if (voucher.type === VoucherType.RECEIPT) {
    // Bank/Cash (Asset) - DEBIT
    // Payer (Debtor) - CREDIT
    const totalReceipt = voucher.lineItems.reduce((sum, item) => sum + item.amount, 0); // Receipts usually don't have GST on top line
    
    // Assuming the "Party" is the payer, and line items define where money went (usually bank)
    // However, in standard Tally/ERP: Header is "Bank", Lines are "Parties".
    // Let's assume Voucher.partyAccountId is the BANK/CASH account receiving money.
    entries.push(createEntry(voucher.partyAccountId, totalReceipt, 0, `Receipt from parties`));

    voucher.lineItems.forEach(item => {
      entries.push(createEntry(item.accountId, 0, item.amount, `Received from ${item.description}`));
    });

  } else if (voucher.type === VoucherType.PAYMENT) {
    // Bank/Cash (Asset) - CREDIT
    // Payee (Creditor) - DEBIT
    const totalPayment = voucher.lineItems.reduce((sum, item) => sum + item.amount, 0);
    entries.push(createEntry(voucher.partyAccountId, 0, totalPayment, `Payment to parties`));

    voucher.lineItems.forEach(item => {
      entries.push(createEntry(item.accountId, item.amount, 0, `Paid to ${item.description}`));
    });
  }

  // ... simplified handling for other types
  
  return entries;
};

export const generateTrialBalance = (entries: LedgerEntry[], accounts: Account[]): TrialBalanceRow[] => {
  const map = new Map<string, TrialBalanceRow>();

  // Initialize with accounts
  accounts.forEach(acc => {
    map.set(acc.id, {
      accountId: acc.id,
      accountName: acc.name,
      debitTotal: 0,
      creditTotal: 0,
      netDebit: 0,
      netCredit: 0
    });
  });

  // Sum entries
  entries.forEach(entry => {
    const row = map.get(entry.accountId);
    if (row) {
      row.debitTotal += entry.debit;
      row.creditTotal += entry.credit;
    }
  });

  // Calculate Nets
  const result: TrialBalanceRow[] = [];
  map.forEach(row => {
    if (row.debitTotal > row.creditTotal) {
      row.netDebit = row.debitTotal - row.creditTotal;
    } else {
      row.netCredit = row.creditTotal - row.debitTotal;
    }
    // Only include if there's activity or balance
    if (row.debitTotal !== 0 || row.creditTotal !== 0) {
        result.push(row);
    }
  });

  return result;
};

export const getProfitAndLoss = (tb: TrialBalanceRow[], accounts: Account[]) => {
  let income = 0;
  let expense = 0;

  tb.forEach(row => {
    const acc = accounts.find(a => a.id === row.accountId);
    if (acc) {
      if (acc.group === AccountGroup.INCOME) income += row.netCredit;
      if (acc.group === AccountGroup.EXPENSE) expense += row.netDebit;
    }
  });

  return { income, expense, netProfit: income - expense };
};
