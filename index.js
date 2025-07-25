import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// چک متغیرهای محیطی
const requiredEnv = [
  'TELEGRAM_BOT_TOKEN',
  'GRAVITY_API_USER',
  'GRAVITY_API_PASS',
  'GRAVITY_API_URL',
  'FORM_FIELD_PHONE',
  'FORM_FIELD_SALESMAN',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`خطا: مقدار ${key} در فایل .env تنظیم نشده است.`);
    process.exit(1);
  }
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// حافظه ساده برای کارشناسان
const experts = new Map();

bot.start((ctx) => {
  ctx.reply('سلام! لطفاً شماره تلفن کارشناس فروش خود را وارد کنید:');
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  if (!experts.has(chatId)) {
    // ثبت شماره کارشناس (بار اول)
    experts.set(chatId, { phone: text, name: `کارشناس شماره ${text}` });
    return ctx.reply(`شماره کارشناس شما ثبت شد: ${text}\nلطفاً شماره مشتری را وارد کنید.`);
  } else {
    // دریافت شماره مشتری و ارسال به گرویتی فرم
    const expert = experts.get(chatId);
    const customerNumber = text;

    const payload = {
      input_values: {
        [process.env.FORM_FIELD_PHONE]: customerNumber,
        [process.env.FORM_FIELD_SALESMAN]: expert.name,
      },
    };

    try {
      const response = await fetch(process.env.GRAVITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' +
            Buffer.from(
              process.env.GRAVITY_API_USER + ':' + process.env.GRAVITY_API_PASS
            ).toString('base64'),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('خطا در ارسال به گرویتی فرم:', text);
        return ctx.reply('ارسال اطلاعات به سرور با خطا مواجه شد. لطفاً دوباره تلاش کنید.');
      }

      ctx.reply('اطلاعات با موفقیت ارسال شد. ممنون از همکاری شما!');
    } catch (error) {
      console.error('خطای شبکه یا سرور:', error);
      ctx.reply('خطایی رخ داده. لطفاً دوباره تلاش کنید.');
    }
  }
});

bot.launch().then(() => {
  console.log('بات با موفقیت اجرا شد');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
