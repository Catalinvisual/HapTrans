const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  validatePdfFile,
  commitFileExclusively,
  checkTargetDirectory,
  sanitizeTargetFilename,
  ensureWithinTargetDir,
  processArchiveJob,
} = require('../hc-pdf-sync');

describe('TerraMaster HC-PDF Sync Worker Hardening & Idempotency Tests', () => {
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
    it('accepts a valid PDF file with %PDF header and %%EOF trailer', () => {
      const filePath = path.join(tempDir, 'valid.pdf');
      const validContent = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n123\n%%EOF';
      fs.writeFileSync(filePath, Buffer.from(validContent));

      const size = validatePdfFile(filePath);
      assert.strictEqual(size >= 50, true);
    });

    it('rejects an empty 0-byte file', () => {
      const filePath = path.join(tempDir, 'empty.pdf');
      fs.writeFileSync(filePath, Buffer.alloc(0));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /0 bytes/);
    });

    it('rejects a file under 50 bytes', () => {
      const filePath = path.join(tempDir, 'tiny.pdf');
      fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\n%%EOF')); // 15 bytes

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /too small to be a valid PDF document/);
    });

    it('rejects a non-PDF file without %PDF header', () => {
      const filePath = path.join(tempDir, 'invalid.pdf');
      fs.writeFileSync(filePath, Buffer.from('NOT A PDF FILE WITH ENOUGH CHARACTERS TO EXCEED FIFTY BYTES FOR TESTING PURPOSE %%EOF'));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /does not match PDF signature/);
    });

    it('rejects a truncated PDF missing %%EOF trailer', () => {
      const filePath = path.join(tempDir, 'truncated.pdf');
      fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n[STREAM TRUNCATED BEFORE WRITING FINAL MARKERS]'));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /missing %%EOF marker/);
    });
  });

  describe('sanitizeTargetFilename & ensureWithinTargetDir', () => {
    it('neutralizes path traversal attempts', () => {
      const sanitized = sanitizeTargetFilename('../../../etc/passwd.pdf');
      assert.strictEqual(sanitized, 'passwd.pdf');
      assert.strictEqual(sanitized.includes('..'), false);
    });

    it('ensures .pdf extension is added if missing', () => {
      assert.strictEqual(sanitizeTargetFilename('invoice_doc'), 'invoice_doc.pdf');
    });

    it('ensures target path stays strictly inside target directory', () => {
      const safeName = ensureWithinTargetDir(tempDir, '../../malicious.pdf');
      assert.strictEqual(safeName, 'malicious.pdf');
      const resolved = path.resolve(tempDir, safeName);
      assert.strictEqual(resolved.startsWith(path.resolve(tempDir)), true);
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

    it('handles multiple existing collisions by incrementing counter', () => {
      fs.writeFileSync(path.join(tempDir, 'Order_101.pdf'), Buffer.from('Orig'));
      fs.writeFileSync(path.join(tempDir, 'Order_101_1.pdf'), Buffer.from('Collision 1'));

      const tmpPath = path.join(tempDir, '.Order_101.tmp_3');
      fs.writeFileSync(tmpPath, Buffer.from('Collision 2'));

      const result = commitFileExclusively(tmpPath, tempDir, 'Order_101.pdf');
      assert.strictEqual(result.finalFilename, 'Order_101_2.pdf');
      assert.strictEqual(fs.existsSync(result.finalPath), true);
    });
  });

  describe('checkTargetDirectory', () => {
    it('succeeds for writable directory and creates .receipts directory', () => {
      assert.strictEqual(checkTargetDirectory(tempDir), true);
      const receiptsDir = path.join(tempDir, '.receipts');
      assert.strictEqual(fs.existsSync(receiptsDir), true);
    });
  });

  describe('processArchiveJob Idempotency & Zero-Duplicates Guarantee', () => {
    it('never creates duplicate files when local receipt exists and ACK fails (e.g. 404 or network timeout)', async () => {
      checkTargetDirectory(tempDir);
      const receiptsDir = path.join(tempDir, '.receipts');

      const jobId = 'f859c10f-2951-4f7a-b339-5723fddabd6f';
      const existingFilename = 'Order_ORD-2026-001_20261011_120000_abcd.pdf';
      const existingFilePath = path.join(tempDir, existingFilename);

      const validContent = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n123\n%%EOF';
      fs.writeFileSync(existingFilePath, Buffer.from(validContent));

      // Simulate an existing persistent receipt for this job
      const receipt = {
        id: jobId,
        finalFilename: existingFilename,
        bytes: Buffer.byteLength(validContent),
        committedAt: new Date().toISOString(),
      };
      fs.writeFileSync(path.join(receiptsDir, `${jobId}.json`), JSON.stringify(receipt));

      const mockJob = {
        id: jobId,
        filename: 'Order_ORD-2026-001_20261011_120000_abcd.pdf',
        signedUrl: 'http://127.0.0.1:9999/should-never-be-called.pdf',
      };

      // Call processArchiveJob with non-existent baseUrl to simulate an ACK connection failure / 404
      const result = await processArchiveJob(mockJob, tempDir, 'http://127.0.0.1:9999', 'test-key', 'worker-test');

      // The job must NOT succeed because ACK failed, BUT:
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.committed, true);
      assert.strictEqual(result.finalFilename, existingFilename);

      // CRITICAL ASSERTION: Exactly ONE PDF file must exist in the directory!
      // Must NOT create Order_..._1.pdf or Order_..._2.pdf!
      const filesOnDisk = fs.readdirSync(tempDir).filter(f => f.endsWith('.pdf'));
      assert.strictEqual(filesOnDisk.length, 1);
      assert.strictEqual(filesOnDisk[0], existingFilename);

      // Simulate a second retry cycle with failing ACK:
      const result2 = await processArchiveJob(mockJob, tempDir, 'http://127.0.0.1:9999', 'test-key', 'worker-test');
      assert.strictEqual(result2.success, false);
      assert.strictEqual(result2.committed, true);

      // Still exactly ONE PDF file on disk!
      const filesAfterSecondRetry = fs.readdirSync(tempDir).filter(f => f.endsWith('.pdf'));
      assert.strictEqual(filesAfterSecondRetry.length, 1);
      assert.strictEqual(filesAfterSecondRetry[0], existingFilename);
    });
  });
});
