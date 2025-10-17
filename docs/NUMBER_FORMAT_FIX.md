# Number Format Error Fix - Deep Dive

## The Error You Saw

```
[PopulateForm] Fyller elKostnad med värde: 1234
The specified value "1234,00" cannot be parsed, or is out of range.
```

## Root Cause - JavaScript Locale Conversion

This is a **subtle browser behavior** issue:

### What Was Happening

1. Database stored: `1234` (numeric)
2. We formatted it: `(1234).toFixed(2)` → `"1234.00"` (punkt, correct!)
3. We tried to set: `el.value = "1234.00"` 
4. **Browser saw this as**: "User is entering a number in Swedish locale"
5. **Browser converted it**: `"1234.00"` → display as `"1234,00"` (komma, Swedish format)
6. **Validator checked**: Does `"1234,00"` match the pattern `^-?\d{1,9}([,.]\d{1,2})?$`?
7. **Pattern says**: Should start with optional minus, then digits... but it saw `"1234,00"` 
8. **Something failed**: Validation error

### Why This Happened

- Our input fields have `inputmode="decimal" pattern="^-?\d{1,9}([,.]\d{1,2})?$"`
- No `type="number"` anymore (we removed that)
- **BUT**: When you use `.value` property in JavaScript to set a value, the browser's locale rules still apply
- HTML5 browsers try to be "helpful" by converting numbers to user's locale format
- In Swedish locale: punkt (.) → komma (,)

### The Solution

**Use `setAttribute("value", ...)` ONLY, never use `.value` for numeric inputs without type.**

```javascript
// ❌ WRONG - causes locale conversion
el.value = "1234.00";  // Browser converts to "1234,00" internally

// ✅ CORRECT - sets the attribute directly, no conversion
el.setAttribute("value", "1234.00");  // Stays as "1234.00"
```

When you use `setAttribute()`:
- You're setting the actual HTML attribute value
- Browser doesn't apply locale conversion
- The value stays as punkt format
- Pattern validation sees the CORRECT format and accepts it

## What Changed in the Code

### Local setVal() (inside populateHuvudmanDetailsForm)
**Before:**
```javascript
el.setAttribute("value", formattedValue);
el.value = formattedValue;  // ← This line was causing conversion!
```

**After:**
```javascript
el.setAttribute("value", formattedValue);
// ← No .value assignment! Stays as-is without locale conversion
console.log(`[setVal LOCAL] Verifiering - getAttribute returnerar: ${el.getAttribute("value")}`);
```

### Global setVal() Function
**Before:**
```javascript
const formatted = num.toFixed(2);
el.setAttribute("value", formatted);
el.value = formatted;  // ← Same problem here
```

**After:**
```javascript
const formatted = num.toFixed(2);
el.setAttribute("value", formatted);
// ← No .value assignment for numeric fields
// Other code still triggers events properly
```

## How to Verify It Works

1. Clear cache: `Ctrl+Shift+Delete`
2. Hard refresh: `Ctrl+Shift+R`
3. Open console: `F12`
4. Load a hovedman with numeric data

### You Should See:
```
[PopulateForm] Fyller elKostnad med värde: 1234
[setVal LOCAL] Setting elKostnad to PUNKT format: 1234.00
[setVal LOCAL] Verifiering - getAttribute returnerar: 1234.00
```

### You Should NOT See:
```
The specified value "1234,00" cannot be parsed
```

## Why This Matters

- **Before:** Numbers were rejected during loading, fields stayed empty
- **After:** Numbers load correctly and display in Swedish format for user
- **Database:** Stores numbers as floating point (123.45)
- **HTML:** Uses punkt format internally (via getAttribute)
- **Display:** Browser shows komma to user (Swedish locale)
- **Validation:** Pattern accepts both formats for user input

## Technical Details

The pattern `^-?\d{1,9}([,.]\d{1,2})?$` accepts BOTH:
- Punkt: `1234.56` (for attribute value, what we set)
- Komma: `1234,56` (what user sees on screen)

So:
- We use `setAttribute("value", "1234.56")` - internal storage with punkt
- Browser displays it as `"1234,56"` to Swedish user
- User can type either `1234.56` or `1234,56` and it works
- When we read it back, we handle both formats with `.replace(",", ".")`

## Files Modified

- **godman_logic.js**
  - Updated local `setVal()` in `populateHuvudmanDetailsForm()` (around line 1908)
  - Updated global `setVal()` function (around line 11072)
  - Removed all `.value = ` assignments for numeric fields
  - Added verification logging to show getAttribute value

## Why We Removed .value Assignment

The `.value` property is for:
- Reading what the user typed
- Setting form fields during user interaction
- JavaScript manipulating form state

It's NOT for:
- Setting the HTML attribute directly
- Avoiding locale-specific formatting
- Ensuring exact value storage

For our use case:
- We need exact punkt format stored
- We should use `setAttribute()` only
- Browser's display layer handles the locale conversion for the user
