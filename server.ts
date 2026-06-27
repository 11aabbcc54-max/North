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
