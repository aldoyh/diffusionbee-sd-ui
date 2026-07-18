// Run with: node electron_app/scripts/tests/win_icon.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const icoPath = path.join(__dirname, '..', '..', 'build', 'Icon.ico');
assert.ok(fs.existsSync(icoPath), 'Icon.ico must exist at electron_app/build/Icon.ico');

const buf = fs.readFileSync(icoPath);
// ICO file header: reserved(2)=0x0000, type(2)=0x0001 (icon), count(2)>0
assert.strictEqual(buf.readUInt16LE(0), 0, 'ICO reserved field must be 0');
assert.strictEqual(buf.readUInt16LE(2), 1, 'ICO type field must be 1 (icon)');
assert.ok(buf.readUInt16LE(4) > 0, 'ICO must contain at least one image');

console.log('win_icon.test.js: all assertions passed');
