#!/usr/bin/env node

/**
 * Quick Start - Task Management System
 * 
 * This script provides a quick checklist for getting the system up and running.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🚀 Task Management System - Quick Start Checklist\n');
console.log('='.repeat(50) + '\n');

const checks = [
    {
        name: 'Node.js installed',
        check: () => {
            try {
                execSync('node --version', { stdio: 'pipe' });
                return true;
            } catch {
                return false;
            }
        }
    },
    {
        name: 'npm installed',
        check: () => {
            try {
                execSync('npm --version', { stdio: 'pipe' });
                return true;
            } catch {
                return false;
            }
        }
    },
    {
        name: 'Dependencies installed',
        check: () => {
            return fs.existsSync(path.join(__dirname, 'node_modules'));
        }
    },
    {
        name: 'Backend server file exists',
        check: () => {
            return fs.existsSync(path.join(__dirname, 'server-wrapper.cjs'));
        }
    },
    {
        name: 'API test file exists',
        check: () => {
            return fs.existsSync(path.join(__dirname, 'test-api.js'));
        }
    },
    {
        name: 'Frontend source files exist',
        check: () => {
            return fs.existsSync(path.join(__dirname, 'index.tsx'));
        }
    }
];

let passed = 0;
checks.forEach(check => {
    const result = check.check();
    const status = result ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (result) passed++;
});

console.log('\n' + '='.repeat(50) + '\n');

if (passed === checks.length) {
    console.log('✨ All checks passed! Ready to start.\n');
    console.log('📋 Next steps:\n');
    console.log('1. Start backend:');
    console.log('   PowerShell: .\\start-backend.ps1');
    console.log('   Or: node server-wrapper.cjs\n');
    console.log('2. In another terminal, start frontend:');
    console.log('   npm run dev\n');
    console.log('3. Test the API:');
    console.log('   node test-api.js\n');
    console.log('4. Open browser:');
    console.log('   http://localhost:3000\n');
    console.log('📝 Default credentials:');
    console.log('   Admin: admin@example.com / adminpassword');
    console.log('   User: user@example.com / userpassword\n');
} else {
    console.log('⚠️  Some checks failed. Please fix before starting.\n');
    console.log('Missing items:');
    checks.forEach(check => {
        if (!check.check()) {
            console.log(`  - ${check.name}`);
        }
    });
    console.log('');
}
