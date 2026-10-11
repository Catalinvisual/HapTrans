const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  validatePdfFile,
  commitFileExclusively,
  checkTargetDirectory,
} = require('../hc-pdf-sync');

describe('TerraMaster HC-PDF Sync Worker Unit Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-pdf-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validatePdfFile', () => {
    it('accepts a valid PDF file with %PDF header', () => {
      const filePath = path.join(tempDir, 'valid.pdf');
      fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\n%trailer\n'));

      const size = validatePdfFile(filePath);
      assert.strictEqual(size > 0, true);
    });

    it('rejects an empty 0-byte file', () => {
      const filePath = path.join(tempDir, 'empty.pdf');
      fs.writeFileSync(filePath, Buffer.alloc(0));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /0 bytes/);
    });

    it('rejects a non-PDF file (corrupted or text file)', () => {
      const filePath = path.join(tempDir, 'invalid.pdf');
      fs.writeFileSync(filePath, Buffer.from('NOT A PDF FILE'));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /does not match PDF signature/);
    });
  });

  describe('commitFileExclusively (No-Overwrite / Atomic write)', () => {
    it('moves tmp file to target destination when file does not exist', () => {
      const tmpPath = path.join(tempDir, '.Order_101.tmp_123');
      fs.writeFileSync(tmpPath, Buffer.from('%PDF-1.4 content'));

      const result = commitFileExclusively(tmpPath, tempDir, 'Order_101.pdf');
      assert.strictEqual(result.finalFilename, 'Order_101.pdf');
      assert.strictEqual(fs.existsSync(result.finalPath), true);
      assert.strictEqual(fs.existsSync(tmpPath), false);
    });

    it('prevents overwriting when destination file already exists by appending suffix', () => {
      const existingPath = path.join(tempDir, 'Order_101.pdf');
      fs.writeFileSync(existingPath, Buffer.from('%PDF-1.4 ORIGINAL CONTENT'));

      const tmpPath = path.join(tempDir, '.Order_101.tmp_new');
      fs.writeFileSync(tmpPath, Buffer.from('%PDF-1.4 NEW CONTENT'));

      const result = commitFileExclusively(tmpPath, tempDir, 'Order_101.pdf');

      // Must NOT overwrite existing file!
      assert.strictEqual(result.finalFilename, 'Order_101_1.pdf');
      assert.strictEqual(fs.readFileSync(existingPath).toString(), '%PDF-1.4 ORIGINAL CONTENT');
      assert.strictEqual(fs.readFileSync(result.finalPath).toString(), '%PDF-1.4 NEW CONTENT');
    });
  });

  describe('checkTargetDirectory', () => {
    it('succeeds for writable directory', () => {
      assert.strictEqual(checkTargetDirectory(tempDir), true);
    });
  });
});
