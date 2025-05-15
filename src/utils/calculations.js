// Basal Metabolic Rate (BMR) hesaplama - Harris-Benedict formülü
export function calculateBMR(weight, height, age, gender) {
  if (gender === 'male') {
    return 66.5 + (13.75 * weight) + (5.003 * height) - (6.75 * age);
  } else {
    return 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
  }
}

// VKİ (BMI) hesaplama
export function calculateBMI(weight, height) {
  // Boy cm, kilo kg
  const heightM = height / 100;
  return +(weight / (heightM * heightM)).toFixed(2);
}

// VKİ kategorisi
export function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Zayıf';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Fazla Kilolu';
  return 'Obez';
}

// Aktivite çarpanları
export const activityMultipliers = {
  low: 1.2,
  medium: 1.55,
  high: 1.75,
}

// Günlük kalori ihtiyacı (Harris-Benedict + aktivite)
export function calculateDailyCalories(weight, height, age, gender, activity) {
  const bmr = calculateBMR(weight, height, age, gender);
  const multiplier = activityMultipliers[activity] || 1.2;
  return Math.round(bmr * multiplier);
}



// Besin porsiyon hesaplama
export const calculateFoodPortion = (foodCalories, targetCalories) => {
  return Math.round((targetCalories / foodCalories) * 100) / 100
}

// Toplam öğün kalorisi hesaplama
export const calculateTotalMealCalories = (foods) => {
  return foods.reduce((total, food) => {
    return total + (food.calories * food.portion)
  }, 0)
}

// Diyet planı kalori kontrolü
export const validateDietPlanCalories = (dietPlan) => {
  const totalMealCalories = dietPlan.meals.reduce((total, meal) => {
    return total + calculateTotalMealCalories(meal.foods)
  }, 0)

  return {
    isValid: totalMealCalories <= dietPlan.targetCalories,
    totalCalories: totalMealCalories,
    remainingCalories: dietPlan.targetCalories - totalMealCalories,
  }
} 