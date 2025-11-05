import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, View, AppState } from 'react-native';
import { Appbar, Button, Card, Dialog, List, Portal, Text, TextInput } from 'react-native-paper';
import DatabaseService from '../services/database';
import { Account } from '../models/types';
import { formatCurrency, parseSmsBalances } from '../utils/helpers';
import AmountInput from '../components/AmountInput';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isPasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<Array<{ last4: string; balance: number }>>([]);

  const load = async () => {
    const rows = await (DatabaseService as any).getAccounts?.();
    if (rows) setAccounts(rows);
  };
  useEffect(() => { load(); }, []);

  

  const total = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const onParse = () => {
    const m = parseSmsBalances(pasteText);
    const arr: Array<{ last4: string; balance: number }> = [];
    m.forEach((bal, last4) => arr.push({ last4, balance: bal }));
    setParsed(arr);
  };

  const applyParsed = async () => {
    for (const it of parsed) {
      await (DatabaseService as any).upsertAccountBalanceByLast4?.(it.last4, it.balance);
    }
    setPasteOpen(false);
    setPasteText('');
    setParsed([]);
    await load();
  };

  const addManual = async () => {
    // به‌جای افزودن مستقیم، فرم ویرایش با فیلدهای خالی را باز می‌کنیم
    const now = new Date().toISOString();
    setEdit({ title: '', bankName: '', cardLast4: '', balance: 0, createdAt: now, updatedAt: now });
  };

  const [edit, setEdit] = useState<Account | null>(null);

  const saveEdit = async () => {
    if (!edit) return;
    if (!edit.title || !edit.title.trim()) {
      // جلوگیری از ذخیره نام خالی
      return;
    }
    const now = new Date().toISOString();
    if (edit.id) {
      await (DatabaseService as any).updateAccount?.(edit.id, { ...edit, updatedAt: now });
    } else {
      await (DatabaseService as any).addAccount?.({ title: edit.title || '', bankName: edit.bankName || '', cardLast4: edit.cardLast4 || '', balance: edit.balance || 0, createdAt: edit.createdAt || now, updatedAt: now });
    }
    setEdit(null);
    await load();
  };

  const removeAccount = async () => {
    if (!edit || !edit.id) { setEdit(null); return; }
    await (DatabaseService as any).deleteAccount?.(edit.id);
    setEdit(null);
    await load();
  };

  // ذخیره خودکار هنگام رفتن اپ به پس‌زمینه
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && edit) {
        if ((edit.title || '').trim()) {
          saveEdit();
        } else {
          setEdit(null);
        }
      }
    });
    return () => sub.remove();
  }, [edit]);

  // ذخیره خودکار هنگام تعویض تب/blur
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        if (edit) {
          if ((edit.title || '').trim()) {
            saveEdit();
          } else {
            setEdit(null);
          }
        }
      };
    }, [edit])
  );

  const renderItem = ({ item }: { item: Account }) => (
    <Card style={{ margin: 12 }} onPress={() => setEdit(item)}>
      <Card.Title title={item.title} subtitle={item.cardLast4 ? `****${item.cardLast4}` : ''} right={() => <Text style={{ margin: 12 }}>{formatCurrency(item.balance || 0)}</Text>} />
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.Content title="حساب‌ها" subtitle={`مجموع: ${formatCurrency(total)}`} />
        <Appbar.Action icon="paste" onPress={() => setPasteOpen(true)} />
        <Appbar.Action icon="plus" onPress={addManual} />
      </Appbar.Header>

      <FlatList data={accounts} keyExtractor={(a) => String(a.id)} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 40 }} />

      <Portal>
        <Dialog visible={isPasteOpen} onDismiss={() => setPasteOpen(false)}>
          <Dialog.Title>ورود از پیامک</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              placeholder="متن پیامک‌های بانکی را اینجا paste کنید..."
              value={pasteText}
              onChangeText={setPasteText}
              multiline
              numberOfLines={8}
            />
            <Button mode="outlined" style={{ marginTop: 8 }} onPress={onParse}>تحلیل متن</Button>
            {parsed.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {parsed.map((p) => (
                  <List.Item key={p.last4} title={`کارت ****${p.last4}`} right={() => <Text>{formatCurrency(p.balance)}</Text>} />
                ))}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasteOpen(false)}>بستن</Button>
            <Button mode="contained" disabled={parsed.length === 0} onPress={applyParsed}>اعمال</Button>
          </Dialog.Actions>
        </Dialog>
  <Dialog visible={!!edit} onDismiss={async () => { if (edit && (edit.title || '').trim()) { await saveEdit(); } else { setEdit(null); } }}>
          <Dialog.Title>ویرایش حساب</Dialog.Title>
          {edit && (
            <Dialog.Content>
              <TextInput style={{ marginBottom: 8 }} label="نام" value={edit.title} onChangeText={(t)=>setEdit({ ...edit, title: t })} />
              <TextInput style={{ marginBottom: 8 }} label="بانک" value={edit.bankName || ''} onChangeText={(t)=>setEdit({ ...edit, bankName: t })} />
              <TextInput style={{ marginBottom: 8 }} label="چهار رقم آخر" value={edit.cardLast4 || ''} onChangeText={(t)=>setEdit({ ...edit, cardLast4: t.replace(/[^0-9]/g,'').slice(-4) })} keyboardType="number-pad" />
              <AmountInput label="موجودی" value={edit.balance ?? 0} onChange={(v)=> setEdit({ ...edit, balance: v })} style={{ marginBottom: 8 }} />
            </Dialog.Content>
          )}
          <Dialog.Actions>
            <Button onPress={() => setEdit(null)}>انصراف</Button>
            {edit?.id ? <Button textColor="#f44336" onPress={removeAccount}>حذف</Button> : null}
            <Button mode="contained" onPress={saveEdit}>ذخیره</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
