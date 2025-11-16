/**
 * Supplier Integration Helpers
 * Functions for integrating with supplier APIs (Sysco, US Foods, Costco, etc.)
 * Note: These are stubbed implementations - real API integration requires supplier credentials
 */

export interface SupplierProduct {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  unitSize?: string;
  price: number;
  minOrderQty?: number;
  leadTimeDays?: number;
  isAvailable: boolean;
}

export interface SupplierOrderRequest {
  items: Array<{
    sku: string;
    quantity: number;
    unit: string;
  }>;
  requestedDate?: Date;
  notes?: string;
}

export interface SupplierOrderResponse {
  orderId: string;
  orderNumber: string;
  status: 'submitted' | 'confirmed' | 'error';
  estimatedDelivery?: Date;
  total: number;
  message?: string;
}

/**
 * Sysco API Integration (Stubbed)
 * Real implementation would use Sysco's API credentials
 */
export async function syncSyscoCatalog(
  credentials: Record<string, any>
): Promise<SupplierProduct[]> {
  // Stub: In real implementation, this would:
  // 1. Authenticate with Sysco API using credentials
  // 2. Fetch product catalog
  // 3. Transform to SupplierProduct format
  // 4. Return products
  
  console.log('Sysco catalog sync (stubbed)');
  return [];
}

export async function placeSyscoOrder(
  credentials: Record<string, any>,
  order: SupplierOrderRequest
): Promise<SupplierOrderResponse> {
  // Stub: In real implementation, this would:
  // 1. Authenticate with Sysco API
  // 2. Submit order
  // 3. Return order confirmation
  
  console.log('Sysco order placement (stubbed)', order);
  return {
    orderId: `sysco-${Date.now()}`,
    orderNumber: `SY-${Date.now()}`,
    status: 'submitted',
    total: 0,
    message: 'Order submitted (stubbed - requires real API credentials)',
  };
}

/**
 * US Foods API Integration (Stubbed)
 */
export async function syncUSFoodsCatalog(
  credentials: Record<string, any>
): Promise<SupplierProduct[]> {
  console.log('US Foods catalog sync (stubbed)');
  return [];
}

export async function placeUSFoodsOrder(
  credentials: Record<string, any>,
  order: SupplierOrderRequest
): Promise<SupplierOrderResponse> {
  console.log('US Foods order placement (stubbed)', order);
  return {
    orderId: `usfoods-${Date.now()}`,
    orderNumber: `US-${Date.now()}`,
    status: 'submitted',
    total: 0,
    message: 'Order submitted (stubbed - requires real API credentials)',
  };
}

/**
 * Costco API Integration (Stubbed)
 */
export async function syncCostcoCatalog(
  credentials: Record<string, any>
): Promise<SupplierProduct[]> {
  console.log('Costco catalog sync (stubbed)');
  return [];
}

export async function placeCostcoOrder(
  credentials: Record<string, any>,
  order: SupplierOrderRequest
): Promise<SupplierOrderResponse> {
  console.log('Costco order placement (stubbed)', order);
  return {
    orderId: `costco-${Date.now()}`,
    orderNumber: `CO-${Date.now()}`,
    status: 'submitted',
    total: 0,
    message: 'Order submitted (stubbed - requires real API credentials)',
  };
}

/**
 * Generic supplier sync function - routes to appropriate supplier API
 */
export async function syncSupplierCatalog(
  provider: string,
  credentials: Record<string, any>
): Promise<SupplierProduct[]> {
  switch (provider.toLowerCase()) {
    case 'sysco':
      return syncSyscoCatalog(credentials);
    case 'usfoods':
      return syncUSFoodsCatalog(credentials);
    case 'costco':
      return syncCostcoCatalog(credentials);
    default:
      throw new Error(`Unsupported supplier provider: ${provider}`);
  }
}

/**
 * Generic supplier order placement - routes to appropriate supplier API
 */
export async function placeSupplierOrder(
  provider: string,
  credentials: Record<string, any>,
  order: SupplierOrderRequest
): Promise<SupplierOrderResponse> {
  switch (provider.toLowerCase()) {
    case 'sysco':
      return placeSyscoOrder(credentials, order);
    case 'usfoods':
      return placeUSFoodsOrder(credentials, order);
    case 'costco':
      return placeCostcoOrder(credentials, order);
    default:
      throw new Error(`Unsupported supplier provider: ${provider}`);
  }
}

/**
 * Match supplier products to ingredients based on name similarity
 */
export function matchProductsToIngredients(
  products: SupplierProduct[],
  ingredients: Array<{ id: string; name: string; category: string }>
): Array<{
  product: SupplierProduct;
  ingredientId: string | null;
  matchScore: number;
}> {
  const matches: Array<{
    product: SupplierProduct;
    ingredientId: string | null;
    matchScore: number;
  }> = [];

  for (const product of products) {
    let bestMatch: { ingredientId: string; score: number } | null = null;

    for (const ingredient of ingredients) {
      const score = calculateNameSimilarity(product.name, ingredient.name);
      
      // Also check category match
      if (product.category && ingredient.category && 
          product.category.toLowerCase() === ingredient.category.toLowerCase()) {
        // Boost score for category match
        const boostedScore = score * 1.2;
        if (!bestMatch || boostedScore > bestMatch.score) {
          bestMatch = { ingredientId: ingredient.id, score: Math.min(boostedScore, 1.0) };
        }
      } else if (!bestMatch || score > bestMatch.score) {
        bestMatch = { ingredientId: ingredient.id, score };
      }
    }

    matches.push({
      product,
      ingredientId: bestMatch && bestMatch.score > 0.5 ? bestMatch.ingredientId : null,
      matchScore: bestMatch?.score || 0,
    });
  }

  return matches;
}

/**
 * Calculate similarity between two product/ingredient names
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const normalize = (str: string) => str.toLowerCase().trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);

  // Exact match
  if (n1 === n2) return 1.0;

  // Check if one contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = Math.min(n1.length, n2.length);
    const longer = Math.max(n1.length, n2.length);
    return shorter / longer;
  }

  // Extract keywords (split by common separators)
  const keywords1 = n1.split(/[\s\-_,]+/).filter(k => k.length > 2);
  const keywords2 = n2.split(/[\s\-_,]+/).filter(k => k.length > 2);

  // Count matching keywords
  const matches = keywords1.filter(k1 => 
    keywords2.some(k2 => k1 === k2 || k1.includes(k2) || k2.includes(k1))
  );
  
  if (matches.length === 0) return 0;

  // Calculate similarity based on keyword overlap
  const totalKeywords = new Set([...keywords1, ...keywords2]).size;
  return matches.length / totalKeywords;
}

