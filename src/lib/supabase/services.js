import supabase from '@/lib/supabase/public'

export async function getAllServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, title, category, short_description, description')
      .order('order_index', { ascending: true })

    if (error) {
      console.info('Error fetching services from Supabase:', error)
      return []
    }

    return data
  } catch (error) {
    console.info('Error fetching services from Supabase:', error)
    return []
  }
}
