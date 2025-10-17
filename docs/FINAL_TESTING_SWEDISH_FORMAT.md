# Final Testing Guide - Swedish Number Format Fix

## Critical Test: Försörjningsstöd (FS) Data Saving

This is the MAIN fix. Hyra already worked, but ElKostnad and other fields were failing.

### Test 1: ElKostnad Saving

1. [ ] Clear cache: `Ctrl+Shift+Delete`
2. [ ] Load page: https://godm.se
3. [ ] Go to: **Försörjningsstöd** tab
4. [ ] In **Generella Kostnader** section:
   - [ ] Find the **"ElKostnad"** (Elkostnad) field
   - [ ] Enter: `111,00` (use komma!)
   - [ ] Verify Spegla syncs to Månadsbudget (should show same value)
5. [ ] Click: **Spara** (Save) button
6. [ ] Check result:
   - [ ] ✅ SUCCESS: "Uppgifter för försörjningsstöd har sparats"
   - [ ] ❌ FAILED: Error message appears

### Test 2: Multiple Fields with Swedish Format

1. [ ] Enter in **Generella Kostnader**:
   - [ ] Hyra: `9 265` (with space)
   - [ ] Elkostnad: `111,00` (with komma)
   - [ ] Hemförsäkring: `1 234,56` (komma + space)
   - [ ] Läkarvård: `500,00` (komma)
2. [ ] Click: **Spara**
3. [ ] Result:
   - [ ] ✅ All fields save correctly
   - [ ] Console shows no NaN errors
   - [ ] Values appear in Månadsbudget section

### Test 3: Verify Spegla Sync Works

1. [ ] After entering values above
2. [ ] Scroll down to **Månadsbudget** section
3. [ ] Check each value matches **Generella Kostnader**:
   - [ ] Hyra: 9265 ✓
   - [ ] Elkostnad: 111 ✓
   - [ ] Hemförsäkring: 1234.56 ✓

### Test 4: Reload and Verify Persistence

1. [ ] Click: **Save** button (again)
2. [ ] Hard refresh: `Ctrl+Shift+R`
3. [ ] Wait for page to load
4. [ ] Select same person from dropdown
5. [ ] Values should still be there:
   - [ ] ✅ Hyra: 9265
   - [ ] ✅ Elkostnad: 111
   - [ ] ✅ Hemförsäkring: 1234.56

## Secondary Tests: Årsräkning (Annual Account)

### Test 5: Arvode Calculation with Swedish Numbers

1. [ ] Go to **Årsräkning** tab
2. [ ] Find **"Arvode"** button/section
3. [ ] Enter in Arvode modal:
   - [ ] Förvalta: `10,50`
   - [ ] Sorja: `20,00`
   - [ ] Extra: `5,75`
4. [ ] Click: **Beräkna** (Calculate)
5. [ ] Check:
   - [ ] ✅ No NaN in calculations
   - [ ] ✅ Results show correct sums
   - [ ] ✅ Tax calculations work

### Test 6: Adjustment Modal

1. [ ] In Årsräkning tab
2. [ ] Find an entry and click: **Justera** (Adjust)
3. [ ] In adjustment modal, enter:
   - [ ] Original: `1 000,00`
   - [ ] Tax: `250,00`
   - [ ] Housing: `500,00`
4. [ ] Click: **Beräkna justerad bruttoinkomst**
5. [ ] Check:
   - [ ] ✅ Calculation works
   - [ ] ✅ Results displayed correctly

## Success Criteria

All of these must be true:

| Test | Success Indicator |
|------|-------------------|
| **ElKostnad Save** | Alert: "Uppgifter för försörjningsstöd har sparats" |
| **Multiple Fields** | All values save without errors |
| **Spegla Sync** | Values appear in Månadsbudget instantly |
| **Persistence** | Values still there after reload |
| **No NaN Errors** | Console shows no NaN in calculations |
| **Arvode Calc** | Calculations work with Swedish format |
| **Adjustment Modal** | Adjustments calculate correctly |

## Console Checks

Open DevTools: `F12` → **Console** tab

### You should NOT see:
```
❌ NaN in any calculation
❌ "cannot be parsed" errors
❌ undefined values
❌ parseFloat returning NaN
```

### You should see:
```
✅ [GODMAN_LOGIC] Script loaded - VERSION: 2025-10-16-FIXED-EVENTS-V3
✅ Normal console output, no numeric errors
```

## Quick Smoke Test (2 minutes)

1. Load page
2. Enter `"1 234,56"` in ElKostnad
3. Click Save
4. If it says "sparats" (saved) → **FIXED** ✅
5. If it fails silently → **NOT FIXED** ❌

## If Something Still Doesn't Work

Check:

1. **Browser Cache** - Did you clear it? Try again:
   - `Ctrl+Shift+Delete`
   - Select: "Cached images and files"
   - Delete

2. **Version Number** - Does console show `2025-10-16-FIXED-EVENTS-V3`?
   - If no: cache not cleared
   - If yes: new code is running

3. **Which field fails?**
   - ElKostnad specifically? → Check normalizeNumericInput function
   - Arvode fields? → Check beraknaArvode function
   - Adjustment fields? → Check calculateAdjustedGrossIncome

4. **Error message in console?**
   - Copy exact error
   - Check which line it's from
   - Report with test results

## Report Back

Once you've tested, please confirm:

1. Does ElKostnad with `"111,00"` save? YES / NO
2. Does Spegla sync work? YES / NO
3. Do values persist after reload? YES / NO
4. Can you calculate Arvode with `"10,50"`? YES / NO
5. Any errors in console? YES / NO (describe if yes)

This fix is **critical** for the FS workflow, as users will always input numbers in Swedish format!
