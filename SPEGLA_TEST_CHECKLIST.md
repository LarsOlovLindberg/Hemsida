# Spegla Fix - Test Checklist

## Prerequisites
- [ ] Clear browser cache: `Ctrl+Shift+Delete`
- [ ] Hard refresh page: `Ctrl+Shift+R`
- [ ] Open DevTools console: `F12` → Console tab

## Step 1: Load a Huvudman
- [ ] Go to "Huvudman" tab
- [ ] Select a hovedman from dropdown (e.g., the one with data: 900810-2312)
- [ ] Wait for data to load (~2 seconds)

## Step 2: Check Console Logs (First Sign)
In the console, look for these SUCCESS logs:
```
[Spegla] ✓ Konfigurerat hyra → ov-HYRA
[Spegla] ✓ Konfigurerat elKostnad → ov-EL_KOSTNAD
[Spegla] ✓ Konfigurerat hemforsakring → ov-HEMFORSAKRING
... (should see ~30+ such messages)
[Spegla] Alla kostnader & inkomster är nu speglade mellan Generella kostnader och Månadsbudget
```

### ❌ If You See This Instead:
```
[Spegla] Fältet hyra eller ov-HYRA hittades inte
[Spegla] Fältet elKostnad eller ov-EL_KOSTNAD hittades inte
```
**Then the fix did NOT work.** Possible causes:
- Browser still has old cached JavaScript (try: `Ctrl+F5` or clear more aggressive)
- Server still serving old file (try: wait 5 minutes, refresh)
- Field IDs have changed in HTML

## Step 3: Check Loaded Values (Second Sign)
In the "Generella Kostnader" section, you should see:
- [ ] Hyra: 7180
- [ ] El Kostnad: 160.86
- [ ] Hemförsäkring: 111.83
- [ ] Läkarvård: 207.5
- [ ] Bredband: 528
- [ ] Pension/Livränta/Sjuk/Aktivitet: 13275
- [ ] Bostadsbidrag: 5703

(These are from test person 900810-2312)

## Step 4: Test Live Sync (Third Sign - The Real Test)
1. [ ] Click into "Hyra" field (in Generella Kostnader)
2. [ ] Change the value from 7180 to 8000 (just for testing)
3. [ ] Tab out of the field

### Expected: 
- [ ] The Hyra field still shows 8000
- [ ] **Scroll down to Månadsbudget section**
- [ ] [ ] The "Hyra" field in Månadsbudget ALSO shows 8000 (this is the sync working!)
- [ ] Console shows: `[Spegla] hyra → ov-HYRA: 8000`

### If This Works ✓
**The Spegla synchronization is working!**
- Values from "Generella Kostnader" are now mirrored to "Månadsbudget"
- PDF generation will now work with correct values
- Data persistence is now properly synchronized

### If This Doesn't Work ❌
The fields might have different IDs in the actual HTML. Need to:
1. Inspect HTML in DevTools (right-click field → Inspect)
2. Check the actual `id` attribute
3. Update the mapping in `initializeSpeglaSync()`

## Step 5: Test Save and Reload
1. [ ] Change Hyra back to 7180
2. [ ] Click "Spara" (Save) button
3. [ ] Wait for success message
4. [ ] Reload page: `Ctrl+R`
5. [ ] Select the same hovedman again
6. [ ] [ ] Check that Hyra is still 7180 (it saved and reloaded correctly)

## Step 6: Format Check
The console should show NO errors like:
```
❌ The specified value "111,00" cannot be parsed
❌ Invalid value
```

If you see format errors, that's a separate issue that also needs fixing.

## Summary

| Test | Expected | If Passes | If Fails |
|------|----------|-----------|---------|
| Console shows "Konfigurerat" for all fields | All fields found ✓ | Fix working | Check cache, wait 5 min |
| Values appear in Generella Kostnader | Numbers visible (7180, 160.86, etc) | Data loading works ✓ | Database or API issue |
| Månadsbudget updates when editing | Value syncs live | Spegla working ✓ | Field IDs might be wrong |
| Save works and values persist | Reload shows saved values | Data saved correctly ✓ | Database save issue |
| No format errors in console | No "cannot be parsed" errors | Format correct ✓ | Komma vs punkt issue |

If you pass all 5 tests, the system is working! 🎉

---

**Report back with:**
1. Do you see the ✓ "Konfigurerat" messages in console?
2. Do values appear in the form?
3. Does Månadsbudget update when you edit Generella Kostnader?
4. Any errors in console?
