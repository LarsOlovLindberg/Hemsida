# Debug Report: Numeric Field Format Issue

## Problem Summary
When loading główman details from the database, numeric fields in "Generella Kostnader" are showing this error:
```
The specified value "100,00" cannot be parsed, or is out of range.
```

This only affects fields with `type="number"` attribute. Fields WITHOUT `type="number"` (like Hyra) work fine.

## Root Cause Analysis

### Why Hyra Works
**HTML for Hyra (index.php line 337-342):**
```html
<input id="hyra"
  inputmode="decimal"
  pattern="^-?\d{1,9}([,.]\d{1,2})?$" />
```

**Key difference:** NO `type="number"` attribute!
- Uses `inputmode="decimal"` for user guidance
- Uses regex `pattern` that accepts BOTH komma (,) and punkt (.)
- Browser validation: Pattern allows `100,00` format

### Why Other Fields Fail
**HTML for elKostnad, hemforsakring, etc. (index.php line 342+):**
```html
<input type="number" step="0.01" id="elKostnad" />
```

**Key difference:** HAS `type="number"` attribute
- HTML5 strict validation: requires punkt (.) as decimal separator
- Rejects komma (,) format with browser validation error
- Error message: `The specified value "100,00" cannot be parsed`

## Code Path Analysis

### When values load from database:

1. **Database** → PHP API returns: `100.00` (numeric type in JSON)
2. **JavaScript** receives via `getCI(hm, "EL_KOSTNAD")`
3. **setVal()** is called with `value=100.00, isNumeric=true, isFloat=true`
4. **setVal() logic** (lines 1908-1930):
   - Converts value to string: `"100.00"`
   - Replaces any komma with punkt: `"100.00"`
   - Parses as float: `100`
   - **Checks `el.type === "number"`**:
     - ✅ If TRUE: Uses `toFixed(2)` → outputs `"100.00"`  ← Should work!
     - ❌ If FALSE: Uses `.replace(".", ",")` → outputs `"100,00"` ← Causes error!

## Debug Changes Made

Added console logging to `setVal()` function (godman_logic.js lines 1908-1930):
```javascript
console.log(`[setVal DEBUG] ID: ${id}, el.type: "${el.type}", inputValue: ${value}, formatted: ${formattedValue}`);
```

## Next Steps to Investigate

### 1. Test Current Fix
- Open browser DevTools (F12)
- Go to Console tab
- Load a huvudman with kostnader filled in
- Look for `[setVal DEBUG]` messages:
  ```
  [setVal DEBUG] ID: elKostnad, el.type: "number", inputValue: 100, formatted: 100.00
  [setVal DEBUG] ID: hyra, el.type: "", inputValue: 100, formatted: 100,00
  ```

### 2. Check Element Type
- If `el.type: "number"` shows for all fields → code should work
- If `el.type: ""` shows → the attribute isn't being read correctly
- If `el.type: "text"` shows → wrong element or attribute override

### 3. Possible Solutions

**Solution A: Remove `type="number"` from all numeric fields (Match Hyra)**
- Make all numeric inputs like Hyra (use pattern validation instead)
- Pros: Accepts both komma and punkt formats, matches user's Swedish expectations
- Cons: Loses browser's built-in numeric validation

**Solution B: Fix format conversion (Current attempt)**
- Ensure `toFixed(2)` always outputs punkt for type="number"
- Pros: Keeps strict validation
- Cons: Users see punkt format, must manually fix their Swedish input

**Solution C: Add pattern validation to all numeric fields**
- Add `pattern="^-?\d{1,9}([,.]\d{1,2})?$"` to all type="number" inputs
- Lets HTML5 accept both formats
- Pros: Best user experience, keeps validation
- Cons: More complex HTML

## Console Check Command
After loading page, paste in console:
```javascript
// Check all numeric input types
document.querySelectorAll('input[type="number"]').forEach(el => {
  console.log(`${el.id}: type="${el.type}", pattern="${el.pattern}"`);
});

// Check if Hyra is different
const hyra = document.getElementById('hyra');
console.log(`hyra: type="${hyra.type}", pattern="${hyra.pattern}"`);
```

## Recommended Next Step
1. ✅ Upload code with debug logging (DONE - deployed to godm.se)
2. **USER ACTION:** Open the app in browser, load a hovedman, check console for `[setVal DEBUG]` messages
3. Share the console output so we can see exactly what `el.type` values are
4. Based on that, choose Solution A, B, or C to implement
