import { supabase } from '../lib/supabase';

// Simple migration runner using direct Supabase operations
export const runSimpleMigrations = async () => {
  try {
    console.log('🚀 Running simple database migrations...');
    
    // Test if health_news table exists by trying to select from it
    const { data: healthNewsTest, error: healthNewsError } = await supabase
      .from('health_news')
      .select('id')
      .limit(1);
    
    if (healthNewsError && healthNewsError.code === 'PGRST116') {
      console.log('❌ health_news table does not exist, creating...');
      
      // Create table manually using raw SQL through supabase.sql
      // Since we can't use exec_sql, we'll need to create tables manually
      console.log('⚠️  Please run the following SQL manually in Supabase SQL Editor:');
      console.log(`
-- Create health_news table
CREATE TABLE IF NOT EXISTS public.health_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text NOT NULL,
  category text NOT NULL,
  icon text,
  url text,
  description text,
  content text,
  published boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.health_news ENABLE ROW LEVEL SECURITY;

-- Admin policies
DROP POLICY IF EXISTS "Admins can do anything" ON public.health_news;
CREATE POLICY "Admins can do anything"
ON public.health_news FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Public policies
DROP POLICY IF EXISTS "Anyone can read published news" ON public.health_news;
CREATE POLICY "Anyone can read published news"
ON public.health_news FOR SELECT
TO public
USING (published = true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_news;
      `);
    } else {
      console.log('✅ health_news table exists');
    }
    
    // Test support_tickets columns
    const { data: supportTest, error: supportError } = await supabase
      .from('support_tickets')
      .select('id, priority, category, assigned_to')
      .limit(1);
    
    if (supportError && supportError.message.includes('column') && supportError.message.includes('priority')) {
      console.log('❌ support_tickets table missing columns');
      console.log('⚠️  Please run the following SQL manually in Supabase SQL Editor:');
      console.log(`
-- Add missing columns to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to uuid references auth.users(id);

-- Add admin policies
DROP POLICY IF EXISTS "Admins can read all tickets" ON public.support_tickets;
CREATE POLICY "Admins can read all tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can update all tickets" ON public.support_tickets;
CREATE POLICY "Admins can update all tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
      `);
    } else {
      console.log('✅ support_tickets table has required columns');
    }
    
    // Test insurance_policies columns
    const { data: insuranceTest, error: insuranceError } = await supabase
      .from('insurance_policies')
      .select('id, user_id, provider_name, coverage_type, start_date, end_date, front_image_url, back_image_url, verified')
      .limit(1);
    
    if (insuranceError && insuranceError.message.includes('column')) {
      console.log('❌ insurance_policies table missing columns');
      console.log('⚠️  Please run the following SQL manually in Supabase SQL Editor:');
      console.log(`
-- Add missing columns to insurance_policies
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS provider_name text;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS coverage_type text;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS front_image_url text;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS back_image_url text;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add admin policies
DROP POLICY IF EXISTS "Admins can read all policies" ON public.insurance_policies;
CREATE POLICY "Admins can read all policies"
ON public.insurance_policies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can update all policies" ON public.insurance_policies;
CREATE POLICY "Admins can update all policies"
ON public.insurance_policies FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can insert policies" ON public.insurance_policies;
CREATE POLICY "Admins can insert policies"
ON public.insurance_policies FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Admins can delete policies" ON public.insurance_policies;
CREATE POLICY "Admins can delete policies"
ON public.insurance_policies FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR auth.uid() = user_id
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_policies;
      `);
    } else {
      console.log('✅ insurance_policies table has required columns');
    }
    
    console.log('🎉 Migration check completed!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
};
