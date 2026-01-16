# Search Feature Setup

## Required Supabase Tables

Run the following SQL in your Supabase dashboard to set up the search tracking system:

### 1. Search History Table
```sql
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  result_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_created_at ON public.search_history(created_at DESC);
```

### 2. Search Selections Table
```sql
CREATE TABLE IF NOT EXISTS public.search_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  result_type text NOT NULL,
  result_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_search_selections_user_id ON public.search_selections(user_id);
CREATE INDEX idx_search_selections_created_at ON public.search_selections(created_at DESC);
```

### 3. Trending Searches Function (Optional but recommended)
```sql
CREATE OR REPLACE FUNCTION get_trending_searches(
  days_back integer DEFAULT 7,
  limit_count integer DEFAULT 8
)
RETURNS TABLE(query text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    search_history.query,
    COUNT(*) as count
  FROM public.search_history
  WHERE search_history.created_at >= (now() - (days_back || ' days')::interval)
  GROUP BY search_history.query
  ORDER BY count DESC
  LIMIT limit_count;
$$;
```

### 4. Enable RLS (if needed)
```sql
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON public.search_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.search_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own search selections"
  ON public.search_selections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search selections"
  ON public.search_selections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Features Enabled

✅ **Real-time Search** - Searches across 6 entity types:
- Doctors
- Hospitals
- Ambulances
- Visits
- Emergency Requests
- Users

✅ **Search Tracking** - Automatically tracks:
- Search queries
- Result counts
- Search selections

✅ **Trending Data** - Shows:
- Top searches this week
- Search frequency
- Discovery patterns

✅ **Recent Searches** - Per-user:
- Last 8 searches
- Timestamps
- Quick re-search

## Usage

The search is accessible via:
- **Desktop**: Cmd+K or Ctrl+K → type
- **Mobile**: Tap search icon in bottom bar

The component automatically:
1. Tracks every search query
2. Records which result was selected
3. Aggregates data for trending calculations
4. Shows recent searches for quick access
