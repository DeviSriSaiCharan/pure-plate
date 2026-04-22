import { collection, doc, runTransaction, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebaseSetup';
import { Meal, DailyLog } from '../types/schema';

/**
 * Logs a new meal and atomically updates the daily totals cache using a Firestore Transaction.
 * This satisfies our Cost Control / Denormalization architecture.
 */
export const logFoodItem = async (
  mealData: Omit<Meal, 'id' | 'userId' | 'dailyLogId' | 'createdAt'>, 
  dateString: string // Format: YYYY-MM-DD
) => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  const userId = auth.currentUser.uid;
  const newMealId = doc(collection(db, `users/${userId}/meals`)).id; // Generate random ID for meal
  
  const dailyLogRef = doc(db, `users/${userId}/dailyLogs`, dateString);
  const newMealRef = doc(db, `users/${userId}/meals`, newMealId);

  try {
    await runTransaction(db, async (transaction) => {
      const dailyLogDoc = await transaction.get(dailyLogRef);
      
      let newLog: DailyLog;
      if (!dailyLogDoc.exists()) {
        // Create the daily log baseline if it's the first meal of the day
        newLog = {
          id: dateString,
          userId,
          dateString,
          totalCalories: mealData.calories,
          totalProtein: mealData.protein,
          totalCarbs: mealData.carbs,
          totalFats: mealData.fats,
          waterIntakeMl: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      } else {
        // Aggregate totals for the O(1) Dashboard Read strategy
        const currentData = dailyLogDoc.data() as DailyLog;
        newLog = {
          ...currentData,
          totalCalories: currentData.totalCalories + mealData.calories,
          totalProtein: currentData.totalProtein + mealData.protein,
          totalCarbs: currentData.totalCarbs + mealData.carbs,
          totalFats: currentData.totalFats + mealData.fats,
          updatedAt: Date.now()
        };
      }

      // 1. Commit the individual meal for history logs
      const fullMeal: Meal = {
        ...mealData,
        id: newMealId,
        userId,
        dailyLogId: dateString,
        createdAt: Date.now()
      };

      transaction.set(newMealRef, fullMeal);
      
      // 2. Commit the Denormalized total counter
      transaction.set(dailyLogRef, newLog);
    });

    console.log(`Successfully logged transaction for Meal ID: ${newMealId}`);
    return newMealId;
  } catch (error) {
    console.error("Transaction failed: ", error);
    throw error; // Let the UI handle the failure
  }
};
