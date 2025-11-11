import * as SQLite from 'expo-sqlite';
import { Installment, Debt, Credit, Check, Reminder, InstallmentPayment, Expense, Account } from '../models/types';
import { generateMonthlySchedule } from '../utils/helpers';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('finance.db');
      // بهبودهای SQLite برای قابلیت اطمینان و کارایی
      try {
        await this.db.execAsync('PRAGMA foreign_keys = ON;');
        await this.db.execAsync('PRAGMA journal_mode = WAL;');
        await this.db.execAsync('PRAGMA synchronous = NORMAL;');
        await this.db.execAsync('PRAGMA busy_timeout = 3000;');
      } catch (e) {
        // در برخی دستگاه‌ها/نسخه‌ها ممکن است همه پراگماها پشتیبانی نشوند
        console.warn('SQLite PRAGMA setup warning:', e);
      }
      await this.createTables();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    // جدول اقساط
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        installmentCount INTEGER NOT NULL,
        paidCount INTEGER DEFAULT 0,
        installmentAmount REAL NOT NULL,
        startDate TEXT NOT NULL,
        dueDay INTEGER NOT NULL,
        description TEXT,
        isPaid INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // پرداخت‌های هر قسط (ماه‌به‌ماه)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS installment_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        installmentId INTEGER NOT NULL,
        monthIndex INTEGER NOT NULL,
        dueDate TEXT NOT NULL,
        isPaid INTEGER DEFAULT 0,
        paidAt TEXT,
        UNIQUE(installmentId, monthIndex)
      );
    `);

    // جدول بدهی‌ها
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        personName TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        dueDate TEXT NOT NULL,
        isPaid INTEGER DEFAULT 0,
        reminderDays INTEGER DEFAULT 3,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    // ایندکس‌ها برای بهبود کارایی جستجو و مرتب‌سازی
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_debts_dueDate ON debts(dueDate);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_debts_isPaid ON debts(isPaid);`);

    // جدول طلب‌ها
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT,
        personName TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        dueDate TEXT NOT NULL,
        isReceived INTEGER DEFAULT 0,
        reminderDays INTEGER DEFAULT 3,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_credits_dueDate ON credits(dueDate);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_credits_isReceived ON credits(isReceived);`);

    // If older DB exists without 'phone' column, attempt to add it (safe migration)
    try {
      const debtCols = await this.db.getAllAsync<any>("PRAGMA table_info('debts');");
      if (!debtCols.find((c: any) => c.name === 'phone')) {
        await this.db.execAsync("ALTER TABLE debts ADD COLUMN phone TEXT;");
      }
    } catch (e) {}
    try {
      const credCols = await this.db.getAllAsync<any>("PRAGMA table_info('credits');");
      if (!credCols.find((c: any) => c.name === 'phone')) {
        await this.db.execAsync("ALTER TABLE credits ADD COLUMN phone TEXT;");
      }
    } catch (e) {}

    // جدول چک‌ها
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkNumber TEXT NOT NULL,
        amount REAL NOT NULL,
        bankName TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        personName TEXT NOT NULL,
        description TEXT,
        reminderDays INTEGER DEFAULT 3,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_checks_dueDate ON checks(dueDate);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_checks_status ON checks(status);`);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_checks_type ON checks(type);`);

    // جدول یادآورها
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        itemType TEXT NOT NULL,
        itemId INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    // جدول مخارج
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        dueDate TEXT NOT NULL,
        description TEXT,
        reminderDays INTEGER DEFAULT 3,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_expenses_dueDate ON expenses(dueDate);`);

    // پرداخت‌های اقساط: ایندکس روی dueDate
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_installment_payments_dueDate ON installment_payments(dueDate);`);

    // جدول حساب‌ها/کارت‌ها
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        bankName TEXT,
        cardLast4 TEXT,
        balance REAL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(cardLast4)
      );
    `);
    await this.db.execAsync(`CREATE INDEX IF NOT EXISTS idx_accounts_last4 ON accounts(cardLast4);`);
  }

  // ==================== INSTALLMENTS ====================
  
  async addInstallment(installment: Omit<Installment, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.runAsync(
      `INSERT INTO installments (title, totalAmount, installmentCount, paidCount, installmentAmount, startDate, dueDay, description, isPaid, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        installment.title,
        installment.totalAmount,
        installment.installmentCount,
        installment.paidCount,
        installment.installmentAmount,
        installment.startDate,
        installment.dueDay,
        installment.description,
        installment.isPaid ? 1 : 0,
        installment.createdAt,
        installment.updatedAt
      ]
    );
    const id = result.lastInsertRowId;
    // ایجاد برنامه ماهانه
    const schedule = generateMonthlySchedule(installment.startDate, installment.installmentCount, installment.dueDay);
    for (let i = 0; i < schedule.length; i++) {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO installment_payments (installmentId, monthIndex, dueDate, isPaid) VALUES (?, ?, ?, 0)`,
        [id, i + 1, schedule[i]]
      );
    }
    return id;
  }

  async getInstallments(): Promise<Installment[]> {
    if (!this.db) throw new Error('Database not initialized');
    // محاسبه تعداد پرداخت شده از جدول پرداخت‌ها
    const rows = await this.db.getAllAsync<any>(
      `SELECT i.*, (
        SELECT COUNT(1) FROM installment_payments p WHERE p.installmentId = i.id AND p.isPaid = 1
      ) as paidCountCalc
       FROM installments i ORDER BY createdAt DESC`
    );
    return rows.map(row => ({
      ...row,
      paidCount: row.paidCountCalc ?? row.paidCount,
      isPaid: (row.paidCountCalc ?? row.paidCount) >= row.installmentCount || row.isPaid === 1
    }));
  }

  async updateInstallment(id: number, installment: Partial<Installment>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(installment).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(key === 'isPaid' ? (value ? 1 : 0) : value);
      }
    });
    
    const now = new Date().toISOString();
    if (fields.length === 0) {
      await this.db.runAsync(`UPDATE installments SET updatedAt = ? WHERE id = ?`, [now, id]);
      return;
    }
    values.push(now, id);
    await this.db.runAsync(
      `UPDATE installments SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
  }

  async deleteInstallment(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM installment_payments WHERE installmentId = ?', [id]);
    await this.db.runAsync('DELETE FROM installments WHERE id = ?', [id]);
  }

  // پرداخت‌های اقساط
  async getInstallmentPayments(installmentId: number): Promise<InstallmentPayment[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM installment_payments WHERE installmentId = ? ORDER BY monthIndex ASC',
      [installmentId]
    );
    return rows.map(r => ({
      id: r.id,
      installmentId: r.installmentId,
      monthIndex: r.monthIndex,
      dueDate: r.dueDate,
      isPaid: r.isPaid === 1,
      paidAt: r.paidAt || null,
    }));
  }

  // دریافت همه پرداخت‌های اقساط برای فیلتر کردن بازه زمانی در داشبورد
  async getAllInstallmentPayments(): Promise<InstallmentPayment[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM installment_payments ORDER BY dueDate ASC'
    );
    return rows.map(r => ({
      id: r.id,
      installmentId: r.installmentId,
      monthIndex: r.monthIndex,
      dueDate: r.dueDate,
      isPaid: r.isPaid === 1,
      paidAt: r.paidAt || null,
    }));
  }

  async toggleInstallmentPayment(installmentId: number, monthIndex: number, paid: boolean): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const paidAt = paid ? new Date().toISOString() : null;
    await this.db.runAsync(
      'UPDATE installment_payments SET isPaid = ?, paidAt = ? WHERE installmentId = ? AND monthIndex = ?',
      [paid ? 1 : 0, paidAt, installmentId, monthIndex]
    );
    // به‌روزرسانی وضعیت کلی قسط
    const row = await this.db.getFirstAsync<any>(
      'SELECT COUNT(1) as pc, (SELECT installmentCount FROM installments WHERE id = ?) as ic FROM installment_payments WHERE installmentId = ? AND isPaid = 1',
      [installmentId, installmentId]
    );
    const allPaid = (row?.pc || 0) >= (row?.ic || 0);
    await this.db.runAsync(
      'UPDATE installments SET paidCount = ?, isPaid = ?, updatedAt = ? WHERE id = ?',
      [row?.pc || 0, allPaid ? 1 : 0, new Date().toISOString(), installmentId]
    );
  }

  // بازتولید برنامه‌ی پرداخت اقساط پس از ویرایش پارامترهای کلیدی (startDate, installmentCount, dueDay)
  async syncInstallmentSchedule(installmentId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    // دریافت تنظیمات فعلی قسط
    const inst = await this.db.getFirstAsync<any>(
      'SELECT startDate, installmentCount, dueDay FROM installments WHERE id = ? LIMIT 1',
      [installmentId]
    );
    if (!inst) return;
    const startISO: string = inst.startDate;
    const count: number = inst.installmentCount;
    const dueDay: number = inst.dueDay;
    // پرداخت‌های پرداخت‌شده قبلی برای حفظ وضعیت
    const oldPaid = await this.db.getAllAsync<any>(
      'SELECT paidAt FROM installment_payments WHERE installmentId = ? AND isPaid = 1 ORDER BY monthIndex ASC',
      [installmentId]
    );
    const prevPaidCount = oldPaid.length;
    // حذف برنامه‌ی فعلی و ایجاد مجدد
    await this.db.runAsync('DELETE FROM installment_payments WHERE installmentId = ?', [installmentId]);
    const schedule = generateMonthlySchedule(startISO, count, dueDay);
    const newPaidCount = Math.min(prevPaidCount, schedule.length);
    for (let i = 0; i < schedule.length; i++) {
      const isPaid = i < newPaidCount ? 1 : 0;
      const paidAt = i < newPaidCount ? (oldPaid[i]?.paidAt || new Date().toISOString()) : null;
      await this.db.runAsync(
        'INSERT INTO installment_payments (installmentId, monthIndex, dueDate, isPaid, paidAt) VALUES (?, ?, ?, ?, ?)',
        [installmentId, i + 1, schedule[i], isPaid, paidAt]
      );
    }
    const allPaid = newPaidCount >= count;
    await this.db.runAsync(
      'UPDATE installments SET paidCount = ?, isPaid = ?, updatedAt = ? WHERE id = ?'
      , [newPaidCount, allPaid ? 1 : 0, new Date().toISOString(), installmentId]
    );
  }

  // ==================== DEBTS ====================
  
  async addDebt(debt: Omit<Debt, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.runAsync(
      `INSERT INTO debts (phone, personName, amount, description, dueDate, isPaid, reminderDays, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        debt.phone || null,
        debt.personName,
        debt.amount,
        debt.description,
        debt.dueDate,
        debt.isPaid ? 1 : 0,
        debt.reminderDays,
        debt.createdAt,
        debt.updatedAt
      ]
    );
    return result.lastInsertRowId;
  }

  async getDebts(): Promise<Debt[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>('SELECT * FROM debts ORDER BY dueDate ASC');
    return rows.map(row => ({
      ...row,
      isPaid: row.isPaid === 1
    }));
  }

  async updateDebt(id: number, debt: Partial<Debt>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(debt).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(key === 'isPaid' ? (value ? 1 : 0) : value);
      }
    });
    
    const now = new Date().toISOString();
    if (fields.length === 0) {
      await this.db.runAsync(`UPDATE debts SET updatedAt = ? WHERE id = ?`, [now, id]);
      return;
    }
    values.push(now, id);
    await this.db.runAsync(
      `UPDATE debts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
  }

  async deleteDebt(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
  }

  // ==================== CREDITS ====================
  
  async addCredit(credit: Omit<Credit, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.runAsync(
      `INSERT INTO credits (phone, personName, amount, description, dueDate, isReceived, reminderDays, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        credit.phone || null,
        credit.personName,
        credit.amount,
        credit.description,
        credit.dueDate,
        credit.isReceived ? 1 : 0,
        credit.reminderDays,
        credit.createdAt,
        credit.updatedAt
      ]
    );
    return result.lastInsertRowId;
  }

  async getCredits(): Promise<Credit[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>('SELECT * FROM credits ORDER BY dueDate ASC');
    return rows.map(row => ({
      ...row,
      isReceived: row.isReceived === 1
    }));
  }

  async updateCredit(id: number, credit: Partial<Credit>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(credit).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(key === 'isReceived' ? (value ? 1 : 0) : value);
      }
    });
    
    const now = new Date().toISOString();
    if (fields.length === 0) {
      await this.db.runAsync(`UPDATE credits SET updatedAt = ? WHERE id = ?`, [now, id]);
      return;
    }
    values.push(now, id);
    await this.db.runAsync(
      `UPDATE credits SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
  }

  async deleteCredit(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM credits WHERE id = ?', [id]);
  }

  // ==================== CHECKS ====================
  
  async addCheck(check: Omit<Check, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    
    const result = await this.db.runAsync(
      `INSERT INTO checks (checkNumber, amount, bankName, dueDate, type, status, personName, description, reminderDays, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        check.checkNumber,
        check.amount,
        check.bankName,
        check.dueDate,
        check.type,
        check.status,
        check.personName,
        check.description,
        check.reminderDays,
        check.createdAt,
        check.updatedAt
      ]
    );
    return result.lastInsertRowId;
  }

  async getChecks(): Promise<Check[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<Check>('SELECT * FROM checks ORDER BY dueDate ASC');
    return rows;
  }

  async updateCheck(id: number, check: Partial<Check>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(check).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    const now = new Date().toISOString();
    if (fields.length === 0) {
      await this.db.runAsync(`UPDATE checks SET updatedAt = ? WHERE id = ?`, [now, id]);
      return;
    }
    values.push(now, id);
    await this.db.runAsync(
      `UPDATE checks SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
  }

  async deleteCheck(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM checks WHERE id = ?', [id]);
  }

  // ==================== EXPENSES ====================

  async addExpense(expense: Omit<Expense, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.runAsync(
      `INSERT INTO expenses (title, amount, dueDate, description, reminderDays, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.title,
        expense.amount,
        expense.dueDate,
        expense.description,
        expense.reminderDays,
        expense.createdAt,
        expense.updatedAt,
      ]
    );
    return result.lastInsertRowId;
  }

  async getExpenses(): Promise<Expense[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<Expense>('SELECT * FROM expenses ORDER BY dueDate ASC');
    return rows;
  }

  async updateExpense(id: number, expense: Partial<Expense>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const fields: string[] = [];
    const values: any[] = [];
    Object.entries(expense).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });
    const now = new Date().toISOString();
    if (fields.length === 0) {
      await this.db.runAsync(`UPDATE expenses SET updatedAt = ? WHERE id = ?`, [now, id]);
      return;
    }
    values.push(now, id);
    await this.db.runAsync(
      `UPDATE expenses SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`,
      values
    );
  }

  async deleteExpense(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  }

  // ==================== ACCOUNTS ====================

  async getAccounts(): Promise<Account[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<Account>('SELECT * FROM accounts ORDER BY title ASC');
    return rows;
  }

  async addAccount(account: Omit<Account, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const res = await this.db.runAsync(
      `INSERT INTO accounts (title, bankName, cardLast4, balance, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [account.title, account.bankName || null, account.cardLast4 || null, account.balance || 0, account.createdAt, account.updatedAt]
    );
    return res.lastInsertRowId;
  }

  async updateAccount(id: number, patch: Partial<Account>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const fields: string[] = [];
    const values: any[] = [];
    Object.entries(patch).forEach(([k, v]) => {
      if (k !== 'id') { fields.push(`${k} = ?`); values.push(v); }
    });
    const now = new Date().toISOString();
    if (fields.length === 0) {
      await this.db.runAsync(`UPDATE accounts SET updatedAt = ? WHERE id = ?`, [now, id]);
      return;
    }
    values.push(now, id);
    await this.db.runAsync(`UPDATE accounts SET ${fields.join(', ')}, updatedAt = ? WHERE id = ?`, values);
  }

  async deleteAccount(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  }

  async findAccountByLast4(last4: string): Promise<Account | null> {
    if (!this.db) throw new Error('Database not initialized');
    const row = await this.db.getFirstAsync<Account>('SELECT * FROM accounts WHERE cardLast4 = ? LIMIT 1', [last4]);
    return row || null;
  }

  async upsertAccountBalanceByLast4(last4: string, balance: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const now = new Date().toISOString();
    const existing = await this.findAccountByLast4(last4);
    if (existing && existing.id) {
      await this.db.runAsync('UPDATE accounts SET balance = ?, updatedAt = ? WHERE id = ?', [balance, now, existing.id]);
    } else {
      await this.addAccount({ title: `کارت ****${last4}`, bankName: '', cardLast4: last4, balance, createdAt: now, updatedAt: now });
    }
  }

  // ==================== BACKUP / RESTORE (JSON) ====================

  async exportAll(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    const [installments, payments, debts, credits, checks, expenses, accounts, reminders] = await Promise.all([
      this.db.getAllAsync<any>('SELECT * FROM installments'),
      this.db.getAllAsync<any>('SELECT * FROM installment_payments'),
      this.db.getAllAsync<any>('SELECT * FROM debts'),
      this.db.getAllAsync<any>('SELECT * FROM credits'),
      this.db.getAllAsync<any>('SELECT * FROM checks'),
      this.db.getAllAsync<any>('SELECT * FROM expenses'),
      this.db.getAllAsync<any>('SELECT * FROM accounts'),
      this.db.getAllAsync<any>('SELECT * FROM reminders'),
    ]);
    const payload = {
      meta: { exportedAt: new Date().toISOString(), version: 1 },
      installments,
      installment_payments: payments,
      debts,
      credits,
      checks,
      expenses,
      accounts,
      reminders,
    };
    return JSON.stringify(payload, null, 2);
  }

  async importAll(jsonText: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const obj = JSON.parse(jsonText || '{}');
    const installments: any[] = obj.installments || [];
    const payments: any[] = obj.installment_payments || [];
    const debts: any[] = obj.debts || [];
    const credits: any[] = obj.credits || [];
    const checks: any[] = obj.checks || [];
    const expenses: any[] = obj.expenses || [];
    const accounts: any[] = obj.accounts || [];
    const reminders: any[] = obj.reminders || [];

    // همه عملیات را در تراکنش انجام می‌دهیم تا اتمیک و سریع باشد
    await this.db.execAsync('BEGIN');
    try {
      // پاکسازی جداول (با ترتیب امن)
      await this.db.runAsync('DELETE FROM installment_payments');
      await this.db.runAsync('DELETE FROM installments');
      await this.db.runAsync('DELETE FROM debts');
      await this.db.runAsync('DELETE FROM credits');
      await this.db.runAsync('DELETE FROM checks');
      await this.db.runAsync('DELETE FROM expenses');
      await this.db.runAsync('DELETE FROM accounts');
      await this.db.runAsync('DELETE FROM reminders');

      // درج داده‌ها با حفظ id در صورت موجود بودن
      for (const it of installments) {
        await this.db.runAsync(
          `INSERT INTO installments (id, title, totalAmount, installmentCount, paidCount, installmentAmount, startDate, dueDay, description, isPaid, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [it.id || null, it.title, it.totalAmount, it.installmentCount, it.paidCount || 0, it.installmentAmount, it.startDate, it.dueDay, it.description || null, it.isPaid ? 1 : 0, it.createdAt, it.updatedAt]
        );
      }
      for (const p of payments) {
        await this.db.runAsync(
          `INSERT INTO installment_payments (id, installmentId, monthIndex, dueDate, isPaid, paidAt)
           VALUES (?, ?, ?, ?, ?, ?)` ,
          [p.id || null, p.installmentId, p.monthIndex, p.dueDate, p.isPaid ? 1 : 0, p.paidAt || null]
        );
      }
      for (const d of debts) {
        await this.db.runAsync(
          `INSERT INTO debts (id, phone, personName, amount, description, dueDate, isPaid, reminderDays, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [d.id || null, d.phone || null, d.personName, d.amount, d.description || null, d.dueDate, d.isPaid ? 1 : 0, d.reminderDays ?? 3, d.createdAt, d.updatedAt]
        );
      }
      for (const c of credits) {
        await this.db.runAsync(
          `INSERT INTO credits (id, phone, personName, amount, description, dueDate, isReceived, reminderDays, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [c.id || null, c.phone || null, c.personName, c.amount, c.description || null, c.dueDate, c.isReceived ? 1 : 0, c.reminderDays ?? 3, c.createdAt, c.updatedAt]
        );
      }
      for (const k of checks) {
        await this.db.runAsync(
          `INSERT INTO checks (id, checkNumber, amount, bankName, dueDate, type, status, personName, description, reminderDays, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [k.id || null, k.checkNumber, k.amount, k.bankName, k.dueDate, k.type, k.status || 'pending', k.personName, k.description || null, k.reminderDays ?? 3, k.createdAt, k.updatedAt]
        );
      }
      for (const e of expenses) {
        await this.db.runAsync(
          `INSERT INTO expenses (id, title, amount, dueDate, description, reminderDays, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
          [e.id || null, e.title, e.amount, e.dueDate, e.description || null, e.reminderDays ?? 3, e.createdAt, e.updatedAt]
        );
      }
      for (const a of accounts) {
        await this.db.runAsync(
          `INSERT INTO accounts (id, title, bankName, cardLast4, balance, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)` ,
          [a.id || null, a.title, a.bankName || null, a.cardLast4 || null, a.balance || 0, a.createdAt, a.updatedAt]
        );
      }
      for (const r of reminders) {
        await this.db.runAsync(
          `INSERT INTO reminders (id, title, message, dueDate, isActive, itemType, itemId, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
          [r.id || null, r.title, r.message, r.dueDate, r.isActive ? 1 : 0, r.itemType, r.itemId, r.createdAt]
        );
      }

      await this.db.execAsync('COMMIT');
    } catch (e) {
      await this.db.execAsync('ROLLBACK');
      throw e;
    }
  }
}

export default new DatabaseService();
