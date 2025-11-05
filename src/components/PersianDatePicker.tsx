import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Text, ScrollView, Pressable } from 'react-native';
import { Modal, Portal, Button, Title, IconButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import jalaali from 'moment-jalaali';

type Props = {
  visible: boolean;
  initialISO?: string; // ISO string
  showTime?: boolean; // for checks
  onCancel: () => void;
  onConfirm: (iso: string) => void;
  title?: string;
  inline?: boolean;
};

// Use English digits inside pickers to avoid glyph spacing issues on some Android fonts
jalaali.loadPersian({ usePersianDigits: false });

const yearsRange = (centerYear: number, span = 10) => {
  const years: number[] = [];
  for (let y = centerYear - span; y <= centerYear + span; y++) years.push(y);
  return years;
};

export default function PersianDatePicker({ visible, initialISO, showTime, onCancel, onConfirm, title, inline }: Props) {
  const initial = initialISO ? jalaali(initialISO) : jalaali();
  const [jy, setJy] = useState<number>(parseInt(initial.format('jYYYY')));
  const [jm, setJm] = useState<number>(parseInt(initial.format('jM')));
  const [jd, setJd] = useState<number>(parseInt(initial.format('jD')));
  const [hh, setHh] = useState<number>(initial.hour());
  const [mm, setMm] = useState<number>(initial.minute());

  const years = useMemo(() => yearsRange(jy, 25), [jy]);
  const monthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const daysInMonth = useMemo(() => jalaali(`${jy}/${jm}/1`, 'jYYYY/jM/jD').daysInMonth(), [jy, jm]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const confirm = () => {
    let m = jalaali(`${jy}/${jm}/${jd}`, 'jYYYY/jM/jD');
    if (showTime) m = m.hour(hh).minute(mm).second(0).millisecond(0);
    const iso = m.toDate().toISOString();
    onConfirm(iso);
  };

  // Clamp selected day if month/year change reduces days in month
  useEffect(() => {
    if (jd > daysInMonth) setJd(daysInMonth);
  }, [daysInMonth]);
  // Sync with incoming initialISO or when dialog becomes visible
  useEffect(() => {
    const base = initialISO ? jalaali(initialISO) : jalaali();
    setJy(parseInt(base.format('jYYYY')));
    setJm(parseInt(base.format('jM')));
    setJd(parseInt(base.format('jD')));
    setHh(base.hour());
    setMm(base.minute());
    // mark next change as first render to avoid immediate auto-apply
    firstChangeSkipRef.current = true;
  }, [initialISO, visible]);
  // Auto-apply selection in inline mode (no need to press confirm)
  const firstChangeSkipRef = useRef(true);
  useEffect(() => {
    if (!inline) return; // only for inline pickers inside modals
    if (firstChangeSkipRef.current) { firstChangeSkipRef.current = false; return; }
    let m = jalaali(`${jy}/${jm}/${jd}`, 'jYYYY/jM/jD');
    if (showTime) m = m.hour(hh).minute(mm).second(0).millisecond(0);
    onConfirm(m.toDate().toISOString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, jy, jm, jd, hh, mm]);
  // Render ultra-simple steppers in inline mode to guarantee touch works in all modals
  const useInlineList = false;
  const pickerMode = Platform.OS === 'android' ? 'dialog' : undefined as any;

  const ListSelect = ({ items, value, onChange }: { items: Array<string|number>; value: number; onChange: (v:number)=>void }) => (
    <View style={styles.listWrap}>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {items.map((it) => {
          const v = typeof it === 'number' ? it : parseInt(String(it));
          const selected = v === value;
          return (
            <Pressable key={String(it)} onPress={() => onChange(v)} style={[styles.listItem, selected && styles.listItemSelected]}>
              <Text style={[styles.listItemText, selected && styles.listItemTextSelected]}>{String(it)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

  const content = (
    <View style={inline ? styles.inlineContainer : styles.modalInner}>
      <Title style={styles.title}>{title || 'انتخاب تاریخ'}</Title>
      {inline ? (
        <View style={styles.row}>
          <View style={styles.stepperWrap}>
            <Text style={styles.pickerLabel}>سال</Text>
            <View style={styles.stepperRow}>
              <IconButton icon="minus" size={18} style={styles.iconTight} onPress={() => setJy(jy - 1)} />
              <View style={styles.valueBox}><Text style={styles.stepperValue}>{jy}</Text></View>
              <IconButton icon="plus" size={18} style={styles.iconTight} onPress={() => setJy(jy + 1)} />
            </View>
          </View>
          <View style={styles.stepperWrap}>
            <Text style={styles.pickerLabel}>ماه</Text>
            <View style={styles.stepperRow}>
              <IconButton icon="chevron-right" size={18} style={styles.iconTight} onPress={() => {
                const next = jm - 1 < 1 ? 12 : jm - 1; setJm(next); if (jd > jalaali(`${jy}/${next}/1`, 'jYYYY/jM/jD').daysInMonth()) setJd(jalaali(`${jy}/${next}/1`, 'jYYYY/jM/jD').daysInMonth());
              }} />
              <View style={styles.valueBox}><Text style={styles.stepperValue}>{pad2(jm)}</Text></View>
              <IconButton icon="chevron-left" size={18} style={styles.iconTight} onPress={() => {
                const next = jm + 1 > 12 ? 1 : jm + 1; setJm(next); if (jd > jalaali(`${jy}/${next}/1`, 'jYYYY/jM/jD').daysInMonth()) setJd(jalaali(`${jy}/${next}/1`, 'jYYYY/jM/jD').daysInMonth());
              }} />
            </View>
          </View>
          <View style={styles.stepperWrap}>
            <Text style={styles.pickerLabel}>روز</Text>
            <View style={styles.stepperRow}>
              <IconButton icon="minus" size={18} style={styles.iconTight} onPress={() => setJd(Math.max(1, jd - 1))} />
              <View style={styles.valueBox}><Text style={styles.stepperValue}>{pad2(jd)}</Text></View>
              <IconButton icon="plus" size={18} style={styles.iconTight} onPress={() => setJd(Math.min(daysInMonth, jd + 1))} />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerLabel}>سال</Text>
            {useInlineList ? (
              <ListSelect items={years} value={jy} onChange={(v)=>setJy(v)} />
            ) : (
              <Picker style={styles.picker} selectedValue={jy} onValueChange={(v)=>setJy(v)} mode={pickerMode}>
                {years.map((y)=> (<Picker.Item key={y} label={`${y}`} value={y} />))}
              </Picker>
            )}
          </View>
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerLabel}>ماه</Text>
            {useInlineList ? (
              <ListSelect items={months.map(m=>`${m} (${monthNames[m-1]})`)} value={jm} onChange={(v)=>setJm(v)} />
            ) : (
              <Picker style={styles.picker} selectedValue={jm} onValueChange={(v)=>setJm(v)} mode={pickerMode}>
                {months.map((m)=> (<Picker.Item key={m} label={monthNames[m-1]} value={m} />))}
              </Picker>
            )}
          </View>
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerLabel}>روز</Text>
            {useInlineList ? (
              <ListSelect items={days} value={jd} onChange={(v)=>setJd(v)} />
            ) : (
              <Picker style={styles.picker} selectedValue={jd} onValueChange={(v)=>setJd(v)} mode={pickerMode}>
                {days.map((d)=> (<Picker.Item key={d} label={`${d}`} value={d} />))}
              </Picker>
            )}
          </View>
        </View>
      )}
      {showTime && (
        <View style={styles.row}>
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerLabel}>ساعت</Text>
            {useInlineList ? (
              <ListSelect items={hours} value={hh} onChange={(v)=>setHh(v)} />
            ) : (
              <Picker style={styles.picker} selectedValue={hh} onValueChange={(v)=>setHh(v)} mode={pickerMode}>
                {hours.map((h)=> (<Picker.Item key={h} label={`${h}`} value={h} />))}
              </Picker>
            )}
          </View>
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerLabel}>دقیقه</Text>
            {useInlineList ? (
              <ListSelect items={minutes} value={mm} onChange={(v)=>setMm(v)} />
            ) : (
              <Picker style={styles.picker} selectedValue={mm} onValueChange={(v)=>setMm(v)} mode={pickerMode}>
                {minutes.map((m)=> (<Picker.Item key={m} label={`${m}`} value={m} />))}
              </Picker>
            )}
          </View>
        </View>
      )}
      {!inline && (
        <View style={styles.buttons}>
          <Button onPress={onCancel}>انصراف</Button>
          <Button mode="contained" onPress={confirm}>تأیید</Button>
        </View>
      )}
    </View>
  );

  if (inline) return content as any;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.modal}>{content}</Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: 'white', padding: 16, margin: 16, borderRadius: 10, maxHeight: 520 },
  title: { textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerWrap: { flex: 1, marginHorizontal: 4 },
  pickerLabel: { fontSize: 12, color: '#666', marginBottom: 4, textAlign: 'center' },
  picker: { flex: 1, height: Platform.OS === 'ios' ? 180 : 44, borderWidth: Platform.OS === 'android' ? 1 : 0, borderColor: '#ddd', borderRadius: 8 },
  listWrap: { flex: 1, height: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  list: { flex: 1 },
  listItem: { paddingVertical: 10, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  listItemSelected: { backgroundColor: '#ede7f6' },
  listItemText: { color: '#555' },
  listItemTextSelected: { color: '#6200ee', fontWeight: 'bold' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  inlineContainer: { backgroundColor: 'white', padding: 8, borderRadius: 8 },
  modalInner: { backgroundColor: 'white', padding: 8 },
  // steppers
  stepperWrap: { flex: 1, marginHorizontal: 4, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 6, backgroundColor: '#fff' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconTight: { margin: 0 },
  valueBox: { minWidth: 56, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
});
