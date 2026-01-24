const fetch = require('node-fetch');

// Placeholder for AI service
// You can replace this with OpenAI, HuggingFace, or any other API.

async function getAIResponse(prompt) {
    console.log(`[AI Service] Received prompt: ${prompt}`);

    // MOCK RESPONSE
    // In a real implementation, you would make an API call here.
    return `AI Response to: "${prompt}" (This is a placeholder)`;
}

module.exports = {
    getAIResponse
};
