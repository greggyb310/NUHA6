# Intent Parsing Test Guide

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
