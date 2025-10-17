import { GoogleGenAI } from "@google/genai";

const getAiClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("API Key not provided. Please set it in the Settings tab.");
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Generates a refined prompt based on a user's request using a meta-prompting technique.
 * @param userRequest The user's description of what they want the AI to do.
 * @param apiKey The user's Gemini API key.
 * @returns A well-structured prompt string.
 */
export const generatePromptFromRequest = async (userRequest: string, apiKey: string): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    const metaPrompt = `
      You are an expert prompt engineer for large language models.
      Based on the following user request, create a detailed, effective, and clear prompt.
      The prompt should be structured to elicit the best possible response from an AI model.
      Ensure the prompt is self-contained and ready to be used directly.

      User Request: "${userRequest}"

      Generated Prompt:
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: metaPrompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error in generatePromptFromRequest:", error);
    if (error instanceof Error) {
        if(error.message.includes('API key not valid')) {
            throw new Error('The provided API key is not valid. Please check it in the Settings tab.');
        }
        throw new Error(`Failed to generate prompt: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the prompt.");
  }
};

/**
 * Sends a generated prompt to the Gemini API to get a test result.
 * @param generatedPrompt The prompt to be tested.
 * @param apiKey The user's Gemini API key.
 * @returns The AI's response to the prompt.
 */
export const testGeneratedPrompt = async (generatedPrompt: string, apiKey: string): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: generatedPrompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error in testGeneratedPrompt:", error);
     if (error instanceof Error) {
        if(error.message.includes('API key not valid')) {
            throw new Error('The provided API key is not valid. Please check it in the Settings tab.');
        }
        throw new Error(`Failed to test prompt: ${error.message}`);
    }
    throw new Error("An unknown error occurred while testing the prompt.");
  }
};
