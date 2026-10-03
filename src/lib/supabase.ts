import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://vbkfmiadtdzzifwhyjgx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZia2ZtaWFkdGR6emlmd2h5amd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNTE4NDgsImV4cCI6MjEwNjYyNzg0OH0.qg0f8F86vvINuVnIWzSZ31TOicRFPDhIZUra0mSHYPE';
// Administrative key for full dashboard management operations
export const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZia2ZtaWFkdGR6emlmd2h5amd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA1MTg0OCwiZXhwIjoyMTA2NjI3ODQ4fQ.qt86lLAwzWPCvBE7qHcEUGPHxTFrYYUcMwWzCyoUpmE';

// Default client for queries and Realtime
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
});
