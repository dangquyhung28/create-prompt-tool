import { GoogleGenAI } from "@google/genai";

const getAiClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("API Key not provided. Please set it in the Settings tab.");
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL_NAME = 'gemini-2.5-flash';

export type Scene = {
  Objective: string;
  Objective_vi?: string;
  Persona: {
    Role: string;
    Tone: string;
    Knowledge_Level: string;
  };
  Task_Instructions: string[];
  Constraints: string[];
  Input_Examples: Array<{
    Input: string;
    Expected_Output: string;
  }>;
  Output_Format: {
    Type: string;
    Structure: {
      character_details: string;
      setting_details: string;
      key_action: string;
      camera_direction: string;
    };
  };
};

export type SceneMap = Record<string, Scene>;

/**
 * Parses a duration string (e.g., "1 minute", "30s", "1 phút") into total seconds.
 * Supports English and Vietnamese units.
 * @param durationStr The input string for duration.
 * @returns The total number of seconds.
 */
const parseDurationToSeconds = (durationStr: string): number => {
    const cleanStr = durationStr.trim().toLowerCase().replace(',', '.');
    let totalSeconds = 0;
    let unitFound = false;

    // Regex to find all number-unit pairs.
    // Units: m, min, minute(s), phút (minutes) | s, sec, second(s), giây (seconds)
    const matches = cleanStr.matchAll(/(\d+(\.\d+)?)\s*(m|min|minute|minutes|phút|s|sec|second|seconds|giây)/g);

    for (const match of matches) {
        unitFound = true;
        const value = parseFloat(match[1]);
        const unit = match[3];

        if (['m', 'min', 'minute', 'minutes', 'phút'].includes(unit)) {
            totalSeconds += value * 60;
        } else { // s, sec, second, seconds, giây
            totalSeconds += value;
        }
    }

    // If no units were found in the string, assume the entire string is a number in seconds.
    if (!unitFound) {
        const plainNumber = parseFloat(cleanStr);
        if (!isNaN(plainNumber) && isFinite(plainNumber)) {
            totalSeconds = plainNumber;
        }
    }

    if (isNaN(totalSeconds) || totalSeconds <= 0) {
        throw new Error("Invalid duration format. Please use formats like '30s', '1 minute', '2m 15s', '1 phút'.");
    }

    return totalSeconds;
};


/**
 * Generates a sequence of refined prompts for a text-to-video model.
 * @param videoIdea The user's core video concept.
 * @param videoDuration The user's desired video length string.
 * @param apiKey The user's Gemini API key.
 * @returns A promise that resolves to an array of well-structured prompt strings.
 */
export const generatePromptFromRequest = async (videoIdea: string, videoDuration: string, apiKey: string): Promise<SceneMap> => {
  try {
    const totalSeconds = parseDurationToSeconds(videoDuration);
    const promptsToGenerate = Math.ceil(totalSeconds / 8);

    const ai = getAiClient(apiKey);
    const metaPrompt = `
You are an expert cinematic prompt architect. Take the user's video idea and split it into a sequence of scenes for a text-to-video model.

Rules:
1) Generate exactly ${promptsToGenerate} scenes; each scene describes ~8 seconds of footage (total ≈ ${promptsToGenerate * 8}s).
2) Maintain strict character continuity. For any recurring character, repeat a consistent, explicit description in every scene's Output_Format.Structure.character_details. Do not assume prior memory.
3) Maintain a coherent story and visual continuity from one scene to the next.
4) Keep photorealistic, 4K, cinematic style throughout unless the idea specifies otherwise.
5) Output MUST be a single JSON object with keys "scene_1".."scene_${promptsToGenerate}", no extra text.

Scene Object Schema (for each scene_N):
{
  "Objective": string,
  "Objective_vi": string,              // 1 câu tóm tắt ngắn gọn bằng tiếng Việt
  "Persona": { "Role": string, "Tone": string, "Knowledge_Level": string },
  "Task_Instructions": string[],
  "Constraints": string[],
  "Input_Examples": [{ "Input": string, "Expected_Output": string }],
  "Output_Format": {
    "Type": "video/mp4",
    "Structure": {
      "character_details": string,        // Repeat full character description here for consistency
      "setting_details": string,
      "key_action": string,
      "camera_direction": string
    }
  }
}

User Input:
- Video Idea: """${videoIdea}"""

Return only the JSON object described above. No markdown, no prose, no code fences.
`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: metaPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    // The response.text is a JSON string, so we parse it.
    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Unexpected AI response: expected a JSON object with scene_* keys.');
    }

    const keys = Object.keys(parsed as Record<string, unknown>);
    const hasSceneKey = keys.some(k => /^scene_\d+$/.test(k));
    if (!hasSceneKey) {
      throw new Error('AI response missing expected scene_N keys.');
    }

    return parsed as SceneMap;

  } catch (error) {
    console.error("Error in generatePromptFromRequest:", error);
    if (error instanceof Error) {
        if(error.message.includes('API key not valid')) {
            throw new Error('The provided API key is not valid. Please check it in the Settings tab.');
        }
        throw new Error(`Failed to generate scenes: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating scenes.");
  }
};
