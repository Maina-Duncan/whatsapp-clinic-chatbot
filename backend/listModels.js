require('dotenv').config(); // Load environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableGeminiModels() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('Error: GEMINI_API_KEY is not set in your .env file.');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Access the modelService to list models
        const { models } = await genAI.listModels(); // This should now work correctly

        console.log('--- Available Gemini Models ---');
        if (models.length === 0) {
            console.log('No models found for your API key. Please check your Google Cloud project settings and API key permissions.');
        } else {
            for (const model of models) {
                console.log(`Name: ${model.name}`);
                console.log(`  Description: ${model.description || 'N/A'}`);
                console.log(`  Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
                console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
                console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
                console.log(`  Version: ${model.version || 'N/A'}`);
                console.log(`  Temperature: ${model.temperature || 'N/A'}`); // Add relevant params
                console.log(`  Top P: ${model.topP || 'N/A'}`);
                console.log(`  Top K: ${model.topK || 'N/A'}`);
                console.log('-----------------------------');
            }
        }
    } catch (error) {
        console.error('Error listing models:', error.message);
        if (error.status === 401 || error.status === 403) {
            console.error('Authentication/Authorization issue. Ensure your API Key is correct and has access to the Generative Language API.');
        } else if (error.status === 429) {
            console.error('Rate limit exceeded. Try again after some time.');
        } else {
            console.error('Detailed Error:', error); // Log full error object for more details
        }
    }
}

listAvailableGeminiModels();