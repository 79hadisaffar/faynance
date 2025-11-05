import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Surface, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DatabaseService from '../services/database';
import { FinancialSummary } from '../models/types';
import { formatCurrency, addMonths, groupAmountsByJMonth, jMonthKeyToFa, jMonthKeyToNum } from '../utils/helpers';
import ChartCard from '../components/ChartCard';
import { useSettings } from '../theme';

export default function DashboardScreen() {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalDebts: 0,
    totalCredits: 0,
    totalPendingChecks: 0,
    totalUpcomingInstallments: 0,
    netBalance: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useSettings();
  const [expensesTotal, setExpensesTotal] = useState<number>(0);
  const [rangeMonths, setRangeMonths] = useState<number>(6);
  const [accountsTotal, setAccountsTotal] = useState<number>(0);
  const [rangeTotals, setRangeTotals] = useState<{ debts: number; credits: number; checks: number; installments: number; expenses: number }>({
    debts: 0,
    credits: 0,
    checks: 0,
    installments: 0,
    expenses: 0,
  });
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [trendMulti, setTrendMulti] = useState<Array<{ name: string; data: number[]; color?: string }>>([]);
  const [seriesEnabled, setSeriesEnabled] = useState({
    debts: true,
    credits: true,
    checks: true,
    installments: true,
    expenses: true,
  });
  const [todayWeek, setTodayWeek] = useState<{
    debts: { today: number; week: number };
    credits: { today: number; week: number };
    checks: { today: number; week: number };
    installments: { today: number; week: number };
    expenses: { today: number; week: number };
  }>({
    debts: { today: 0, week: 0 },
    credits: { today: 0, week: 0 },
    checks: { today: 0, week: 0 },
    installments: { today: 0, week: 0 },
    expenses: { today: 0, week: 0 },
  });
  const [liq, setLiq] = useState<{ weeks: number[]; total30: number }>({ weeks: [0,0,0,0], total30: 0 });

  const loadSummary = async () => {
    try {
      const [debts, credits, checks, installments, expenses, allPayments] = await Promise.all([
        DatabaseService.getDebts(),
        DatabaseService.getCredits(),
        DatabaseService.getChecks(),
        DatabaseService.getInstallments(),
        (DatabaseService as any).getExpenses ? (DatabaseService as any).getExpenses() : Promise.resolve([]),
        (DatabaseService as any).getAllInstallmentPayments ? (DatabaseService as any).getAllInstallmentPayments() : Promise.resolve([]),
      ]);

      const totalDebts = debts
        .filter(d => !d.isPaid)
        .reduce((sum, d) => sum + d.amount, 0);

      const totalCredits = credits
        .filter(c => !c.isReceived)
        .reduce((sum, c) => sum + c.amount, 0);

      const totalPendingChecks = checks
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (c.type === 'receivable' ? c.amount : -c.amount), 0);

      const totalUpcomingInstallments = installments
        .filter(i => !i.isPaid)
        .reduce((sum, i) => sum + (i.installmentAmount * (i.installmentCount - i.paidCount)), 0);

      const netBalance = totalCredits - totalDebts + totalPendingChecks;

      setSummary({
        totalDebts,
        totalCredits,
        totalPendingChecks,
        totalUpcomingInstallments,
        netBalance,
      });
  const expSum = (expenses as any[]).reduce((s, e: any) => s + (e.amount || 0), 0);
      setExpensesTotal(expSum);
  // حساب‌ها (موجودی کل)
  const accounts = (DatabaseService as any).getAccounts ? await (DatabaseService as any).getAccounts() : [];
  const accTotal = (accounts as any[]).reduce((s, a:any)=> s + (a.balance || 0), 0);
  setAccountsTotal(accTotal);

      // محاسبه جمع‌ها بر اساس بازه زمانی انتخاب‌شده (ماه)
      const now = new Date();
      const start = addMonths(new Date(), -rangeMonths);
      const within = (iso: string) => {
        const d = new Date(iso);
        return d >= start && d <= now;
      };
      const debtsInRange = debts.filter(d => !d.isPaid && within(d.dueDate)).reduce((s, d) => s + d.amount, 0);
      const creditsInRange = credits.filter(c => !c.isReceived && within(c.dueDate)).reduce((s, c) => s + c.amount, 0);
      const checksNetInRange = checks
        .filter(c => c.status === 'pending' && within(c.dueDate))
        .reduce((s, c) => s + (c.type === 'receivable' ? c.amount : -c.amount), 0);
      // اقساط: جمع پرداخت‌های سررسید نشده و پرداخت‌نشده در بازه
      const instAmountById = new Map<number, number>(installments.map(i => [i.id!, i.installmentAmount]));
      const installmentsInRange = (allPayments as any[])
        .filter((p: any) => !p.isPaid && within(p.dueDate))
        .reduce((s: number, p: any) => s + (instAmountById.get(p.installmentId) || 0), 0);
      const expensesInRange = (expenses as any[]).filter((e: any) => within(e.dueDate)).reduce((s, e: any) => s + (e.amount || 0), 0);
      setRangeTotals({
        debts: debtsInRange,
        credits: creditsInRange,
        checks: Math.abs(checksNetInRange),
        installments: installmentsInRange,
        expenses: expensesInRange,
      });

      // مرور امروز / ۷ روز آینده
      const daysDiff = (iso: string) => {
        const now = new Date();
        const d = new Date(iso);
        const dn = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Math.round((dd - dn) / (24 * 3600 * 1000));
      };
      const cnt = {
        debts: { today: 0, week: 0 },
        credits: { today: 0, week: 0 },
        checks: { today: 0, week: 0 },
        installments: { today: 0, week: 0 },
        expenses: { today: 0, week: 0 },
      };
      debts.filter(d => !d.isPaid).forEach(d => {
        const k = daysDiff(d.dueDate);
        if (k === 0) cnt.debts.today++;
        if (k >= 1 && k <= 7) cnt.debts.week++;
      });
      credits.filter(c => !c.isReceived).forEach(c => {
        const k = daysDiff(c.dueDate);
        if (k === 0) cnt.credits.today++;
        if (k >= 1 && k <= 7) cnt.credits.week++;
      });
      checks.filter(ch => ch.status === 'pending').forEach(ch => {
        const k = daysDiff(ch.dueDate);
        if (k === 0) cnt.checks.today++;
        if (k >= 1 && k <= 7) cnt.checks.week++;
      });
      (allPayments as any[]).filter((p:any)=>!p.isPaid).forEach(p => {
        const k = daysDiff(p.dueDate);
        if (k === 0) cnt.installments.today++;
        if (k >= 1 && k <= 7) cnt.installments.week++;
      });
      (expenses as any[]).forEach((e:any) => {
        const k = daysDiff(e.dueDate);
        if (k === 0) cnt.expenses.today++;
        if (k >= 1 && k <= 7) cnt.expenses.week++;
      });
      setTodayWeek(cnt);

      // تقویم نقدینگی ۴ هفته آینده
      const nextDays = (iso: string) => {
        const now = new Date();
        const d = new Date(iso);
        const dn = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Math.round((dd - dn) / (24 * 3600 * 1000));
      };
      const weeks = [0,0,0,0];
      const pushAmt = (days: number, amt: number) => {
        if (days < 0 || days > 27) return;
        const idx = Math.floor(days / 7); // 0..3
        weeks[idx] += amt;
      };
      // بدهی (خروجی)
      debts.filter(d=>!d.isPaid).forEach(d => pushAmt(nextDays(d.dueDate), -d.amount));
      // طلب (ورودی)
      credits.filter(c=>!c.isReceived).forEach(c => pushAmt(nextDays(c.dueDate), +c.amount));
      // چک: دریافتی + ، پرداختی -
      checks.filter(ch=>ch.status==='pending').forEach(ch => pushAmt(nextDays(ch.dueDate), ch.type==='receivable' ? +ch.amount : -ch.amount));
      // اقساط پرداخت‌نشده (خروجی)
      (allPayments as any[]).filter((p:any)=>!p.isPaid).forEach(p => pushAmt(nextDays(p.dueDate), -(instAmountById.get(p.installmentId) || 0)));
      // مخارج (خروجی)
      (expenses as any[]).forEach((e:any) => pushAmt(nextDays(e.dueDate), -(e.amount || 0)));
      const total30 = weeks.reduce((s,n)=>s+n,0);
      setLiq({ weeks, total30 });

      // روند ماهانه برای هر بخش در بازه آخر N ماه
      const mkSeries = <T,>(items: T[], getDateISO: (t: T)=>string, getAmount: (t: T)=>number) => {
        const { labels, data } = groupAmountsByJMonth(items, getDateISO, getAmount, rangeMonths);
        return { labels, data };
      };
      const debSer = mkSeries(
        debts.filter(d => !d.isPaid),
        (d:any)=>d.dueDate,
        (d:any)=>d.amount
      );
      const creSer = mkSeries(
        credits.filter(c => !c.isReceived),
        (c:any)=>c.dueDate,
        (c:any)=>c.amount
      );
      const chkSer = mkSeries(
        checks.filter(c => c.status === 'pending'),
        (c:any)=>c.dueDate,
        (c:any)=>Math.abs(c.amount)
      );
      const instAmtMap = new Map<number, number>(installments.map((i:any)=>[i.id!, i.installmentAmount]));
      const instSer = mkSeries(
        (allPayments as any[]).filter((p:any)=>!p.isPaid),
        (p:any)=>p.dueDate,
        (p:any)=> instAmtMap.get(p.installmentId) || 0
      );
      const expSer = mkSeries(
        expenses as any[],
        (e:any)=>e.dueDate,
        (e:any)=>e.amount || 0
      );
      // همه برچسب‌ها هم‌راستا هستند چون بر اساس now و rangeMonths می‌سازیم
  const numLabels = (debSer.labels).map(jMonthKeyToNum);
  setTrendLabels(numLabels);
      setTrendMulti([
        { name: 'بدهی', data: debSer.data, color: colors.debts },
        { name: 'طلب', data: creSer.data, color: colors.credits },
        { name: 'چک', data: chkSer.data, color: colors.checks },
        { name: 'اقساط', data: instSer.data, color: colors.installments },
        { name: 'مخارج', data: expSer.data, color: colors.expenses },
      ]);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [rangeMonths]);

  // Reload when screen gains focus (e.g., after editing accounts)
  useFocusEffect(
    React.useCallback(() => {
      loadSummary();
    }, [rangeMonths])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
  <Surface style={[styles.headerCard, { backgroundColor: colors.dashboard }]}>
        <Title style={styles.headerTitle}>خلاصه وضعیت مالی</Title>
        <View style={styles.balanceContainer}>
          <Title style={[styles.balanceAmount, summary.netBalance >= 0 ? styles.positive : styles.negative]}>
            {formatCurrency(Math.abs(summary.netBalance))}
          </Title>
          <Paragraph style={styles.balanceLabel}>
            {summary.netBalance >= 0 ? 'موجودی خالص' : 'کسری بودجه'}
          </Paragraph>
          <Paragraph style={[styles.balanceLabel, { marginTop: 4 }]}>
            مجموع موجودی کارت‌ها: {formatCurrency(accountsTotal)}
          </Paragraph>
        </View>
      </Surface>

      {/* موجودی کارت‌ها به صورت کارت مجزا برای وضوح بیشتر */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="wallet" size={28} color="#7b1fa2" />
            <Title style={styles.cardTitle}>موجودی کارت‌ها</Title>
          </View>
          <Paragraph style={styles.amount}>{formatCurrency(accountsTotal)}</Paragraph>
        </Card.Content>
      </Card>

      <View style={styles.rangeRow}>
        <Chip compact selected={rangeMonths === 1} onPress={() => setRangeMonths(1)} style={styles.chip}>۱ ماهه</Chip>
        <Chip compact selected={rangeMonths === 3} onPress={() => setRangeMonths(3)} style={styles.chip}>۳ ماهه</Chip>
        <Chip compact selected={rangeMonths === 6} onPress={() => setRangeMonths(6)} style={styles.chip}>۶ ماهه</Chip>
        <Chip compact selected={rangeMonths === 12} onPress={() => setRangeMonths(12)} style={styles.chip}>۱ ساله</Chip>
      </View>

      {/* مرور امروز و ۷ روز آینده */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-today" size={28} color="#ff7043" />
            <Title style={styles.cardTitle}>مرور امروز و ۷ روز آینده</Title>
          </View>
          <View style={[styles.rangeRow, { flexWrap: 'wrap' }]}>
            <Chip compact style={styles.chip}>بدهی: امروز {todayWeek.debts.today} | هفته {todayWeek.debts.week}</Chip>
            <Chip compact style={styles.chip}>طلب: امروز {todayWeek.credits.today} | هفته {todayWeek.credits.week}</Chip>
            <Chip compact style={styles.chip}>چک: امروز {todayWeek.checks.today} | هفته {todayWeek.checks.week}</Chip>
            <Chip compact style={styles.chip}>قسط: امروز {todayWeek.installments.today} | هفته {todayWeek.installments.week}</Chip>
            <Chip compact style={styles.chip}>مخارج: امروز {todayWeek.expenses.today} | هفته {todayWeek.expenses.week}</Chip>
          </View>
        </Card.Content>
      </Card>

      {/* سری‌های نمودار روند: نمایش/مخفی کردن هر بخش */}
      <View style={[styles.rangeRow, { marginBottom: 4, flexWrap: 'wrap' }]}>
        <Chip
          compact
          selected={seriesEnabled.debts}
          onPress={() => setSeriesEnabled(s => ({ ...s, debts: !s.debts }))}
          style={[styles.chip, { borderColor: colors.debts, borderWidth: 1 }]}
          textStyle={{ color: seriesEnabled.debts ? colors.debts : '#777' }}
        >بدهی</Chip>
        <Chip
          compact
          selected={seriesEnabled.credits}
          onPress={() => setSeriesEnabled(s => ({ ...s, credits: !s.credits }))}
          style={[styles.chip, { borderColor: colors.credits, borderWidth: 1 }]}
          textStyle={{ color: seriesEnabled.credits ? colors.credits : '#777' }}
        >طلب</Chip>
        <Chip
          compact
          selected={seriesEnabled.checks}
          onPress={() => setSeriesEnabled(s => ({ ...s, checks: !s.checks }))}
          style={[styles.chip, { borderColor: colors.checks, borderWidth: 1 }]}
          textStyle={{ color: seriesEnabled.checks ? colors.checks : '#777' }}
        >چک</Chip>
        <Chip
          compact
          selected={seriesEnabled.installments}
          onPress={() => setSeriesEnabled(s => ({ ...s, installments: !s.installments }))}
          style={[styles.chip, { borderColor: colors.installments, borderWidth: 1 }]}
          textStyle={{ color: seriesEnabled.installments ? colors.installments : '#777' }}
        >اقساط</Chip>
        <Chip
          compact
          selected={seriesEnabled.expenses}
          onPress={() => setSeriesEnabled(s => ({ ...s, expenses: !s.expenses }))}
          style={[styles.chip, { borderColor: colors.expenses, borderWidth: 1 }]}
          textStyle={{ color: seriesEnabled.expenses ? colors.expenses : '#777' }}
        >مخارج</Chip>
      </View>

      <ChartCard
        title={`نمودار بخش‌ها (${rangeMonths === 12 ? '۱ ساله' : rangeMonths + ' ماهه'})`}
        color={colors.dashboard}
        labels={[ '۱', '۲', '۳', '۴', '۵' ]}
        data={[ rangeTotals.debts, rangeTotals.credits, rangeTotals.checks, rangeTotals.installments, rangeTotals.expenses ]}
        legendItems={[
          { name: '۱- بدهی', color: colors.debts },
          { name: '۲- طلب', color: colors.credits },
          { name: '۳- چک', color: colors.checks },
          { name: '۴- اقساط', color: colors.installments },
          { name: '۵- مخارج', color: colors.expenses },
        ]}
        xCategories={[ 'بدهی', 'طلب', 'چک', 'اقساط', 'مخارج' ]}
      />

      <ChartCard
        title={`روند ماهانه بخش‌ها (${rangeMonths === 12 ? '۱ ساله' : rangeMonths + ' ماهه'})`}
        chartType="line"
        labels={trendLabels}
        multiData={trendMulti.filter(d => (
          (d.name === 'بدهی' && seriesEnabled.debts) ||
          (d.name === 'طلب' && seriesEnabled.credits) ||
          (d.name === 'چک' && seriesEnabled.checks) ||
          (d.name === 'اقساط' && seriesEnabled.installments) ||
          (d.name === 'مخارج' && seriesEnabled.expenses)
        ))}
        legendItems={trendMulti.filter(d => (
          (d.name === 'بدهی' && seriesEnabled.debts) ||
          (d.name === 'طلب' && seriesEnabled.credits) ||
          (d.name === 'چک' && seriesEnabled.checks) ||
          (d.name === 'اقساط' && seriesEnabled.installments) ||
          (d.name === 'مخارج' && seriesEnabled.expenses)
        )).map(d => ({ name: d.name, color: d.color }))}
      />

      {/* تقویم نقدینگی ۴ هفته آینده */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-range" size={28} color="#0277bd" />
            <Title style={styles.cardTitle}>تقویم نقدینگی (۴ هفته آینده)</Title>
          </View>
          <View style={[styles.rangeRow, { flexWrap: 'wrap' }]}>
            <Chip compact style={styles.chip}>هفته ۱: {formatCurrency(Math.abs(liq.weeks[0]))} {liq.weeks[0] >= 0 ? 'ورود' : 'خروج'}</Chip>
            <Chip compact style={styles.chip}>هفته ۲: {formatCurrency(Math.abs(liq.weeks[1]))} {liq.weeks[1] >= 0 ? 'ورود' : 'خروج'}</Chip>
            <Chip compact style={styles.chip}>هفته ۳: {formatCurrency(Math.abs(liq.weeks[2]))} {liq.weeks[2] >= 0 ? 'ورود' : 'خروج'}</Chip>
            <Chip compact style={styles.chip}>هفته ۴: {formatCurrency(Math.abs(liq.weeks[3]))} {liq.weeks[3] >= 0 ? 'ورود' : 'خروج'}</Chip>
          </View>
          <Paragraph style={{ textAlign: 'right', marginTop: 8, color: liq.total30 >= 0 ? '#2e7d32' : '#c62828' }}>
            جمع ۳۰ روز آینده: {formatCurrency(Math.abs(liq.total30))} {liq.total30 >= 0 ? 'ورود' : 'خروج'}
          </Paragraph>
        </Card.Content>
      </Card>

      {liq.total30 < 0 && (
        <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#c62828' }]}>
          <Card.Content>
            <Title style={{ color: '#c62828', fontSize: 16 }}>هشدار کسری نقدینگی</Title>
            <Paragraph style={{ textAlign: 'right' }}>
              جمع خروجی ۳۰ روز آینده از ورودی بیشتر است. برای جلوگیری از کمبود نقدینگی برنامه‌ریزی کن.
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cash-minus" size={28} color="#f44336" />
            <Title style={styles.cardTitle}>بدهی‌ها</Title>
          </View>
          <Paragraph style={styles.amount}>{formatCurrency(summary.totalDebts)}</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cash-plus" size={28} color="#4caf50" />
            <Title style={styles.cardTitle}>طلب‌ها</Title>
          </View>
          <Paragraph style={styles.amount}>{formatCurrency(summary.totalCredits)}</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="checkbook" size={28} color="#2196f3" />
            <Title style={styles.cardTitle}>چک‌های در جریان</Title>
          </View>
          <Paragraph style={styles.amount}>{formatCurrency(Math.abs(summary.totalPendingChecks))}</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={28} color="#ff9800" />
            <Title style={styles.cardTitle}>اقساط باقیمانده</Title>
          </View>
          <Paragraph style={styles.amount}>{formatCurrency(summary.totalUpcomingInstallments)}</Paragraph>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="refresh"
        onPress={onRefresh}
        style={styles.refreshButton}
      >
        به‌روزرسانی
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  headerCard: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  positive: {
    color: '#4caf50',
  },
  negative: {
    color: '#f44336',
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    marginRight: 12,
    fontSize: 18,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  refreshButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 4,
  },
  chip: {
    marginHorizontal: 4,
  },
});
