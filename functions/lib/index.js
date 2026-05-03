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
    let { base64Image, mimeType } = request.data;
    // Strip the 'data:image/jpeg;base64,' prefix if it was included from the frontend
    if (base64Image && base64Image.includes("base64,")) {
        base64Image = base64Image.split("base64,")[1];
    }
    if (!base64Image) {
        throw new https_1.HttpsError("invalid-argument", "Missing base64Image payload");
    }
    try {
        const ai = new genai_1.GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                "You are a master nutritionist. Analyze the food item in the image. Return a structured JSON containing the name of the food, total estimated calories, macros (protein, carbs, fats in grams), and a list of identified ingredients. Assume average portion sizing.\n\nCRITICAL WARNING RULES:\n1. If the food is dangerously unhealthy (e.g. extremely high sugar, trans fats, excessive grease), set isUnhealthy to true and provide a warningMessage.\n2. If the user scans a raw product, bulk ingredient, or packaged spice (e.g. 'Everest Chicken Masala', an onion, a bag of rice), set isRawIngredient to true and provide a warningMessage explicitly telling them this cannot be logged as a meal.",
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
    if (!lat || !lon) {
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
        if (temp > 30) {
            advice = "It is extremely hot right now. Limit heavily spiced curries. Hydrate with watery fruits and cooling foods.";
            suggestedFoods = ["Watermelon", "Curd Rice", "Cucumber Salad", "Coconut Water"];
        }
        else if (temp < 15) {
            advice = "It's chilly today. Thermogenic, spiced foods will boost your body temperature and metabolic rate.";
            suggestedFoods = ["Masala Oats", "Chicken Soup", "Ginger Tea", "Spiced Dal"];
        }
        else {
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
    }
    catch (e) {
        logger.error("Weather Error", e);
        throw new https_1.HttpsError("internal", "Could not fetch climate data.");
    }
});
//# sourceMappingURL=index.js.map