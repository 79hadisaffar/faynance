import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// تنظیمات نوتیفیکیشن
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  async init() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#FFA000',
        sound: 'default',
      });
    }

    // درخواست مجوز
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
  console.warn('⚠️ اجازه‌ی اعلان‌ها داده نشده است');
    }
  }

  async scheduleNotification(
    title: string,
    body: string,
    date: Date,
    data?: any,
    channelId: 'default' | 'reminders' = 'default'
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        // روی اندروید، کانال نوتیفیکیشن را تعیین می‌کند
        channelId,
      },
    });

    return identifier;
  }

  async scheduleReminder(
    title: string,
    message: string,
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string> {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(9, 0, 0, 0); // ساعت 9 صبح

    // اگه تاریخ یادآوری گذشته، برای فردا تنظیم کن
    if (reminderDate < new Date()) {
      reminderDate.setDate(new Date().getDate() + 1);
    }

    return this.scheduleNotification(
      `یادآوری: ${title}`,
      message,
      reminderDate,
      undefined,
      'reminders'
    );
  }

  async cancelNotification(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // یادآوری برای قسط
  async scheduleInstallmentReminder(
    installmentTitle: string,
    amount: number,
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string> {
    const message = `قسط ${installmentTitle} به مبلغ ${amount.toLocaleString('fa-IR')} تومان در تاریخ ${dueDate.toLocaleDateString('fa-IR')} سررسید دارد.`;
    return this.scheduleReminder(installmentTitle, message, dueDate, daysBefore);
  }

  // یادآوری برای بدهی
  async scheduleDebtReminder(
    personName: string,
    amount: number,
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string> {
    const message = `بدهی به ${personName} به مبلغ ${amount.toLocaleString('fa-IR')} تومان در تاریخ ${dueDate.toLocaleDateString('fa-IR')} سررسید دارد.`;
    return this.scheduleReminder(`بدهی ${personName}`, message, dueDate, daysBefore);
  }

  // یادآوری برای طلب
  async scheduleCreditReminder(
    personName: string,
    amount: number,
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string> {
    const message = `طلب از ${personName} به مبلغ ${amount.toLocaleString('fa-IR')} تومان در تاریخ ${dueDate.toLocaleDateString('fa-IR')} سررسید دارد.`;
    return this.scheduleReminder(`طلب ${personName}`, message, dueDate, daysBefore);
  }

  // یادآوری برای چک
  async scheduleCheckReminder(
    checkNumber: string,
    amount: number,
    type: 'receivable' | 'payable',
    dueDate: Date,
    daysBefore: number = 3
  ): Promise<string> {
    const typeText = type === 'receivable' ? 'دریافتی' : 'پرداختی';
    const message = `چک ${typeText} شماره ${checkNumber} به مبلغ ${amount.toLocaleString('fa-IR')} تومان در تاریخ ${dueDate.toLocaleDateString('fa-IR')} سررسید دارد.`;
    return this.scheduleReminder(`چک ${checkNumber}`, message, dueDate, daysBefore);
  }
}

export default new NotificationService();
