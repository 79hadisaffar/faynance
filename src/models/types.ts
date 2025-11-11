// انواع داده‌های برنامه مدیریت مالی

export interface Installment {
  id?: number;
  title: string;
  totalAmount: number;
  installmentCount: number;
  paidCount: number;
  installmentAmount: number;
  startDate: string;
  dueDay: number; // روز سررسید هر ماه
  description: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentPayment {
  id?: number;
  installmentId: number;
  monthIndex: number; // 1-based
  dueDate: string; // ISO string
  isPaid: boolean;
  paidAt?: string | null; // ISO string
}

export interface Debt {
  id?: number;
  personName: string;
  amount: number;
  phone?: string;
  description: string;
  dueDate: string;
  isPaid: boolean;
  reminderDays: number; // چند روز قبل یادآوری بده
  createdAt: string;
  updatedAt: string;
}

export interface Credit {
  id?: number;
  personName: string;
  amount: number;
  phone?: string;
  description: string;
  dueDate: string;
  isReceived: boolean;
  reminderDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Check {
  id?: number;
  checkNumber: string;
  amount: number;
  bankName: string;
  dueDate: string;
  type: 'receivable' | 'payable'; // دریافتی یا پرداختی
  status: 'pending' | 'cashed' | 'bounced'; // در انتظار، نقد شده، برگشتی
  personName: string;
  description: string;
  reminderDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id?: number;
  title: string;
  message: string;
  dueDate: string;
  isActive: boolean;
  itemType: 'installment' | 'debt' | 'credit' | 'check';
  itemId: number;
  createdAt: string;
}

export interface FinancialSummary {
  totalDebts: number;
  totalCredits: number;
  totalPendingChecks: number;
  totalUpcomingInstallments: number;
  netBalance: number;
}

export interface Expense {
  id?: number;
  title: string;
  amount: number;
  dueDate: string; // ISO string (date only)
  description: string;
  reminderDays: number; // days before dueDate
  createdAt: string;
  updatedAt: string;
}

// حساب/کارت بانکی (آفلاین)
export interface Account {
  id?: number;
  title: string; // نام حساب/کارت برای نمایش
  bankName?: string;
  cardLast4?: string; // چهار رقم آخر کارت (برای تطبیق پیامک)
  balance: number; // موجودی به تومان
  createdAt: string;
  updatedAt: string;
}

// نتیجه پارس پیامک‌ها برای موجودی کارت‌ها
export type ParsedSmsBalance = {
  cardLast4: string;
  balance: number;
};
