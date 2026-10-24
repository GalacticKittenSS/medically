import cors from 'cors';
import express from 'express';
import multer from 'multer';

import { getEnv, getEnvBool, isDevMode } from './utilities.js';

const app = express();
const PORT = process.env.PORT || 3000;

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

        // 1. Parse structured headings
        // const structuredData = parseStructuredText(fileText);

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

app.listen(PORT, () => {
    console.log(`Medically API running on port ${PORT}`);
});