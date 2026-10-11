try { require('dotenv').config(); } catch (_) {}
let axios;
try {
  axios = require('axios');
} catch (_) {
  try {
    axios = require(require('path').join(__dirname, '../../server/node_modules/axios'));
  } catch (e) {
    // In container, axios is installed in local node_modules
  }
}
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = (process.env.SAAS_API_BASE_URL || 'https://haptrans-production.up.railway.app').replace(/\/+$/, '');
const API_KEY = process.env.TNAS_API_KEY || '';
const TARGET_DIR = process.env.TARGET_DIR || '/hc-pdf';
const RECEIPTS_DIR = process.env.RECEIPTS_DIR || (process.platform === 'win32' ? path.join(os.tmpdir(), 'hc-pdf-receipts') : '/receipts');
const TMP_DIR = process.env.TMP_DIR || path.join(RECEIPTS_DIR, 'tmp');
const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 2500); // 2.5 seconds default
const WORKER_ID = process.env.WORKER_ID || `worker_${os.hostname()}_${process.pid}`;

let isRunning = false;

/**
 * Normalizes and sanitizes filename safely:
 * - Neutralizes path traversal (.., /, \)
 * - Replaces unsafe characters
 * - Ensures .pdf extension
 */
function sanitizeTargetFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    filename = 'document.pdf';
  }
  // Strip directory paths and null bytes
  let clean = path.basename(filename).replace(/\0/g, '');
  // Remove dangerous traversal patterns or unsafe chars
  clean = clean.replace(/[^a-zA-Z0-9_\.-]/g, '_');
  // Avoid leading dots so files are visible
  clean = clean.replace(/^\.+/, '');
  // Ensure extension is .pdf
  if (!clean.toLowerCase().endsWith('.pdf')) {
    clean = `${clean}.pdf`;
  }
  return clean || 'document.pdf';
}

/**
 * Verifies filename containment strictly within targetDir.
 */
function ensureWithinTargetDir(targetDir, filename) {
  const safeName = sanitizeTargetFilename(filename);
  const resolved = path.resolve(targetDir, safeName);
  const resolvedTarget = path.resolve(targetDir);
  if (!resolved.startsWith(resolvedTarget + path.sep) && resolved !== resolvedTarget) {
    throw new Error(`Path traversal attempt detected: ${filename}`);
  }
  return safeName;
}

/**
 * Validates that a file:
 * 1. Has size >= 50 bytes (not empty, not truncated snippet)
 * 2. Starts with '%PDF' magic header
 * 3. Contains '%%EOF' structural trailer in tail
 */
function validatePdfFile(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error('Downloaded PDF file is 0 bytes');
  }
  if (stat.size < 50) {
    throw new Error('Downloaded file is too small to be a valid PDF document (under 50 bytes)');
  }

  const fd = fs.openSync(filePath, 'r');
  const headBuffer = Buffer.alloc(4);
  fs.readSync(fd, headBuffer, 0, 4, 0);

  if (headBuffer.toString('utf-8') !== '%PDF') {
    fs.closeSync(fd);
    throw new Error('Downloaded file does not match PDF signature (%PDF)');
  }

  // Structural trailer check: PDF files must end with %%EOF marker
  const tailLength = Math.min(stat.size, 1024);
  const tailBuffer = Buffer.alloc(tailLength);
  fs.readSync(fd, tailBuffer, 0, tailLength, stat.size - tailLength);
  fs.closeSync(fd);

  if (!tailBuffer.toString('utf-8').includes('%%EOF')) {
    throw new Error('Downloaded PDF is truncated or missing %%EOF marker');
  }

  return stat.size;
}

/**
 * Safely and atomically replaces the existing PDF at the stable target path.
 * - Validates completed PDF before touching the destination.
 * - Atomically replaces destination (POSIX renameSync).
 * - Never creates numbered collision variants (_1.pdf, _2.pdf).
 * - Updates modification timestamp (mtime) to the current time so it sorts at top on NAS.
 */
