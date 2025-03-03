import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mscoanrofiljkfqwoppq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zY29hbnJvZmlsamtmcXdvcHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NjY4NTksImV4cCI6MjA1NjA0Mjg1OX0.eNOlfLkcprXqYJtOV5o6VTYQQtHPO7a8mnPvBDM3jFE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 