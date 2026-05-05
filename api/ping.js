import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { error } = await supabase
    .from('tracker_state')
    .select('id')
    .limit(1)

  if (error) {
    return res.status(500).json({ status: 'error', message: error.message })
  }
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
}
