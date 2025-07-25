const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ====== اینها را خودت جایگزین کن ======
const TELEGRAM_TOKEN = '7956714963:AAHnybhfhA3c0d7C1VJnXIHhbR-fkeTsXfI';
const GRAVITY_FORM_API_URL = 'https://pestehiran.shop/wp-json/gf/v2/forms/1/submissions';
const GRAVITY_API_USER = 'ck_c41df7e26cdcfcf53c467b77a62b13e91f4343fc';
const GRAVITY_API_PASS = 'cs_539bbe6f6d5e524b984d4a658d1d698c75574295';

// اطلاعات کارشناسان (نام و شماره)
// میتونی هر تعداد اضافه کنی
const salesExperts = {
  // شماره کارشناس => نام کارشناس
  "09170324187": "علی فیروز",
  "شماره_کارشناس_دوم": "نام_کارشناس_دوم"
};

// حافظه موقت برای ذخیره وضعیت چت‌ها (تا ربات ریست نشه)
// فرمت: chatId: { expertNumber: '...', step: 'awaiting_customer_number' یا 'awaiting_expert_number' یا 'done' }
const chatMemory = {};

// ساخت ربات (Polling)
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text && msg.text.trim();

  if (!text) return;

  if (!chatMemory[chatId]) {
    // کاربر برای اولین بار پیام داده، ازش شماره کارشناس بپرس
    chatMemory[chatId] = {
      step: 'awaiting_expert_number',
      expertNumber: null
    };
    bot.sendMessage(chatId, 'لطفاً شماره تلفن کارشناس فروش خود را وارد کنید:');
    return;
  }

  const userData = chatMemory[chatId];

  if (userData.step === 'awaiting_expert_number') {
    // ذخیره شماره کارشناس و چک کردن
    if (salesExperts[text]) {
      userData.expertNumber = text;
      userData.step = 'awaiting_customer_number';
      bot.sendMessage(chatId, `کارشناس شما: ${salesExperts[text]}. حالا شماره مشتری را وارد کنید:`);
    } else {
      bot.sendMessage(chatId, 'شماره کارشناس معتبر نیست. لطفاً شماره صحیح را وارد کنید:');
    }
    return;
  }

  if (userData.step === 'awaiting_customer_number') {
    // شماره مشتری دریافت شد، ارسال به گرویتی فرم
    const customerNumber = text;
    const expertNumber = userData.expertNumber;
    const expertName = salesExperts[expertNumber];

    try {
      await axios.post(GRAVITY_FORM_API_URL, {
        input_values: {
          5: customerNumber,  // شماره مشتری
          6: expertName       // نام کارشناس
        }
      }, {
        auth: {
          username: GRAVITY_API_USER,
          password: GRAVITY_API_PASS
        }
      });
      bot.sendMessage(chatId, 'اطلاعات با موفقیت ثبت شد. ممنون از شما!');
      userData.step = 'done';
    } catch (error) {
      console.error('خطا در ارسال به گرویتی فرم:', error.response?.data || error.message);
      bot.sendMessage(chatId, '❌ خطا در ارسال اطلاعات به فرم. لطفاً دوباره تلاش کنید.');
    }
    return;
  }

  if (userData.step === 'done') {
    bot.sendMessage(chatId, 'اطلاعات قبلا ثبت شده. اگر می‌خواهید مجدداً ثبت کنید، لطفاً /start را ارسال کنید.');
  }
});

// دستور /start برای ریست کردن حافظه و شروع مجدد
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  chatMemory[chatId] = null;
  bot.sendMessage(chatId, 'ربات ریست شد. لطفاً شماره تلفن کارشناس فروش خود را وارد کنید:');
});
