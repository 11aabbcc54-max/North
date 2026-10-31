import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini API client
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set in the environment variables!");
  }
  const ai = new GoogleGenAI({
    apiKey: apiKey || 'dummy-key',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Load Firebase Config
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }

  // Set limits for base64 image support
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Catch body parsing errors (e.g. payload too large, invalid JSON)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && req.path.startsWith('/api/')) {
      console.error('Body parser error for API route:', err);
      return res.status(err.status || 400).json({ 
        error: `خطأ في معالجة الطلب: ${err.message || 'بيانات غير صالحة أو تجاوز الحد المسموح وحجم الملف كبير جداً'}` 
      });
    }
    next(err);
  });

  // API Routes
  app.post('/api/gemini/analyze-image', async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY index is missing. Please configure it in Settings > Secrets.' });
      }

      let base64Data = image;
      let imgMimeType = mimeType || 'image/jpeg';

      if (image.includes(';base64,')) {
        const parts = image.split(';base64,');
        base64Data = parts[1];
        const mimeParts = parts[0].split(':');
        if (mimeParts[1]) {
          imgMimeType = mimeParts[1];
        }
      }

      console.log('Sending request to Gemini model (gemini-3.5-flash) to transcribe subscriptions...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: imgMimeType
            }
          },
          'Extract all car washing subscriptions shown in the image or spreadsheet screenshot. Return a structured list of every entry.'
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                apartmentNumber: { type: Type.STRING, description: "License plate or identifier under 'لوحة السيارة'" },
                apartment: { type: Type.STRING, description: "Apartment number under 'الشقة' inside the spreadsheet" },
                car: { type: Type.STRING, description: "Car model / name under 'السيارة'" },
                startDate: { type: Type.STRING, description: "Start date in YYYY-MM-DD format under 'تاريخ البداية'" },
                workerName: { type: Type.STRING, description: "Worker name under 'العامل'" },
                price: { type: Type.NUMBER, description: "Price under 'المبلغ' (e.g. 300, 400, 600)" },
                monthsCount: { type: Type.NUMBER, description: "Payment duration in months under 'مدة الدفع'" },
                schedule: { 
                  type: Type.ARRAY, 
                  items: { type: Type.INTEGER }, 
                  description: "Days to wash. Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0. Example: 'Fri & Tue' => [5, 2]" 
                }
              },
              required: ["apartmentNumber", "apartment", "car", "startDate", "workerName", "price", "monthsCount", "schedule"]
            }
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Gemini model returned empty response text');
      }

      const parsedData = JSON.parse(resultText);
      res.json({ data: parsedData });
    } catch (error: any) {
      console.error('Error in /api/gemini/analyze-image:', error);
      res.status(500).json({ error: error.message || 'Failed to process image' });
    }
  });

  // Text-To-Speech API route to generate audio files
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required for TTS generation' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server' });
      }

      console.log('Generating Arabic audio using gemini-3.8-flash-lite-tts for:', text.substring(0, 60));
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text,
                speechMetadata: {
                  style: 'Speak with clear, professional, natural Arabic pronunciation. Articulate apartment numbers and technical terms clearly.',
                },
              },
            ],
          },
        ] as any,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Charon' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('No audio data received from Gemini TTS model');
      }

      // Save audio to public/voices directory for direct audio link playback in WhatsApp
      const voicesDir = path.join(process.cwd(), 'public', 'voices');
      if (!fs.existsSync(voicesDir)) {
        fs.mkdirSync(voicesDir, { recursive: true });
      }

      const cleanApt = (req.body.apt || req.body.apartment || 'apt').toString().replace(/[^a-zA-Z0-9_-]/g, '');
      const fileId = `voice_${Date.now()}_${cleanApt}`;
      const fileName = `${fileId}.wav`;
      const filePath = path.join(voicesDir, fileName);

      fs.writeFileSync(filePath, Buffer.from(base64Audio, 'base64'));

      // Protocol and host for direct links
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const fullAudioUrl = `${protocol}://${host}/voices/${fileName}`;
      const playerUrl = `${protocol}://${host}/voice/${fileId}`;

      res.json({
        success: true,
        fileId,
        fileName,
        audioBase64: base64Audio,
        audioUrl: `/voices/${fileName}`,
        fullAudioUrl,
        playerUrl,
        mimeType: 'audio/wav',
        dataUri: `data:audio/wav;base64,${base64Audio}`
      });
    } catch (error: any) {
      console.error('Error in /api/tts:', error);
      res.status(500).json({ error: error.message || 'Failed to synthesize audio' });
    }
  });

  // Dedicated WhatsApp Voice Player page that auto-plays the audio with high fidelity
  app.get('/voice/:fileId', (req, res) => {
    const { fileId } = req.params;
    const voicesDir = path.join(process.cwd(), 'public', 'voices');
    const audioPath = path.join(voicesDir, `${fileId}.wav`);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8"><title>المقطع الصوتي غير متوفر</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0b141a;color:#fff;">
          <h2>عذراً، المقطع الصوتي غير متوفر أو انتهت صلاحيته</h2>
        </body>
        </html>
      `);
    }

    const audioUrl = `/voices/${fileId}.wav`;
    res.send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎙️ تسجيل صوتي لبلاغ الصيانة - نورث ريزيدنس</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0b141a;
            color: #e9edef;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            background: #111b21;
            border: 1px solid #222e35;
            border-radius: 28px;
            max-width: 440px;
            width: 100%;
            padding: 32px 24px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          }
          .icon-badge {
            width: 64px;
            height: 64px;
            border-radius: 20px;
            background: #00a884;
            color: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin-bottom: 20px;
            box-shadow: 0 8px 24px rgba(0,168,132,0.3);
          }
          h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #fff; }
          p.subtitle { font-size: 13px; color: #8696a0; margin-bottom: 24px; }
          .player-box {
            background: #202c33;
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid #2a3942;
          }
          .waves {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            height: 40px;
            margin-bottom: 16px;
          }
          .wave-bar {
            width: 4px;
            background: #00a884;
            border-radius: 4px;
            animation: bounce 1.2s ease-in-out infinite alternate;
          }
          .wave-bar:nth-child(2) { height: 16px; animation-delay: 0.1s; }
          .wave-bar:nth-child(3) { height: 28px; animation-delay: 0.2s; }
          .wave-bar:nth-child(4) { height: 38px; animation-delay: 0.3s; }
          .wave-bar:nth-child(5) { height: 22px; animation-delay: 0.4s; }
          .wave-bar:nth-child(6) { height: 34px; animation-delay: 0.5s; }
          .wave-bar:nth-child(7) { height: 18px; animation-delay: 0.6s; }
          .wave-bar:nth-child(8) { height: 30px; animation-delay: 0.7s; }
          .wave-bar:nth-child(9) { height: 14px; animation-delay: 0.8s; }
          @keyframes bounce {
            from { transform: scaleY(0.4); opacity: 0.5; }
            to { transform: scaleY(1); opacity: 1; }
          }
          .paused .wave-bar { animation: none; transform: scaleY(0.3); opacity: 0.3; }
          .play-btn {
            background: #00a884;
            color: #111b21;
            border: none;
            width: 100%;
            padding: 16px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            transition: 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .play-btn:hover { background: #02906f; }
          .download-btn {
            display: inline-block;
            margin-top: 16px;
            color: #8696a0;
            font-size: 13px;
            text-decoration: none;
          }
          .download-btn:hover { color: #00a884; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge">🎙️</div>
          <h1>مقطع صوتي لبلاغ الصيانة</h1>
          <p class="subtitle">مجمع نورث ريزيدنس السكني</p>

          <div class="player-box">
            <div id="waves" class="waves">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>

            <audio id="audio" src="${audioUrl}" preload="auto"></audio>

            <button id="btn" class="play-btn" onclick="togglePlay()">
              <span id="btnIcon">▶️</span>
              <span id="btnText">تشغيل الفويس الآن</span>
            </button>
          </div>

          <a href="${audioUrl}" download="صوت_بلاغ_الصيانة.wav" class="download-btn">
            📥 تحميل ملف الصوت (.WAV) لجهازك
          </a>
        </div>

        <script>
          const audio = document.getElementById('audio');
          const btnIcon = document.getElementById('btnIcon');
          const btnText = document.getElementById('btnText');
          const waves = document.getElementById('waves');

          function togglePlay() {
            if (audio.paused) {
              audio.play().then(() => {
                btnIcon.textContent = '⏸️';
                btnText.textContent = 'إيقاف مؤقت';
                waves.classList.remove('paused');
              }).catch(() => {
                alert('اضغط في أي مكان لتشغيل الصوت');
              });
            } else {
              audio.pause();
              btnIcon.textContent = '▶️';
              btnText.textContent = 'تشغيل الفويس';
              waves.classList.add('paused');
            }
          }

          audio.onended = () => {
            btnIcon.textContent = '▶️';
            btnText.textContent = 'إعادة تشغيل الفويس';
            waves.classList.add('paused');
          };

          // Try autoplay on user arrival
          window.addEventListener('load', () => {
            audio.play().then(() => {
              btnIcon.textContent = '⏸️';
              btnText.textContent = 'إيقاف مؤقت';
              waves.classList.remove('paused');
            }).catch(() => {
              waves.classList.add('paused');
            });
          });
        </script>
      </body>
      </html>
    `);
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === 'Fyozr' && password === '5150') {
      try {
        // Create a custom token for the user
        // We use a consistent UID for this user
        const uid = 'fyozr-admin-user';
        const customToken = await admin.auth().createCustomToken(uid, {
          role: 'admin',
          email: 'Fyozr@system.local'
        });

        res.json({ token: customToken });
      } catch (error) {
        console.error('Error creating custom token:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Final catch-all error handler for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(err.status || err.statusCode || 500).json({
        error: err.message || 'حدث خطأ غير متوقع في السيرفر الداخلي'
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
