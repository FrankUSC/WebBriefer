#!/usr/bin/env node

/**
 * WebBriefer Extension Validation Script
 * Validates that all required files are present and properly structured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating WebBriefer Chrome Extension...\n');

// Required files for Chrome extension
const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'content.js',
  'background.js',
  'README.md',
  'package.json',
  'LICENSE'
];

// Required directories
const requiredDirs = [
  'styles',
  'icons'
];

// Required files in subdirectories
const requiredSubFiles = [
  'styles/popup.css',
  'styles/options.css',
  'icons/icon16.svg',
  'icons/icon32.svg',
  'icons/icon48.svg',
  'icons/icon128.svg'
];

let allValid = true;

// Check required files
console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allValid = false;
  }
});

// Check required directories
console.log('\n📂 Checking required directories...');
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    console.log(`✅ ${dir}/`);
  } else {
    console.log(`❌ ${dir}/ - MISSING`);
    allValid = false;
  }
});

// Check required subdirectory files
console.log('\n📄 Checking subdirectory files...');
requiredSubFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allValid = false;
  }
});

// Validate manifest.json
console.log('\n🔧 Validating manifest.json...');
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  // Check required manifest fields
  const requiredFields = ['manifest_version', 'name', 'version', 'description', 'permissions'];
  requiredFields.forEach(field => {
    if (manifest[field]) {
      console.log(`✅ manifest.${field}`);
    } else {
      console.log(`❌ manifest.${field} - MISSING`);
      allValid = false;
    }
  });

  // Check Chrome AI permissions
  const aiPermissions = [
    'aiLanguageModelOriginTrial',
    'aiSummarizerOriginTrial', 
    'aiTranslatorOriginTrial'
  ];
  
  console.log('\n🤖 Checking Chrome AI permissions...');
  aiPermissions.forEach(permission => {
    if (manifest.permissions && manifest.permissions.includes(permission)) {
      console.log(`✅ ${permission}`);
    } else {
      console.log(`❌ ${permission} - MISSING`);
      allValid = false;
    }
  });

} catch (error) {
  console.log('❌ manifest.json - INVALID JSON');
  allValid = false;
}

// Final validation result
console.log('\n' + '='.repeat(50));
if (allValid) {
  console.log('🎉 WebBriefer extension validation PASSED!');
  console.log('✅ Ready for Chrome extension submission');
  console.log('✅ Ready for Google Chrome Built-in AI Challenge 2025');
} else {
  console.log('❌ WebBriefer extension validation FAILED!');
  console.log('🔧 Please fix the missing files/configurations above');
}
console.log('='.repeat(50));

process.exit(allValid ? 0 : 1);