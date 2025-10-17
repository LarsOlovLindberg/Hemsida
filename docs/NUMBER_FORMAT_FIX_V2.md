# Complete Number Format Fix - Event Dispatching

## The Real Problem Discovered

The error `"1245,00" cannot be parsed` was NOT just from setting the value. It was from the **event dispatching cascade**:

1. ✅ We set: `el.setAttribute("value", "1245.00")` (punkt, correct)
2. ✅ Value is stored correctly in the HTML attribute
3. ❌ We dispatched: `el.dispatchEvent(new Event("input"))`
4. ❌ Spegla listened to "input" and ran `syncValue()`
5. ❌ Spegla read: `generalField.value` 
6. ❌ Browser returned: `"1245,00"` (komma, because of Swedish locale!)
7. ❌ Spegla tried to set: `monthlyField.value = "1245,00"`
8. ❌ monthlyField had `pattern="^-?\d{1,9}([,.]\d{1,2})?$"`
9. ❌ Browser validator saw komma and...validation error somewhere in the flow

## The Two-Part Solution

### Part 1: Fix Spegla's syncValue Function

When Spegla reads the value to sync, it must use `getAttribute()` instead of `.value`:

```javascript
const syncValue = () => {
  // ❌ WRONG: Browser returns komma format
  monthlyField.value = generalField.value;
  
  // ✅ CORRECT: Get raw punkt format
  const rawValue = generalField.getAttribute("value") || generalField.value;
  monthlyField.setAttribute("value", rawValue);
  monthlyField.value = rawValue;
};
```

This ensures we copy the punkt format value, not the localized komma format.

### Part 2: Don't Dispatch Events for Numeric Fields During Load

The simplest solution: **don't fire input/change events when loading numeric values from database**:

```javascript
else if (isNumeric) {
  // ... set the attribute ...
  // VIKTIGT: Trigga INTE events för numeriska fält under initial load
  shouldTriggerEvents = false;  // ← Prevent event dispatch
}
```

This prevents Spegla from even trying to sync during the problematic initial load phase.

**After all form fields are loaded:**
- User manually edits a field → "input" event fires
- Spegla listener picks it up
- Reads with `getAttribute("value")` to get punkt format
- Syncs correctly to monthlyField

## The Complete Flow Now

```
1. Load data from database
   ↓
2. setVal() for numeric fields:
   - Set with setAttribute("value", "1245.00")
   - DON'T dispatch events
   ↓
3. Form is fully populated, no premature event cascades
   ↓
4. User edits a field manually
   ↓
5. Browser fires "input" event
   ↓
6. Spegla's syncValue() runs:
   - Reads: getAttribute("value") → "1245.00" (punkt)
   - Sets: monthlyField with setAttribute + .value
   - No error!
```

## Why This Works

- **During initial load:** No events means Spegla doesn't interfere
- **User edits:** Events work normally, Spegla uses getAttribute to get correct format
- **Save:** System has punkt format internally, komma displayed to user
- **Validation:** Pattern accepts both formats, no errors

## Files Modified

**godman_logic.js:**
- Local `setVal()` - Added: `shouldTriggerEvents = false` for numeric fields
- `initializeSpeglaSync()` - Updated `syncValue()` to use `getAttribute("value")`

## Testing

Clear cache and test:

```
❌ SHOULD NOT SEE:
The specified value "1245,00" cannot be parsed

✅ SHOULD SEE:
[setVal LOCAL] Setting elKostnad to PUNKT format: 1245.00
[setVal LOCAL] Verifiering - getAttribute returnerar: 1245.00
(No event dispatch, no Spegla error)

When you edit a field manually:
✅ SHOULD SEE:
[Spegla] elKostnad → ov-EL_KOSTNAD: 1245.00 (getAttribute)
(Sync happens without errors)
```

## Summary

The fix has two parts:
1. **Spegla's syncValue** - Use `getAttribute()` to read punkt format
2. **setVal() for numeric** - Don't dispatch events during database load

This breaks the error cascade and allows numeric fields to load and sync without validation errors.
