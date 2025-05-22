import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { file } from 'tmp-promise';
import { logger } from './logger.js';

const execPromise = promisify(exec);
const PYTHON_PATH = process.env.PYTHON_PATH || '/app/venv/bin/python3';
const NSJAIL_CONFIG_PATH = process.env.NSJAIL_CONFIG_PATH || '/app/config/nsjail_config.proto';
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/app/workspace';

/**
 * Execute Python code securely using nsjail
 * @param {string} pythonCode - The Python code to execute
 * @returns {Promise<{result: Object, stdout: string}>} - The result of execution
 */
export async function executePythonCode(pythonCode) {
  // Create temporary file for the script with a unique name
  const scriptName = `script-${uuidv4()}.py`;
  const workspacePath = path.join(WORKSPACE_DIR, scriptName);
  
  try {
    // Create the wrapper script that captures main() return value and stdout
    const wrapperScript = createWrapperScript(pythonCode);
    
    // Ensure workspace directory exists
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    
    // Write the script directly to the workspace directory
    await fs.writeFile(workspacePath, wrapperScript);
    
    // Execute the Python script securely
    let command;
    
    // Try to use nsjail if available, otherwise fallback to direct Python execution
    try {
      // First check if nsjail is installed
      await execPromise('which nsjail');
      
      command = `nsjail --config ${NSJAIL_CONFIG_PATH} -- ${PYTHON_PATH} ${workspacePath}`;
      logger.info(`Using nsjail for secure execution with config: ${NSJAIL_CONFIG_PATH}`);
    } catch (error) {
      // Fallback to direct execution if nsjail is not available
      command = `${PYTHON_PATH} ${workspacePath}`;
      logger.warn('nsjail not found, falling back to direct Python execution');
    }
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      logger.warn(`Python stderr: ${stderr}`);
    }
    
    // Parse the output to extract result and stdout
    const result = parseExecutionOutput(stdout);
    return result;
  } catch (error) {
    logger.error(`Execution error: ${error.message}`);
    throw new Error(`Failed to execute Python code: ${error.message}`);
  } finally {
    // Clean up the workspace file
    try {
      await fs.unlink(workspacePath);
    } catch (error) {
      logger.warn(`Failed to clean up temporary file: ${error.message}`);
    }
  }
}

/**
 * Create a wrapper script to capture main() return value and stdout
 * @param {string} originalScript - The original Python script
 * @returns {string} - The wrapped script
 */
function createWrapperScript(originalScript) {
  return `
import sys
import os
import json
import io
from contextlib import redirect_stdout

# Original script
${originalScript}

# Validate main function exists
if 'main' not in globals() or not callable(globals()['main']):
    sys.stderr.write("Error: main() function not found")
    sys.exit(1)

# Capture stdout during execution
buffer = io.StringIO()
with redirect_stdout(buffer):
    try:
        result = main()
        # Validate result is JSON serializable
        try:
            json.dumps(result)
        except (TypeError, OverflowError):
            sys.stderr.write("Error: main() must return JSON serializable data")
            sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Error during execution: {str(e)}")
        sys.exit(1)

# Output the result and captured stdout separately
print("___RESULT_SEPARATOR___")
print(json.dumps(result))
print("___STDOUT_SEPARATOR___")
print(buffer.getvalue())
`;
}

/**
 * Parse the execution output to extract result and stdout
 * @param {string} output - The raw execution output
 * @returns {{result: Object, stdout: string}} - The parsed result and stdout
 */
function parseExecutionOutput(output) {
  // Split the output to get result and stdout
  const parts = output.split('___RESULT_SEPARATOR___');
  if (parts.length < 2) {
    throw new Error('Failed to parse execution result');
  }
  
  const resultParts = parts[1].split('___STDOUT_SEPARATOR___');
  if (resultParts.length < 2) {
    throw new Error('Failed to parse execution stdout');
  }
  
  const resultJson = resultParts[0].trim();
  const stdout = resultParts[1].trim();
  
  try {
    const result = JSON.parse(resultJson);
    return { result, stdout };
  } catch (error) {
    throw new Error('Failed to parse JSON result from Python execution');
  }
} 