import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // This parses URL-encoded bodies

// Serve static files from /public
app.use('/public', express.static(path.join(__dirname, 'public')));

import gameApiRoutes from './routes/gameapi.js';
import translationApiRoutes from './routes/translations.js';

app.use('/gameapi', gameApiRoutes);
app.use('/translations', translationApiRoutes);

app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
