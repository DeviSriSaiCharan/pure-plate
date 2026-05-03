"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClimateAdvice = exports.analyzeMealWithGemini = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const genai_1 = require("@google/genai");
// ----------------------------------------------------------------------
// 1. MEAL ANALYSIS WITH GEMINI 1.5/2.5 FLASH
// ----------------------------------------------------------------------
const mealSchema = {
    type: genai_1.Type.OBJECT,
    properties: {
        foodName: { type: genai_1.Type.STRING },
        calories: { type: genai_1.Type.NUMBER },
        macros: {
            type: genai_1.Type.OBJECT,
            properties: {
                protein: { type: genai_1.Type.NUMBER },
                carbs: { type: genai_1.Type.NUMBER },
                fats: { type: genai_1.Type.NUMBER }
            }
        },
        ingredients: {
            type: genai_1.Type.ARRAY,
            items: { type: genai_1.Type.STRING }
        },
        isUnhealthy: { type: genai_1.Type.BOOLEAN, description: "True if food is notably dangerous or lacks nutritional value (e.g. extreme sugar, deep-fried)." },
        isRawIngredient: { type: genai_1.Type.BOOLEAN, description: "True if the image is a raw ingredient or spice packet (like a box of masala) instead of a prepared meal." },
        warningMessage: { type: genai_1.Type.STRING, description: "If unhealthy or raw, provide a short, urgent warning." }
    },
    required: ["foodName", "calories", "macros", "ingredients", "isUnhealthy", "isRawIngredient"]
};
function normalizeMealAnalysis(raw) {
    const protein = Number(raw?.macros?.protein ?? 0);
    const carbs = Number(raw?.macros?.carbs ?? 0);
    const fat = Number(raw?.macros?.fats ?? raw?.macros?.fat ?? 0);
    const calories = Number(raw?.calories ?? 0);
    const ingredients = Array.isArray(raw?.ingredients)
        ? raw.ingredients.map((item) => String(item))
        : [];
    const foodName = typeof raw?.foodName === "string" && raw.foodName.trim().length > 0
        ? raw.foodName.trim()
        : "Unknown Meal";
    const isRawIngredient = Boolean(raw?.isRawIngredient);
    const isUnhealthy = Boolean(raw?.isUnhealthy);
    let mealType = "SNACK";
    const normalizedName = foodName.toLowerCase();
    if (/(idli|dosa|oats|upma|paratha|poha|breakfast|eggs?)/.test(normalizedName))
        mealType = "BREAKFAST";
    else if (/(rice|biryani|thali|lunch|dal|sambar|curry)/.test(normalizedName))
        mealType = "LUNCH";
    else if (/(dinner|roti|chapati|paneer|chicken|fish|meal)/.test(normalizedName))
        mealType = "DINNER";
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
function classifyClimate(temp) {
    if (temp > 30)
        return "HOT";
    if (temp < 15)
        return "COLD";
    return "NORMAL";
}
exports.analyzeMealWithGemini = (0, https_1.onCall)({
    cors: true,
    secrets: ["GEMINI_API_KEY"],
    enforceAppCheck: false
}, async (request) => {
    logger.info("analyzeMealWithGemini logic triggered");
    // Enforce Authentication
    // if (!request.auth) {
    //   throw new HttpsError("unauthenticated", "User must be authenticated.");
    // }
    const { base64Image, mimeType } = request.data;
    // Strip the 'data:image/jpeg;base64,' prefix if it was included from the frontend
    let normalizedImage = base64Image;
    if (normalizedImage && normalizedImage.includes("base64,")) {
        normalizedImage = normalizedImage.split("base64,")[1];
    }
    if (!normalizedImage) {
        throw new https_1.HttpsError("invalid-argument", "Missing base64Image payload");
    }
    if (!process.env.GEMINI_API_KEY) {
        throw new https_1.HttpsError("failed-precondition", "GEMINI_API_KEY secret is not configured.");
    }
    try {
        const ai = new genai_1.GoogleGenAI({
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
    }
    catch (e) {
        logger.error("GenAI Error", e);
        throw new https_1.HttpsError("internal", "Failed to analyze meal visually.");
    }
});
// ----------------------------------------------------------------------
// 2. CLIMATE ADVICE USING OPENWEATHERMAP
// ----------------------------------------------------------------------
exports.getClimateAdvice = (0, https_1.onCall)({
    cors: true,
    secrets: ["OPENWEATHER_API_KEY"],
    enforceAppCheck: false
}, async (request) => {
    logger.info("getClimateAdvice triggered");
    const { lat, lon } = request.data;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
        throw new https_1.HttpsError("invalid-argument", "Missing coordinates (lat, lon).");
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
        let suggestedFoods = [];
        const climateCondition = classifyClimate(temp);
        let waterGoalDeltaMl = 0;
        if (temp > 30) {
            advice = "It is extremely hot right now. Limit heavily spiced curries. Hydrate with watery fruits and cooling foods.";
            suggestedFoods = ["Watermelon", "Curd Rice", "Cucumber Salad", "Coconut Water"];
            waterGoalDeltaMl = 750;
        }
        else if (temp < 15) {
            advice = "It's chilly today. Thermogenic, spiced foods will boost your body temperature and metabolic rate.";
            suggestedFoods = ["Masala Oats", "Chicken Soup", "Ginger Tea", "Spiced Dal"];
            waterGoalDeltaMl = 250;
        }
        else {
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
    }
    catch (e) {
        logger.error("Weather Error", e);
        throw new https_1.HttpsError("internal", "Could not fetch climate data.");
    }
});
//# sourceMappingURL=index.js.map