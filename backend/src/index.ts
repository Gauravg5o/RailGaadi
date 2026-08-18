import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import trainsRouter from './routes/trains';
import weatherRouter from './routes/weather';
import elevationRouter from './routes/elevation';
import geographyRouter from './routes/geography';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://rail-gaadi-2j9i.vercel.app' // Replace with your actual live Next.js URL
  ],
  credentials: true
}));

// Rate Limiting: 100 requests per 15 min window
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// API Routes
app.use('/api/trains', trainsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/elevation', elevationRouter);
app.use('/api/geography', geographyRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RailGaadi Intelligence Backend',
    apis: {
      openWeather: !!process.env.OPENWEATHER_API_KEY,
      openTopography: !!process.env.OPENTOPOGRAPHY_API_KEY,
      railRadar: !!process.env.RAILRADAR_API_KEY,
      mapTiler: !!process.env.MAPTILER_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚆 RailGaadi Backend running at http://localhost:${PORT}`);
});
