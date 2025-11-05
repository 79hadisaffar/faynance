import React, { useState, useEffect, useMemo } from 'react';
import { View, SectionList, Pressable, StyleSheet, RefreshControl, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { FAB, Card, Title, Paragraph, Chip, IconButton, Portal, Modal, TextInput, Button, List, Switch } from 'react-native-paper';
import DatabaseService from '../services/database';
import { Credit } from '../models/types';
import { formatPersianDate, formatCurrency, toEnglishDigits } from '../utils/helpers';
import PersianDatePicker from '../components/PersianDatePicker';
import NotificationService from '../services/notifications';
import { useSettings } from '../theme';
import moment from 'moment-jalaali';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CreditsScreen() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCredit, setCurrentCredit] = useState<Partial<Credit>>({});
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
    loadCredits();
  }, []);

  const loadCredits = async () => {
    const data = await DatabaseService.getCredits();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCredits(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCredits();
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
    if (d <= 0) return '#ef5350';
    if (d <= 3) return '#ffa726';
    return '#66bb6a';
  };

  const filteredCredits = useMemo(() => {
    const now = new Date();
    const lim = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    return credits
      .filter((c) => (onlyOpen ? !c.isReceived : true))
      .filter((c) => (next30 ? new Date(c.dueDate) <= lim && new Date(c.dueDate) >= now : true));
  }, [credits, onlyOpen, next30]);

  const summary = useMemo(() => {
    const openCount = filteredCredits.filter((c) => !c.isReceived).length;
    const upcoming30 = filteredCredits.filter((c) => {
      const dd = daysDiffFromNow(c.dueDate);
      return dd >= 0 && dd <= 30;
    }).length;
    const nearestDays = filteredCredits.length
      ? Math.min(...filteredCredits.map((c) => daysDiffFromNow(c.dueDate)))
      : undefined;
    return { openCount, upcoming30, nearestDays };
  }, [filteredCredits]);

  const showModal = (credit?: Credit) => {
    if (credit) {
      setCurrentCredit(credit);
      setEditMode(true);
      setAmountText((credit.amount || 0).toLocaleString('fa-IR'));
    } else {
      setCurrentCredit({
        personName: '',
        amount: 0,
        description: '',
        dueDate: new Date().toISOString(),
        isReceived: false,
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

  const saveCredit = async () => {
    if (!currentCredit.personName || !currentCredit.amount) return;
    if (editMode && currentCredit.id) {
      await DatabaseService.updateCredit(currentCredit.id, { ...currentCredit, updatedAt: new Date().toISOString() });
    } else {
      const id = await DatabaseService.addCredit(currentCredit as Credit);
      if (enableReminder) {
        await NotificationService.scheduleCreditReminder(
          currentCredit.personName!, currentCredit.amount!, new Date(currentCredit.dueDate!), currentCredit.reminderDays ?? 3
        );
      }
    }
    hideModal();
    loadCredits();
  };

  const deleteCredit = (id: number) => {
    Alert.alert('حذف طلب', 'آیا از حذف این مورد مطمئن هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => DatabaseService.deleteCredit(id).then(loadCredits) },
    ]);
  };
  const toggleReceived = (credit: Credit) => { DatabaseService.updateCredit(credit.id!, { isReceived: !credit.isReceived }).then(loadCredits); };

  const quickActions = (item: Credit) => {
    Alert.alert('اقدامات', `${item.personName}`, [
      { text: item.isReceived ? 'علامت‌گذاری دریافت‌نشده' : 'علامت‌گذاری دریافت‌شده', onPress: () => toggleReceived(item) },
      { text: 'ویرایش', onPress: () => showModal(item) },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCredit(item.id!) },
      { text: 'انصراف', style: 'cancel' },
    ]);
  };

  const renderRightActions = (item: Credit) => () => (
    <View style={styles.swipeActions}>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#42a5f5' }]} onPress={() => showModal(item)}>
        <Paragraph style={styles.swipeText}>ویرایش</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#66bb6a' }]} onPress={() => toggleReceived(item)}>
        <Paragraph style={styles.swipeText}>{item.isReceived ? 'برگشت' : 'تیک'}</Paragraph>
      </Pressable>
      <Pressable style={[styles.swipeBtn, { backgroundColor: '#ef5350' }]} onPress={() => deleteCredit(item.id!)}>
        <Paragraph style={styles.swipeText}>حذف</Paragraph>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: Credit }) => (
    <Swipeable renderRightActions={renderRightActions(item)} overshootRight={false}>
      <Pressable onLongPress={() => quickActions(item)} delayLongPress={250}>
        <Card style={[styles.card, { borderRightWidth: 4, borderRightColor: severityColor(item.dueDate) }]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title>{item.personName}</Title>
              <Chip icon={item.isReceived ? 'check' : 'clock'} style={{ backgroundColor: item.isReceived ? '#e8f5e9' : '#fff3e0' }} textStyle={{ color: item.isReceived ? '#2e7d32' : '#ef6c00' }}>{item.isReceived ? 'دریافت شده' : 'دریافت نشده'}</Chip>
            </View>
            <Paragraph>مبلغ: {formatCurrency(item.amount)}</Paragraph>
            <Paragraph>سررسید: {formatPersianDate(item.dueDate)}</Paragraph>
            {item.description ? <Paragraph>{item.description}</Paragraph> : null}
            <View style={styles.actions}>
              <IconButton icon="pencil" accessibilityLabel="ویرایش طلب" onPress={() => showModal(item)} />
              <IconButton icon="delete" accessibilityLabel="حذف طلب" onPress={() => deleteCredit(item.id!)} />
              <IconButton icon={item.isReceived ? 'close-circle' : 'check-circle'} accessibilityLabel={item.isReceived ? 'علامت‌گذاری به عنوان دریافت‌نشده' : 'علامت‌گذاری به عنوان دریافت‌شده'} onPress={() => toggleReceived(item)} />
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    </Swipeable>
  );

  const sections = useMemo(() => {
    const groups = new Map<string, Credit[]>();
    const sorted = [...filteredCredits].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    sorted.forEach((c) => {
      const title = moment(c.dueDate).format('jMMMM jYYYY');
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title)!.push(c);
    });
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredCredits]);

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
        <Chip selected={onlyOpen} onPress={()=>setOnlyOpen(s=>!s)}>فقط باز</Chip>
        <Chip selected={next30} onPress={()=>setNext30(s=>!s)}>۳۰ روز آینده</Chip>
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
          <Title>{editMode ? 'ویرایش طلب' : 'ثبت طلب'}</Title>
          <TextInput label="نام شخص" value={currentCredit.personName} onChangeText={(t)=>setCurrentCredit({...currentCredit, personName:t})} style={styles.input} />
          <TextInput label="مبلغ" value={amountText} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            const val = parseInt(en.replace(/[^0-9]/g,'')||'0',10);
            setCurrentCredit({...currentCredit, amount: val});
            setAmountText(val ? val.toLocaleString('fa-IR') : '');
          }} style={styles.input} />
          <Paragraph style={{ marginTop: -8, marginBottom: 8, textAlign: 'right' }}>{formatCurrency(currentCredit.amount || 0)}</Paragraph>
          <List.Item title="تاریخ سررسید" description={formatPersianDate(currentCredit.dueDate || new Date())} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Chip onPress={()=>setCurrentCredit({ ...currentCredit, dueDate: new Date().toISOString() })}>امروز</Chip>
            <Chip onPress={()=>setCurrentCredit({ ...currentCredit, dueDate: new Date(Date.now()+7*24*3600*1000).toISOString() })}>+۷ روز</Chip>
            <Chip onPress={()=>setCurrentCredit({ ...currentCredit, dueDate: new Date(Date.now()+30*24*3600*1000).toISOString() })}>+۳۰ روز</Chip>
          </View>
          <PersianDatePicker
            inline
            visible={true}
            initialISO={currentCredit.dueDate}
            onCancel={() => {}}
            onConfirm={(iso) => setCurrentCredit({ ...currentCredit, dueDate: iso })}
          />
          <TextInput label="توضیحات" value={currentCredit.description} onChangeText={(t)=>setCurrentCredit({...currentCredit, description:t})} multiline style={styles.input} />
          <List.Item title="یادآوری" right={() => (<Switch value={enableReminder} onValueChange={setEnableReminder} />)} />
          <TextInput label="روزهای قبل از یادآوری" value={(currentCredit.reminderDays??3).toString()} keyboardType="numeric" onChangeText={(t)=>{
            const en = toEnglishDigits(t);
            setCurrentCredit({...currentCredit, reminderDays: parseInt(en)||3})
          }} style={styles.input} />
          <View style={styles.modalButtons}>
            <Button onPress={hideModal}>انصراف</Button>
            <Button mode="contained" onPress={saveCredit}>ذخیره</Button>
          </View>
        </Modal>
      </Portal>

      {/* date picker rendered inline in modal */}
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
