import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Load Firebase Config
  const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

  // Initialize Firebase Admin
  // In this environment, we can usually initialize without credentials to use default ones
  // or we can provide the project ID.
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }

  app.use(express.json());

  // API Routes
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
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
