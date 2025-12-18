# Intent Parsing Test Guide

## Recent Fix (2025-12-18) - Complete Solution

### The Problem
Duration and other parsed intent values were NOT being applied to the Create Excursion form. User would type "1 hour hike near here" but the form would show default values instead.

### Root Cause
The home screen was NOT parsing user input or passing intent data to the chat screen. The entire intent parsing flow was missing from navigation.

### Complete Fix Applied

**1. Home Screen (`app/(tabs)/index.tsx`)**
- ✅ Import `parseIntent` from intent-parser service
- ✅ Parse user input in `handleSendMessage()` before navigation
- ✅ Pass `intentData` as JSON string in route params
- ✅ Changed route to full path: `/(tabs)/chat`
- ✅ Added console logging for debugging

**2. Chat Screen (`app/(tabs)/chat.tsx`)**
- ✅ Import and use `useLocalSearchParams()` hook
- ✅ Read `intentData` parameter and parse JSON
- ✅ Apply parsed values to form state (duration, activities, goals, risk)
- ✅ Block user preferences from overwriting intent values
- ✅ Added green banner showing parsed request
- ✅ Added console logging for debugging

### Testing in Browser Console
Open browser DevTools and look for these console messages:
1. `Home screen - Parsed intent:` shows what was parsed
2. `Home screen - Navigating with intentData:` shows JSON being passed
3. `Received params:` shows what chat screen received
4. `Applying intent to form:` shows the intent object
5. `Setting duration to:` shows duration value being applied

## Test Cases

### Test 1: "1 hour hike near here"
**Expected Flow:**
1. Type in home screen input: `1 hour hike near here`
2. Should route to Create Excursion (not chat)
3. Form should show:
   - Duration: 1 hour (60 min)
   - Activity: "Hiking" selected
   - Banner: "Using your request: 60 min • Hiking • near here"
4. Places search limited to 3 miles, max 10 results
5. Create excursion → AI should acknowledge "1-hour hiking excursion near you"
6. Detail page shows "YOUR REQUEST" card with: "60 min • Hiking • near here"

---

### Test 2: "90 min walking nearby"
**Expected Flow:**
1. Type: `90 min walking nearby`
2. Form pre-fills:
   - Duration: 1.5 hours (90 min)
   - Activity: "Walking" selected
   - Banner shows "90 min • Walking • nearby"
3. Places search limited to 4 miles
4. Detail page shows parsed request

---

### Test 3: "within 3 miles hiking"
**Expected Flow:**
1. Type: `within 3 miles hiking`
2. Form pre-fills:
   - Activity: "Hiking" selected
   - Banner shows "Hiking • within 4.8 km"
3. Places hard-filtered to 3 miles (4.8 km)
4. Only shows places within that radius

---

### Test 4: "30 minutes meditation for stress"
**Expected Flow:**
1. Type: `30 minutes meditation for stress`
2. Form pre-fills:
   - Duration: 30 min
   - Activity: "Meditation" selected
   - Therapeutic: "Stress Relief" selected
   - Banner shows parsed elements
3. AI creates calming, stress-focused meditation excursion

---

### Test 5: "How does nature help with anxiety?" (Non-excursion)
**Expected Flow:**
1. Type conversational query
2. Routes to general chat (NOT excursion form)
3. No parsing applied, normal chat interaction

---

## Validation Checklist

- [ ] Parser extracts duration correctly (hour/min variants)
- [ ] Parser identifies activities (Hiking, Walking, Meditation, etc.)
- [ ] Proximity bias reduces search radius appropriately
- [ ] Form pre-populates with parsed values
- [ ] Banner shows on Create Excursion when confidence ≥ 0.55
- [ ] AI acknowledges user's original request in description
- [ ] Detail page displays "YOUR REQUEST" card
- [ ] intent_snapshot saved to database
- [ ] Conversational queries still route to chat
- [ ] Max 10 places returned for performance

---

## Database Verification

```sql
-- Check that intent_snapshot is being saved
SELECT
  id,
  title,
  intent_snapshot->>'rawText' as original_request,
  intent_snapshot->>'durationMinutes' as parsed_duration,
  intent_snapshot->>'activities' as activities,
  intent_snapshot->>'proximityBias' as proximity
FROM excursions
WHERE intent_snapshot IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## Quick Test Command

```bash
# Type check passes
npm run typecheck

# No intent-related errors
npm run typecheck 2>&1 | grep -i intent
```
