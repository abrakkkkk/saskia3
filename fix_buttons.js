const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/app');
let modifiedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add 'btn ' to 'btn-primary', 'btn-success', etc if missing
  content = content.replace(/className="btn-(primary|success|danger|warning|info|purple)"/g, 'className="btn btn-$1"');
  
  // Clean up duplicate 'btn btn ' if any
  content = content.replace(/className="btn btn btn-/g, 'className="btn btn-');

  // Remove some inline styles from buttons that mess up the design
  content = content.replace(/style=\{\{\s*padding:\s*'10px 20px'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*padding:\s*'10px'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*padding:\s*'10px',\s*background:\s*'#[a-fA-F0-9]+'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*padding:\s*'10px',\s*background:\s*'\w+'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*padding:\s*'10px 20px',\s*height:\s*'42px'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*padding:\s*'10px 20px',\s*height:\s*'42px',\s*background:\s*'#[a-fA-F0-9]+'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*background:\s*'#[a-fA-F0-9]+'\s*\}\}/g, '');
  content = content.replace(/style=\{\{\s*background:\s*'transparent',\s*color:\s*'#[a-fA-F0-9]+',\s*border:\s*'1px solid #[a-fA-F0-9]+'\s*\}\}/g, '');

  // Remove empty styles
  content = content.replace(/ style=\{\{\s*\}\}/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Modified: ' + file);
    modifiedFiles++;
  }
});

console.log('Total files modified: ' + modifiedFiles);
