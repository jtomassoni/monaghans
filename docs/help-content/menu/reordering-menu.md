---
title: Reordering Menu Sections and Items
feature: menu
route: /admin/menu
keywords:
  - reorder menu
  - reorder items
  - display order
  - menu order
aliases:
  - menu organization
  - item order
relatedFeatures:
  - menu
  - menu-sections
  - menu-items
version: 1.0.0
lastUpdated: 2025-01-27
---

# Reordering Menu Sections and Items

Control how sections and items appear using Display Order.

## Display Order System

Both sections and items use **Display Order** numbers:
- **Lower numbers appear first** (1, 2, 3...)
- **Higher numbers appear later** (10, 20, 30...)
- Use increments of 10 for easy reordering

## Reorder Sections

1. Go to **Menu** → **Sections**
2. Edit the section
3. Change **Display Order**:
   - Lower = earlier
   - Higher = later
4. Save

### Example

```
Appetizers: 10
Salads: 20
Entrees: 30
Desserts: 40
```

Move "Desserts" before "Entrees":
- Change "Desserts" to 25
- Order: Appetizers (10), Salads (20), Desserts (25), Entrees (30)

## Reorder Items

1. Go to **Menu** → **Items**
2. Edit the item
3. Change **Display Order** within section
4. Save

**Note**: Order only affects items within same section. Sections ordered first.

### Example (within "Entrees")

```
Classic Burger: 10
Chicken Sandwich: 20
Fish & Chips: 30
```

Move "Fish & Chips" first:
- Change to 5
- Order: Fish & Chips (5), Classic Burger (10), Chicken Sandwich (20)

## Tips

### Use Increments of 10
Easier to insert later:
- Between 20 and 30? Use 25
- Before 10? Use 5

### Plan Order
Logical flow:
- **Sections**: Appetizers → Main Courses → Desserts → Drinks
- **Items**: Popular first, alphabetical, or by price

### Consistent Numbering
- Sections: 10, 20, 30, 40...
- Items: 10, 20, 30, 40...

## Quick Reordering

1. **Start Fresh**: Renumber everything in increments of 10 if messy
2. **Insert**: Use numbers between existing (e.g., 15 between 10 and 20)
3. **Move to End**: Use high number (e.g., 999)
4. **Move to Beginning**: Use low number (e.g., 1)

## Display Order

Menu shows:
1. Sections by Display Order (lowest first)
2. Items within each section by Display Order (lowest first)

## Ordering Strategies

### By Popularity
Most popular first: 10, 20, 30... (most popular = 10)

### Alphabetical
A-Z order: 10, 20, 30... (A = 10, B = 20)

### By Price
Lowest/highest first: 10, 20, 30... (sorted by price)

### By Category
Group similar items: 10-19 (burgers), 20-29 (sandwiches)

## Next Steps

- [Manage sections](./menu-sections.md)
- [Create items](./menu-items.md)

