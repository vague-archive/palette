import * as fs from 'fs';

const templatePath = 'palette.yml';
const outputPath = 'palette.processed.yml';
const jsCodePath = 'src/cloudfrontAuth.js';
const placeholder = '<Palette-Auth-Code>';

// Read input files
const templateLines = fs.readFileSync(templatePath, 'utf-8').split('\n');
const jsCodeLines = fs.readFileSync(jsCodePath, 'utf-8').split('\n');

const placeholderLocation = templateLines.findIndex(line => line.includes(placeholder))
let outputLine = templateLines.slice(0, placeholderLocation)
outputLine.push(templateLines[placeholderLocation].replace(placeholder, "|"))
const indent = templateLines[placeholderLocation].match(/^(\s*)/)?.[1] || '';
outputLine.push(...jsCodeLines.map(line => `${indent}  ${line}`))
outputLine.push(...templateLines.slice(placeholderLocation + 1))

fs.writeFileSync(outputPath, outputLine.join('\n'));
console.log(`✅ Wrote processed template to: ${outputPath}`);