require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const OpenAI = require("openai");

// OpenAI клиент (берёт ключ из .env: OPENAI_API_KEY=...)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Простой health-check
app.get("/", (_req, res) => {
  res.send("Lior Server OK");
});

// ================== WhatsApp Client ==================
const waClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false, // показываем окно браузера, так стабильнее
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ],
    // Если Chromium всё равно падает, можно указать свой Chrome:
    // executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  },
});

// QR-код для входа в WhatsApp
waClient.on("qr", (qr) => {
  console.log("📱 Отсканируй этот QR код в WhatsApp:");
  qrcode.generate(qr, { small: true });
});

waClient.on("ready", () => {
  console.log("✅ WhatsApp client готов");
});

// Пришло сообщение в WhatsApp
waClient.on("message", async (msg) => {
  try {
    const userText = (msg.body || "").trim();
    if (!userText) return;

    console.log("📩 WhatsApp сообщение:", msg.from, "=>", userText);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Ты дружелюбный, короткий и понятный ассистент. Отвечай по делу, максимум 3–4 предложения.",
        },
        { role: "user", content: userText },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Не получилось ответить, попробуй ещё раз.";

    await msg.reply(reply);

    // Отправим в WebSocket, если фронт слушает
    io.emit("whatsapp-message", {
      from: msg.from,
      text: userText,
      reply,
    });
  } catch (err) {
    console.error("❌ Ошибка обработки сообщения:", err);
  }
});

// Стартуем WhatsApp, но не убиваем сервер, если что-то пошло не так
waClient
  .initialize()
  .then(() => console.log("🚀 Инициализация WhatsApp завершена"))
  .catch((err) => {
    console.error("❌ Ошибка инициализации WhatsApp:", err);
  });

// ================== HTTP + WebSocket сервер ==================
server.listen(PORT, () => {
  console.log(`🚀 Lior Server запущен на http://localhost:${PORT}`);
  console.log(`📡 WebSocket слушает на ws://localhost:${PORT}`);
});