function replaceFileSafely(tmpPath, targetDir, baseFilename) {
  const safeBase = sanitizeTargetFilename(baseFilename);
  const targetPath = path.join(targetDir, safeBase);

  // Attempt atomic rename directly
  try {
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    if (err.code === 'EXDEV') {
      // Cross-device link fallback: copy to staging file in targetDir, then atomic renameSync
      const localStaging = path.join(targetDir, `.replace_staging_${process.pid}_${Date.now()}.tmp`);
      try {
        fs.copyFileSync(tmpPath, localStaging);
        fs.renameSync(localStaging, targetPath);
      } finally {
        if (fs.existsSync(localStaging)) {
          try { fs.unlinkSync(localStaging); } catch (_) {}
        }
      }
    } else {
      throw err;
    }
  }

  // Update modification timestamp to the current time so it sorts to top in TerraMaster
  const now = new Date();
  try {
    fs.utimesSync(targetPath, now, now);
  } catch (utimesErr) {
    console.warn(`[WARN] Could not update utimes for ${targetPath}: ${utimesErr.message}`);
  }

  return { finalFilename: safeBase, finalPath: targetPath };
}

// Preserve commitFileExclusively as alias pointing to safe replacement
const commitFileExclusively = replaceFileSafely;

/**
 * Tests directory write permissions on startup and creates receipts/tmp storage.
 * Note: Never creates .receipts inside targetDir (/Volume3/HC-PDF).
 */
