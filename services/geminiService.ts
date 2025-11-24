import { GoogleGenAI } from "@google/genai";
import { Voucher, VoucherType, Account } from '../types';

let aiClient: GoogleGenAI | null = null;

// Initialize strictly with process.env.API_KEY
if (process.env.API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const explainTransaction = async (voucher: Voucher, accounts: Account[], context: string): Promise<string> => {
  if (!aiClient) return "API Key not configured.";

  const accountMap = accounts.reduce((acc, curr) => ({...acc, [curr.id]: curr.name}), {} as Record<string, string>);

  const prompt = `
    You are an expert Indian Accounting Tutor.
    Explain the following transaction to a student learning accounting.
    
    Context: ${context}
    
    Transaction Data:
    Type: ${voucher.type}
    Total Amount: ₹${voucher.totalAmount}
    Party: ${accountMap[voucher.partyAccountId] || 'Unknown'}
    
    Items/Ledgers involved:
    ${voucher.lineItems.map(item => `- ${item.description} (Amount: ${item.amount}, GST: ${item.gstRate}%)`).join('\n')}

    Please explain:
    1. The "Golden Rules of Accounting" applied here (Real, Personal, Nominal).
    2. Which accounts are Debited and Credited and WHY.
    3. The GST implication (Input vs Output Tax).
    4. How this affects the Financial Reports (P&L vs Balance Sheet).

    Keep it concise, encouraging, and use simple language.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate explanation.";
  } catch (error) {
    console.error("Gemini API Error", error);
    return "Error generating explanation. Please check your API usage.";
  }
};

export const askAccountingTutor = async (question: string): Promise<string> => {
    if (!aiClient) return "API Key not configured.";
    
    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a helpful Indian Chartered Accountant tutor. Answer this concisely: ${question}`,
        });
        return response.text || "No response.";
    } catch (e) {
        return "Error reaching tutor.";
    }
}
