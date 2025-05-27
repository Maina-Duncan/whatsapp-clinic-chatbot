require('dotenv').config(); // Load environment variables from .env file

async function listAvailableGeminiModelsDirect() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('Error: GEMINI_API_KEY is not set in your .env file.');
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log(`Attempting to fetch models from: ${url}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            console.log('--- Available Gemini Models (Direct API Call) ---');
            if (data.models && data.models.length > 0) {
                for (const model of data.models) {
                    console.log(`Name: ${model.name}`);
                    console.log(`  Description: ${model.description || 'N/A'}`);
                    console.log(`  Supported Methods: ${model.supportedGenerationMethods ? model.supportedGenerationMethods.join(', ') : 'N/A'}`);
                    console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
                    console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
                    console.log('-----------------------------');
                }
            } else {
                console.log('No models found, or models array is empty. Check API key and project permissions.');
            }
        } else {
            console.error(`API Call Error: ${response.status} ${response.statusText}`);
            console.error('Error details:', data);
            if (response.status === 401 || response.status === 403) {
                console.error('Possible API Key issue. Ensure it is valid, active, and has access to the Generative Language API.');
            }
        }
    } catch (error) {
        console.error('Network or fetch error:', error.message);
        console.error('Full fetch error:', error);
    }
}

listAvailableGeminiModelsDirect();