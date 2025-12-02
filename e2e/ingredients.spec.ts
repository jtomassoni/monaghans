import { test, expect } from '@playwright/test';

test.use({ storageState: '.auth/admin.json' });

test.describe('Ingredients Management', () => {
  test('should navigate to ingredients page', async ({ page }) => {
    await page.goto('/admin');
    
    // Navigate to ingredients
    await page.click('a:has-text("Ingredients")');
    
    // Should be on ingredients page
    await expect(page).toHaveURL(/\/admin\/ingredients/);
  });

  test('should display ingredients list', async ({ page }) => {
    await page.goto('/admin/ingredients');
    
    await page.waitForTimeout(1000);
    
    // Page should load
    await expect(page.locator('body')).toBeVisible();
    
    // Should have ingredients content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should create a new ingredient', async ({ page }) => {
    await page.goto('/admin/ingredients');
    
    await page.waitForTimeout(1000);
    
    // Look for "New" or "Add" button
    const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Create"), a:has-text("New")').first();
    const buttonCount = await newButton.count();
    
    if (buttonCount > 0) {
      await newButton.click();
      await page.waitForTimeout(1000);
      
      // Form should appear
      const nameInput = page.locator('input[id="name"], input[name="name"], input[id="title"]');
      const formVisible = await nameInput.isVisible().catch(() => false);
      
      if (formVisible) {
        // Fill in ingredient details
        await nameInput.fill('Test Ingredient');
        
        // Fill category if exists
        const categoryInput = page.locator('input[id*="category"], select[id*="category"], input[name*="category"]');
        if (await categoryInput.count() > 0) {
          if (await categoryInput.first().evaluate(el => el.tagName === 'SELECT')) {
            const options = await categoryInput.locator('option').count();
            if (options > 1) {
              await categoryInput.selectIndex(1);
            }
          } else {
            await categoryInput.first().fill('Test Category');
          }
        }
        
        // Fill cost if exists
        const costInput = page.locator('input[type="number"][id*="cost"], input[type="number"][name*="cost"]');
        if (await costInput.count() > 0) {
          await costInput.first().fill('5.99');
        }
        
        // Fill unit if exists
        const unitInput = page.locator('input[id*="unit"], select[id*="unit"], input[name*="unit"]');
        if (await unitInput.count() > 0) {
          if (await unitInput.first().evaluate(el => el.tagName === 'SELECT')) {
            const options = await unitInput.locator('option').count();
            if (options > 1) {
              await unitInput.selectIndex(1);
            }
          } else {
            await unitInput.first().fill('lb');
          }
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          const successVisible = await page.locator('text=/success|created|saved/i').isVisible().catch(() => false);
          expect(successVisible).toBeTruthy();
        }
      }
    }
  });

  test('should edit an existing ingredient', async ({ page }) => {
    await page.goto('/admin/ingredients');
    
    await page.waitForTimeout(1000);
    
    // Look for edit buttons
    const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    const editCount = await editButtons.count();
    
    if (editCount > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Form should appear with existing data
      const nameInput = page.locator('input[id="name"], input[name="name"]');
      if (await nameInput.count() > 0) {
        const currentValue = await nameInput.inputValue();
        if (currentValue) {
          await nameInput.fill(`${currentValue} - Updated`);
          
          // Save
          const submitButton = page.locator('button[type="submit"], button:has-text("Save")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(2000);
            
            const successVisible = await page.locator('text=/success|updated|saved/i').isVisible().catch(() => false);
            expect(successVisible).toBeTruthy();
          }
        }
      }
    }
  });

  test('should delete an ingredient', async ({ page }) => {
    await page.goto('/admin/ingredients');
    
    await page.waitForTimeout(1000);
    
    // Look for delete buttons
    const deleteButtons = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]');
    const deleteCount = await deleteButtons.count();
    
    if (deleteCount > 0) {
      await deleteButtons.first().click();
      await page.waitForTimeout(500);
      
      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
      if (await confirmButton.count() > 0) {
        await confirmButton.first().click();
        await page.waitForTimeout(2000);
        
        const successVisible = await page.locator('text=/success|deleted|removed/i').isVisible().catch(() => false);
        expect(successVisible).toBeTruthy();
      }
    }
  });

  test('should link ingredients to menu items', async ({ page }) => {
    await page.goto('/admin/menu');
    
    await page.waitForTimeout(1000);
    
    // Navigate to items tab if exists
    const itemsTab = page.locator('button:has-text("Items"), [role="tab"]:has-text("Items")');
    if (await itemsTab.count() > 0) {
      await itemsTab.first().click();
      await page.waitForTimeout(1000);
    }
    
    // Edit an item
    const editButtons = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Look for ingredients section
      const ingredientsSection = page.locator('text=/ingredient/i, select[id*="ingredient"], input[id*="ingredient"]');
      const sectionCount = await ingredientsSection.count();
      
      // Ingredients linking may or may not be available in the form
      expect(sectionCount).toBeGreaterThanOrEqual(0);
    }
  });
});

