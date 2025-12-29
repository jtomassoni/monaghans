/**
 * Menu Import Adapters
 * 
 * Handles importing menus from various external platforms and formats
 */

export type ImportPlatform = 
  | 'csv'
  | 'json'
  | 'toast'
  | 'square'
  | 'chownow'
  | 'olo'
  | 'grubhub'
  | 'doordash'
  | 'wix'
  | 'generic';

export interface ImportedMenuItem {
  name: string;
  description?: string | null;
  price?: string | null;
  priceNotes?: string | null;
  modifiers?: string | null;
  sectionName: string;
  sectionDescription?: string | null;
  menuType?: 'breakfast' | 'dinner' | 'both';
  isAvailable?: boolean;
  prepTimeMin?: number | null;
}

export interface ImportedMenuSection {
  name: string;
  description?: string | null;
  menuType?: 'breakfast' | 'dinner' | 'both';
  displayOrder?: number;
  items: ImportedMenuItem[];
}

export interface ImportResult {
  sections: ImportedMenuSection[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse CSV menu data
 * Expected format: section_name,item_name,description,price,price_notes,modifiers,menu_type,is_available
 */
export function parseCSV(csvContent: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sectionsMap = new Map<string, ImportedMenuSection>();

  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      errors.push('CSV file is empty');
      return { sections: [], errors, warnings };
    }

    // Check if first line is header
    const hasHeader = lines[0].toLowerCase().includes('section') || 
                      lines[0].toLowerCase().includes('name');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    dataLines.forEach((line, index) => {
      try {
        // Simple CSV parsing (handles quoted fields)
        const fields = parseCSVLine(line);
        
        if (fields.length < 2) {
          warnings.push(`Line ${index + 1}: Skipped - insufficient data`);
          return;
        }

        const sectionName = fields[0]?.trim() || 'Uncategorized';
        const itemName = fields[1]?.trim() || '';
        const description = fields[2]?.trim() || null;
        const price = fields[3]?.trim() || null;
        const priceNotes = fields[4]?.trim() || null;
        const modifiers = fields[5]?.trim() || null;
        const menuType = (fields[6]?.trim()?.toLowerCase() as 'breakfast' | 'dinner' | 'both') || 'dinner';
        const isAvailable = fields[7]?.trim()?.toLowerCase() !== 'false';

        if (!itemName) {
          warnings.push(`Line ${index + 1}: Skipped - missing item name`);
          return;
        }

        if (!sectionsMap.has(sectionName)) {
          sectionsMap.set(sectionName, {
            name: sectionName,
            description: null,
            menuType: menuType === 'both' ? 'both' : menuType,
            displayOrder: sectionsMap.size,
            items: [],
          });
        }

        const section = sectionsMap.get(sectionName)!;
        section.items.push({
          name: itemName,
          description,
          price,
          priceNotes,
          modifiers,
          sectionName,
          menuType,
          isAvailable,
        });
      } catch (err) {
        errors.push(`Line ${index + 1}: ${err instanceof Error ? err.message : 'Parse error'}`);
      }
    });
  } catch (err) {
    errors.push(`CSV parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return {
    sections: Array.from(sectionsMap.values()),
    errors,
    warnings,
  };
}

/**
 * Simple CSV line parser that handles quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : null;
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

/**
 * Parse JSON menu data
 * Expected format: { sections: [{ name: string, items: [{ name, description, price, ... }] }] }
 */
export function parseJSON(jsonContent: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonContent);
    
    if (!data.sections || !Array.isArray(data.sections)) {
      errors.push('JSON must have a "sections" array');
      return { sections: [], errors, warnings };
    }

    const sections: ImportedMenuSection[] = data.sections.map((section: any, index: number) => {
      if (!section.name) {
        errors.push(`Section ${index + 1}: Missing name`);
        return null;
      }

      const items: ImportedMenuItem[] = (section.items || []).map((item: any, itemIndex: number) => {
        if (!item.name) {
          warnings.push(`Section "${section.name}", Item ${itemIndex + 1}: Missing name, skipped`);
          return null;
        }

        return {
          name: item.name,
          description: item.description || null,
          price: item.price || null,
          priceNotes: item.priceNotes || item.price_notes || null,
          modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
          sectionName: section.name,
          sectionDescription: section.description || null,
          menuType: item.menuType || section.menuType || 'dinner',
          isAvailable: item.isAvailable !== false,
          prepTimeMin: item.prepTimeMin || item.prep_time_min || null,
        };
      }).filter((item: any) => item !== null);

      return {
        name: section.name,
        description: section.description || null,
        menuType: section.menuType || 'dinner',
        displayOrder: section.displayOrder || section.display_order || index,
        items,
      };
    }).filter((section: any) => section !== null);

    return { sections, errors, warnings };
  } catch (err) {
    errors.push(`JSON parsing failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    return { sections: [], errors, warnings };
  }
}

/**
 * Parse Toast POS menu format
 * Toast typically uses JSON with a specific structure
 */
export function parseToast(jsonContent: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonContent);
    
    // Toast format can vary, try common structures
    const sections: ImportedMenuSection[] = [];
    
