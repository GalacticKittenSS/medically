import cors from 'cors';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getEnv, getEnvBool, isDevMode } from './utilities.js';
import { Verify } from './verify.js';

const app = express();
const PORT = process.env.PORT || 3000;
const pidFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '.medically-api.pid'
);
const htmlDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'html'
);

app.use(express.json());

app.use(cors({
    origin: [
        'http://localhost:3000',  // Standard local dev server port
        'http://127.0.0.1:5500',  // Live Server default port
        'http://localhost:8080'
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.static(htmlDirectory));
app.get('/imaging-desk', (req, res) => {
    res.sendFile(path.join(htmlDirectory, 'Imaging-Desk.html'));
});
app.get('/cris', (req, res) => {
    res.sendFile(path.join(htmlDirectory, 'CRIS-Radiography-Worklist.html'));
});

// Store uploads in memory buffer instead of writing to disk
const upload = multer({ storage: multer.memoryStorage() });

// Helper: Parse raw text file content grouped by headings
function parseStructuredText(textContent) 
{
    const sections = {};
    let currentHeading = 'Uncategorized';

    const lines = textContent.split(/\r?\n/);

    for (const line of lines) 
    {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Detect heading formats (e.g., "=== HEADING ===" or "# HEADING" or "[HEADING]")
        if (trimmed.startsWith('===') || trimmed.startsWith('#') || trimmed.startsWith('[')) {
        currentHeading = trimmed.replace(/^[\=\#\[\s]+|[\=\#\]\s]+$/g, '');
        if (!sections[currentHeading]) {
            sections[currentHeading] = [];
        }
        } else {
            if (!sections[currentHeading]) {
                sections[currentHeading] = [];
            }

            sections[currentHeading].push(trimmed);
        }
    }

    return sections;
}



async function sendToWebsite2(structuredData) 
{
    if (isDevMode())
    {
        console.log('--------------------------------------------------');
        console.log('[DEV_MODE ACTIVE] Skipping remote request to Website 2.');
        console.log('Parsed Data:');
        console.dir(structuredData, { depth: null });
        console.log('--------------------------------------------------');
    
        return {
            status: 'MOCK_SUCCESS',
            message: 'Data logged locally in DEV_MODE.',
            timestamp: new Date().toISOString()
        };
    }

    // PRODUCTION: Real request to Website 2
    const website2Response = await fetch('https://website2.com/api/receive-endpoint', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_WEBSITE_2_API_KEY'
        },
        body: JSON.stringify({
            source: 'Website 1 Pipeline',
            timestamp: new Date().toISOString(),
            data: structuredData
        })
    });

    if (!website2Response.ok) {
        throw new Error(`Website 2 rejected payload with status ${website2Response.status}`);
    }

    return await website2Response.json();
}

// Endpoint to receive file from Website 1
app.post('/api/process-file', upload.single('file'), async (req, res) => 
{
    try 
    {
        let bookingData = null;
        // let fileText = '';

        // // Handle file upload or raw body payload
        // if (req.file) fileText = req.file.buffer.toString('utf-8');
        // else if (req.body && typeof req.body === 'string') fileText = req.body;
        // else return res.status(400).json({ error: 'No file or text payload provided.' });

        // TAKES WEBSITE 1 DATA AS JSON WE WILL USE IT TO SPRING
        if (req.file)
        {
            try 
            {
                bookingData = JSON.parse(req.file.buffer.toString('utf-8'));
            } catch (parseErr)
            {
                return res.status(400).json({ error: 'Uploaded file is not valid JSON' })
            }
        }
        else if (req.body && Object.keys(req.body).length > 0)
        {
            bookingData = req.body;
        }
        else
        {
            return res.status(400).json({ error: 'No JSON file or payload provided.' });
        }

        console.log("Received request. Processing...")

        // 1. Parse structured headings
        //const structuredData = parseStructuredText(fileText);
        const structuredData = bookingData;

        // 2. Verify Data is accurate 
        // Send provisional response to say more data is coming
        res.writeProcessing();

        const verified = await Verify(structuredData);
        if (!verified.decision) {
            res.status(406).json({
                success: false,
                error: "Referral notes are not suitable.",
                message: verified.response
            });
            return;
        }

        // 2. Forward parsed payload to Website 2
        const responseData = await sendToWebsite2(structuredData);
        
        // 3. Return success response back to Website 1
        res.status(200).json(
        {
            success: true,
            message: isDevMode() ? 'Parsed and logged in DEV_MODE' : 'File parsed and successfully forwarded to Website 2.',
            website2Ack: responseData
        });

    } catch (error) 
    {
        console.error('Processing error:', error);
        res.status(500).json(
        {
            success: false,
            error: error.message
        });
    }
});

const server = app.listen(PORT, () => {
    writeFileSync(pidFile, String(process.pid));
    console.log(`Medically API running on port ${PORT}`);
});

function removePidFile() {
    if (existsSync(pidFile) && readFileSync(pidFile, 'utf8').trim() === String(process.pid)) {
        rmSync(pidFile);
    }
}

process.on('exit', removePidFile);

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
        console.log(`Received ${signal}; shutting down Medically API...`);
        server.close((error) => {
            if (error) {
                console.error('Could not close the Medically API server:', error);
                process.exitCode = 1;
            }
            removePidFile();
        });
    });
}