import { supabase } from '../lib/supabase';

// Simple migration runner
export const runMigrations = async () => {
  try {
    console.log('🚀 Running database migrations...');
    
    // Health News table
    const healthNewsSQL = `
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
      
      DROP POLICY IF EXISTS "Anyone can read published news" ON public.health_news;
      CREATE POLICY "Anyone can read published news"
      ON public.health_news FOR SELECT
      TO public
      USING (published = true);
    `;
    
    const { error: healthNewsError } = await supabase.rpc('exec_sql', { 
      sql_query: healthNewsSQL 
    });
    
    if (healthNewsError) {
      console.error('❌ Health News migration failed:', healthNewsError);
    } else {
      console.log('✅ Health News table created successfully');
    }
    
    // Support Tickets enhancements
    const supportTicketsSQL = `
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'support_tickets' AND column_name = 'priority'
        ) THEN 
          ALTER TABLE public.support_tickets ADD COLUMN priority text DEFAULT 'normal';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'support_tickets' AND column_name = 'category'
        ) THEN 
          ALTER TABLE public.support_tickets ADD COLUMN category text DEFAULT 'general';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'support_tickets' AND column_name = 'assigned_to'
        ) THEN 
          ALTER TABLE public.support_tickets ADD COLUMN assigned_to uuid references auth.users(id);
        END IF;
      END $$;
      
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
    `;
    
    const { error: supportTicketsError } = await supabase.rpc('exec_sql', { 
      sql_query: supportTicketsSQL 
    });
    
    if (supportTicketsError) {
      console.error('❌ Support Tickets migration failed:', supportTicketsError);
    } else {
      console.log('✅ Support Tickets enhanced successfully');
    }
    
    // Insurance Policies enhancements
    const insuranceSQL = `
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'user_id'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN user_id uuid references auth.users(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'provider_name'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN provider_name text;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'coverage_type'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN coverage_type text;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'start_date'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN start_date timestamp with time zone;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'end_date'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN end_date timestamp with time zone;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'front_image_url'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN front_image_url text;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'back_image_url'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN back_image_url text;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'verified'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN verified boolean DEFAULT false;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'created_at'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN created_at timestamp with time zone DEFAULT now();
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'insurance_policies' AND column_name = 'updated_at'
        ) THEN 
          ALTER TABLE public.insurance_policies ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        END IF;
      END $$;
      
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
    `;
    
    const { error: insuranceError } = await supabase.rpc('exec_sql', { 
      sql_query: insuranceSQL 
    });
    
    if (insuranceError) {
      console.error('❌ Insurance Policies migration failed:', insuranceError);
    } else {
      console.log('✅ Insurance Policies enhanced successfully');
    }
    
    console.log('🎉 All migrations completed!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
};
