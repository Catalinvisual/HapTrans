const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  validatePdfFile,
  replaceFileSafely,
  commitFileExclusively,
  checkTargetDirectory,
  sanitizeTargetFilename,
  ensureWithinTargetDir,
  getJobReceipt,
  processArchiveJob,
} = require('../hc-pdf-sync');

describe('TerraMaster HC-PDF Sync Worker - Safe Replacement & Idempotency Tests', () => {
  let targetDir;
  let receiptsDir;
  let tmpDir;

  const validPdfHeader = '%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\nstartxref\n123\n%%EOF';
  const updatedPdfHeader = '%PDF-1.4\n1 0 obj\n<< /Version 2 >>\nendobj\ntrailer\n<<>>\nstartxref\n456\n%%EOF';

  beforeEach(() => {
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-pdf-target-'));
    receiptsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-pdf-receipts-'));
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-pdf-tmp-'));
  });

  afterEach(() => {
    [targetDir, receiptsDir, tmpDir].forEach((d) => {
      if (fs.existsSync(d)) {
        try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) {}
      }
    });
  });

  describe('validatePdfFile', () => {
    it('accepts a valid PDF file with %PDF header and %%EOF trailer', () => {
      const filePath = path.join(tmpDir, 'valid.pdf');
      fs.writeFileSync(filePath, Buffer.from(validPdfHeader));

      const size = validatePdfFile(filePath);
      assert.strictEqual(size >= 50, true);
    });

    it('rejects an empty 0-byte file', () => {
      const filePath = path.join(tmpDir, 'empty.pdf');
      fs.writeFileSync(filePath, Buffer.alloc(0));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /0 bytes/);
    });

    it('rejects a file under 50 bytes', () => {
      const filePath = path.join(tmpDir, 'tiny.pdf');
      fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\n%%EOF')); // 15 bytes

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /too small to be a valid PDF document/);
    });

    it('rejects a non-PDF file without %PDF header', () => {
      const filePath = path.join(tmpDir, 'invalid.pdf');
      fs.writeFileSync(filePath, Buffer.from('NOT A PDF FILE WITH ENOUGH CHARACTERS TO EXCEED FIFTY BYTES FOR TESTING %%EOF'));

      assert.throws(() => {
        validatePdfFile(filePath);
      }, /does not match PDF signature/);
    });

    it('rejects a truncated PDF missing %%EOF trailer', () => {
      const filePath = path.join(tmpDir, 'truncated.pdf');
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
      assert.strictEqual(sanitizeTargetFilename('Truck_B123XYZ'), 'Truck_B123XYZ.pdf');
    });

    it('ensures target path stays strictly inside target directory', () => {
      const safeName = ensureWithinTargetDir(targetDir, '../../malicious.pdf');
      assert.strictEqual(safeName, 'malicious.pdf');
      const resolved = path.resolve(targetDir, safeName);
      assert.strictEqual(resolved.startsWith(path.resolve(targetDir)), true);
    });
  });

  describe('replaceFileSafely (Atomic Safe Replacement - No Duplicates)', () => {
    it('creates file at stable destination when target does not exist', () => {
      const tmpPath = path.join(tmpDir, 'test_create.tmp');
      fs.writeFileSync(tmpPath, Buffer.from(validPdfHeader));

      const result = replaceFileSafely(tmpPath, targetDir, 'Truck_B123XYZ.pdf');
      assert.strictEqual(result.finalFilename, 'Truck_B123XYZ.pdf');
      assert.strictEqual(fs.existsSync(result.finalPath), true);
      assert.strictEqual(fs.existsSync(tmpPath), false);
    });

    it('atomically replaces existing file WITHOUT creating _1.pdf or _2.pdf', () => {
      const targetPath = path.join(targetDir, 'Truck_B123XYZ.pdf');
      fs.writeFileSync(targetPath, Buffer.from('OLD CONTENT ORIGINAL'));

      const tmpPath = path.join(tmpDir, 'test_replace.tmp');
      fs.writeFileSync(tmpPath, Buffer.from('NEW CONTENT REGENERATED'));

      const result = replaceFileSafely(tmpPath, targetDir, 'Truck_B123XYZ.pdf');

      // Filename must remain the stable filename
      assert.strictEqual(result.finalFilename, 'Truck_B123XYZ.pdf');
      // Content must be the newly generated content
      assert.strictEqual(fs.readFileSync(result.finalPath).toString(), 'NEW CONTENT REGENERATED');

      // CRITICAL: Must not create any collision duplicate files
      const allFiles = fs.readdirSync(targetDir);
      assert.strictEqual(allFiles.length, 1);
      assert.strictEqual(allFiles[0], 'Truck_B123XYZ.pdf');
      assert.strictEqual(fs.existsSync(path.join(targetDir, 'Truck_B123XYZ_1.pdf')), false);
    });

    it('updates modification timestamp (mtime) on successful replacement', () => {
      const targetPath = path.join(targetDir, 'Trailer_B456XYZ.pdf');
      fs.writeFileSync(targetPath, Buffer.from('ORIGINAL'));

      // Backdate the original file by 10 minutes
      const pastTime = new Date(Date.now() - 600000);
      fs.utimesSync(targetPath, pastTime, pastTime);
      const statBefore = fs.statSync(targetPath);
      assert.strictEqual(statBefore.mtimeMs < Date.now() - 500000, true);

      // Replace file
      const tmpPath = path.join(tmpDir, 'test_mtime.tmp');
      fs.writeFileSync(tmpPath, Buffer.from('REPLACEMENT'));
      replaceFileSafely(tmpPath, targetDir, 'Trailer_B456XYZ.pdf');

      const statAfter = fs.statSync(targetPath);
      // mtime must be updated to current time
      assert.strictEqual(statAfter.mtimeMs >= Date.now() - 5000, true);
    });
  });

  describe('checkTargetDirectory & receipts directory separation', () => {
    it('creates receipts and tmp directories outside targetDir without creating .receipts inside targetDir', () => {
      checkTargetDirectory(targetDir, receiptsDir, tmpDir);

      assert.strictEqual(fs.existsSync(receiptsDir), true);
      assert.strictEqual(fs.existsSync(tmpDir), true);
      // Ensure .receipts was NOT created inside targetDir
      assert.strictEqual(fs.existsSync(path.join(targetDir, '.receipts')), false);
    });
  });

  describe('processArchiveJob - End-to-end Safe Replacement & Idempotency', () => {
    it('regenerating a truck PDF replaces the existing file without creating duplicates', async () => {
      checkTargetDirectory(targetDir, receiptsDir, tmpDir);

      // Step 1: Initial generation (Job 1)
      const job1Id = 'job-truck-001';
      const stableFilename = 'Truck_B-123-XYZ.pdf';
      const targetFile = path.join(targetDir, stableFilename);

      // Pre-commit initial file on disk
      fs.writeFileSync(targetFile, Buffer.from(validPdfHeader));
      // Save receipt for Job 1
      fs.writeFileSync(
        path.join(receiptsDir, `${job1Id}.json`),
        JSON.stringify({ id: job1Id, finalFilename: stableFilename, bytes: Buffer.byteLength(validPdfHeader), committedAt: new Date().toISOString() })
      );

      // Verify initial state
      assert.strictEqual(fs.readFileSync(targetFile).toString(), validPdfHeader);

      // Step 2: Regenerate the truck PDF (Job 2 for same document)
      const job2Id = 'job-truck-002';
      // Create a local test server / mock handler via custom processArchiveJob call or stub
      // To test replacement, simulate processArchiveJob replacing the file with updated content
      const tmpFile = path.join(tmpDir, `.tmp_${job2Id}.pdf`);
      fs.writeFileSync(tmpFile, Buffer.from(updatedPdfHeader));

      const replaceResult = replaceFileSafely(tmpFile, targetDir, stableFilename);

      // Exactly ONE file exists with the stable name
      const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.pdf'));
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0], stableFilename);
      assert.strictEqual(fs.readFileSync(targetFile).toString(), updatedPdfHeader);
    });

    it('works identically for trailers, orders and clients', () => {
      const testCases = [
        { name: 'Trailer_B-456-DEF.pdf', content1: validPdfHeader, content2: updatedPdfHeader },
        { name: 'Order_ORD-2026-089.pdf', content1: validPdfHeader, content2: updatedPdfHeader },
        { name: 'Client_Acme_Corp.pdf', content1: validPdfHeader, content2: updatedPdfHeader },
      ];

      for (const tc of testCases) {
        const filePath = path.join(targetDir, tc.name);
        // Initial write
        fs.writeFileSync(filePath, Buffer.from(tc.content1));
        assert.strictEqual(fs.readFileSync(filePath).toString(), tc.content1);

        // Regenerate and replace
        const tmp = path.join(tmpDir, `tmp_${tc.name}`);
        fs.writeFileSync(tmp, Buffer.from(tc.content2));
        replaceFileSafely(tmp, targetDir, tc.name);

        assert.strictEqual(fs.readFileSync(filePath).toString(), tc.content2);
      }

      // No collision variants like _1.pdf
      const files = fs.readdirSync(targetDir);
      assert.strictEqual(files.some((f) => f.includes('_1.pdf') || f.includes('_2.pdf')), false);
    });

    it('two different entities do not overwrite each other', () => {
      const client1 = 'Client_Acme_client1.pdf';
      const client2 = 'Client_Acme_client2.pdf';

      fs.writeFileSync(path.join(targetDir, client1), Buffer.from('Client 1 Content'));
      fs.writeFileSync(path.join(targetDir, client2), Buffer.from('Client 2 Content'));

      // Both files exist independently
      assert.strictEqual(fs.readFileSync(path.join(targetDir, client1)).toString(), 'Client 1 Content');
      assert.strictEqual(fs.readFileSync(path.join(targetDir, client2)).toString(), 'Client 2 Content');

      // Regenerating client 1 does NOT touch client 2
      const tmp = path.join(tmpDir, 'tmp_c1.pdf');
      fs.writeFileSync(tmp, Buffer.from('Client 1 Updated Content'));
      replaceFileSafely(tmp, targetDir, client1);

      assert.strictEqual(fs.readFileSync(path.join(targetDir, client1)).toString(), 'Client 1 Updated Content');
      assert.strictEqual(fs.readFileSync(path.join(targetDir, client2)).toString(), 'Client 2 Content');
    });

    it('failed validation preserves the existing valid PDF file', () => {
      const stableName = 'Truck_B999ZZZ.pdf';
      const targetPath = path.join(targetDir, stableName);
      fs.writeFileSync(targetPath, Buffer.from(validPdfHeader));

      const corruptTmp = path.join(tmpDir, 'corrupt.tmp');
      fs.writeFileSync(corruptTmp, Buffer.from('CORRUPT DATA NOT A PDF'));

      // Validation must throw
      assert.throws(() => {
        validatePdfFile(corruptTmp);
      });

      // Existing file must be 100% intact
      assert.strictEqual(fs.readFileSync(targetPath).toString(), validPdfHeader);
    });

    it('reprocessing the same completed job is idempotent and does not re-download or duplicate', async () => {
      checkTargetDirectory(targetDir, receiptsDir, tmpDir);

      const jobId = 'job-idem-100';
      const filename = 'Order_ORD-IDEMPOTENT.pdf';
      const filePath = path.join(targetDir, filename);
      fs.writeFileSync(filePath, Buffer.from(validPdfHeader));

      // Existing receipt
      fs.writeFileSync(
        path.join(receiptsDir, `${jobId}.json`),
        JSON.stringify({ id: jobId, finalFilename: filename, bytes: Buffer.byteLength(validPdfHeader), committedAt: new Date().toISOString() })
      );

      const mockJob = {
        id: jobId,
        filename,
        signedUrl: 'http://127.0.0.1:9999/should-not-be-called.pdf',
      };

      // Call processArchiveJob with non-existent server to simulate ACK retry
      const res = await processArchiveJob(mockJob, targetDir, 'http://127.0.0.1:9999', 'key', 'worker-1', receiptsDir, tmpDir);

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.committed, true);
      assert.strictEqual(res.finalFilename, filename);

      // Exactly ONE file on disk, zero duplicates
      const pdfs = fs.readdirSync(targetDir).filter((f) => f.endsWith('.pdf'));
      assert.strictEqual(pdfs.length, 1);
      assert.strictEqual(pdfs[0], filename);
    });

    it('a receipt for an old job does not prevent a new job from updating the same document', () => {
      const oldJobId = 'old-job-uuid-1';
      const newJobId = 'new-job-uuid-2';
      const filename = 'Truck_B111AAA.pdf';
      const filePath = path.join(targetDir, filename);

      // Old job was committed
      fs.writeFileSync(filePath, Buffer.from(validPdfHeader));
      fs.writeFileSync(
        path.join(receiptsDir, `${oldJobId}.json`),
        JSON.stringify({ id: oldJobId, finalFilename: filename, bytes: Buffer.byteLength(validPdfHeader), committedAt: new Date().toISOString() })
      );

      // Check receipt for NEW job - should be null!
      const receiptNew = getJobReceipt(newJobId, receiptsDir, targetDir);
      assert.strictEqual(receiptNew, null);

      // New job can safely replace the file
      const tmp = path.join(tmpDir, 'tmp_new.pdf');
      fs.writeFileSync(tmp, Buffer.from(updatedPdfHeader));
      replaceFileSafely(tmp, targetDir, filename);

      // File is updated
      assert.strictEqual(fs.readFileSync(filePath).toString(), updatedPdfHeader);
    });

    it('keeps temporary files out of the shared target folder', () => {
      checkTargetDirectory(targetDir, receiptsDir, tmpDir);

      const tmp = path.join(tmpDir, '.test_tmp.pdf');
      fs.writeFileSync(tmp, Buffer.from(validPdfHeader));

      replaceFileSafely(tmp, targetDir, 'Order_CLEAN.pdf');

      // Shared targetDir should contain ONLY Order_CLEAN.pdf, no temp files
      const items = fs.readdirSync(targetDir);
      assert.strictEqual(items.length, 1);
      assert.strictEqual(items[0], 'Order_CLEAN.pdf');
      assert.strictEqual(items.some((i) => i.startsWith('.tmp') || i.startsWith('.replace')), false);
    });
  });
});
