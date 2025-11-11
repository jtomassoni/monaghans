export interface StatusOption {
  value: string;
  label: string;
}

/**
 * Get order status options - simplified single workflow
 */
export function getOrderStatusOptions(): StatusOption[] {
  return [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
}

/**
 * Calculate tip distribution - simplified to 50/50 split
 */
export function calculateTipDistribution(tipAmount: number): { bohTip: number; fohTip: number } {
  // Simple 50/50 split
  const half = Math.round(tipAmount * 0.5 * 100) / 100;
  return {
    bohTip: half,
    fohTip: tipAmount - half,
  };
}