    // Try Toast menu groups structure
    if (data.menuGroups && Array.isArray(data.menuGroups)) {
      data.menuGroups.forEach((group: any, index: number) => {
        const items: ImportedMenuItem[] = [];
        
        if (group.items && Array.isArray(group.items)) {
          group.items.forEach((item: any) => {
            items.push({
              name: item.name || item.itemName || '',
              description: item.description || null,
              price: item.price ? formatPrice(item.price) : null,
              priceNotes: item.priceNotes || null,
              modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
              sectionName: group.name || group.groupName || 'Uncategorized',
              menuType: 'dinner',
              isAvailable: item.available !== false,
              prepTimeMin: item.prepTime || null,
            });
          });
        }

        sections.push({
          name: group.name || group.groupName || `Section ${index + 1}`,
          description: group.description || null,
          menuType: 'dinner',
          displayOrder: index,
          items,
        });
      });
    } else if (data.categories && Array.isArray(data.categories)) {
      // Alternative Toast structure
      data.categories.forEach((category: any, index: number) => {
        const items: ImportedMenuItem[] = (category.items || []).map((item: any) => ({
          name: item.name || '',
          description: item.description || null,
          price: item.price ? formatPrice(item.price) : null,
          sectionName: category.name || 'Uncategorized',
          menuType: 'dinner',
          isAvailable: true,
        }));

        sections.push({
          name: category.name || `Section ${index + 1}`,
          menuType: 'dinner',
          displayOrder: index,
          items,
        });
      });
    } else {
      errors.push('Toast format not recognized. Expected menuGroups or categories array.');
    }

    return { sections, errors, warnings };
  } catch (err) {
    errors.push(`Toast parsing failed: ${err instanceof Error ? err.message : 'Invalid format'}`);
    return { sections: [], errors, warnings };
  }
}

/**
 * Parse Square POS menu format
 */
export function parseSquare(jsonContent: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonContent);
    
    const sections: ImportedMenuSection[] = [];
    
    // Square catalog structure
    if (data.objects && Array.isArray(data.objects)) {
      const categories = data.objects.filter((obj: any) => obj.type === 'CATEGORY');
      const items = data.objects.filter((obj: any) => obj.type === 'ITEM');
      
      categories.forEach((category: any, index: number) => {
        const categoryItems = items.filter((item: any) => 
          item.categoryId === category.id || 
          (item.categories && item.categories.includes(category.id))
        );

        sections.push({
          name: category.categoryData?.name || `Section ${index + 1}`,
          description: category.categoryData?.description || null,
          menuType: 'dinner',
          displayOrder: index,
          items: categoryItems.map((item: any) => ({
            name: item.itemData?.name || '',
            description: item.itemData?.description || null,
            price: item.itemData?.variations?.[0]?.itemVariationData?.priceMoney 
              ? formatSquarePrice(item.itemData.variations[0].itemVariationData.priceMoney)
              : null,
            sectionName: category.categoryData?.name || 'Uncategorized',
            menuType: 'dinner',
            isAvailable: item.itemData?.availableForPickup !== false,
          })),
        });
      });
    } else {
      errors.push('Square format not recognized. Expected objects array with type CATEGORY and ITEM.');
    }

    return { sections, errors, warnings };
  } catch (err) {
    errors.push(`Square parsing failed: ${err instanceof Error ? err.message : 'Invalid format'}`);
    return { sections: [], errors, warnings };
  }
}

/**
 * Parse ChowNow menu format
 */
export function parseChowNow(jsonContent: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonContent);
    
    const sections: ImportedMenuSection[] = [];
    
    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach((category: any, index: number) => {
        sections.push({
          name: category.name || `Section ${index + 1}`,
          description: category.description || null,
          menuType: 'dinner',
          displayOrder: index,
          items: (category.items || []).map((item: any) => ({
            name: item.name || '',
            description: item.description || null,
            price: item.price ? formatPrice(item.price) : null,
            sectionName: category.name || 'Uncategorized',
            menuType: 'dinner',
            isAvailable: item.available !== false,
          })),
        });
      });
    } else {
      errors.push('ChowNow format not recognized. Expected categories array.');
    }

    return { sections, errors, warnings };
  } catch (err) {
    errors.push(`ChowNow parsing failed: ${err instanceof Error ? err.message : 'Invalid format'}`);
    return { sections: [], errors, warnings };
  }
}

/**
 * Generic parser - tries to infer structure
 */
export function parseGeneric(content: string, mimeType?: string): ImportResult {
  if (mimeType?.includes('json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
    return parseJSON(content);
  } else {
    return parseCSV(content);
  }
}

/**
 * Main import function that routes to the appropriate parser
 */
export function importMenu(
  content: string,
  platform: ImportPlatform,
  mimeType?: string
): ImportResult {
  switch (platform) {
    case 'csv':
      return parseCSV(content);
    case 'json':
      return parseJSON(content);
    case 'toast':
      return parseToast(content);
    case 'square':
      return parseSquare(content);
    case 'chownow':
      return parseChowNow(content);
    case 'generic':
    default:
      return parseGeneric(content, mimeType);
  }
}

/**
 * Helper to format price from number to string
 */
function formatPrice(price: number | string): string {
  if (typeof price === 'string') return price;
  return `$${price.toFixed(2)}`;
}

/**
 * Helper to format Square price (in cents)
 */
function formatSquarePrice(priceMoney: { amount: number; currency: string }): string {
  const dollars = priceMoney.amount / 100;
  return `$${dollars.toFixed(2)}`;
}

