# راهنمای نصب Java و ساخت APK

## مشکل فعلی:
Java JDK نسخه 11 نصب است، اما برای ساخت APK نیاز به Java JDK 17 یا بالاتر داریم.

## راه‌حل (انتخاب کنید):

### گزینه 1: نصب Java JDK 17 (5 دقیقه)
1. دانلود Java JDK 17:
   - لینک: https://adoptium.net/temurin/releases/
   - انتخاب: Java 17 (LTS)
   - سیستم‌عامل: Windows
   - فایل: .msi installer

2. نصب Java:
   - فایل دانلود شده را اجرا کنید
   - در مسیر پیش‌فرض نصب کنید: C:\Program Files\Eclipse Adoptium\jdk-17...
   - گزینه "Set JAVA_HOME" را فعال کنید

3. بعد از نصب، این فایل را اجرا کنید:
   ```
   fix-java.bat
   ```

4. سپس APK را بسازید:
   ```
   build-apk.bat
   ```

### گزینه 2: استفاده از Expo Go (بدون نیاز به ساخت APK) - فوری!
اگر می‌خواهید فوراً برنامه را امتحان کنید:

1. Expo Go را از Play Store نصب کنید:
   https://play.google.com/store/apps/details?id=host.exp.exponent

2. این فایل را اجرا کنید:
   ```
   run-with-expo-go.bat
   ```

3. QR code را با Expo Go اسکن کنید

توجه: این روش فقط برای تست است و نمی‌توانید فایل APK را به دیگران بدهید.

---

## مکان فایل APK (بعد از ساخت):
```
c:\Users\hadi\New folder (2)\FinanceApp\android\app\build\outputs\apk\release\app-release.apk
```

این فایل را می‌توانید به دیگران بدهید و روی هر گوشی Android نصب کنید.

## حجم تقریبی APK: 40-60 مگابایت

## مدت زمان ساخت APK: 5-10 دقیقه (اولین بار)
