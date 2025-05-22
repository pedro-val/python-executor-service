import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

const execPromise = promisify(exec);
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/app/workspace';

async function setupEnvironment() {
  try {
    // Ensure workspace directory exists
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    logger.info(`Workspace directory created: ${WORKSPACE_DIR}`);
    
    // Check Python environment
    try {
      const { stdout } = await execPromise('python3 --version');
      logger.info(`Python version: ${stdout.trim()}`);
      
      // Check if nsjail is available
      try {
        await execPromise('which nsjail');
        const { stdout: nsjailVersion } = await execPromise('nsjail --version');
        logger.info(`nsjail is available: ${nsjailVersion.trim()}`);
      } catch (error) {
        logger.warn('nsjail is not available, will fallback to direct Python execution');
      }
      
      // Check Python packages
      const { stdout: packages } = await execPromise('pip3 list');
      logger.info('Available Python packages:');
      logger.info(packages);
    } catch (error) {
      logger.error(`Error checking Python environment: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error during environment setup: ${error.message}`);
  }
}

// Run setup and then start the application
setupEnvironment()
  .then(() => {
    logger.info('Environment setup complete, starting application...');
    // Start the main application
    import('./index.js').catch(error => {
      logger.error(`Failed to start application: ${error.message}`);
      process.exit(1);
    });
  })
  .catch(err => {
    logger.error(`Startup error: ${err.message}`);
    process.exit(1);
  }); 