/**
 * Profitability Helpers
 * Functions to calculate profit margins, prime costs, contribution margins, and COGS
 */

import { parsePrice, calculateFoodCost } from './food-cost-helpers';
import { calculateLaborCostPerItem } from './labor-cost-helpers';

export interface ProfitabilityMetrics {
  revenue: number;
  foodCost: number;
  laborCost: number;
  primeCost: number;
  profitMargin: number;
  profitMarginPercentage: number | null;
  contributionMargin: number;
  contributionMarginPercentage: number | null;
}

/**
 * Calculate prime cost (food cost + labor cost) per item
 */
export function calculatePrimeCost(
  foodCost: number,
  laborCost: number | null
): number {
  return foodCost + (laborCost || 0);
}

/**
 * Calculate profit margin (revenue - food cost - labor cost)
 */
export function calculateProfitMargin(
  revenue: number,
  foodCost: number,
  laborCost: number | null
): number {
  return revenue - foodCost - (laborCost || 0);
}

/**
 * Calculate profit margin percentage (profit margin / revenue * 100)
 */
export function calculateProfitMarginPercentage(
  profitMargin: number,
  revenue: number
): number | null {
  if (revenue === 0) return null;
  return Math.round((profitMargin / revenue) * 100 * 100) / 100;
}

/**
 * Calculate contribution margin (revenue - variable costs)
 * For menu items, variable costs are food cost + labor cost
 */
export function calculateContributionMargin(
  revenue: number,
  foodCost: number,
  laborCost: number | null
): number {
  return revenue - foodCost - (laborCost || 0);
}

/**
 * Calculate contribution margin percentage (contribution margin / revenue * 100)
 */
export function calculateContributionMarginPercentage(
  contributionMargin: number,
  revenue: number
): number | null {
  if (revenue === 0) return null;
  return Math.round((contributionMargin / revenue) * 100 * 100) / 100;
}

/**
 * Calculate total profitability metrics for a menu item
 */
export function calculateProfitabilityMetrics(
  revenue: number,
  foodCost: number,
  laborCost: number | null
): ProfitabilityMetrics {
  const primeCost = calculatePrimeCost(foodCost, laborCost);
  const profitMargin = calculateProfitMargin(revenue, foodCost, laborCost);
  const profitMarginPercentage = calculateProfitMarginPercentage(profitMargin, revenue);
  const contributionMargin = calculateContributionMargin(revenue, foodCost, laborCost);
  const contributionMarginPercentage = calculateContributionMarginPercentage(contributionMargin, revenue);

  return {
    revenue,
    foodCost,
    laborCost: laborCost || 0,
    primeCost,
    profitMargin,
    profitMarginPercentage,
    contributionMargin,
    contributionMarginPercentage,
  };
}

/**
 * Calculate Cost of Goods Sold (COGS)
 * COGS = sum of (food cost + labor cost) for all items sold
 */
export function calculateCOGS(
  items: Array<{
    quantity: number;
    foodCost: number;
    laborCost: number | null;
  }>
): number {
  return items.reduce((total, item) => {
    const primeCost = calculatePrimeCost(item.foodCost, item.laborCost);
    return total + (primeCost * item.quantity);
  }, 0);
}

/**
 * Get profitability status based on profit margin percentage
 * Industry standards: > 30% = excellent, 20-30% = good, 10-20% = acceptable, < 10% = poor
 */
export function getProfitabilityStatus(
  profitMarginPercentage: number | null
): 'excellent' | 'good' | 'acceptable' | 'poor' | 'unknown' {
  if (profitMarginPercentage === null) return 'unknown';
  if (profitMarginPercentage > 30) return 'excellent';
  if (profitMarginPercentage >= 20) return 'good';
  if (profitMarginPercentage >= 10) return 'acceptable';
  return 'poor';
}

/**
 * Format profit margin percentage for display
 */
export function formatProfitMarginPercentage(percentage: number | null): string {
  if (percentage === null) return 'N/A';
  return `${percentage.toFixed(1)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

