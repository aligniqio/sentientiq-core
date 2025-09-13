#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix relative imports to add .js extension
  content = content.replace(/from ['"](\.\.[\/\\][^'"]+)['"];/g, (match, importPath) => {
    if (!importPath.endsWith('.js')) {
      return `from '${importPath}.js';`;
    }
    return match;
  });
  
  content = content.replace(/from ['"](\.[\/\\][^'"]+)['"];/g, (match, importPath) => {
    if (!importPath.endsWith('.js')) {
      return `from '${importPath}.js';`;
    }
    return match;
  });
  
  fs.writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.js')) {
      console.log(`Fixing imports in ${fullPath}`);
      fixImportsInFile(fullPath);
    }
  }
}

console.log('Fixing ESM imports in dist directory...');
walkDir(distDir);
console.log('Done!');