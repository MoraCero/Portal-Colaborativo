import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tousvyzsdqfykmqesaiy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_YPuynopy_6D2IGCUmLCkpQ_HKYBVXbT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
