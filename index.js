require('dotenv').config();

const requiredEnv = [
  'TELEGRAM_BOT_TOKEN',
  'GRAVITY_API_USER',
  'GRAVITY_API_PASS',
  'GRAVITY_API_URL',
  'FORM_FIELD_PHONE',
  'FORM_FIELD_SALESMAN'
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`خطا: متغیر محیطی ${key} مقداردهی نشده است.`);
    process.exit(1);
  }
}

console.log('تمام متغیرهای محیطی به درستی مقداردهی شده‌اند.');
// اینجا میتونی بقیه کد ربات رو قرار بدی یا اینو فقط تست کنی
