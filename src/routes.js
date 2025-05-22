import express from 'express';
import { executePythonCode } from './python-executor.js';
import { logger } from './logger.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Python execution endpoint
router.post('/execute', async (req, res, next) => {
  try {
    const { script } = req.body;

    // Validate request
    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }

    // Basic validation for main function
    if (!script.includes('def main():')) {
      return res.status(400).json({
        error: 'Script must contain a main() function'
      });
    }

    logger.info('Executing Python script');
    const result = await executePythonCode(script);
    
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error executing Python script: ${error.message}`);
    if (error.message.includes('JSON')) {
      return res.status(400).json({
        error: 'The main() function must return a JSON-serializable object'
      });
    }
    next(error);
  }
});

export { router }; 