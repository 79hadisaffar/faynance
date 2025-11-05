import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { FAB, Card, Title, Paragraph, Chip, IconButton, Portal, Modal, TextInput, Button, Checkbox, List } from 'react-native-paper';
import DatabaseService from '../services/database';
import { Installment } from '../models/types';
import { formatPersianDate, formatCurrency, generateMonthlySchedule, jDayFromISO, toEnglishDigits } from '../utils/helpers';
import PersianDatePicker from '../components/PersianDatePicker';
import NotificationService from '../services/notifications';
import { useSettings } from '../theme';

export default function InstallmentsScreen() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentInstallment, setCurrentInstallment] = useState<Partial<Installment>>({});
  const [paymentsVisible, setPaymentsVisible] = useState(false);
  const [payments, setPayments] = useState<{ monthIndex: number; dueDate: string; isPaid: boolean; }[]>([]);
  const [dateOpen, setDateOpen] = useState(false);
  const [enableReminder, setEnableReminder] = useState(true);
  const { colors } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyText, setMonthlyText] = useState('');

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    const data = await DatabaseService.getInstallments();
    setInstallments(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInstallments();
    setRefreshing(false);
  };

  const showModal = (installment?: Installment) => {
    if (installment) {
      setCurrentInstallment(installment);
      setEditMode(true);
      setMonthlyText((installment.installmentAmount || 0).toLocaleString('fa-IR'));
    } else {
      setCurrentInstallment({
        title: '',
        totalAmount: 0,
        installmentCount: 12,
        paidCount: 0,
        installmentAmount: 0,
        startDate: new Date().toISOString(),
        dueDay: 1,
        description: '',
        isPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setEditMode(false);
      setMonthlyText('');
    }
    setVisible(true);
  };

  const hideModal = () => setVisible(false);

  const openPayments = async (installment: Installment) => {
    const rows = await DatabaseService.getInstallmentPayments(installment.id!);
    setCurrentInstallment(installment);
    setPayments(rows.map(r => ({ monthIndex: r.monthIndex, dueDate: r.dueDate, isPaid: r.isPaid })));
    setPaymentsVisible(true);
  };

  const closePayments = () => setPaymentsVisible(false);

  const togglePayment = async (monthIndex: number, val: boolean) => {
    if (!currentInstallment.id) return;
    await DatabaseService.toggleInstallmentPayment(currentInstallment.id, monthIndex, val);
    const rows = await DatabaseService.getInstallmentPayments(currentInstallment.id);
    setPayments(rows.map(r => ({ monthIndex: r.monthIndex, dueDate: r.dueDate, isPaid: r.isPaid })));
    loadInstallments();
  };

  const saveInstallment = async () => {
    const title = (currentInstallment.title || '').trim();
    const count = currentInstallment.installmentCount || 0;
    const monthly = currentInstallment.installmentAmount || 0;
    if (!title || monthly <= 0 || count <= 0) {
      Alert.alert('خطا', 'عنوان، مبلغ ماهانه و تعداد اقساط را کامل وارد کنید');
      return;
    }

    try {
      const dueDay = jDayFromISO(currentInstallment.startDate as string);
      const totalAmount = monthly * count;
      const patch: Partial<Installment> = {
        ...currentInstallment,
        title,
        installmentAmount: monthly,
        installmentCount: count,
        totalAmount,
        dueDay,
      };

      if (editMode && currentInstallment.id) {
        await DatabaseService.updateInstallment(currentInstallment.id, {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
        // برنامه‌ی اقساط را با پارامترهای جدید همگام می‌کنیم (حفظ تعداد پرداخت‌شده‌ها)
        await (DatabaseService as any).syncInstallmentSchedule?.(currentInstallment.id);
      } else {
        const id = await DatabaseService.addInstallment({
          ...(patch as Installment),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        // schedule next upcoming payment reminder
        const sched = generateMonthlySchedule((patch.startDate as string), (patch.installmentCount as number), (patch.dueDay as number));
        const next = sched.find(d => new Date(d) >= new Date()) || sched[0];
        if (next) {
          await NotificationService.scheduleInstallmentReminder(
            patch.title as string,
            patch.installmentAmount as number,
            new Date(next)
          );
        }
      }
      hideModal();
      loadInstallments();
    } catch (error) {
      Alert.alert('خطا', 'خطا در ذخیره اطلاعات');
    }
  };

  const deleteInstallment = (id: number) => {
    Alert.alert(
      'تأیید حذف',
      'آیا مطمئن هستید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.deleteInstallment(id);
            loadInstallments();
          },
        },
      ]
    );
  };

  const togglePaid = async (installment: Installment) => {
    await DatabaseService.updateInstallment(installment.id!, {
      paidCount: installment.isPaid ? 0 : installment.installmentCount,
      isPaid: !installment.isPaid,
    });
    loadInstallments();
  };

  const renderItem = ({ item }: { item: Installment }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title>{item.title}</Title>
          <Chip icon={item.isPaid ? 'check-circle' : 'clock'} mode="outlined">
            {item.isPaid ? 'پرداخت شده' : `${item.paidCount}/${item.installmentCount}`}
          </Chip>
        </View>
        <Paragraph>مبلغ کل: {formatCurrency(item.totalAmount)}</Paragraph>
        <Paragraph>مبلغ هر قسط: {formatCurrency(item.installmentAmount)}</Paragraph>
        <Paragraph>تاریخ شروع: {formatPersianDate(item.startDate)}</Paragraph>
        {item.description ? <Paragraph>توضیحات: {item.description}</Paragraph> : null}
        <View style={styles.actions}>
          <IconButton icon="pencil" onPress={() => showModal(item)} />
          <IconButton icon="delete" onPress={() => deleteInstallment(item.id!)} />
          <IconButton 
            icon={item.isPaid ? 'close-circle' : 'check-circle'}
            onPress={() => togglePaid(item)}
          />
          <IconButton icon="calendar-check" onPress={() => openPayments(item)} />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={installments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
      
      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modal}>
          <Title>{editMode ? 'ویرایش قسط' : 'افزودن قسط'}</Title>
          <TextInput
            label="عنوان"
            value={currentInstallment.title}
            onChangeText={(text) => setCurrentInstallment({ ...currentInstallment, title: text })}
            style={styles.input}
          />
          {/* فقط حالت مبلغ ماهانه */}
          <TextInput
            label="مبلغ ماهانه"
            value={monthlyText}
            onChangeText={(text) => {
              const monthly = parseInt(toEnglishDigits(text).replace(/[^0-9]/g,'') || '0', 10);
              const count = currentInstallment.installmentCount || 0;
              setCurrentInstallment({
                ...currentInstallment,
                installmentAmount: monthly,
                totalAmount: monthly * count,
              });
              setMonthlyText(monthly ? monthly.toLocaleString('fa-IR') : '');
            }}
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            label="تعداد اقساط"
            value={(currentInstallment.installmentCount ?? 0).toString()}
            onChangeText={(text) => {
              const count = parseInt(toEnglishDigits(text).replace(/[^0-9]/g,'') || '0', 10);
              const monthly = currentInstallment.installmentAmount || 0;
              setCurrentInstallment({
                ...currentInstallment,
                installmentCount: count,
                totalAmount: monthly * count,
              });
            }}
            keyboardType="number-pad"
            style={styles.input}
          />
          <List.Item title="مبلغ کل (محاسبه‌شده)" description={formatCurrency((currentInstallment.totalAmount || 0))} />
          <TextInput
            label="توضیحات"
            value={currentInstallment.description}
            onChangeText={(text) => setCurrentInstallment({ ...currentInstallment, description: text })}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          <List.Item title="تاریخ شروع" description={formatPersianDate(currentInstallment.startDate || new Date())} />
          <PersianDatePicker
            inline
            visible={true}
            initialISO={currentInstallment.startDate as string}
            onCancel={() => {}}
            onConfirm={(iso) => setCurrentInstallment({ ...currentInstallment, startDate: iso })}
          />
          {/* پیش‌نمایش بازه اقساط */}
          {useMemo(() => {
            try {
              const count = currentInstallment.installmentCount || 0;
              const dueDay = jDayFromISO(currentInstallment.startDate as string);
              const sched = generateMonthlySchedule((currentInstallment.startDate as string), count, dueDay);
              if (sched.length > 0) {
                return (
                  <List.Item
                    title="بازه اقساط"
                    description={`از ${formatPersianDate(sched[0])} تا ${formatPersianDate(sched[sched.length-1])}`}
                  />
                );
              }
            } catch {}
            return null;
          }, [currentInstallment.startDate, currentInstallment.installmentCount])}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Chip onPress={()=>setCurrentInstallment({ ...currentInstallment, startDate: new Date().toISOString() })}>امروز</Chip>
            <Chip onPress={()=>setCurrentInstallment({ ...currentInstallment, startDate: new Date(Date.now()+7*24*3600*1000).toISOString() })}>+۷ روز</Chip>
            <Chip onPress={()=>setCurrentInstallment({ ...currentInstallment, startDate: new Date(Date.now()+30*24*3600*1000).toISOString() })}>+۳۰ روز</Chip>
          </View>
          <List.Item title="یادآوری" description="یادآوری قسط بعدی"/>
          <View style={styles.modalButtons}>
            <Button onPress={hideModal}>انصراف</Button>
            <Button mode="contained" onPress={saveInstallment}>ذخیره</Button>
          </View>
        </Modal>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => showModal()}
      />

      {/* Payments Modal */}
      <Portal>
        <Modal visible={paymentsVisible} onDismiss={closePayments} contentContainerStyle={styles.modal}>
          <Title>پرداخت‌های ماهانه</Title>
          <FlatList
            data={payments}
            keyExtractor={(i) => i.monthIndex.toString()}
            renderItem={({ item }) => (
              <List.Item
                title={`قسط ${item.monthIndex}`}
                description={`سررسید: ${formatPersianDate(item.dueDate)} • مبلغ: ${formatCurrency(currentInstallment.installmentAmount || 0)}`}
                right={() => (
                  <Checkbox
                    status={item.isPaid ? 'checked' : 'unchecked'}
                    onPress={() => togglePayment(item.monthIndex, !item.isPaid)}
                  />
                )}
              />
            )}
          />
          <View style={styles.modalButtons}>
            <Button onPress={closePayments}>بستن</Button>
          </View>
        </Modal>
      </Portal>

      <PersianDatePicker
        visible={dateOpen}
        initialISO={currentInstallment.startDate as string}
        onCancel={()=>setDateOpen(false)}
        onConfirm={(iso)=>{ setCurrentInstallment({ ...currentInstallment, startDate: iso }); setDateOpen(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
