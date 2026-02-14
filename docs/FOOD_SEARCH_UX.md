# Food Search UX (mobile-first) — OpenFoodFacts (OFF)

This document defines the intended UX for searching foods and selecting one to auto-fill nutrition fields, primarily for the **Calories → Add food** flow.

## Primary user story
As a user logging calories on my phone, I want to quickly find a packaged food online (OFF), tap it, and have the log form auto-filled with reliable baseline nutrition (per 100g), without leaving the current screen.

## Entry points
### 1) Calories page → “Add food” modal (primary)
- User taps **➕ Add** (for a meal or ungrouped)
- Modal opens with tabs:
  - **Local** (default)
  - **Online** (OFF)

### 2) Future: Foods library → “Import from OFF” (secondary)
- Optional later: add a dedicated import flow in `/foods`.

## Screen / interaction spec (wire-level)
### Add Food modal header
- Title: “Add food”
- Tabs:
  - **Local**: searches existing local foods
  - **Online**: searches OFF

### Search input
- Sticky at top of the modal (mobile ergonomics)
- Placeholder:
  - Local tab: “Search your foods…”
  - Online tab: “Search OpenFoodFacts…”
- Debounce:
  - Online: ~400ms debounce (avoid spamming API)
- Minimum query length:
  - Online: 2+ characters

### Results list (Online tab)
Each result row should be **fully tappable** (44px+ height) and show:
- **Product name** (truncate to 1 line)
- **Brand** (muted)
- **Key nutrition per 100g** (small, right-aligned or second line):
  - kcal, P/C/F
- Optional: barcode (tiny / hidden by default)

### Selecting an online result
On tap of a result, we do one of:
1) **If barcode is present** → “Save & use” (preferred)
   - Call `POST /api/food-search { barcode }` to cache into local DB.
   - On success:
     - Switch tab to **Local**
     - Select the newly saved food in the form
     - User continues to choose serving / grams / quantity as usual.
2) **If no barcode** (rare) → “Use without saving” (fallback)
   - Populate the *preview* (or a temporary selection state) with OFF values, but encourage saving when possible.

### Loading / empty / error states
- Loading: inline spinner + “Searching…”
- Empty (no results): “No matches. Try a different name/brand.”
- Error (network/API): “Can’t reach OpenFoodFacts right now. Try again.”

## Auto-fill: target fields
We treat OFF values as **per-100g** nutrition and store them in the `foods` table.

### Required fields (must exist to save)
- `foods.name` ← OFF `product_name` (fallback: “Unknown”)
- `foods.barcode` ← OFF `code` (EAN)
- `foods.calories` ← OFF `nutriments.energy-kcal_100g`

### Defaulted (0 if missing)
- `foods.protein` ← `nutriments.proteins_100g`
- `foods.carbs` ← `nutriments.carbohydrates_100g`
- `foods.fat` ← `nutriments.fat_100g`

### Optional nullable nutrition (store when present)
- `foods.fiber` ← `nutriments.fiber_100g`
- `foods.sugar` ← `nutriments.sugars_100g`
- `foods.sodium` ← `nutriments.sodium_100g` (convert **g → mg**)
- `foods.saturatedFat` ← `nutriments.saturated-fat_100g`

### Metadata
- `foods.brand` ← OFF `brands`
- `foods.source` ← `'openfoodfacts'`

### Servings
If OFF provides serving info:
- Create a default serving row:
  - `foodServings.name` ← OFF `serving_size` (string)
  - `foodServings.grams` ← OFF `serving_quantity` (numeric)
  - `foodServings.isDefault` ← true

## Notes / acceptance
- The UX should be optimized for one-handed phone use.
- The user should never be forced out of the Add Food flow; online selection should “drop” them back into the local selection + logging controls.
- The minimal nutrition fields that must end up populated in the log preview are: **kcal, protein, carbs, fat**.
