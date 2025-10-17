# CRITICAL: Cache Busting Required

## The Issue

The browser has been **serving old cached JavaScript code**. The console output you're seeing contains log messages that **no longer exist** in the current code:

```
[PopulateForm] Fyller elKostnad med värde: 111  ← This log doesn't exist anymore!
```

This means the server is still sending old code, or the browser cache is extremely persistent.

## What Was Just Updated

1. **godman_logic.js** - Updated version log: `2025-10-16-FIXED-EVENTS-V3`
2. **index.php** - Changed script src from `godman_logic.js?v=<?php echo time(); ?>` to `godman_logic.js?v=20251016v3`

This forces the browser to download a **completely new copy** of the script.

## How to Clear Cache Completely

### Step 1: Close Everything
- [ ] Close ALL browser windows/tabs (including any godm.se tabs)
- [ ] Close the entire browser application completely
- [ ] Wait 10 seconds

### Step 2: Clear Cache Aggressively
While browser is CLOSED:

**Windows:**
- Press `Windows + R`
- Type: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache`
- Delete ALL files in this folder
- Also delete: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Code Cache`

**If using Chrome:**
- Close Chrome completely
- Navigate to: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache`
- Delete entire Cache folder

### Step 3: Reopen Browser
- [ ] Restart browser completely
- [ ] Go to: https://godm.se
- [ ] Press `Ctrl+Shift+R` (hard refresh)
- [ ] Wait for page to fully load

### Step 4: Check Console

Open DevTools: `F12` → Console tab

**You should immediately see:**
```
[GODMAN_LOGIC] Script loaded - VERSION: 2025-10-16-FIXED-EVENTS-V3
```

If you see this version number, the **new code is now loaded**.

## What the New Code Does

1. **Local `setVal()` for numeric fields** - Sets attributes WITHOUT dispatching events
2. **Spegla's `syncValue()`** - Reads values with `getAttribute()` to get point format
3. **No premature event cascade** - Prevents the "cannot be parsed" error chain

## Testing After New Code Loads

Once you see `VERSION: 2025-10-16-FIXED-EVENTS-V3`:

1. [ ] Select a hovedman from dropdown
2. [ ] Wait for form to populate
3. [ ] Check console - should show numeric values loading
4. [ ] **Critically: Look for error "cannot be parsed"**
   - [ ] If GONE: Fix worked! ✅
   - [ ] If STILL THERE: Cache still not cleared, try again

5. [ ] Scroll to "Generella Kostnader" section
6. [ ] Values should be visible (e.g., Hyra: 9265, El: 111)
7. [ ] Edit a value (e.g., change Hyra to 9999)
8. [ ] Scroll down to "Månadsbudget" section
9. [ ] Value should sync instantly: Hyra should also show 9999
10. [ ] No errors in console

## Success Indicators

```
✅ Console shows: VERSION: 2025-10-16-FIXED-EVENTS-V3
✅ No "The specified value "111,00" cannot be parsed" errors
✅ Numbers appear in form fields
✅ Spegla sync works (edit one field, see other update)
✅ No validation errors
```

## If Cache Still Won't Clear

**Nuclear option - restart computer:**
1. Save all work
2. Restart Windows completely
3. All OS-level caches will clear
4. Open browser fresh
5. Go to godm.se and test

## Why This Matters

Browser caching can be very aggressive. When we upload new code:
- Server may have the new version
- But browser still serves old cached version
- This is why you were still seeing old log messages
- Version query parameter forces browser to fetch fresh copy

The new code should finally prevent the format error!

---

**After doing FULL cache clear and restart, report back:**
- What version number do you see in console?
- Do you still see "cannot be parsed" errors?
- Do numeric values load without errors?
- Does Spegla sync work?
