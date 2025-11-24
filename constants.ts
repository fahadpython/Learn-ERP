import { Account, AccountGroup, AccountSubGroup, Item } from './types';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc_cash', name: 'Cash in Hand', group: AccountGroup.ASSET, subGroup: AccountSubGroup.CASH_BANK, openingBalance: 50000 },
  { id: 'acc_hdfc', name: 'HDFC Bank', group: AccountGroup.ASSET, subGroup: AccountSubGroup.CASH_BANK, openingBalance: 150000 },
  { id: 'acc_sales', name: 'Sales Account', group: AccountGroup.INCOME, subGroup: AccountSubGroup.SALES_ACCOUNT, openingBalance: 0 },
  { id: 'acc_purchase', name: 'Purchase Account', group: AccountGroup.EXPENSE, subGroup: AccountSubGroup.PURCHASE_ACCOUNT, openingBalance: 0 },
  { id: 'acc_customer_a', name: 'Tech Solutions Ltd (Customer)', group: AccountGroup.ASSET, subGroup: AccountSubGroup.SUNDRY_DEBTOR, openingBalance: 0 },
  { id: 'acc_vendor_x', name: 'Office Mart (Supplier)', group: AccountGroup.LIABILITY, subGroup: AccountSubGroup.SUNDRY_CREDITOR, openingBalance: 0 },
  { id: 'acc_input_cgst', name: 'Input CGST', group: AccountGroup.ASSET, subGroup: AccountSubGroup.DUTIES_TAXES, openingBalance: 0 },
  { id: 'acc_input_sgst', name: 'Input SGST', group: AccountGroup.ASSET, subGroup: AccountSubGroup.DUTIES_TAXES, openingBalance: 0 },
  { id: 'acc_input_igst', name: 'Input IGST', group: AccountGroup.ASSET, subGroup: AccountSubGroup.DUTIES_TAXES, openingBalance: 0 },
  { id: 'acc_output_cgst', name: 'Output CGST', group: AccountGroup.LIABILITY, subGroup: AccountSubGroup.DUTIES_TAXES, openingBalance: 0 },
  { id: 'acc_output_sgst', name: 'Output SGST', group: AccountGroup.LIABILITY, subGroup: AccountSubGroup.DUTIES_TAXES, openingBalance: 0 },
  { id: 'acc_output_igst', name: 'Output IGST', group: AccountGroup.LIABILITY, subGroup: AccountSubGroup.DUTIES_TAXES, openingBalance: 0 },
  { id: 'acc_electricity', name: 'Electricity Expense', group: AccountGroup.EXPENSE, subGroup: AccountSubGroup.INDIRECT_EXPENSE, openingBalance: 0 },
];

export const DEFAULT_ITEMS: Item[] = [
  { id: 'item_laptop', name: 'Dell Laptop', hsnCode: '8471', price: 45000, gstRate: 18, unit: 'Nos' },
  { id: 'item_mouse', name: 'Logitech Mouse', hsnCode: '8471', price: 500, gstRate: 18, unit: 'Nos' },
  { id: 'item_service', name: 'Consulting Service', hsnCode: '9983', price: 5000, gstRate: 18, unit: 'Hrs' },
  { id: 'item_paper', name: 'A4 Paper Rim', hsnCode: '4802', price: 200, gstRate: 12, unit: 'Pkt' },
];
