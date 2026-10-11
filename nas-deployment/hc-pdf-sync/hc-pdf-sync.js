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

const BASE_URL = (process.env.SAAS_API_BASE_URL || 'https://haptrans-production.up.railway.app').replace(/\/+$/, '');
const API_KEY = process.env.TNAS_API_KEY || '';
const TARGET_DIR = process.env.TARGET_DIR || '/hc-pdf';
const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 2500); // 2.5 seconds default

let isRunning = false;

/**
 * Validates that a file starts with the PDF magic bytes '%PDF' and has size > 0.
 */
function validatePdfFile(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error('Downloaded PDF file is 0 bytes');
  }

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);

  if (buffer.toString('utf-8') !== '%PDF') {
    throw new Error('Downloaded file does not match PDF signature (%PDF)');
  }

  return stat.size;
}

/**
 * Race-safe atomic move that guarantees an existing file is NEVER overwritten.
 * Uses fs.linkSync (POSIX atomic exclusive creation) and falls back safely.
 */
function commitFileExclusively(tmpPath, targetDir, baseFilename) {
  let candidateName = baseFilename;
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
        const parsed = path.parse(baseFilename);
        candidateName = `${parsed.name}_${counter}${parsed.ext}`;
        counter++;
      } else {
        // Fallback for filesystems that do not support hardlinks or Windows dev environment:
        // Check existence and rename atomically
        if (!fs.existsSync(targetPath)) {
          fs.renameSync(tmpPath, targetPath);
          return { finalFilename: candidateName, finalPath: targetPath };
        }
        const parsed = path.parse(baseFilename);
        candidateName = `${parsed.name}_${counter}${parsed.ext}`;
        counter++;
      }
    }
  }
}

/**
 * Tests directory write permissions on startup.
 */
function checkTargetDirectory(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      throw new Error(`Cannot create target directory ${dir}: ${err.message}`);
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
 */
async function processArchiveJob(job, targetDir, baseUrl, apiKey) {
  const { id, filename, signedUrl } = job;
  const tmpName = `.${filename}.tmp_${Date.now()}_${process.pid}`;
  const tmpPath = path.join(targetDir, tmpName);

  try {
    // 1. Download binary stream from signed Cloudinary URL
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

    // 2. Validate PDF signature & size
    const bytesWritten = validatePdfFile(tmpPath);

    // 3. Atomically commit without overwriting
    const { finalFilename, finalPath } = commitFileExclusively(tmpPath, targetDir, filename);

    // 4. Double check final file exists
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Committed file missing at ${finalPath}`);
    }

    // 5. Send completion acknowledgement
    await axios.post(
      `${baseUrl}/api/tnas/hc-pdf/${id}/downloaded`,
      {},
      {
        headers: { Authorization: `Bearer ${apiKey}` },
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

    const isRetryable = !err.message.includes('signature') && !err.message.includes('0 bytes');
    console.error(`[ERROR] [${new Date().toISOString()}] Job ${id} (${filename}) failed: ${err.message}`);

    // Report error back to Railway
    try {
      await axios.post(
        `${baseUrl}/api/tnas/hc-pdf/${id}/failed`,
        { reason: err.message, retryable: isRetryable },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
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
async function runSyncCycle(targetDir = TARGET_DIR, baseUrl = BASE_URL, apiKey = API_KEY) {
  if (!apiKey) {
    console.warn(`[WARN] [${new Date().toISOString()}] TNAS_API_KEY is not configured. Skipping poll.`);
    return { skipped: true, reason: 'missing_api_key' };
  }

  try {
    const res = await axios.get(`${baseUrl}/api/tnas/hc-pdf/pending`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });

    const jobs = Array.isArray(res.data) ? res.data : [];
    if (jobs.length === 0) {
      return { processed: 0 };
    }

    console.log(`[INFO] [${new Date().toISOString()}] Found ${jobs.length} pending HC-PDF archive job(s).`);
    const results = [];

    for (const job of jobs) {
      const result = await processArchiveJob(job, targetDir, baseUrl, apiKey);
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
  console.log(`HapCargo TerraMaster HC-PDF Sync Worker v1.0`);
  console.log(`Destination: ${TARGET_DIR} (Root only, no subfolders)`);
  console.log(`Poll Interval: ${INTERVAL_MS}ms`);
  console.log(`SaaS Endpoint: ${BASE_URL}`);
  console.log(`====================================================`);

  try {
    checkTargetDirectory(TARGET_DIR);
    console.log(`[OK] Write access confirmed for ${TARGET_DIR}`);
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
  validatePdfFile,
  commitFileExclusively,
  checkTargetDirectory,
  processArchiveJob,
  runSyncCycle,
};
