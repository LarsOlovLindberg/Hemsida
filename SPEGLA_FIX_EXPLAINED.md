# Spegla Synchronization Fix - Explained

## The Problem

The console was showing this message repeatedly:
```
[Spegla] Fältet hyra eller ov-HYRA hittades inte
[Spegla] Fältet elKostnad eller ov-EL_KOSTNAD hittades inte
[Spegla] Fältet hemforsakring eller ov-HEMFORSAKRING hittades inte
... (for all 30+ cost/income fields)
```

This meant **Spegla was running but could not find any of the form fields**.

## Root Cause

The **Spegla initialization was running at DOMContentLoaded time**, which happens **very early when the page loads**.

However:
1. The cost/income fields are **not in the HTML when the page loads**
2. They are **dynamically created and populated** when a "huvudman" (person) is selected
3. The `populateHuvudmanDetailsForm()` function renders these fields
4. But Spegla already tried to set up before this function ran

**Timeline of events:**
```
Page Load
    ↓
DOMContentLoaded fires
    ↓
Spegla tries to find fields → FAILS (fields don't exist yet)
    ↓
User selects a hovedman from dropdown
    ↓
populateHuvudmanDetailsForm() runs
    ↓
Form fields are rendered and populated
    ↓
Spegla should set up now → BUT IT ALREADY FAILED
```

## The Solution

**Move Spegla initialization from DOMContentLoaded to AFTER the form fields are populated.**

### What Changed

**BEFORE:**
```javascript
document.addEventListener("DOMContentLoaded", () => {
  // Spegla tries to find fields here - but they don't exist yet!
  const fieldMappings = [ ... ];
  fieldMappings.forEach((...) => {
    // Try to find fields - fails for all of them
  });
});
```

**AFTER:**
```javascript
function populateHuvudmanDetailsForm(data) {
  // ... populate all fields ...
  
  // NOW call Spegla AFTER fields are created
  initializeSpeglaSync();
}

function initializeSpeglaSync() {
  // This function runs AFTER all fields are populated
  const fieldMappings = [ ... ];
  fieldMappings.forEach((...) => {
    // Now fields exist and we can set up synchronization!
  });
}
```

**New Timeline:**
```
Page Load
    ↓
DOMContentLoaded fires → Nothing happens (Spegla code removed)
    ↓
User selects a hovedman
    ↓
populateHuvudmanDetailsForm() runs
    ↓
Form fields are rendered
    ↓
initializeSpeglaSync() is called
    ↓
Spegla finds all fields ✓ and sets up synchronization ✓
```

## Expected Behavior Now

When you load a huvudman:

1. **All cost/income fields are populated** with values from the database
2. **Spegla console shows:**
   ```
   [Spegla] ✓ Konfigurerat hyra → ov-HYRA
   [Spegla] ✓ Konfigurerat elKostnad → ov-EL_KOSTNAD
   [Spegla] ✓ Konfigurerat hemforsakring → ov-HEMFORSAKRING
   ... (all 30+ fields successfully configured)
   [Spegla] Alla kostnader & inkomster är nu speglade mellan Generella kostnader och Månadsbudget
   ```

3. **Live synchronization works:**
   - When you edit a value in "Generella Kostnader" section
   - The same value automatically updates in "Månadsbudget" section
   - Console shows: `[Spegla] elKostnad → ov-EL_KOSTNAD: 500`

## What Gets Synchronized

| Cost/Income Field | General Form ID | Monthly Budget ID |
|---|---|---|
| Hyra | `hyra` | `ov-HYRA` |
| Electricity | `elKostnad` | `ov-EL_KOSTNAD` |
| Insurance | `hemforsakring` | `ov-HEMFORSAKRING` |
| Rent (others) | `reskostnader` | `ov-RESKOSTNADER` |
| ... | ... | ... |
| Salary | `lon` | `ov-LON` |
| Pension | `pensionLivrantaSjukAktivitet` | `ov-PENSION_LIVRANTA_SJUK_AKTIVITET` |
| **Total: 30+ fields** | | |

## Testing

After page load and loading a huvudman, check the console (F12 → Console tab):

✓ Should see: `[Spegla] ✓ Konfigurerat [fieldname] → [monthlyid]` for each field
✗ Should NOT see: `[Spegla] Fältet ... hittades inte` (field not found)

If you see "field not found" messages, it means:
- Either the field IDs in HTML have changed
- Or the fields are not being rendered at all

## Files Modified

- **godman_logic.js**
  - Added new function: `initializeSpeglaSync()` (line ~2105)
  - Updated: `populateHuvudmanDetailsForm()` to call `initializeSpeglaSync()` at end
  - Removed: Old DOMContentLoaded Spegla code (was waiting for fields that don't exist)

## Why This Matters

**Before this fix:**
- Spegla never worked (looked for fields before they existed)
- Cost/income values were not synchronized between sections
- Månadsbudget section always stayed empty even when you filled Generella Kostnader

**After this fix:**
- Spegla finds all fields and sets up correctly
- Changes in Generella Kostnader instantly appear in Månadsbudget
- Values are properly synchronized for PDF generation and data persistence
