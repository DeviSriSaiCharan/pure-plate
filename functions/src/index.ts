import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { GoogleGenAI, Type } from "@google/genai";

type MealAnalysisResult = {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  isUnhealthy: boolean;
  isRawIngredient: boolean;
  warningMessage?: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  estimatedByAI: boolean;
};

type ClimateAdviceResult = {
  temp: number;
  humidity: number;
  condition: string;
  advice: string;
  suggestedFoods: string[];
  climateCondition: "HOT" | "COLD" | "NORMAL";
  waterGoalDeltaMl: number;
};

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
    },
    isUnhealthy: { type: Type.BOOLEAN, description: "True if food is notably dangerous or lacks nutritional value (e.g. extreme sugar, deep-fried)." },
    isRawIngredient: { type: Type.BOOLEAN, description: "True if the image is a raw ingredient or spice packet (like a box of masala) instead of a prepared meal." },
    warningMessage: { type: Type.STRING, description: "If unhealthy or raw, provide a short, urgent warning." }
  },
  required: ["foodName", "calories", "macros", "ingredients", "isUnhealthy", "isRawIngredient"]
};

function normalizeMealAnalysis(raw: any): MealAnalysisResult {
  const protein = Number(raw?.macros?.protein ?? 0);
  const carbs = Number(raw?.macros?.carbs ?? 0);
  const fat = Number(raw?.macros?.fats ?? raw?.macros?.fat ?? 0);

  const calories = Number(raw?.calories ?? 0);
  const ingredients = Array.isArray(raw?.ingredients)
    ? raw.ingredients.map((item: unknown) => String(item))
    : [];

  const foodName = typeof raw?.foodName === "string" && raw.foodName.trim().length > 0
    ? raw.foodName.trim()
    : "Unknown Meal";

  const isRawIngredient = Boolean(raw?.isRawIngredient);
  const isUnhealthy = Boolean(raw?.isUnhealthy);

  let mealType: MealAnalysisResult["mealType"] = "SNACK";
  const normalizedName = foodName.toLowerCase();
  if (/(idli|dosa|oats|upma|paratha|poha|breakfast|eggs?)/.test(normalizedName)) mealType = "BREAKFAST";
  else if (/(rice|biryani|thali|lunch|dal|sambar|curry)/.test(normalizedName)) mealType = "LUNCH";
  else if (/(dinner|roti|chapati|paneer|chicken|fish|meal)/.test(normalizedName)) mealType = "DINNER";

  return {
    foodName,
    calories,
    protein,
    carbs,
    fat,
    ingredients,
    isUnhealthy,
    isRawIngredient,
    warningMessage: typeof raw?.warningMessage === "string" ? raw.warningMessage : undefined,
    mealType,
    estimatedByAI: true,
  };
}

function classifyClimate(temp: number): ClimateAdviceResult["climateCondition"] {
  if (temp > 30) return "HOT";
  if (temp < 15) return "COLD";
  return "NORMAL";
}

export const analyzeMealWithGemini = onCall(
  {
    cors: true,
    secrets: ["GEMINI_API_KEY"],
    enforceAppCheck: false 
  },
  async (request) => {
    logger.info("analyzeMealWithGemini logic triggered");

    // Enforce Authentication
    // if (!request.auth) {
    //   throw new HttpsError("unauthenticated", "User must be authenticated.");
    // }

    const { base64Image, mimeType } = request.data as {
      base64Image: string;
      mimeType: string;
    };

    // Strip the 'data:image/jpeg;base64,' prefix if it was included from the frontend
    let normalizedImage = base64Image;
    if (normalizedImage && normalizedImage.includes("base64,")) {
        normalizedImage = normalizedImage.split("base64,")[1];
    }

    if (!normalizedImage) {
        throw new HttpsError("invalid-argument", "Missing base64Image payload");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY secret is not configured.");
    }

    try {
      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY
      });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            "You are a master nutritionist. Analyze the food item in the image. Return a structured JSON containing the name of the food, total estimated calories, macros (protein, carbs, fats in grams), and a list of identified ingredients. Assume average portion sizing.\n\nCRITICAL WARNING RULES:\n1. If the food is dangerously unhealthy (e.g. extremely high sugar, trans fats, excessive grease), set isUnhealthy to true and provide a warningMessage.\n2. If the user scans an inedible raw bulk ingredient, packaged spice, or raw meat (e.g. 'Everest Chicken Masala', a 5kg bag of rice, raw chicken), set isRawIngredient to true and provide a warningMessage explicitly telling them this cannot be logged as a meal.\n3. IMPORTANT: NEVER flag edible raw foods as 'isRawIngredient'. This includes raw bananas, apples, other fruits, groundnuts/peanuts with shells, and raw vegetables/salads. These are perfectly fine to log. For nuts with shells, estimate the edible portion weight inside the shell.\n4. If the item is a condiment, sauce, or mayonnaise, estimate macros based on a standard serving size (e.g., 15g or 1 tbsp) and mention the serving size in the foodName or warningMessage.",
            {
                inlineData: {
                data: normalizedImage,
                    mimeType: mimeType || 'image/jpeg'
                }
            }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: mealSchema
        }
      });
      
      const parsed = JSON.parse(response.text || "{}");
      return { result: normalizeMealAnalysis(parsed) };
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

    const { lat, lon } = request.data as { lat?: number; lon?: number };
    if (typeof lat !== 'number' || typeof lon !== 'number') {
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
         const climateCondition = classifyClimate(temp);
         let waterGoalDeltaMl = 0;

       if (temp > 30) {
           advice = "It is extremely hot right now. Limit heavily spiced curries. Hydrate with watery fruits and cooling foods.";
           suggestedFoods = ["Watermelon", "Curd Rice", "Cucumber Salad", "Coconut Water"];
           waterGoalDeltaMl = 750;
       } else if (temp < 15) {
           advice = "It's chilly today. Thermogenic, spiced foods will boost your body temperature and metabolic rate.";
           suggestedFoods = ["Masala Oats", "Chicken Soup", "Ginger Tea", "Spiced Dal"];
           waterGoalDeltaMl = 250;
       } else {
           advice = "Perfect temperate weather. Stick to your baseline macro targets.";
           suggestedFoods = ["Standard Diet"];
           waterGoalDeltaMl = 0;
       }

       return { 
           temp, 
           humidity,
           condition: weather.weather[0].main,
           advice, 
           suggestedFoods,
           climateCondition,
           waterGoalDeltaMl
        };
    } catch (e) {
       logger.error("Weather Error", e);
       throw new HttpsError("internal", "Could not fetch climate data.");
    }
  }
);
