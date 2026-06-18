# Auto-Generate Username from Email
## Migration Reference

**File**: `supabase/migrations/20260122160000_auto_generate_username.sql`  
**Purpose**: Ensure all profiles have usernames by auto-generating from email

---

## What It Does

### 1. **Backfills Existing NULL Usernames** ✅
Scans all profiles with `username IS NULL` and generates username from their email address.

### 2. **Auto-Generates for New Profiles** ✅
Adds a `BEFORE INSERT` trigger that automatically sets username from email if not provided.

### 3. **Handles Duplicates** ✅
If username already exists, appends a number (e.g., `johndoe`, `johndoe1`, `johndoe2`).

---

## Username Generation Logic

### Algorithm:

```javascript
1. Extract email prefix (before @)
   "john.doe@example.com" → "john.doe"

2. Convert to lowercase
   "john.doe" → "john.doe"

3. Remove special characters (keep only a-z, 0-9)
   "john.doe" → "johndoe"

4. Ensure minimum 3 characters
   "a@b.com" → "a" → "usera"

5. Check uniqueness, add suffix if needed
   "johndoe" exists? → "johndoe1"
   "johndoe1" exists? → "johndoe2"
```

---

## Examples

| Email | Generated Username |
|-------|-------------------|
| `john.doe@example.com` | `johndoe` |
| `dr..robert.taylor.doc@ivisit.bg` | `drroberttaylordoc` |
| `test123@gmail.com` | `test123` |
| `halodyrane@gmail.com` | `halodyrane` |
| `a@b.com` | `usera` |
| `john-smith@mail.com` | `johnsmith` |
| `user_name@site.org` | `username` |

### Duplicate Handling:

| Email | Username (in order) |
|-------|-------------------|
| `john@example.com` | `john` |
| `john@different.com` | `john1` |
| `john@another.org` | `john2` |

---

## What Gets Updated

### Profiles Table:

**Before Migration**:
```sql
id                  | email                    | username
--------------------|--------------------------|----------
e1c66a93...         | dr..robert.taylor...     | NULL
a1d6fbe8...         | dr..jennifer.lopez...    | NULL
e887d504...         | halodyrane@gmail.com     | halodyrane (already set)
```

**After Migration**:
```sql
id                  | email                    | username
--------------------|--------------------------|----------
e1c66a93...         | dr..robert.taylor...     | drroberttaylordoc ✅
a1d6fbe8...         | dr..jennifer.lopez...    | drjenniferlopezdoc ✅
e887d504...         | halodyrane@gmail.com     | halodyrane (unchanged)
```

---

## Triggers Added

### 1. `on_profile_set_username` (BEFORE INSERT)

**When**: New profile is created  
**Action**: If `username` is NULL, generate from email

**Example**:
```sql
-- User signup with email only
INSERT INTO profiles (id, email) 
VALUES ('new-uuid', 'newuser@example.com');

-- Trigger fires automatically
-- Result: username = 'newuser'
```

---

## Functions Added

### `generate_username_from_email(email_input TEXT)`

**Purpose**: Extract and sanitize username from email with uniqueness guarantee

**Input**: `john.doe@example.com`  
**Output**: `johndoe` (or `johndoe1` if duplicate)

**Usage**:
```sql
SELECT generate_username_from_email('test@example.com');
-- Returns: 'test'

SELECT generate_username_from_email('a@b.com');
-- Returns: 'usera' (enforced min 3 chars)
```

---

## Special Cases

### 1. **Email with Multiple Dots**
```
Input:  dr..robert.taylor.doc@ivisit.bg
Output: drroberttaylordoc
```

### 2. **Very Short Email Prefix**
```
Input:  a@example.com
Output: usera (enforced minimum)
```

### 3. **Email with Numbers**
```
Input:  user123@site.com
Output: user123
```

### 4. **Email with Special Characters**
```
Input:  john-doe_test@mail.com
Output: johndoetest
```

### 5. **No Email (Fallback)**
```
Input:  profile with no email
Output: user12345678 (uses id prefix)
```

