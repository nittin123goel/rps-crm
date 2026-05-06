import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import publicRoutes from './routes/public.js';
import applicationRoutes from './routes/applications.js';
import projectRoutes from './routes/projects.js';
import userRoutes from './routes/users.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

// CORS — allow listed origins
const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));

// Health
app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// Public (no auth) — customer submission
app.use('/api/public', publicRoutes);

// Auth-required
app.use('/api/applications', applicationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on :${port}`));