function checkTargetDirectory(dir = TARGET_DIR, receiptsDir = RECEIPTS_DIR, tmpDir = TMP_DIR) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create target directory ${dir}: ${err.message}`);
    }
  }

  // Ensure receipts storage exists
  if (!fs.existsSync(receiptsDir)) {
    try {
      fs.mkdirSync(receiptsDir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create receipts directory ${receiptsDir}: ${err.message}`);
    }
  }

  // Ensure temp storage exists (outside shared folder)
  if (!fs.existsSync(tmpDir)) {
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create temp directory ${tmpDir}: ${err.message}`);
    }
  }

  const testFile = path.join(dir, `.permission_check_${process.pid}_${Date.now()}`);
  try {
    fs.writeFileSync(testFile, 'test', 'utf-8');
    fs.unlinkSync(testFile);
    return true;
  } catch (err) {
    throw new Error(`Write permission check failed for ${dir}: ${err.message}`);
  }
}

/**
 * Reads local receipt for this specific job ID from RECEIPTS_DIR or legacy .receipts.
 */
function getJobReceipt(id, receiptsDir, targetDir) {
  const primaryPath = path.join(receiptsDir, `${id}.json`);
  if (fs.existsSync(primaryPath)) {
    try {
      return { receipt: JSON.parse(fs.readFileSync(primaryPath, 'utf-8')), path: primaryPath };
    } catch (_) {}
  }

  const legacyPath = path.join(targetDir, '.receipts', `${id}.json`);
  if (fs.existsSync(legacyPath)) {
    try {
      return { receipt: JSON.parse(fs.readFileSync(legacyPath, 'utf-8')), path: legacyPath };
    } catch (_) {}
  }

  return null;
}

/**
 * Downloads a single archive job and atomically replaces the stable file at the root of targetDir.
 * - Safe replacement: downloaded and validated into tmpDir before touching destination.
 * - Idempotent: Recognizes existing committed jobs via <jobId>.json receipt and re-acknowledges.
 * - A receipt for an old job never blocks a new job for the same document.
 * - Mod-time updated to current time on replacement.
 * - Cleans up all temporary files on success or failure.
 */
async function processArchiveJob(
  job,
  targetDir = TARGET_DIR,
  baseUrl = BASE_URL,
  apiKey = API_KEY,
  workerId = WORKER_ID,
  receiptsDir = RECEIPTS_DIR,
  tmpDir = TMP_DIR
) {
  const { id, filename, signedUrl } = job;
  const receiptPath = path.join(receiptsDir, `${id}.json`);

  // 1. Check idempotency: Has THIS exact job already been committed to disk?
  const jobReceipt = getJobReceipt(id, receiptsDir, targetDir);
  if (jobReceipt && jobReceipt.receipt) {
    const committedFilename = jobReceipt.receipt.finalFilename || jobReceipt.receipt.filename || jobReceipt.receipt.targetFilename;
    const existingCommittedPath = path.join(targetDir, committedFilename);
    if (fs.existsSync(existingCommittedPath)) {
      try {
        const committedBytes = validatePdfFile(existingCommittedPath);
        console.log(`[IDEMPOTENT] Job ${id} already committed as ${committedFilename} (${committedBytes} bytes). Re-sending ACK.`);
        const ackRes = await axios.post(
          `${baseUrl}/api/tnas/hc-pdf/${id}/downloaded`,
          { committedFilename, bytes: committedBytes },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-Worker-Id': workerId,
            },
            timeout: 10000,
          }
        );
        console.log(`[OK] ACK confirmed for ${id} (${committedFilename}, HTTP ${ackRes.status})`);
        return { success: true, finalFilename: committedFilename, bytes: committedBytes, idempotent: true };
      } catch (ackErr) {
        const status = ackErr.response ? ackErr.response.status : 'NETWORK_ERROR';
        const msg = ackErr.response?.data?.message || ackErr.message;
        console.error(`[ACK_RETRY_FAILED] Acknowledgement for committed job ${id} (${committedFilename}) failed (HTTP ${status}): ${msg}. NOT re-downloading.`);
        return {
          success: false,
          error: `ACK failed (HTTP ${status}): ${msg}`,
          finalFilename: committedFilename,
          committed: true,
          retryable: true,
        };
      }
    } else {
      console.warn(`[WARN] Receipt found for ${id} but committed file ${committedFilename} is missing on disk. Proceeding with download.`);
    }
  }

  const safeFilename = ensureWithinTargetDir(targetDir, filename);

  // Keep temporary files OUT of the shared folder
  if (!fs.existsSync(tmpDir)) {
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch (_) {}
  }
  const tmpName = `.tmp_${id}_${Date.now()}_${process.pid}.pdf`;
  const tmpPath = path.join(tmpDir, tmpName);

  try {
    // 2. Download binary stream into temporary file outside shared folder
    const response = await axios({
      method: 'GET',
      url: signedUrl,
      responseType: 'stream',
      timeout: 30000,
    });

    const writer = fs.createWriteStream(tmpPath);
    await new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 3. Validate completed PDF before touching existing destination
    const bytesWritten = validatePdfFile(tmpPath);

    // 4. Atomically replace the existing PDF at the stable target path
    const { finalFilename, finalPath } = replaceFileSafely(tmpPath, targetDir, safeFilename);

    // 5. Double-check final file exists
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Committed file missing at ${finalPath}`);
    }

    // 6. Update local receipt only after successful replacement
    try {
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      const receiptTmp = path.join(receiptsDir, `.tmp_receipt_${id}_${Date.now()}.json`);
      fs.writeFileSync(receiptTmp, JSON.stringify({
        id,
        finalFilename,
        bytes: bytesWritten,
        committedAt: new Date().toISOString(),
      }), 'utf-8');
      fs.renameSync(receiptTmp, receiptPath);
    } catch (rErr) {
      console.warn(`[WARN] Failed to write local receipt for ${id}: ${rErr.message}`);
    }

    // 7. Acknowledge the job only after the new PDF is safely committed
    try {
      const ackRes = await axios.post(
        `${baseUrl}/api/tnas/hc-pdf/${id}/downloaded`,
        { committedFilename: finalFilename, bytes: bytesWritten },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-Worker-Id': workerId,
          },
          timeout: 10000,
        }
      );
      console.log(`[OK] [${new Date().toISOString()}] Archived: ${finalFilename} (${bytesWritten} bytes, Job: ${id}, HTTP ${ackRes.status})`);
      return { success: true, finalFilename, bytes: bytesWritten };
    } catch (ackErr) {
      const status = ackErr.response ? ackErr.response.status : 'NETWORK_ERROR';
      const msg = ackErr.response?.data?.message || ackErr.message;
      console.error(`[ACK_FAILED] Job ${id} committed as ${finalFilename} (${bytesWritten} bytes), but acknowledgement failed (HTTP ${status}): ${msg}. Receipt saved. Will re-ACK on next cycle.`);
      return {
        success: false,
        finalFilename,
        error: `ACK failed (HTTP ${status}): ${msg}`,
        committed: true,
        retryable: true,
      };
    }
  } catch (err) {
    const isRetryable = !err.message.includes('signature') &&
                        !err.message.includes('0 bytes') &&
                        !err.message.includes('too small') &&
                        !err.message.includes('missing %%EOF') &&
                        !err.message.includes('traversal');

    console.error(`[ERROR] [${new Date().toISOString()}] Job ${id} (${filename}) failed: ${err.message}`);

    // Report error back to Railway
    try {
      await axios.post(
        `${baseUrl}/api/tnas/hc-pdf/${id}/failed`,
        { reason: err.message, retryable: isRetryable },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'X-Worker-Id': workerId,
          },
          timeout: 10000,
        }
      );
    } catch (reportErr) {
      console.warn(`[WARN] Could not report failure for ${id}: ${reportErr.message}`);
    }

    return { success: false, error: err.message };
  } finally {
    // Keep temporary files out of the shared folder after success or failure
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }
}

