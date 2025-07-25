require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const botToken = process.env.BOT_TOKEN;
const gravityUsername = process.env.GF_USERNAME;
const gravityPassword = process.env.GF_PASSWORD;
const formId = process.env.GF_FORM_ID;
const gravityUrl = process.env.GF_API_URL;

if (!botToken || !gravityUsername || !gravityPassword || !formId || !gravityUrl) {
  console.error("لطفا مقادیر .env را کامل و صحیح وارد کنید.");
  process.exit(1);
}

const bot = new TelegramBot(botToken, { polling: true });

// حافظه ساده برای نگهداری شماره کارشناسان (json)
const dataFile = path.join(__dirname, 'users.json');
let users = {};

// بارگذاری حافظه از فایل
if (fs.existsSync(dataFile)) {
  try {
    users = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    users = {};
  }
}

// ذخیره حافظه در فایل
function saveUsers() {
  fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
}

// داده‌های نمونه کارشناسان از قبل
// اگر می‌خواهید دستی وارد کنید اینجا اضافه کنید مثل:
// users = { "<chat_id>": { name: "علی فیروز", phone: "09170324187" } };
// ولی این کد به صورت تعاملی می‌گیرد

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text && msg.text.trim();

  if (!text) return;

  // اگر کاربر جدید است، ازش شماره کارشناس را بگیر
  if (!users[chatId] || !users[chatId].phone) {
    if (!/^\d{8,15}$/.test(text.replace(/\D/g, ''))) {
      // شماره معتبر نداد، درخواست دوباره
      return bot.sendMessage(chatId, 'لطفا شماره تلفن همراه خود (کارشناس فروش) را فقط به صورت عددی وارد کنید.');
    }
    // ذخیره شماره کارشناسی
    users[chatId] = { phone: text.replace(/\D/g, ''), name: null };
    saveUsers();
    return bot.sendMessage(chatId, 'شماره کارشناس ثبت شد. حالا لطفا نام خود را وارد کنید:');
  }

  // اگر شماره ثبت شده ولی نام ثبت نشده
  if (users[chatId] && !users[chatId].name) {
    users[chatId].name = text;
    saveUsers();
    return bot.sendMessage(chatId, `نام شما ثبت شد: ${text}\nحالا شماره مشتری را وارد کنید:`);
  }

  // وقتی نام و شماره کارشناس ثبت شده، منتظر شماره مشتری هستیم
  if (users[chatId].name && users[chatId].phone) {
    // شماره مشتری را دریافت می‌کنیم و ارسال به گرویتی فرم
    if (!/^\d{8,15}$/.test(text.replace(/\D/g, ''))) {
      return bot.sendMessage(chatId, 'لطفا شماره مشتری را فقط به صورت عددی وارد کنید.');
    }
    const customerPhone = text.replace(/\D/g, '');

    // ارسال به گرویتی فرم
    try {
      const dataToSend = {
        input_values: {
          5: customerPhone,          // فیلد شماره مشتری
          6: users[chatId].name     // فیلد نام کارشناس
        }
      };

      const response = await axios.post(gravityUrl, dataToSend, {
        auth: {
          username: gravityUsername,
          password: gravityPassword,
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 201 || response.status === 200) {
        bot.sendMessage(chatId, `اطلاعات مشتری با شماره ${customerPhone} با موفقیت ارسال شد.`);
      } else {
        bot.sendMessage(chatId, 'خطا در ارسال اطلاعات به فرم. لطفا دوباره تلاش کنید.');
      }
    } catch (error) {
      console.error('خطا در ارسال به گرویتی فرم:', error.response?.data || error.message);
      bot.sendMessage(chatId, `❌ خطا در ارسال اطلاعات به فرم.\n${error.response?.data?.message || error.message}`);
    }

    return; // برای جلوگیری از ادامه پیام‌ها
  }
});
