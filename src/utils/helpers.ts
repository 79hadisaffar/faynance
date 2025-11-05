import jalaali from 'moment-jalaali';

// تنظیم locale فارسی
jalaali.loadPersian({ usePersianDigits: true });

export const formatPersianDate = (date: Date | string): string => {
  return jalaali(date).format('jYYYY/jMM/jDD');
};

export const formatPersianDateTime = (date: Date | string): string => {
  return jalaali(date).format('jYYYY/jMM/jDD HH:mm');
};

export const parsePersianDate = (persianDate: string): Date => {
  const parts = persianDate.split('/');
  if (parts.length !== 3) throw new Error('Invalid Persian date format');
  
  const jy = parseInt(parts[0]);
  const jm = parseInt(parts[1]);
  const jd = parseInt(parts[2]);
  
  return jalaali(`${jy}/${jm}/${jd}`, 'jYYYY/jMM/jDD').toDate();
};

export const getCurrentPersianDate = (): string => {
  return jalaali().format('jYYYY/jMM/jDD');
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  return jalaali(date).add(months, 'jMonth').toDate();
};

// Generate monthly due dates based on a start date (ISO) and due day of Persian month
export const generateMonthlySchedule = (startISO: string, count: number, dueDay: number): string[] => {
  const start = new Date(startISO);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    // add i Persian months, then set jDay to dueDay
    let m = jalaali(start).add(i, 'jMonth');
    // clamp day to month length
    const monthDays = m.daysInMonth();
    const jDay = Math.min(dueDay, monthDays);
    m = m.jDate(jDay);
    dates.push(m.toDate().toISOString());
  }
  return dates;
};

export const getDaysUntil = (targetDate: Date): number => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('fa-IR') + ' تومان';
};

export const isOverdue = (dueDate: Date): boolean => {
  return new Date() > dueDate;
};

// Group array of items into last N Jalali months and sum amounts
export function groupAmountsByJMonth<T>(items: T[], getDateISO: (t: T)=>string, getAmount: (t: T)=>number, monthsBack = 6) {
  const now = jalaali();
  const buckets: { [key: string]: number } = {};
  const labels: string[] = [];
  // Build month labels from oldest to newest
  for (let i = monthsBack - 1; i >= 0; i--) {
    const m = now.clone().subtract(i, 'jMonth');
    const key = m.format('jYYYY/jMM');
    labels.push(key);
    buckets[key] = 0;
  }
  items.forEach((it) => {
    const key = jalaali(getDateISO(it)).format('jYYYY/jMM');
    if (key in buckets) {
      buckets[key] += getAmount(it) || 0;
    }
  });
  const data = labels.map((k) => buckets[k]);
  return { labels, data };
}

// Convert jYYYY/jMM key to a friendly Persian month label (e.g., 'آبان ۱۴۰۴')
export function jMonthKeyToFa(key: string): string {
  const m = jalaali(key + '/01', 'jYYYY/jMM/jDD');
  return m.format('jMMM jYY');
}

// برچسب عددی ماه (فقط شماره ماه جلالی)
export function jMonthKeyToNum(key: string): string {
  const m = jalaali(key + '/01', 'jYYYY/jMM/jDD');
  return m.format('jMM');
}

// تبدیل ارقام فارسی/عربی به انگلیسی
export function toEnglishDigits(input: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return input.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d))).replace(/[٠-٩]/g, (d) => String(ar.indexOf(d))).replace(/[,\s]+/g, (m) => (m.includes(',') ? '' : m));
}

// پارس مجموعه پیامک برای استخراج آخرین موجودی هر کارت (با چهار رقم آخر)
// متن ورودی می‌تواند چند پیامک چسبیده باشد. خروجی: Map last4 -> balance
export function parseSmsBalances(text: string): Map<string, number> {
  const map = new Map<string, number>();
  const norm = toEnglishDigits(text).replace(/\u200c/g, '');
  // پیام‌ها را خط‌به‌خط بررسی می‌کنیم
  const lines = norm.split(/\r?\n|\u2028|\u2029/).filter(Boolean);
  const push = (last4: string, bal: number) => {
    if (!last4 || isNaN(bal)) return;
    map.set(last4, bal);
  };

  const numberPattern = /(?:\d{1,3}(?:,\d{3})+|\d+)/g;
  const balanceKeywords = /(موجودی|مانده|balance|available|avail)/i;
  const last4Patterns: RegExp[] = [
    /\*{2,}\s*(\d{4})/i, // ****1234
    /(?:\d{4}[-\s*]*){3}(\d{4})/i, // 1234-****-****-1234 یا 6037-...-1234
    /کارت\s*(?:شماره)?\s*\*{0,4}\s*(\d{4})/i,
  ];

  for (const line of lines) {
    const l = line.trim();
    if (!l) continue;
    let last4: string | null = null;
    for (const rp of last4Patterns) {
      const m = l.match(rp);
      if (m && m[1]) { last4 = m[1]; break; }
    }
    // اگر کل خط بدون last4 بود، شاید شماره کارت کامل در خط بعدی باشد؛ اینجا ساده‌سازی می‌کنیم و از همان خط می‌گیریم
    // یافتن عددِ پس از کلیدواژه موجودی
    let bal: number | null = null;
    if (balanceKeywords.test(l)) {
      const nums = l.match(numberPattern) || [];
      // بزرگ‌ترین عدد را به‌عنوان موجودی در نظر می‌گیریم (در اغلب پیام‌ها موجودی از سایر مبالغ بزرگ‌تر است)
      const max = nums.map((s) => parseInt(s.replace(/,/g, ''))).filter((n) => !isNaN(n)).sort((a, b) => b - a)[0];
      if (typeof max === 'number') bal = max;
    }
    if (last4 && bal != null) push(last4, bal);
  }
  // اگر خط‌محور چیزی پیدا نشد، روی کل متن تلاش می‌کنیم
  if (map.size === 0) {
    const last4Match = norm.match(/\*{2,}\s*(\d{4})/) || norm.match(/(?:\d{4}[-\s*]*){3}(\d{4})/);
    const nums = norm.match(numberPattern) || [];
    const max = nums.map((s) => parseInt(s.replace(/,/g, ''))).filter((n) => !isNaN(n)).sort((a, b) => b - a)[0];
    if (last4Match && last4Match[1] && typeof max === 'number') map.set(last4Match[1], max);
  }
  return map;
}

// روز جلالی از تاریخ ISO (1..31)
export function jDayFromISO(iso: string | Date): number {
  const d = jalaali(iso);
  const jd = parseInt(d.format('jDD'), 10);
  return isNaN(jd) ? 1 : jd;
}