/**
 * Runs a single polling cycle.
 */
async function runSyncCycle(
  targetDir = TARGET_DIR,
  baseUrl = BASE_URL,
  apiKey = API_KEY,
  workerId = WORKER_ID,
  receiptsDir = RECEIPTS_DIR,
  tmpDir = TMP_DIR
) {
  if (!apiKey) {
    console.warn(`[WARN] [${new Date().toISOString()}] TNAS_API_KEY is not configured. Skipping poll.`);
    return { skipped: true, reason: 'missing_api_key' };
  }

  try {
    const res = await axios.get(`${baseUrl}/api/tnas/hc-pdf/pending`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Worker-Id': workerId,
      },
      timeout: 10000,
    });

    const jobs = Array.isArray(res.data) ? res.data : [];
    if (jobs.length === 0) {
      return { processed: 0 };
    }

    console.log(`[INFO] [${new Date().toISOString()}] Found ${jobs.length} pending HC-PDF archive job(s).`);
    const results = [];

    for (const job of jobs) {
      const result = await processArchiveJob(job, targetDir, baseUrl, apiKey, workerId, receiptsDir, tmpDir);
      results.push(result);
    }

    return { processed: jobs.length, results };
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] Failed to fetch pending HC-PDF jobs: ${err.message}`);
    return { error: err.message };
  }
}

/**
 * Main daemon loop.
 */
async function startDaemon() {
  console.log(`====================================================`);
  console.log(`HapCargo TerraMaster HC-PDF Sync Worker v1.2 (Safe Replacement)`);
  console.log(`Worker ID: ${WORKER_ID}`);
  console.log(`Destination: ${TARGET_DIR} (Root only, no subfolders)`);
  console.log(`Receipts Dir: ${RECEIPTS_DIR}`);
  console.log(`Poll Interval: ${INTERVAL_MS}ms`);
  console.log(`SaaS Endpoint: ${BASE_URL}`);
  console.log(`====================================================`);

  try {
    checkTargetDirectory(TARGET_DIR, RECEIPTS_DIR, TMP_DIR);
    console.log(`[OK] Write access & storage confirmed (Target: ${TARGET_DIR}, Receipts: ${RECEIPTS_DIR})`);
  } catch (err) {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
  }

  const tick = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await runSyncCycle();
    } catch (e) {
      console.error(`[ERROR] Daemon tick exception: ${e.message}`);
    } finally {
      isRunning = false;
      setTimeout(tick, INTERVAL_MS);
    }
  };

  tick();
}

if (require.main === module) {
  startDaemon();
}

module.exports = {
  sanitizeTargetFilename,
  ensureWithinTargetDir,
  validatePdfFile,
  replaceFileSafely,
  commitFileExclusively,
  checkTargetDirectory,
  getJobReceipt,
  processArchiveJob,
  runSyncCycle,
  TARGET_DIR,
  RECEIPTS_DIR,
  TMP_DIR,
};
