-- CreateTable: Ingredient
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "unit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "parLevel" DOUBLE PRECISION,
    "currentStock" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MenuItemIngredient
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Ingredient category
CREATE INDEX "Ingredient_category_idx" ON "Ingredient"("category");

-- CreateIndex: Ingredient name
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");

-- CreateIndex: MenuItemIngredient menuItemId
CREATE INDEX "MenuItemIngredient_menuItemId_idx" ON "MenuItemIngredient"("menuItemId");

-- CreateIndex: MenuItemIngredient ingredientId
CREATE INDEX "MenuItemIngredient_ingredientId_idx" ON "MenuItemIngredient"("ingredientId");

-- CreateUniqueConstraint: MenuItemIngredient unique menuItemId + ingredientId
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_ingredientId_key" ON "MenuItemIngredient"("menuItemId", "ingredientId");

-- AddForeignKey: MenuItemIngredient menuItemId -> MenuItem id
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: MenuItemIngredient ingredientId -> Ingredient id
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
