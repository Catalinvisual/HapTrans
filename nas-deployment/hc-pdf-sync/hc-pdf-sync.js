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
 * Race-safe atomic move that guarantees an existing file is NEVER overwritten.
 * Uses fs.linkSync (POSIX atomic exclusive creation) and falls back safely.
 */
function commitFileExclusively(tmpPath, targetDir, baseFilename) {
  const safeBase = sanitizeTargetFilename(baseFilename);
  let candidateName = safeBase;
  let counter = 1;

  while (true) {
    const targetPath = path.join(targetDir, candidateName);

    try {
      // POSIX linkSync creates targetPath atomically if and only if targetPath does not exist.
      // If it exists, linkSync throws EEXIST.
      fs.linkSync(tmpPath, targetPath);
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      return { finalFilename: candidateName, finalPath: targetPath };
    } catch (err) {
      if (err.code === 'EEXIST') {
        const parsed = path.parse(safeBase);
        candidateName = `${parsed.name}_${counter}${parsed.ext || '.pdf'}`;
        counter++;
      } else {
        // Fallback for filesystems that do not support hardlinks or Windows dev environment:
        if (!fs.existsSync(targetPath)) {
          try {
            fs.renameSync(tmpPath, targetPath);
            return { finalFilename: candidateName, finalPath: targetPath };
          } catch (renErr) {
            if (renErr.code === 'EEXIST') {
              const parsed = path.parse(safeBase);
              candidateName = `${parsed.name}_${counter}${parsed.ext || '.pdf'}`;
              counter++;
              continue;
            }
            throw renErr;
          }
        }
        const parsed = path.parse(safeBase);
        candidateName = `${parsed.name}_${counter}${parsed.ext || '.pdf'}`;
        counter++;
      }
    }
  }
}

/**
 * Tests directory write permissions on startup and creates receipts storage.
 */
function checkTargetDirectory(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create target directory ${dir}: ${err.message}`);
    }
  }

  const receiptsDir = path.join(dir, '.receipts');
  if (!fs.existsSync(receiptsDir)) {
    try {
      fs.mkdirSync(receiptsDir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create receipts directory ${receiptsDir}: ${err.message}`);
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
 * Downloads a single archive job and writes it directly to the root of targetDir.
 * Idempotent: Recognizes existing committed jobs via .receipts/<jobId>.json and re-acknowledges
 * without creating duplicate files.
 */
async function processArchiveJob(job, targetDir, baseUrl, apiKey, workerId = WORKER_ID) {
  const { id, filename, signedUrl } = job;
  const receiptsDir = path.join(targetDir, '.receipts');
  const receiptPath = path.join(receiptsDir, `${id}.json`);

  // 1. Check idempotency: Has this exact job already been committed to disk?
  if (fs.existsSync(receiptPath)) {
    try {
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf-8'));
      const existingCommittedPath = path.join(targetDir, receipt.finalFilename);
      if (fs.existsSync(existingCommittedPath)) {
        const existingBytes = validatePdfFile(existingCommittedPath);
        console.log(`[IDEMPOTENT] Job ${id} already committed as ${receipt.finalFilename} (${existingBytes} bytes). Re-sending ACK.`);
        
        await axios.post(
          `${baseUrl}/api/tnas/hc-pdf/${id}/downloaded`,
          { committedFilename: receipt.finalFilename, bytes: existingBytes },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-Worker-Id': workerId,
            },
            timeout: 10000,
          }
        );
        return { success: true, finalFilename: receipt.finalFilename, bytes: existingBytes, idempotent: true };
      }
    } catch (receiptErr) {
      console.warn(`[WARN] Receipt inspection failed for ${id}: ${receiptErr.message}. Proceeding to re-download.`);
    }
  }

  const safeFilename = ensureWithinTargetDir(targetDir, filename);
  const tmpName = `.tmp_${id}_${Date.now()}_${process.pid}.pdf`;
  const tmpPath = path.join(targetDir, tmpName);

  try {
    // 2. Download binary stream from signed Cloudinary URL
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

    // 3. Validate PDF signature, size & %%EOF marker
    const bytesWritten = validatePdfFile(tmpPath);

    // 4. Atomically commit without overwriting existing files
    const { finalFilename, finalPath } = commitFileExclusively(tmpPath, targetDir, safeFilename);

    // 5. Double check final file exists
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Committed file missing at ${finalPath}`);
    }

    // 6. Record persistent receipt for idempotency
    try {
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      const receiptTmp = path.join(receiptsDir, `.tmp_${id}_${Date.now()}`);
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

    // 7. Send completion acknowledgement with actual committed filename
    await axios.post(
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

    console.log(`[OK] [${new Date().toISOString()}] Archived: ${finalFilename} (${bytesWritten} bytes, Job: ${id})`);
    return { success: true, finalFilename, bytes: bytesWritten };
  } catch (err) {
    // Cleanup incomplete temporary file
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }

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
  }
}

/**
 * Runs a single polling cycle.
 */
async function runSyncCycle(targetDir = TARGET_DIR, baseUrl = BASE_URL, apiKey = API_KEY, workerId = WORKER_ID) {
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
      const result = await processArchiveJob(job, targetDir, baseUrl, apiKey, workerId);
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
  console.log(`HapCargo TerraMaster HC-PDF Sync Worker v1.1 (Hardened)`);
  console.log(`Worker ID: ${WORKER_ID}`);
  console.log(`Destination: ${TARGET_DIR} (Root only, no subfolders)`);
  console.log(`Poll Interval: ${INTERVAL_MS}ms`);
  console.log(`SaaS Endpoint: ${BASE_URL}`);
  console.log(`====================================================`);

  try {
    checkTargetDirectory(TARGET_DIR);
    console.log(`[OK] Write access & receipts directory confirmed for ${TARGET_DIR}`);
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
  commitFileExclusively,
  checkTargetDirectory,
  processArchiveJob,
  runSyncCycle,
};
