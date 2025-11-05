import React, { useState, useEffect, useMemo } from 'react';
import { View, SectionList, Pressable, StyleSheet, RefreshControl, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { FAB, Card, Title, Paragraph, Chip, IconButton, Portal, Modal, TextInput, Button, List, Switch } from 'react-native-paper';
import DatabaseService from '../services/database';
import { Check } from '../models/types';
import { formatPersianDate, formatCurrency, toEnglishDigits } from '../utils/helpers';
import PersianDatePicker from '../components/PersianDatePicker';
import NotificationService from '../services/notifications';
import { useSettings } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import moment from 'moment-jalaali';

export default function ChecksScreen() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<Partial<Check>>({});
  const [dateOpen, setDateOpen] = useState(false);
  const [enableReminder, setEnableReminder] = useState(true);
  const { colors } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [amountText, setAmountText] = useState('');

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    loadChecks();
  }, []);

  const loadChecks = async () => {
    const data = await DatabaseService.getChecks();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setChecks(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChecks();
    setRefreshing(false);
  };

  const showModal = (check?: Check) => {
    if (check) { setCurrentCheck(check); setEditMode(true); }
    else {
      setCurrentCheck({
        checkNumber: '', amount: 0, bankName: '', dueDate: new Date().toISOString(),
        type: 'receivable', status: 'pending', personName: '', description: '', reminderDays: 3,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      } as Partial<Check>);
      setEditMode(false);
    }
    setAmountText(check ? (check.amount || 0).toLocaleString('fa-IR') : '');
    setVisible(true);
  };

  const hideModal = () => setVisible(false);

  const saveCheck = async () => {
    if (!currentCheck.checkNumber || !currentCheck.amount || !currentCheck.bankName) return;
    if (editMode && currentCheck.id) {
      await DatabaseService.updateCheck(currentCheck.id, { ...currentCheck, updatedAt: new Date().toISOString() });
    } else {
      const id = await DatabaseService.addCheck(currentCheck as Check);
      if (enableReminder) {
        await NotificationService.scheduleCheckReminder(
          currentCheck.checkNumber!, currentCheck.amount!, (currentCheck.type as any) || 'receivable', new Date(currentCheck.dueDate!), currentCheck.reminderDays ?? 3
        );
      }
    }
    hideModal();
    loadChecks();
  };

  const deleteCheck = (id: number) => {
    Alert.alert('حذف چک', 'آیا از حذف این چک مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => DatabaseService.deleteCheck(id).then(loadChecks) },
    ]);
  };
  const toggleStatus = (c: Check) => DatabaseService.updateCheck(c.id!, { status: c.status === 'cashed' ? 'pending' : 'cashed' }).then(loadChecks);

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
    const groups = new Map<string, Check[]>();
    const sorted = [...checks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    sorted.forEach((c) => {
      const title = moment(c.dueDate).format('jMMMM jYYYY');
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)!.push(c);
    });
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [checks]);

  const quickActions = (item: Check) => {
    Alert.alert('اقدامات', `چک ${item.checkNumber}`, [
      { text: item.status === 'cashed' ? 'علامت‌گذاری در انتظار' : 'علامت‌گذاری نقد شده', onPress: () => toggleStatus(item) },
      { text: 'ویرایش', onPress: () => showModal(item) },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCheck(item.id!) },
      { text: 'انصراف', style: 'cancel' },
    ]);
  };

  const renderRightActions = (item: Check) => () => (
    <View style={styles.swipeActions}>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#42a5f5' }]} onPress={() => showModal(item)}>
        <Paragraph style={styles.swipeText}>ویرایش</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#66bb6a' }]} onPress={() => toggleStatus(item)}>
        <Paragraph style={styles.swipeText}>{item.status === 'cashed' ? 'برگشت' : 'تیک'}</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#ef5350' }]} onPress={() => deleteCheck(item.id!)}>
        <Paragraph style={styles.swipeText}>حذف</Paragraph>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: Check }) => (
    <Swipeable renderRightActions={renderRightActions(item)} overshootRight={false}>
      <Pressable onLongPress={() => quickActions(item)} delayLongPress={250}>
        <Card style={[styles.card, { borderRightWidth: 4, borderRightColor: severityColor(item.dueDate) }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title>چک {item.checkNumber}</Title>
              <Chip style={{ backgroundColor: item.type === 'receivable' ? '#e3f2fd' : '#ffebee' }} textStyle={{ color: item.type === 'receivable' ? '#1565c0' : '#c62828' }}>
                {item.type === 'receivable' ? 'دریافتی' : 'پرداختی'}
              </Chip>
            </View>
            <Paragraph>مبلغ: {formatCurrency(item.amount)}</Paragraph>
            <Paragraph>بانک: {item.bankName}</Paragraph>
            <Paragraph>سررسید: {formatPersianDate(item.dueDate)}</Paragraph>
            <Paragraph>نام: {item.personName}</Paragraph>
            <Chip icon={item.status === 'cashed' ? 'check' : 'clock'} style={{ backgroundColor: item.status === 'cashed' ? '#e8f5e9' : '#fff3e0' }} textStyle={{ color: item.status === 'cashed' ? '#2e7d32' : '#ef6c00' }}>
              {item.status === 'cashed' ? 'نقد شده' : 'در انتظار'}
            </Chip>
            <View style={styles.actions}>
              <IconButton icon="pencil" accessibilityLabel="ویرایش چک" onPress={() => showModal(item)} />
              <IconButton icon="delete" accessibilityLabel="حذف چک" onPress={() => deleteCheck(item.id!)} />
              <IconButton icon={item.status === 'cashed' ? 'close-circle' : 'check-circle'} accessibilityLabel={item.status === 'cashed' ? 'علامت‌گذاری به عنوان در انتظار' : 'علامت‌گذاری به عنوان نقد شده'} onPress={() => toggleStatus(item)} />
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
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
          <Title>{editMode ? 'ویرایش چک' : 'ثبت چک'}</Title>
          <TextInput label="شماره چک" value={currentCheck.checkNumber} onChangeText={(t)=>setCurrentCheck({...currentCheck, checkNumber:t})} style={styles.input} />
          <TextInput label="مبلغ" value={amountText} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            const val = parseInt(en.replace(/[^0-9]/g,'')||'0',10);
            setCurrentCheck({...currentCheck, amount: val});
            setAmountText(val ? val.toLocaleString('fa-IR') : '');
          }} style={styles.input} />
          <Paragraph style={{ marginTop: -8, marginBottom: 8, textAlign: 'right' }}>{formatCurrency(currentCheck.amount || 0)}</Paragraph>
          <TextInput label="بانک" value={currentCheck.bankName} onChangeText={(t)=>setCurrentCheck({...currentCheck, bankName:t})} style={styles.input} />
          <List.Item title="تاریخ سررسید" description={formatPersianDate(currentCheck.dueDate || new Date())} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Chip onPress={()=>setCurrentCheck({ ...currentCheck, dueDate: new Date().toISOString() })}>امروز</Chip>
            <Chip onPress={()=>setCurrentCheck({ ...currentCheck, dueDate: new Date(Date.now()+7*24*3600*1000).toISOString() })}>+۷ روز</Chip>
            <Chip onPress={()=>setCurrentCheck({ ...currentCheck, dueDate: new Date(Date.now()+30*24*3600*1000).toISOString() })}>+۳۰ روز</Chip>
          </View>
          <PersianDatePicker
            inline
            visible={true}
            initialISO={currentCheck.dueDate}
            onCancel={() => {}}
            onConfirm={(iso) => setCurrentCheck({ ...currentCheck, dueDate: iso })}
          />
          {/* حذف باکس نوع طبق درخواست؛ مقدار پیش‌فرض برای آیتم جدید 'receivable' است و در ویرایش، مقدار قبلی حفظ می‌شود */}
          <TextInput label="نام" value={currentCheck.personName} onChangeText={(t)=>setCurrentCheck({...currentCheck, personName:t})} style={styles.input} />
          <TextInput label="توضیحات" value={currentCheck.description} onChangeText={(t)=>setCurrentCheck({...currentCheck, description:t})} multiline style={styles.input} />
          <List.Item title="یادآوری" right={() => (<Switch value={enableReminder} onValueChange={setEnableReminder} />)} />
          <TextInput label="روزهای قبل از یادآوری" value={(currentCheck.reminderDays??3).toString()} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            setCurrentCheck({...currentCheck, reminderDays: parseInt(en)||3})
          }} style={styles.input} />
          <View style={styles.modalButtons}>
            <Button onPress={hideModal}>انصراف</Button>
            <Button mode="contained" onPress={saveCheck}>ذخیره</Button>
          </View>
        </Modal>
      </Portal>

      {/* date/time picker now shown inline in modal */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  card: { marginBottom: 12, borderRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
  input: { marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  swipeActions: { flexDirection: 'row', alignItems: 'stretch' },
  swipeBtn: { width: 72, justifyContent: 'center', alignItems: 'center' },
  swipeText: { color: '#fff', fontWeight: '600' },
  empty: { padding: 32, alignItems: 'center', opacity: 0.7 },
  sectionHeader: { backgroundColor: '#eee', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, marginTop: 8, marginHorizontal: 16 },
  sectionHeaderText: { fontWeight: '600', color: '#444', textAlign: 'right' },
});
