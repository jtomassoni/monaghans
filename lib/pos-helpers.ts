/**
 * POS Integration Helpers
 * Functions to interact with different POS systems (Square, Toast, Clover, etc.)
 */

export type POSProvider = 'square' | 'toast' | 'clover' | 'lightspeed' | 'touchbistro';

export interface POSCredentials {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  locationId?: string;
  merchantId?: string;
  [key: string]: any; // Allow additional provider-specific credentials
}

export interface POSConfig {
  locationIds?: string[];
  syncSettings?: {
    autoSync?: boolean;
    syncFrequency?: 'hourly' | 'daily' | 'weekly' | 'manual';
  };
  itemMatching?: {
    enabled?: boolean;
    fuzzyMatch?: boolean;
  };
  [key: string]: any;
}

export interface POSTransaction {
  transactionId: string;
  orderNumber?: string;
  saleDate: Date;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod?: string;
  customerCount?: number;
  serverName?: string;
  locationId?: string;
  items: POSTransactionItem[];
  rawData?: any;
}

export interface POSTransactionItem {
  itemId?: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: string[];
}

/**
 * Square POS Integration
 */
export class SquarePOS {
  private accessToken: string;
  private locationId?: string;

  constructor(credentials: POSCredentials) {
    this.accessToken = credentials.accessToken || '';
    this.locationId = credentials.locationId;
  }

  /**
   * Fetch transactions from Square API
   * Documentation: https://developer.squareup.com/reference/square/payments-api/list-payments
   */
  async fetchTransactions(startDate: Date, endDate: Date): Promise<POSTransaction[]> {
    if (!this.accessToken) {
      throw new Error('Square access token is required');
    }

    const transactions: POSTransaction[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL('https://connect.squareup.com/v2/payments');
      url.searchParams.append('begin_time', startDate.toISOString());
      url.searchParams.append('end_time', endDate.toISOString());
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }
      if (this.locationId) {
        url.searchParams.append('location_id', this.locationId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Square API error: ${error.errors?.[0]?.detail || response.statusText}`);
      }

      const data = await response.json();
      const payments = data.payments || [];

      for (const payment of payments) {
        // Fetch order details if available
        let orderItems: POSTransactionItem[] = [];
        if (payment.order_id) {
          try {
            const orderResponse = await fetch(
              `https://connect.squareup.com/v2/orders/${payment.order_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                  'Content-Type': 'application/json',
                  'Square-Version': '2024-01-18',
                },
              }
            );
            if (orderResponse.ok) {
              const orderData = await orderResponse.json();
              const order = orderData.order;
              if (order?.line_items) {
                orderItems = order.line_items.map((item: any) => ({
                  itemId: item.uid,
                  name: item.name || 'Unknown Item',
                  category: item.catalog_object_id ? 'catalog' : 'custom',
                  quantity: parseInt(item.quantity || '1'),
                  unitPrice: parseFloat(item.base_price_money?.amount || 0) / 100,
                  totalPrice: parseFloat(item.total_money?.amount || 0) / 100,
                  modifiers: item.modifiers?.map((m: any) => m.name) || [],
                }));
              }
            }
          } catch (err) {
            console.warn('Failed to fetch order details:', err);
          }
        }

        // If no order items, create a placeholder from payment
        if (orderItems.length === 0) {
          orderItems = [{
            name: 'Payment',
            quantity: 1,
            unitPrice: parseFloat(payment.total_money?.amount || 0) / 100,
            totalPrice: parseFloat(payment.total_money?.amount || 0) / 100,
          }];
        }

        transactions.push({
          transactionId: payment.id,
          orderNumber: payment.order_id,
          saleDate: new Date(payment.created_at),
          subtotal: parseFloat(payment.amount_money?.amount || 0) / 100 - 
                   (parseFloat(payment.tip_money?.amount || 0) / 100) -
                   (parseFloat(payment.tax_money?.amount || 0) / 100),
          tax: parseFloat(payment.tax_money?.amount || 0) / 100,
          tip: parseFloat(payment.tip_money?.amount || 0) / 100,
          total: parseFloat(payment.total_money?.amount || 0) / 100,
          paymentMethod: payment.source_type?.toLowerCase(),
          serverName: payment.employee_id ? 'Employee' : undefined,
          locationId: payment.location_id,
          items: orderItems,
          rawData: payment,
        });
      }

      cursor = data.cursor;
    } while (cursor);

    return transactions;
  }

  /**
   * Test connection to Square API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://connect.squareup.com/v2/locations', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create POS client based on provider
 */
export function createPOSClient(provider: POSProvider, credentials: POSCredentials) {
  switch (provider) {
    case 'square':
      return new SquarePOS(credentials);
    case 'toast':
      // TODO: Implement Toast integration
      throw new Error('Toast integration not yet implemented');
    case 'clover':
      // TODO: Implement Clover integration
      throw new Error('Clover integration not yet implemented');
    case 'lightspeed':
      // TODO: Implement Lightspeed integration
      throw new Error('Lightspeed integration not yet implemented');
    case 'touchbistro':
      // TODO: Implement TouchBistro integration
      throw new Error('TouchBistro integration not yet implemented');
    default:
      throw new Error(`Unknown POS provider: ${provider}`);
  }
}

/**
 * Match POS item to MenuItem by name (fuzzy matching)
 */
export function matchMenuItem(posItemName: string, menuItems: Array<{ id: string; name: string }>): string | null {
  // Simple exact match first
  const exactMatch = menuItems.find(item => 
    item.name.toLowerCase() === posItemName.toLowerCase()
  );
  if (exactMatch) return exactMatch.id;

  // Fuzzy match - check if POS item name contains menu item name or vice versa
  const fuzzyMatch = menuItems.find(item => {
    const posLower = posItemName.toLowerCase();
    const menuLower = item.name.toLowerCase();
    return posLower.includes(menuLower) || menuLower.includes(posLower);
  });
  if (fuzzyMatch) return fuzzyMatch.id;

  return null;
}

