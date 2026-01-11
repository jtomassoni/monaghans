---
title: Creating and Managing Menu Items
feature: menu
route: /admin/menu
keywords:
  - menu items
  - create item
  - edit item
  - delete item
  - add menu item
aliases:
  - food items
  - menu management
relatedFeatures:
  - menu
  - menu-sections
  - modifiers
version: 1.0.0
lastUpdated: 2025-01-27
---

# Creating and Managing Menu Items

Create, edit, and manage individual dishes and drinks.

## Create Item

1. Go to **Menu** (`/admin/menu`)
2. Click **"Items"** tab
3. Click **"New Item"** (or "+")
4. Fill details and save

### Required
- **Name**: Item name (e.g., "Classic Burger")
- **Section**: Menu section
- **Price**: Item price (leave blank for "Market Price")

### Optional
- **Description**: Item details
- **Price Notes**: Additional pricing (e.g., "Market Price", "Add $2 for cheese")
- **Modifiers**: Customization options (see [Modifiers](./modifiers.md))
- **Availability**: Available or Unavailable
- **Display Order**: Order in section (lower = first)
- **Prep Time**: Estimated minutes

## Edit Item

1. Go to **Menu** → **Items**
2. Click item name or edit icon
3. Update details
4. Save

## Delete Item

1. Go to **Menu** → **Items**
2. Click delete icon (trash)
3. Confirm

**Warning**: Deleted items cannot be recovered.

## Availability

Hide items without deleting:

1. Edit the item
2. Toggle **"Available"** status

**Use when**:
- Out of stock
- Seasonal items
- Testing before launch

## Field Details

### Name
Clear, descriptive name customers recognize.

### Description
Include:
- Ingredients
- Preparation method
- Serving size
- Special notes

**Example**: "Grilled chicken breast with house-made marinade, served with seasonal vegetables and mashed potatoes"

### Price
Base price. Leave blank for:
- Market price items
- Variable pricing
- Price determined by modifiers

### Price Notes
Shown next to price:
- "Market Price"
- "Add $2 for extra cheese"
- "Prices vary by size"

### Display Order
Order within section:
- Lower numbers appear first (1, 2, 3...)
- Use increments of 10 for easy reordering

### Prep Time
Estimated minutes. Used for:
- Kitchen displays
- Customer expectations
- Order management

## Section Organization

Items must belong to a section:
1. Select **Section** from dropdown
2. Item appears in that section
3. Change section anytime by editing

## Tips

- Use clear, recognizable names
- Write helpful descriptions
- Keep prices current
- Hide items instead of deleting when out of stock
- Keep formatting consistent

## Next Steps

- [Add modifiers](./modifiers.md)
- [Set availability](./item-availability.md)
- [Reorder items](./reordering-menu.md)

