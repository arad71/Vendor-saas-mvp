/**
 * Development startup script to run both client and server
 * Usage: node start-dev.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Paths
const rootDir = process.cwd();
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

// Check if directories exist
if (!fs.existsSync(serverDir)) {
  console.error(`${colors.red}Server directory not found: ${serverDir}${colors.reset}`);
  process.exit(1);
}

if (!fs.existsSync(clientDir)) {
  console.error(`${colors.red}Client directory not found: ${clientDir}${colors.reset}`);
  process.exit(1);
}

// Check if .env files exist and create them if they don't
const serverEnvFile = path.join(serverDir, '.env');
const clientEnvFile = path.join(clientDir, '.env');

if (!fs.existsSync(serverEnvFile)) {
  console.log(`${colors.yellow}Server .env file not found. Creating from example...${colors.reset}`);
  const serverEnvExampleFile = path.join(serverDir, '.env.example');
  
  if (fs.existsSync(serverEnvExampleFile)) {
    fs.copyFileSync(serverEnvExampleFile, serverEnvFile);
    console.log(`${colors.green}Created ${serverEnvFile}${colors.reset}`);
  } else {
    console.warn(`${colors.yellow}Server .env.example file not found. Skipping...${colors.reset}`);
  }
}

if (!fs.existsSync(clientEnvFile)) {
  console.log(`${colors.yellow}Client .env file not found. Creating from example...${colors.reset}`);
  const clientEnvExampleFile = path.join(clientDir, '.env.example');
  
  if (fs.existsSync(clientEnvExampleFile)) {
    fs.copyFileSync(clientEnvExampleFile, clientEnvFile);
    console.log(`${colors.green}Created ${clientEnvFile}${colors.reset}`);
  } else {
    console.warn(`${colors.yellow}Client .env.example file not found. Skipping...${colors.reset}`);
  }
}

// Function to start a process
function startProcess(command, args, cwd, name, color) {
  const proc = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: true }
  });

  // Print process output with color prefix
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${name}] ${line}${colors.reset}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${color}[${name}] ${line}${colors.reset}`);
      }
    });
  });

  proc.on('close', (code) => {
    console.log(`${color}[${name}] Process exited with code ${code}${colors.reset}`);
  });

  return proc;
}

// Start the server
console.log(`${colors.magenta}=== Starting development environment ===${colors.reset}`);
console.log(`${colors.cyan}Starting server...${colors.reset}`);
const server = startProcess('npm', ['run', 'dev'], serverDir, 'Server', colors.cyan);

// Start the client
console.log(`${colors.green}Starting client...${colors.reset}`);
const client = startProcess('npm', ['start'], clientDir, 'Client', colors.green);

// Handle process termination
process.on('SIGINT', () => {
  console.log(`${colors.magenta}Shutting down...${colors.reset}`);
  server.kill();
  client.kill();
  process.exit();
});

console.log(`${colors.magenta}=== Development environment started ===${colors.reset}`);
console.log(`${colors.magenta}Press Ctrl+C to stop both server and client${colors.reset}`);
