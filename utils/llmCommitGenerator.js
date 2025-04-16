const axios = require('axios');
require('dotenv').config();

/**
 * Available customization options for commit message generation
 */
const COMMIT_STYLE_OPTIONS = {
  // How detailed should the description be
  detailLevel: {
    minimal: "Focus only on the most important changes",
    moderate: "Include key changes with some context", 
    detailed: "Provide comprehensive details about changes"
  },
  // Tone/formality level
  tone: {
    casual: "Use casual, conversational language",
    neutral: "Use neutral, professional language",
    technical: "Use precise technical terminology"
  },
  // Length preference
  length: {
    short: "Very concise (30-50 chars)",
    medium: "Standard length (50-100 chars)",
    long: "Extended description (100-200 chars)"
  },
  // Emphasis focus
  focus: {
    creative: "Emphasize creative/artistic aspects",
    technical: "Emphasize technical aspects and parameters",
    balanced: "Balance between creative and technical details"
  }
};

/**
 * Generates a DAW user-friendly commit message based on project changes
 * @param {Object} diffSummary - The LLM-friendly summary from trackComparison.js
 * @param {Object} [options] - Customization options for the commit message
 * @param {string} [options.detailLevel] - Level of detail (minimal, moderate, detailed)
 * @param {string} [options.tone] - Tone of message (casual, neutral, technical)
 * @param {string} [options.length] - Desired length (short, medium, long)
 * @param {string} [options.focus] - What to emphasize (creative, technical, balanced)
 * @returns {Promise<Object>} Object containing generated commit message and metadata
 */
async function generateCommitMessage(diffSummary, options = {}) {
  try {
    // Extract the LLM-friendly text summary
    const diffText = diffSummary.llmText || "No changes detected";
    
    // Set defaults for any missing options
    const userOptions = {
      detailLevel: options.detailLevel || 'moderate',
      tone: options.tone || 'neutral',
      length: options.length || 'medium',
      focus: options.focus || 'balanced'
    };
    
    // Create a music producer-friendly prompt with user options
    const prompt = createProducerFriendlyPrompt(diffText, userOptions);
    
    // Make API request to OpenAI
    const response = await callOpenAI(prompt, userOptions);
    
    return {
      success: true,
      commitMessage: response,
      rawSummary: diffText,
      promptUsed: prompt,
      options: userOptions
    };
  } catch (error) {
    console.error("Error generating commit message:", error);
    return {
      success: false,
      error: error.message,
      commitMessage: "Project update" // Fallback generic message
    };
  }
}

/**
 * Crafts a prompt specifically designed for music producers and DAW users
 * @param {string} diffText - The LLM-friendly diff summary text
 * @param {Object} options - User customization options
 * @returns {string} A complete prompt for the LLM
 */
function createProducerFriendlyPrompt(diffText, options) {
  // Get the descriptions for each selected option
  const detailDesc = COMMIT_STYLE_OPTIONS.detailLevel[options.detailLevel];
  const toneDesc = COMMIT_STYLE_OPTIONS.tone[options.tone];
  const lengthDesc = COMMIT_STYLE_OPTIONS.length[options.length];
  const focusDesc = COMMIT_STYLE_OPTIONS.focus[options.focus];

  let prompt = `You are a music production assistant helping to describe changes made to a project.
    
Based on the following track changes in a DAW (Digital Audio Workstation) project, 
write a commit message summarizing the key changes.

Your response should follow these specific style preferences:
- Detail level: ${detailDesc}
- Tone: ${toneDesc}
- Length: ${lengthDesc}
- Focus: ${focusDesc}

Additional guidelines:
- Use music production terminology rather than software development terms
- Be specific about track modifications (instruments, effects, arrangements)
- No need to mention version control concepts

Here's a summary of the changes:

${diffText}

Commit Message:`;

  if (process.env.NODE_ENV !== 'production') {
    console.log("Prompt for OpenAI:", prompt);
  }
  
  return prompt;
}

/**
 * Makes the actual API call to OpenAI
 * @param {string} prompt - The complete prompt to send
 * @returns {Promise<string>} The generated commit message
 */
async function callOpenAI(prompt, options) {
  try {
    // Check if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OpenAI API key. Please add OPENAI_API_KEY to your .env file");
    }

    // Adjust max_tokens based on prompt length to avoid excessive costs
    const promptLength = prompt.length;
    // Roughly estimate token count (1 token ≈ 4 chars in English)
    const estimatedPromptTokens = Math.ceil(promptLength / 4);
    // Cap response tokens based on prompt size
    const maxResponseTokens = Math.min(
      250, // Never go over 250 tokens for responses
      Math.max(50, 300 - estimatedPromptTokens) // Dynamic allocation based on prompt size
    );

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a music production assistant that helps describe changes made to DAW projects in clear, concise language." 
          },
          { role: "user", content: prompt }
        ],
        temperature: options?.tone === 'casual' ? 0.8 : 0.7, // Slightly higher creativity for casual tone
        max_tokens: maxResponseTokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Extract just the commit message text from the response
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenAI API call failed:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * Returns the available customization options for client-side usage
 * @returns {Object} Available customization options
 */
function getCommitStyleOptions() {
  return COMMIT_STYLE_OPTIONS;
}

module.exports = {
  generateCommitMessage,
  getCommitStyleOptions,
  COMMIT_STYLE_OPTIONS
};