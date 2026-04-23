import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { GoogleGenAI, Type } from "@google/genai";

// ----------------------------------------------------------------------
// 1. MEAL ANALYSIS WITH GEMINI 1.5/2.5 FLASH
// ----------------------------------------------------------------------

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    foodName: { type: Type.STRING },
    calories: { type: Type.NUMBER },
    macros: {
      type: Type.OBJECT,
      properties: {
        protein: { type: Type.NUMBER },
        carbs: { type: Type.NUMBER },
        fats: { type: Type.NUMBER }
      }
    },
    ingredients: { 
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["foodName", "calories", "macros", "ingredients"]
};

export const analyzeMealWithGemini = onCall(
  {
    cors: true,
    secrets: ["GEMINI_API_KEY"],
    enforceAppCheck: false 
  },
  async (request) => {
    logger.info("analyzeMealWithGemini logic triggered");

    // Enforce Authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated.");
    }

    const { base64Image, mimeType } = request.data as {
      base64Image: string;
      mimeType: string;
    };

    if (!base64Image) {
        throw new HttpsError("invalid-argument", "Missing base64Image payload");
    }

    try {
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY!
      });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            "You are a master nutritionist specializing in culturally diverse (especially Indian) cuisines. Analyze the food item in the image. Return a structured JSON containing the name of the food, total estimated calories, macros (protein, carbs, fats in grams), and a list of identified ingredients. Assume average portion sizing unless a plate boundary visually infers differently.",
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType || 'image/jpeg'
                }
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: mealSchema
        }
      });
      
      return { result: JSON.parse(response.text || "{}") };
    } catch (e) {
      logger.error("GenAI Error", e);
      throw new HttpsError("internal", "Failed to analyze meal visually.");
    }
  }
);

// ----------------------------------------------------------------------
// 2. CLIMATE ADVICE USING OPENWEATHERMAP
// ----------------------------------------------------------------------
export const getClimateAdvice = onCall(
  {
    cors: true,
    secrets: ["OPENWEATHER_API_KEY"],
    enforceAppCheck: false
  },
  async (request) => {
    logger.info("getClimateAdvice triggered");

    const { lat, lon } = request.data;
    if (!lat || !lon) {
       throw new HttpsError("invalid-argument", "Missing coordinates (lat, lon).");
    }

    try {
       const apiKey = process.env.OPENWEATHER_API_KEY;
       if (!apiKey) {
           throw new Error("Missing OpenWeather API Key secret.");
       }

       const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
       const weather = await response.json();
       
       if (weather.cod !== 200) {
           throw new Error(weather.message);
       }

       const temp = weather.main.temp;
       const humidity = weather.main.humidity;
       
       let advice = "";
       let suggestedFoods: string[] = [];

       if (temp > 30) {
           advice = "It is extremely hot right now. Limit heavily spiced curries. Hydrate with watery fruits and cooling foods.";
           suggestedFoods = ["Watermelon", "Curd Rice", "Cucumber Salad", "Coconut Water"];
       } else if (temp < 15) {
           advice = "It's chilly today. Thermogenic, spiced foods will boost your body temperature and metabolic rate.";
           suggestedFoods = ["Masala Oats", "Chicken Soup", "Ginger Tea", "Spiced Dal"];
       } else {
           advice = "Perfect temperate weather. Stick to your baseline macro targets.";
           suggestedFoods = ["Standard Diet"];
       }

       return { 
           temp, 
           humidity,
           condition: weather.weather[0].main,
           advice, 
           suggestedFoods 
        };
    } catch (e) {
       logger.error("Weather Error", e);
       throw new HttpsError("internal", "Could not fetch climate data.");
    }
  }
);
