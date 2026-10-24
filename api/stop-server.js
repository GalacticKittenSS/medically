import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pidFile = path.join(projectRoot, '.medically-api.pid');

if (!existsSync(pidFile)) {
    console.log('Medically API is not running (no PID file found).');
    process.exit(0);
}

const pid = Number(readFileSync(pidFile, 'utf8').trim());
if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error(`Invalid PID in ${pidFile}. Remove the file after confirming the server is stopped.`);
}

try {
    process.kill(pid, 0);
} catch (error) {
    if (error.code !== 'ESRCH') {
        throw error;
    }

    rmSync(pidFile);
    console.log('Removed a stale Medically API PID file; the server is not running.');
    process.exit(0);
}

process.kill(pid, 'SIGTERM');
console.log(`Sent shutdown signal to Medically API (PID ${pid}).`);

const timeout = Date.now() + 10000;
const interval = setInterval(() => {
    try {
        process.kill(pid, 0);
        if (Date.now() >= timeout) {
            clearInterval(interval);
            console.error(`Medically API (PID ${pid}) did not stop within 10 seconds.`);
            process.exitCode = 1;
        }
    } catch (error) {
        clearInterval(interval);
        if (error.code !== 'ESRCH') {
            throw error;
        }

        if (existsSync(pidFile) && Number(readFileSync(pidFile, 'utf8').trim()) === pid) {
            rmSync(pidFile);
        }
        console.log('Medically API stopped.');
    }
}, 100);
