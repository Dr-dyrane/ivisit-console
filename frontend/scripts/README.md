# Supabase Schema Inspector Scripts

Three ways to inspect your Supabase database schema. Choose based on your preference.

## 1. 🚀 **SQL Editor (Easiest)**

### `inspect-schema.sql`

**No setup required!** Just copy-paste into Supabase SQL Editor.

**Steps:**
1. Go to your Supabase project: https://app.supabase.com
2. Click **"SQL Editor"** in left sidebar
3. Click **"New Query"**
4. Copy entire contents of `inspect-schema.sql`
5. Paste and click **"Run"**

**What it shows:**
- ✅ All tables with column counts and sizes
- ✅ Detailed schema (columns, types, nullability)
- ✅ Row counts per table
- ✅ Indexes and primary keys
- ✅ Foreign key relationships

**Advantages:**
- No dependencies
- Fastest to run
- Can save queries for later

---

## 2. 💻 **CLI Interactive (Node.js)**

### `inspect-schema-cli.js`

Interactive terminal prompts for credentials.

**Prerequisites:**
```bash
npm install @supabase/supabase-js dotenv
```

**Steps:**
```bash
node scripts/inspect-schema-cli.js
```

**It will prompt you for:**
1. Supabase URL (find in Settings → API)
2. Service Role Key or Anon Key

**Advantages:**
- Interactive prompts
- Pretty formatted output
- Shows row counts
- Error handling

---

## 3. 🛠️ **Auto from .env (Node.js)**

### `inspect-supabase-schema.js`

Reads credentials from `.env` file automatically.

**Prerequisites:**
```bash
npm install @supabase/supabase-js dotenv
```

**Ensure `.env` has:**
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_key_here
```

**Steps:**
```bash
node scripts/inspect-supabase-schema.js
```

**Output:**
- Creates `supabase-schema.json` in scripts folder
- Displays schema in terminal
- Includes sample rows from each table

**Advantages:**
- Uses existing .env
- Saves JSON for reference
- Shows sample data

---

## 4. 🐚 **Shell Script (Unix/Mac/WSL)**

### `inspect-schema.sh`

For bash/shell environments (Linux, macOS, or WSL on Windows).

**Prerequisites:**
- `curl` (usually pre-installed)
- `jq` (optional, for formatting): `brew install jq` (Mac) or `apt-get install jq` (Linux)

**Steps:**
```bash
chmod +x scripts/inspect-schema.sh
./scripts/inspect-schema.sh
```

**Advantages:**
- No Node.js required
- Pure REST API calls
- Portable

---

## 📊 **What You'll Get**

From any script, you'll see your database structure:

```
TABLE: profiles
────────────────────────────────────────────────────────────
  Column 1          | Data Type            | Constraint
  id                | uuid                 | NOT NULL
  email             | text                 | NOT NULL
  role              | text                 | NULL
  created_at        | timestamp with tz    | NOT NULL
  
📊 Row count: 24
```

---

## 🔑 **Finding Your Credentials**

### Supabase URL & Anon Key:
1. Go to https://app.supabase.com
2. Click your project
3. Click **"Settings"** → **"API"**
4. Copy **Project URL** and **anon (public)** key

### Service Role Key (if needed):
1. Same location as above
2. Copy **service_role (secret)** key
3. ⚠️ Keep this secret! Don't commit to git

---

## 💡 **Common Queries**

Once you know your schema, use these to feed proper data:

### Get all tables:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

### Get specific table structure:
```sql
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = 'hospitals' AND table_schema = 'public';
```

### Count rows in table:
```sql
SELECT COUNT(*) FROM hospitals;
```

### See sample data:
```sql
SELECT * FROM hospitals LIMIT 5;
```

---

## 🎯 **Next Steps**

Once you have the schema, update your services:

1. **Check data types** - Match with TypeScript interfaces
2. **Note relationships** - Foreign keys for joins
3. **Review row counts** - For pagination
4. **Update PageDataContext** - Feed correct queries
5. **Create TypeScript interfaces** - One per table

---

## ❓ **Troubleshooting**

**"Invalid API key"**
- Copy full anon key from Supabase dashboard
- Paste without quotes in .env

**"Invalid URL"**
- Ensure URL format: `https://xxx.supabase.co`
- No trailing slash

**"No tables found"**
- Check you're in `public` schema
- Verify API key has read access

---

## 📝 **Example Output**

```json
{
  "hospitals": {
    "columns": [
      {
        "name": "id",
        "type": "uuid",
        "nullable": false,
        "default": "gen_random_uuid()"
      },
      {
        "name": "name",
        "type": "text",
        "nullable": false,
        "default": null
      }
    ]
  }
}
```
