import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { router } from './routes.js';
import { logger } from './logger.js';

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/', router);

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Python Executor Service listening on port ${port}`);
}); 