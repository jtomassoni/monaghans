/**
 * Labor Cost Helpers
 * Functions to calculate labor costs, average wages, and analyze labor efficiency
 */

/**
 * Calculate labor cost per menu item based on prep time and average hourly wage
 * @param prepTimeMin - Prep time in minutes
 * @param averageHourlyWage - Average hourly wage across all employees
 * @returns Labor cost in dollars, or null if prep time is not set
 */
export function calculateLaborCostPerItem(
  prepTimeMin: number | null | undefined,
  averageHourlyWage: number
): number | null {
  if (!prepTimeMin || prepTimeMin <= 0) return null;
  
  const hours = prepTimeMin / 60;
  return Math.round(hours * averageHourlyWage * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate average hourly wage across all active employees
 * @param employees - Array of employees with hourlyWage property
 * @returns Average hourly wage, or 0 if no employees
 */
export function calculateAverageHourlyWage(
  employees: Array<{ hourlyWage: number }>
): number {
  if (employees.length === 0) return 0;
  
  const totalWage = employees.reduce((sum, emp) => sum + emp.hourlyWage, 0);
  return Math.round((totalWage / employees.length) * 100) / 100;
}

/**
 * Calculate labor cost percentage (labor cost / sales * 100)
 * @param laborCost - Total labor cost in dollars
 * @param sales - Total sales in dollars
 * @returns Labor cost percentage, or null if sales is 0
 */
export function calculateLaborCostPercentage(
  laborCost: number,
  sales: number
): number | null {
  if (sales === 0) return null;
  
  return Math.round((laborCost / sales) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Get labor cost percentage status
 * Industry standards: < 25% = good, 25-30% = acceptable, > 30% = high
 */
export function getLaborCostStatus(percentage: number | null): 'good' | 'acceptable' | 'high' | 'unknown' {
  if (percentage === null) return 'unknown';
  if (percentage < 25) return 'good';
  if (percentage <= 30) return 'acceptable';
  return 'high';
}

/**
 * Format labor cost percentage for display
 */
export function formatLaborCostPercentage(percentage: number | null): string {
  if (percentage === null) return 'N/A';
  return `${percentage.toFixed(1)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

