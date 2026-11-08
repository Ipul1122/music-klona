import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import verifyHandler from '../api/verify';
import adminGenerateHandler from '../api/admin-generate';
import searchHandler from '../api/search';
import extractStreamHandler from '../api/extract-stream';
import streamHandler from '../api/stream';
import { getAllLicenses } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check & status
app.get('/', (_req, res) => {
  res.json({
    service: 'Musik-Klona License Server',
    status: 'online',
    version: '1.0.0',
    documentation: {
      verify: 'POST /api/verify',
      adminGenerate: 'POST /api/admin-generate'
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mounted handlers
app.all('/api/verify', verifyHandler);
app.all('/api/admin-generate', adminGenerateHandler);
app.all('/api/search', searchHandler);
app.all('/api/extract-stream', extractStreamHandler);
app.all('/api/stream', streamHandler);

// Admin read-only dashboard list (for developer inspection)
app.get('/api/admin/licenses', async (req, res) => {
  const secret = req.query.secret || req.headers.authorization?.replace('Bearer ', '');
  const adminSecret = process.env.ADMIN_SECRET || 'musik-klona-admin-master-key-2026';
  if (secret !== adminSecret) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const all = await getAllLicenses();
  return res.json({ total: all.length, licenses: all });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 [LICENSE-SERVER] Berjalan di http://localhost:${PORT}`);
    console.log(`🔑 Endpoint Verifikasi: POST http://localhost:${PORT}/api/verify`);
    console.log(`🛡️  Endpoint Admin Generate: POST http://localhost:${PORT}/api/admin-generate`);
  });
}

export default app;

