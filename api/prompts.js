// Requires Node.js 18+ and a running Ollama server.

const host = process.env.OLLAMA_HOST || 'http://localhost:11434';

export async function text_prompt(prompt) {
    try {
    const response = await fetch(`${host.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        model: "qwen3:1.7b",
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        }),
    });

    if (!response.ok) {
        throw new Error(
        `Ollama returned HTTP ${response.status}: ${await response.text()}`
        );
    }

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    if (typeof data.message?.content !== 'string') {
        throw new Error('Ollama returned an unexpected response.');
    }

    return data.message.content;

    } catch (error) {
    console.error(`Request failed: ${error.message}`);

    if (error.cause?.code) {
        console.error(`Connection error: ${error.cause.code}`);
    }

    console.error(
        `Ensure Ollama is running at ${host} and ${model} is installed (ollama list).`
    );
    process.exitCode = 1;
    return "";
    }
}

export async function decision_prompt(context, instructions, criteria_true, criteria_false) {
    try {
        const response = await fetch(`${host.replace(/\/$/, '')}/v1/systemone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            model: 'd3:latest',
            state: context,
            questions: {
                verify: {
                    type: 'noul',
                    instructions: instructions,
                    criteria: {
                        true: criteria_true,
                        false: criteria_false,
                    },
                },
            },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        
        if (data.error) throw new Error(data.error);
        return data.answers.noul > 0.5;

        } catch (error) {
        console.error(`Request failed: ${error.message}`);
        throw error;
        }
}
