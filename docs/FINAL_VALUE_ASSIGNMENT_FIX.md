# FINAL FIX - Numeric Input Value Assignment Error

## The Discovery

After deep investigation, found the **real culprit**: Using `setAttribute("value", ...)` to set HTML value attributes was triggering browser parsing/validation errors in Swedish locale environments.

### Error Pattern

```
The specified value "111,00" cannot be parsed, or is out of range.
```

This error occurs when:
1. We set: `setAttribute("value", "111.00")` ✓ (correct format)
2. Browser's Swedish locale layer converts it: "111.00" → "111,00" for display
3. Browser tries to validate the display format against the pattern
4. Pattern sees komma and... something fails

## The Real Solution

**Stop using `setAttribute("value", ...)` entirely. Use `.value` property directly.**

### Why This Works

- `.value` property: Direct assignment, no browser validation during set
- `setAttribute("value", ...)`: Creates an HTML attribute that browser may try to parse/validate

When you use `.value`:
```javascript
el.value = "111.00";  // Browser accepts, stores internally as punkt, displays as komma
```

When you use `setAttribute`:
```javascript
el.setAttribute("value", "111.00");  // Browser may try to parse/validate the attribute value
```

## Changes Made

### All setVal Functions Updated

**Local setVal() in populateHuvudmanDetailsForm():**
```javascript
// BEFORE
el.setAttribute("value", formattedValue);
el.value = formattedValue;

// AFTER - ONLY .value
el.value = formattedValue;
```

**Global setVal() function:**
```javascript
// BEFORE  
el.setAttribute("value", formatted);
console.log(...getAttribute...);

// AFTER - ONLY .value
el.value = formatted;
console.log("Set via .value");
```

**Spegla syncValue():**
```javascript
// BEFORE
const rawValue = generalField.getAttribute("value") || generalField.value;
monthlyField.setAttribute("value", rawValue);
monthlyField.value = rawValue;

// AFTER - ONLY .value
const syncedValue = generalField.value;
monthlyField.value = syncedValue;
```

## Why This Fixes It

1. **No attribute parsing** - Browser doesn't try to parse/validate attribute when it's not set
2. **Direct property assignment** - `.value` is the native way to set input values
3. **Browser handles locale** - Internally stores punkt format, displays komma format, user sees komma
4. **Pattern validation works** - Pattern only validates user INPUT, not the .value property

## The Three-Part Solution

You also identified the **saving issue** which is now fixed:

1. **Number Format During Load** ✓ (Now: Use .value directly)
2. **Number Format During Save** ✓ (Now: normalizeNumericInput() helper)
3. **Spegla Synchronization** ✓ (Now: Simple .value = .value)

## Complete Flow

```
1. Load from database: value = 111
2. Local setVal("elKostnad", 111, ..., true, true):
   - Convert: "111" → 111
   - Format: 111 → "111.00"
   - Set: el.value = "111.00" ✓
   - Browser displays: "111,00" (Swedish locale)
   - No error!

3. User sees: "111,00"

4. User edits to: "1 234,56"

5. Save clicks:
   - collect from DOM: el.value (browser normalizes for us)
   - normalizeNumericInput() cleans it: "1 234,56" → "1234.56"
   - Save to database: 1234.56 ✓

6. Spegla sync during load:
   - generalField.value (already punkt from step 2)
   - monthlyField.value = syncedValue ✓
   - No parsing errors!
```

## Files Modified

- **godman_logic.js**
  - Local setVal() - Removed setAttribute for numeric
  - Global setVal() - Removed setAttribute for numeric  
  - Spegla syncValue() - Removed setAttribute, simplified to .value
  - (Previously: Added normalizeNumericInput() helper - still in place)

## Testing

```
1. Clear cache: Ctrl+Shift+Delete
2. Hard refresh: Ctrl+Shift+R
3. Load a huvudman
4. Check: No "cannot be parsed" errors in console ✓
5. Verify: ElKostnad "111,00" displays without error ✓
6. Save: Click save, should complete successfully ✓
7. Sync: Spegla updates Månadsbudget without errors ✓
```

## Why .value Works When setAttribute Doesn't

| Approach | What Happens | Result |
|----------|---|---|
| `setAttribute("value", "111.00")` | Browser may parse/validate attribute | ❌ Error in Swedish locale |
| `el.value = "111.00"` | Direct assignment, no validation | ✅ Works correctly |

The `.value` property is **specifically designed for programmatic value assignment** on input elements. The `value` attribute is for HTML serialization. Browser implementations handle them differently.

##Keys Learning

- **Never** use `setAttribute("value", ...)` on input fields - Use `.value` property instead
- HTML5 input validation is complex with locale-specific behavior
- The `.value` property and `value` attribute are **not the same thing**
- Browser locale conversion happens at the display layer, not the storage layer

---

**This should finally resolve the "cannot be parsed" error completely!**
