import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Portal, Modal, Title, RadioButton, List, Switch, Divider, IconButton, Text, Button, Dialog, TextInput } from 'react-native-paper';
import { ScrollView } from 'react-native';
import { useSettings } from '../theme';
import DatabaseService from '../services/database';

export default function SettingsModal() {
  const { themeKey, setTheme, visibleTabs, setVisibleTabs, isSettingsOpen, closeSettings, fontFamily, setFontFamily, fontScale, incFont, decFont, colorScheme, setColorScheme } = useSettings();
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [busy, setBusy] = useState(false);

  const onBackup = async () => {
    try {
      setBusy(true);
      const json = await (DatabaseService as any).exportAll?.();
      setBackupText(json || '');
      setBackupOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    Alert.alert('بازگردانی', 'بازگردانی کل داده‌ها باعث جایگزینی کامل دیتابیس فعلی می‌شود. ادامه می‌دهید؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'ادامه', style: 'destructive', onPress: async () => {
        try {
          setBusy(true);
          await (DatabaseService as any).importAll?.(restoreText || '{}');
          setRestoreOpen(false);
          setRestoreText('');
          closeSettings();
        } catch (e) {
          Alert.alert('خطا', 'بازگردانی انجام نشد. فرمت JSON را بررسی کنید.');
        } finally {
          setBusy(false);
        }
      } }
    ]);
  };

  return (
    <Portal>
      <Modal visible={isSettingsOpen} onDismiss={closeSettings} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Title style={styles.title}>تنظیمات نمایش و تم</Title>

          <List.Section>
          <List.Subheader>تم برنامه</List.Subheader>
          <RadioButton.Group onValueChange={(v)=>setTheme(v as any)} value={themeKey}>
            <RadioButton.Item label="روشن" value="light" />
            <RadioButton.Item label="تیره" value="dark" />
          </RadioButton.Group>
  </List.Section>

        <Divider style={{ marginVertical: 8 }} />

        <List.Section>
          <List.Subheader>رنگ اصلی برنامه</List.Subheader>
          <RadioButton.Group value={colorScheme} onValueChange={(v)=>setColorScheme(v as any)}>
            <RadioButton.Item label="بنفش" value="purple" />
            <RadioButton.Item label="فیروزه‌ای" value="teal" />
            <RadioButton.Item label="آبی" value="blue" />
            <RadioButton.Item label="نارنجی" value="orange" />
            <RadioButton.Item label="قرمز" value="red" />
          </RadioButton.Group>
        </List.Section>

        <Divider style={{ marginVertical: 8 }} />

        <List.Section>
          <List.Subheader>فونت و اندازه</List.Subheader>
          <RadioButton.Group onValueChange={(v)=>setFontFamily(v)} value={fontFamily}>
            <RadioButton.Item label="سیستمی" value="" />
            <RadioButton.Item label="Vazirmatn (پیشنهاد فارسی)" value="Vazirmatn" />
            <RadioButton.Item label="IRANSans (در صورت نصب)" value="IRANSans" />
            <RadioButton.Item label="Sans Serif" value="sans-serif" />
            <RadioButton.Item label="Sans Serif Medium" value="sans-serif-medium" />
          </RadioButton.Group>
          <List.Item
            title="اندازه فونت"
            description={`ضریب: ${fontScale.toFixed(1)}`}
            right={() => (
              <>
                <IconButton icon="minus" onPress={decFont} />
                <IconButton icon="plus" onPress={incFont} />
              </>
            )}
          />
        </List.Section>

        
            {/* فونت و اندازه در بالا مدیریت می‌شود */}

            <Divider style={{ marginVertical: 8 }} />

        <List.Section>
          <List.Subheader>نمایش تب‌ها</List.Subheader>
          {(
            [
              ['dashboard','داشبورد'],
              ['installments','اقساط'],
              ['debts','بدهی‌ها'],
              ['credits','طلب‌ها'],
              ['checks','چک‌ها'],
              ['expenses','مخارج'],
              ['accounts','حساب‌ها'],
            ] as const
          ).map(([key,label]) => (
            <List.Item
              key={key}
              title={label}
              right={() => (
                <Switch value={(visibleTabs as any)[key]} onValueChange={(val)=>setVisibleTabs({ [key]: val } as any)} />
              )}
            />
          ))}
        </List.Section>

        <Divider style={{ marginVertical: 8 }} />

        <List.Section>
          <List.Subheader>پشتیبان‌گیری و بازگردانی (آفلاین)</List.Subheader>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button mode="contained" onPress={onBackup} loading={busy}>پشتیبان‌گیری (نمایش JSON)</Button>
            <Button mode="outlined" onPress={()=>setRestoreOpen(true)} disabled={busy}>بازگردانی از JSON</Button>
          </View>
          <Text style={{ color: '#777', marginTop: 6 }}>برای بازگردانی، فایل JSON نسخه پشتیبان را در دیالوگ بعدی Paste کنید.</Text>
        </List.Section>
        </ScrollView>

        {/* Backup Dialog */}
        <Dialog visible={backupOpen} onDismiss={()=>setBackupOpen(false)}>
          <Dialog.Title>نسخه پشتیبان (JSON)</Dialog.Title>
          <Dialog.Content>
            <TextInput multiline numberOfLines={12} value={backupText} onChangeText={setBackupText} mode="outlined" editable={false} />
            <Text style={{ marginTop: 8, color: '#777' }}>این متن را کپی و در جایی امن ذخیره کنید.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={()=>setBackupOpen(false)}>بستن</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog visible={restoreOpen} onDismiss={()=>setRestoreOpen(false)}>
          <Dialog.Title>بازگردانی از JSON</Dialog.Title>
          <Dialog.Content>
            <TextInput multiline numberOfLines={10} placeholder="متن JSON نسخه پشتیبان را اینجا Paste کنید" value={restoreText} onChangeText={setRestoreText} mode="outlined" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={()=>setRestoreOpen(false)}>انصراف</Button>
            <Button mode="contained" onPress={onRestore} disabled={!restoreText || busy}>بازگردانی</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { backgroundColor: 'white', padding: 0, margin: 16, borderRadius: 10, maxHeight: '80%' },
  scrollContent: { padding: 20 },
  title: { marginBottom: 8, textAlign: 'center' },
});
