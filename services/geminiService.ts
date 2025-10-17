
import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set. Please set it to use the Gemini API.");
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Generates a refined prompt based on a user's request using a meta-prompting technique.
 * @param userRequest The user's description of what they want the AI to do.
 * @returns A well-structured prompt string.
 */
export const generatePromptFromRequest = async (userRequest: string): Promise<string> => {
  try {
    const ai = getAiClient();
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
            throw new Error('The provided API key is not valid. Please check your environment configuration.');
        }
        throw new Error(`Failed to generate prompt: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the prompt.");
  }
};

/**
 * Sends a generated prompt to the Gemini API to get a test result.
 * @param generatedPrompt The prompt to be tested.
 * @returns The AI's response to the prompt.
 */
export const testGeneratedPrompt = async (generatedPrompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: generatedPrompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error in testGeneratedPrompt:", error);
     if (error instanceof Error) {
        if(error.message.includes('API key not valid')) {
            throw new Error('The provided API key is not valid. Please check your environment configuration.');
        }
        throw new Error(`Failed to test prompt: ${error.message}`);
    }
    throw new Error("An unknown error occurred while testing the prompt.");
  }
};
