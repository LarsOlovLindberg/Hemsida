# Quick Test - Number Format Fix

## What to Test

After clearing cache and refreshing, load a huvudman and check:

### ✅ Success Signs

**In console, you should see:**
```
[PopulateForm] Fyller elKostnad med värde: 1234
[setVal LOCAL] Setting elKostnad to PUNKT format: 1234.00
[setVal LOCAL] Verifiering - getAttribute returnerar: 1234.00
```

**In the form fields:**
- Values should appear without errors
- Numbers should display in Swedish format (e.g., "1 234,00")
- No validation errors in console

### ❌ Failure Signs (What We Fixed)

**If you still see this:**
```
The specified value "1234,00" cannot be parsed, or is out of range.
```

It means the old code is still running. Try:
1. Clear all browser cache: `Ctrl+Shift+Delete` (select "Cached images and files")
2. Close ALL browser tabs for godm.se
3. Wait 30 seconds
4. Hard refresh: `Ctrl+Shift+R`

## What Each Console Log Means

| Log | Meaning |
|-----|---------|
| `[PopulateForm] Fyller {fieldname} med värde: 1234` | Field is being populated with value from database |
| `[setVal LOCAL] Setting {id} to PUNKT format: 1234.00` | Formatting value to punkt format for storage |
| `[setVal LOCAL] Verifiering - getAttribute returnerar: 1234.00` | Confirming the value was set correctly via setAttribute |
| `[Spegla] ✓ Konfigurerat {id} → {monthlyid}` | Spegla found field and set up synchronization |
| `The specified value "1234,00" cannot be parsed` | ❌ OLD CODE - Browser sees komma format and rejects it |

## How to Use the Form

**When entering values:**
- You can type either `1234.56` (punkt) OR `1234,56` (komma)
- Both are accepted by the pattern
- The system handles both correctly

**What you see:**
- Database: `1234.56` (punkt for internal storage)
- HTML attribute: `1234.56` (punkt)
- Browser display: `1 234,56` (komma, Swedish format)
- User input: Either works!

## If Numbers Still Don't Appear

Check console for errors:

1. **If you see:** `[PopulateForm] Fyller {field} med värde: NULL`
   - Data not in database or API not returning it
   - Run `/api/debug_load_hovedman.php?pnr=...` to check

2. **If you see:** `The specified value "1234,00" cannot be parsed`
   - Old code still running
   - More aggressive cache clear needed

3. **If you see:** `[Spegla] Fältet {id} hittades inte`
   - Fields not being rendered
   - Form HTML issue or main flaw

## Success Checklist

- [ ] Clear browser cache completely
- [ ] Hard refresh page
- [ ] Select a hovedman
- [ ] See "Fyller" messages in console (not "hittades inte")
- [ ] See "Setting... to PUNKT format" messages
- [ ] Numbers appear in form fields
- [ ] No "cannot be parsed" errors
- [ ] Edit a number field and see Månadsbudget update (Spegla sync)

Once all checked: **System is working correctly!** ✅
