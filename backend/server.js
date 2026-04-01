import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import stockRoutes from './routes/stock.js';
import statsRoutes from './routes/stats.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'OK', version: '5.5.0', timestamp: new Date().toISOString() }));
app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stock',        stockRoutes);
app.use('/api/stats',        statsRoutes);
app.use('/api/settings',     settingsRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée', path: req.path }));
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`\n🚀 FOREXIUM v5.5.0  |  Port ${PORT}  |  ${process.env.NODE_ENV || 'development'}`);
  await testConnection();
});

process.on('SIGTERM', () => { console.log('Arrêt...'); process.exit(0); });
