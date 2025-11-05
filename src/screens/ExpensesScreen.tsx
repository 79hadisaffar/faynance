import React, { useEffect, useMemo, useState } from 'react';
import { View, SectionList, Pressable, StyleSheet, Alert, RefreshControl, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { FAB, Card, Title, Paragraph, IconButton, Portal, Modal, TextInput, Button, List, Chip } from 'react-native-paper';
import DatabaseService from '../services/database';
import { Expense } from '../models/types';
import { formatCurrency, formatPersianDate, toEnglishDigits } from '../utils/helpers';
import PersianDatePicker from '../components/PersianDatePicker';
// نمودار فقط در داشبورد نمایش داده می‌شود
import NotificationService from '../services/notifications';
import moment from 'moment-jalaali';
import { useSettings } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ExpensesScreen() {
  const [items, setItems] = useState<Expense[]>([]);
  const [visible, setVisible] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [current, setCurrent] = useState<Partial<Expense>>({});
  const { colors } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [amountText, setAmountText] = useState('');

  const load = async () => {
    const data = await DatabaseService.getExpenses();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(data);
  };

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openModal = (exp?: Expense) => {
    if (exp) { setCurrent(exp); setEditMode(true); }
    else {
      setCurrent({
        title: '', amount: 0, description: '',
        dueDate: new Date().toISOString(), reminderDays: 3,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setEditMode(false);
    }
    setAmountText(exp ? (exp.amount || 0).toLocaleString('fa-IR') : '');
    setVisible(true);
  };

  const save = async () => {
    if (!current.title || !current.amount) { Alert.alert('خطا','عنوان و مبلغ الزامی است'); return; }
    if (editMode && current.id) {
      await DatabaseService.updateExpense(current.id, { ...current, updatedAt: new Date().toISOString() });
    } else {
      const id = await DatabaseService.addExpense(current as Expense);
      // schedule reminder
      await NotificationService.scheduleReminder(
        `مخارج: ${current.title}`,
        `یادآوری پرداخت ${formatCurrency(current.amount!)} در تاریخ ${formatPersianDate(current.dueDate!)}`,
        new Date(current.dueDate!),
        current.reminderDays ?? 3
      );
    }
    setVisible(false);
    load();
  };

  const remove = (id: number) => {
    Alert.alert('حذف','آیا مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async ()=>{ await DatabaseService.deleteExpense(id); load(); } }
    ]);
  };

  // بدون نمودار در این صفحه
  const daysDiffFromNow = (iso?: string) => {
    if (!iso) return 9999;
    const now = new Date();
    const due = new Date(iso);
    const ms = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round(ms / (24 * 3600 * 1000));
  };
  const severityColor = (iso?: string) => {
    const d = daysDiffFromNow(iso);
    if (d <= 0) return '#ef5350';
    if (d <= 3) return '#ffa726';
    return '#66bb6a';
  };

  const sections = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    const sorted = [...items].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    sorted.forEach((e) => {
      const title = moment(e.dueDate).format('jMMMM jYYYY');
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)!.push(e);
    });
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [items]);

  const quickActions = (item: Expense) => {
    Alert.alert('اقدامات', item.title || '', [
      { text: 'ویرایش', onPress: () => openModal(item) },
      { text: 'حذف', style: 'destructive', onPress: () => remove(item.id!) },
      { text: 'انصراف', style: 'cancel' },
    ]);
  };

  const renderRightActions = (item: Expense) => () => (
    <View style={styles.swipeActions}>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#42a5f5' }]} onPress={() => openModal(item)}>
        <Paragraph style={styles.swipeText}>ویرایش</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#ef5350' }]} onPress={() => remove(item.id!)}>
        <Paragraph style={styles.swipeText}>حذف</Paragraph>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: Expense }) => (
    <Swipeable renderRightActions={renderRightActions(item)} overshootRight={false}>
      <Pressable onLongPress={() => quickActions(item)} delayLongPress={250}>
        <Card style={[styles.card, { borderRightWidth: 4, borderRightColor: severityColor(item.dueDate) }]}>
          <Card.Content>
            <View style={styles.head}>
              <Title>{item.title}</Title>
              <Paragraph>{formatCurrency(item.amount)}</Paragraph>
            </View>
            <Paragraph>سررسید: {formatPersianDate(item.dueDate)}</Paragraph>
            {item.description ? <Paragraph>{item.description}</Paragraph> : null}
          </Card.Content>
          <View style={styles.actions}>
            <IconButton icon="pencil" accessibilityLabel="ویرایش مخارج" onPress={()=>openModal(item)} />
            <IconButton icon="delete" accessibilityLabel="حذف مخارج" onPress={()=>remove(item.id!)} />
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
  {/* نمودار فقط در داشبورد نمایش داده می‌شود */}
      {sections.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={36} color="#9e9e9e" />
          <Paragraph>موردی برای نمایش وجود ندارد</Paragraph>
        </View>
      ) : (
      <SectionList
        sections={sections}
        renderItem={renderItem}
        keyExtractor={(i)=>i.id!.toString()}
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

      <Portal>
        <Modal visible={visible} onDismiss={()=>setVisible(false)} contentContainerStyle={styles.modal}>
          <Title>{editMode ? 'ویرایش مخارج' : 'ثبت مخارج'}</Title>
          <TextInput label="عنوان" value={current.title} onChangeText={(t)=>setCurrent({...current, title:t})} style={styles.input} />
          <TextInput label="مبلغ" value={amountText} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            const val = parseInt(en.replace(/[^0-9]/g,'')||'0',10);
            setCurrent({...current, amount: val});
            setAmountText(val ? val.toLocaleString('fa-IR') : '');
          }} style={styles.input} />
          <Paragraph style={{ marginTop: -8, marginBottom: 8, textAlign: 'right' }}>{formatCurrency(current.amount || 0)}</Paragraph>
          <List.Item title="تاریخ" description={formatPersianDate(current.dueDate || new Date())} left={(p)=>null} />
          <PersianDatePicker
            inline
            visible={true}
            initialISO={current.dueDate}
            onCancel={() => {}}
            onConfirm={(iso) => { setCurrent({...current, dueDate: iso}); }}
            title="انتخاب تاریخ"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Chip onPress={()=>setCurrent({ ...current, dueDate: new Date().toISOString() })}>امروز</Chip>
            <Chip onPress={()=>setCurrent({ ...current, dueDate: new Date(Date.now()+7*24*3600*1000).toISOString() })}>+۷ روز</Chip>
            <Chip onPress={()=>setCurrent({ ...current, dueDate: new Date(Date.now()+30*24*3600*1000).toISOString() })}>+۳۰ روز</Chip>
          </View>
          <TextInput label="توضیحات" value={current.description} onChangeText={(t)=>setCurrent({...current, description:t})} style={styles.input} multiline />
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} label="روزهای قبل از یادآوری" value={(current.reminderDays??3).toString()} keyboardType="numeric" onChangeText={(t)=>{
              const en = toEnglishDigits(t);
              setCurrent({...current, reminderDays: parseInt(en)||3})
            }} />
          </View>
          <View style={styles.modalButtons}>
            <Button onPress={()=>setVisible(false)}>انصراف</Button>
            <Button mode="contained" onPress={save}>ذخیره</Button>
          </View>
        </Modal>
      </Portal>

      <PersianDatePicker
        visible={datePickerOpen}
        initialISO={current.dueDate}
        onCancel={()=>setDatePickerOpen(false)}
        onConfirm={(iso)=>{ setCurrent({...current, dueDate: iso}); setDatePickerOpen(false); }}
        title="انتخاب تاریخ"
      />

      <FAB style={styles.fab} icon="plus" onPress={()=>openModal()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 10, elevation: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
  input: { marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeader: { backgroundColor: '#eee', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, marginTop: 8, marginHorizontal: 16 },
  sectionHeaderText: { fontWeight: '600', color: '#444', textAlign: 'right' },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, justifyContent: 'center', alignItems: 'center' },
  swipeText: { color: '#fff', fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center', opacity: 0.7 },
});
