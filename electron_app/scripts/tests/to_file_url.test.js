// Run with: node electron_app/scripts/tests/to_file_url.test.js
const assert = require('assert');

function toFileUrl(p) {
    if (!p) {
        return '';
    }
    if (p.startsWith('file://') || p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:') || p.startsWith('blob:')) {
        return p;
    }
    // Windows drive-letter absolute path, e.g. C:\Users\... or C:/Users/...
    if (/^[a-zA-Z]:[\\/]/.test(p)) {
        return 'file:///' + p.replace(/\\/g, '/');
    }
    if (p.startsWith('/')) {
        return 'file://' + p;
    }
    return 'file://' + p;
}

assert.strictEqual(toFileUrl('/Users/foo/bar.png'), 'file:///Users/foo/bar.png');
assert.strictEqual(toFileUrl('C:\\Users\\foo\\bar.png'), 'file:///C:/Users/foo/bar.png');
assert.strictEqual(toFileUrl('C:/Users/foo/bar.png'), 'file:///C:/Users/foo/bar.png');
assert.strictEqual(toFileUrl('https://example.com/x.png'), 'https://example.com/x.png');
assert.strictEqual(toFileUrl(''), '');

console.log('to_file_url.test.js: all assertions passed');
