export type OrderManagementMode = 'foh' | 'boh';

export interface StatusOption {
  value: string;
  label: string;
  department: 'FOH' | 'BOH';
}

/**
 * Get order status options based on management mode
 */
export function getOrderStatusOptions(mode: OrderManagementMode): StatusOption[] {
  if (mode === 'boh') {
    // BOH Mode: BOH handles everything except final handoff
    return [
      { value: 'pending', label: 'Pending', department: 'FOH' },
      { value: 'confirmed', label: 'Confirmed (BOH)', department: 'BOH' },
      { value: 'acknowledged', label: 'Acknowledged (BOH)', department: 'BOH' },
      { value: 'preparing', label: 'Preparing (BOH)', department: 'BOH' },
      { value: 'ready', label: 'Ready (BOH)', department: 'BOH' },
      { value: 'completed', label: 'Completed (FOH)', department: 'FOH' },
      { value: 'cancelled', label: 'Cancelled (FOH)', department: 'FOH' },
    ];
  } else {
    // FOH Mode: Traditional workflow
    return [
      { value: 'pending', label: 'Pending (FOH)', department: 'FOH' },
      { value: 'confirmed', label: 'Confirmed (FOH)', department: 'FOH' },
      { value: 'acknowledged', label: 'Acknowledged (BOH)', department: 'BOH' },
      { value: 'preparing', label: 'Preparing (BOH)', department: 'BOH' },
      { value: 'ready', label: 'Ready (BOH)', department: 'BOH' },
      { value: 'completed', label: 'Completed (FOH)', department: 'FOH' },
      { value: 'cancelled', label: 'Cancelled (FOH)', department: 'FOH' },
    ];
  }
}

/**
 * Calculate tip distribution based on management mode
 */
export function calculateTipDistribution(tipAmount: number, mode: OrderManagementMode): { bohTip: number; fohTip: number } {
  if (mode === 'boh') {
    // BOH gets 70%, FOH gets 30%
    return {
      bohTip: Math.round(tipAmount * 0.7 * 100) / 100,
      fohTip: Math.round(tipAmount * 0.3 * 100) / 100,
    };
  } else {
    // FOH Mode: Default split (can be customized)
    // For now, FOH gets 100% in FOH mode
    return {
      bohTip: 0,
      fohTip: tipAmount,
    };
  }
}

