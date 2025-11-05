import React, { useState, useEffect, useMemo } from 'react';
import { View, SectionList, Pressable, StyleSheet, RefreshControl, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { FAB, Card, Title, Paragraph, Chip, IconButton, Portal, Modal, TextInput, Button, List, Switch } from 'react-native-paper';
import DatabaseService from '../services/database';
import { Debt } from '../models/types';
import { formatPersianDate, formatCurrency, toEnglishDigits } from '../utils/helpers';
import PersianDatePicker from '../components/PersianDatePicker';
import NotificationService from '../services/notifications';
import moment from 'moment-jalaali';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '../theme';

export default function DebtsScreen() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDebt, setCurrentDebt] = useState<Partial<Debt>>({});
  const [dateOpen, setDateOpen] = useState(false);
  const [enableReminder, setEnableReminder] = useState(true);
  const { colors } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [next30, setNext30] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    loadDebts();
  }, []);

  const loadDebts = async () => {
    const data = await DatabaseService.getDebts();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDebts(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDebts();
    setRefreshing(false);
  };

  const daysDiffFromNow = (iso?: string) => {
    if (!iso) return 9999;
    const now = new Date();
    const due = new Date(iso);
    const ms = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round(ms / (24 * 3600 * 1000));
  };

  const severityColor = (iso?: string) => {
    const d = daysDiffFromNow(iso);
    if (d <= 0) return '#ef5350'; // today or overdue
    if (d <= 3) return '#ffa726'; // soon
    return '#66bb6a'; // ok
  };

  const filteredDebts = useMemo(() => {
    const now = new Date();
    const lim = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    return debts
      .filter((d) => (onlyOpen ? !d.isPaid : true))
      .filter((d) => (next30 ? new Date(d.dueDate) <= lim && new Date(d.dueDate) >= now : true));
  }, [debts, onlyOpen, next30]);

  const summary = useMemo(() => {
    const openCount = filteredDebts.filter((d) => !d.isPaid).length;
    const upcoming30 = filteredDebts.filter((d) => {
      const dd = daysDiffFromNow(d.dueDate);
      return dd >= 0 && dd <= 30;
    }).length;
    const nearestDays = filteredDebts.length
      ? Math.min(...filteredDebts.map((d) => daysDiffFromNow(d.dueDate)))
      : undefined;
    return { openCount, upcoming30, nearestDays };
  }, [filteredDebts]);

  const showModal = (debt?: Debt) => {
    if (debt) {
      setCurrentDebt(debt);
      setEditMode(true);
      setAmountText((debt.amount || 0).toLocaleString('fa-IR'));
    } else {
      setCurrentDebt({
        personName: '',
        amount: 0,
        description: '',
        dueDate: new Date().toISOString(),
        isPaid: false,
        reminderDays: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setEditMode(false);
      setAmountText('');
    }
    setVisible(true);
  };

  const hideModal = () => setVisible(false);

  const saveDebt = async () => {
    if (!currentDebt.personName || !currentDebt.amount) return;
    if (editMode && currentDebt.id) {
      await DatabaseService.updateDebt(currentDebt.id, { ...currentDebt, updatedAt: new Date().toISOString() });
    } else {
      const id = await DatabaseService.addDebt(currentDebt as Debt);
      if (enableReminder) {
        await NotificationService.scheduleDebtReminder(
          currentDebt.personName!, currentDebt.amount!, new Date(currentDebt.dueDate!), currentDebt.reminderDays ?? 3
        );
      }
    }
    hideModal();
    loadDebts();
  };

  const deleteDebt = (id: number) => {
    Alert.alert('حذف بدهی', 'آیا از حذف این بدهی مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => DatabaseService.deleteDebt(id).then(loadDebts) },
    ]);
  };

  const togglePaid = (debt: Debt) => {
    DatabaseService.updateDebt(debt.id!, { isPaid: !debt.isPaid }).then(loadDebts);
  };

  const quickActions = (item: Debt) => {
    Alert.alert('اقدامات', `${item.personName}`, [
      { text: item.isPaid ? 'علامت‌گذاری پرداخت‌نشده' : 'علامت‌گذاری پرداخت‌شده', onPress: () => togglePaid(item) },
      { text: 'ویرایش', onPress: () => showModal(item) },
      { text: 'حذف', style: 'destructive', onPress: () => deleteDebt(item.id!) },
      { text: 'انصراف', style: 'cancel' },
    ]);
  };

  const renderRightActions = (item: Debt) => () => (
    <View style={styles.swipeActions}>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#42a5f5' }]} onPress={() => showModal(item)}>
        <Paragraph style={styles.swipeText}>ویرایش</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#66bb6a' }]} onPress={() => togglePaid(item)}>
        <Paragraph style={styles.swipeText}>{item.isPaid ? 'برگشت' : 'تیک'}</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#ef5350' }]} onPress={() => deleteDebt(item.id!)}>
        <Paragraph style={styles.swipeText}>حذف</Paragraph>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: Debt }) => (
    <Swipeable renderRightActions={renderRightActions(item)} overshootRight={false}>
      <Pressable onLongPress={() => quickActions(item)} delayLongPress={250}>
        <Card style={[styles.card, { borderRightWidth: 4, borderRightColor: severityColor(item.dueDate) }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title>{item.personName}</Title>
              <Chip icon={item.isPaid ? 'check' : 'clock'} style={{ backgroundColor: item.isPaid ? '#e8f5e9' : '#fff3e0' }} textStyle={{ color: item.isPaid ? '#2e7d32' : '#ef6c00' }}>{item.isPaid ? 'پرداخت شده' : 'پرداخت نشده'}</Chip>
            </View>
            <Paragraph>مبلغ: {formatCurrency(item.amount)}</Paragraph>
            <Paragraph>سررسید: {formatPersianDate(item.dueDate)}</Paragraph>
            {item.description ? <Paragraph>{item.description}</Paragraph> : null}
          </Card.Content>
          <View style={styles.actions}>
            <IconButton icon="pencil" accessibilityLabel="ویرایش بدهی" onPress={() => showModal(item)} />
            <IconButton icon="delete" accessibilityLabel="حذف بدهی" onPress={() => deleteDebt(item.id!)} />
            <IconButton icon={item.isPaid ? 'close-circle' : 'check-circle'} accessibilityLabel={item.isPaid ? 'علامت‌گذاری به عنوان پرداخت‌نشده' : 'علامت‌گذاری به عنوان پرداخت‌شده'} onPress={() => togglePaid(item)} />
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );

  const sections = useMemo(() => {
    const groups = new Map<string, Debt[]>();
    const sorted = [...filteredDebts].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    sorted.forEach((d) => {
      const title = moment(d.dueDate).format('jMMMM jYYYY');
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)!.push(d);
    });
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredDebts]);

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Paragraph>
            باز: {summary.openCount} 
            {'  '}|{'  '} ۳۰ روز آینده: {summary.upcoming30}
            {summary.nearestDays !== undefined ? (
              <>
                {'  '}|{'  '} نزدیک‌ترین: {summary.nearestDays >= 0 ? `${summary.nearestDays} روز` : `${Math.abs(summary.nearestDays)} روز گذشته`}
              </>
            ) : null}
          </Paragraph>
        </Card.Content>
      </Card>
      <View style={styles.filterRow}>
        <Chip selected={onlyOpen} onPress={()=>{ LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOnlyOpen(s=>!s); }}>فقط باز</Chip>
        <Chip selected={next30} onPress={()=>{ LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setNext30(s=>!s); }}>۳۰ روز آینده</Chip>
      </View>
      {sections.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={36} color="#9e9e9e" />
          <Paragraph>موردی برای نمایش وجود ندارد</Paragraph>
        </View>
      ) : (
      <SectionList
        sections={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}><Paragraph style={styles.sectionHeaderText}>{section.title}</Paragraph></View>
        )}
        stickySectionHeadersEnabled
      />)}
      <FAB style={styles.fab} icon="plus" onPress={() => showModal()} />

      <Portal>
        <Modal visible={visible} onDismiss={hideModal} contentContainerStyle={styles.modal}>
          <Title>{editMode ? 'ویرایش بدهی' : 'ثبت بدهی'}</Title>
          <TextInput label="نام شخص" value={currentDebt.personName} onChangeText={(t)=>setCurrentDebt({...currentDebt, personName:t})} style={styles.input} />
          <TextInput label="مبلغ" value={amountText} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            const val = parseInt(en.replace(/[^0-9]/g,'')||'0',10);
            setCurrentDebt({...currentDebt, amount: val});
            setAmountText(val ? val.toLocaleString('fa-IR') : '');
          }} style={styles.input} />
          <Paragraph style={{ marginTop: -8, marginBottom: 8, textAlign: 'right' }}>{formatCurrency(currentDebt.amount || 0)}</Paragraph>
          <List.Item title="تاریخ سررسید" description={formatPersianDate(currentDebt.dueDate || new Date())} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Chip onPress={()=>setCurrentDebt({ ...currentDebt, dueDate: new Date().toISOString() })}>امروز</Chip>
            <Chip onPress={()=>setCurrentDebt({ ...currentDebt, dueDate: new Date(Date.now()+7*24*3600*1000).toISOString() })}>+۷ روز</Chip>
            <Chip onPress={()=>setCurrentDebt({ ...currentDebt, dueDate: new Date(Date.now()+30*24*3600*1000).toISOString() })}>+۳۰ روز</Chip>
          </View>
          {/* inline picker so options visible immediately in the modal */}
          <PersianDatePicker
            inline
            visible={true}
            initialISO={currentDebt.dueDate}
            onCancel={() => {}}
            onConfirm={(iso) => setCurrentDebt({ ...currentDebt, dueDate: iso })}
          />
          <TextInput label="توضیحات" value={currentDebt.description} onChangeText={(t)=>setCurrentDebt({...currentDebt, description:t})} multiline style={styles.input} />
          <List.Item
            title="یادآوری"
            right={() => (
              <Switch value={enableReminder} onValueChange={setEnableReminder} />
            )}
          />
          <TextInput label="روزهای قبل از یادآوری" value={(currentDebt.reminderDays??3).toString()} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            setCurrentDebt({...currentDebt, reminderDays: parseInt(en)||3});
          }} style={styles.input} />
          <View style={styles.modalButtons}>
            <Button onPress={hideModal}>انصراف</Button>
            <Button mode="contained" onPress={saveDebt}>ذخیره</Button>
          </View>
        </Modal>
      </Portal>

      {/* date picker is now inline inside the modal */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  summaryCard: { marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  list: { padding: 16 },
  card: { marginBottom: 12, borderRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
  input: { marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  sectionHeader: { backgroundColor: '#eee', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, marginTop: 8, marginHorizontal: 16 },
  sectionHeaderText: { fontWeight: '600', color: '#444', textAlign: 'right' },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, justifyContent: 'center', alignItems: 'center' },
  swipeText: { color: '#fff', fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center', opacity: 0.7 },
});
