// User Profile Data Structure
export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  goal?: "LOSE_WEIGHT" | "MAINTAIN" | "GAIN_WEIGHT";
  baselineBmr?: number;
  dailyCalorieTarget?: number;
  dailyProteinTarget?: number;
  dailyCarbTarget?: number;
  dailyFatTarget?: number;
  culturalPreference?: "SOUTH_INDIAN" | "NORTH_INDIAN" | "VEGAN";
  activityLevel?: "SEDENTARY" | "ACTIVE";
  onboardingComplete: boolean;
  createdAt: number; // Unix timestamp
  updatedAt: number;
}

// Daily Aggregation Data Structure
export interface DailyLog {
  id: string; // Typically structured as YYYY-MM-DD
  userId: string;
  dateString: string; // e.g. "2026-04-22"
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  waterIntakeMl: number;
  createdAt: number;
  updatedAt: number;
}

// Individual Meal Data Structure
export interface Meal {
  id: string;
  userId: string;
  dailyLogId: string; // Traces back to which day this belongs
  name: string;
  imageUri?: string; // If a photo was taken
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  estimatedByAI: boolean; // Flag to indicate if Gemini provided the metrics
  climateConditionAtScan?: "HOT" | "COLD" | "NORMAL"; // Metadata for analytics
  createdAt: number;
}
