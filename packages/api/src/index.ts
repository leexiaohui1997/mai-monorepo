import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureDataDir, getDataDir } from './config/paths';
import providerRoutes from './routes/providers';

dotenv.config();
ensureDataDir();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/providers', providerRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] MAI API running on http://localhost:${PORT}`);
  console.log(`[Config] Data directory: ${getDataDir()}`);
});