---

## Testing

### After Running Migration:

1. **Check backfill results**:
```sql
SELECT id, username, 
  (SELECT email FROM auth.users WHERE id = profiles.id) as email
FROM profiles
WHERE username IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

2. **Test auto-generation** (create new user):
```sql
-- This would happen via signup, but you can test:
INSERT INTO auth.users (email) VALUES ('testuser@example.com');
-- Profile trigger will auto-generate username: 'testuser'
```

3. **Check for duplicates**:
```sql
SELECT username, COUNT(*) 
FROM profiles 
GROUP BY username 
HAVING COUNT(*) > 1;
-- Should return 0 rows (no duplicates)
```

---

## User Experience

### Before Migration:
- ❌ Some users have NULL username
- ❌ Can't mention users without username
- ❌ Profile displays look incomplete

### After Migration:
- ✅ All users have unique usernames
- ✅ Can mention users: `@johndoe`
- ✅ Profile URLs work: `/profile/johndoe`
- ✅ New signups auto-generate username
- ✅ Users can change username later if desired

---

## Customization Options

### Change Minimum Length:
```sql
-- In generate_username_from_email function
IF LENGTH(base_username) < 5 THEN  -- Change 3 to 5
  base_username := 'user' || base_username;
END IF;
```

### Change Character Filtering:
```sql
-- Keep hyphens and underscores:
base_username := REGEXP_REPLACE(base_username, '[^a-z0-9_-]', '', 'g');

-- Or keep only letters (no numbers):
base_username := REGEXP_REPLACE(base_username, '[^a-z]', '', 'g');
```

### Change Duplicate Suffix Format:
```sql
-- Use underscore instead of number:
final_username := base_username || '_' || counter::TEXT;
-- Result: johndoe_1, johndoe_2
```

---

## Expected Migration Output

When you run this in Supabase SQL Editor:

```
NOTICE: Backfilled username for profile e1c66a93...: dr..robert.taylor.doc@ivisit.bg → drroberttaylordoc
NOTICE: Backfilled username for profile a1d6fbe8...: dr..jennifer.lopez.doc@ivisit.bg → drjenniferlopezdoc
NOTICE: Backfilled username for profile 97daa328...: dr..david.kim.doc@ivisit.bg → drdavidkimdoc
...
NOTICE: ✅ Backfilled 15 usernames from email

NOTICE: 
═══════════════════════════════════════════════════════════════
  USERNAME GENERATION REPORT
═══════════════════════════════════════════════════════════════

Total Profiles:           23
Profiles with Username:   23 (100.0%)
Profiles without Username: 0

═══════════════════════════════════════════════════════════════
  MIGRATION COMPLETE ✅
═══════════════════════════════════════════════════════════════
```

---

## Next Steps

After running this migration:

1. **Verify**: Check that all profiles have usernames
2. **Test**: Create a new user and verify username auto-generates
3. **UI Update**: Show username in profile displays
4. **Features**: Enable @mentions, profile URLs, etc.

---

## Rollback (If Needed)

To remove auto-generation (not recommended):

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS on_profile_set_username ON public.profiles;

-- Drop function
DROP FUNCTION IF EXISTS public.generate_username_from_email(TEXT);

-- Note: This won't remove already-generated usernames
-- To clear them:
UPDATE profiles SET username = NULL WHERE username LIKE '%@%';
```

---

## Best Practices

### ✅ DO:
- Run this migration early (before users notice missing usernames)
- Test in staging first
- Keep username editable (let users change it later)
- Show username in profile UI

### ❌ DON'T:
- Don't make username immutable (users should be able to change it)
- Don't rely on username format (it's auto-generated, not validated)
- Don't use username for authentication (use email)

---

**Status**: Ready to run ✅  
**Risk Level**: Low (non-destructive, only fills NULL values)  
**Estimated Time**: 10-30 seconds depending on profile count  
**Reversible**: Yes (can drop triggers, usernames remain)

