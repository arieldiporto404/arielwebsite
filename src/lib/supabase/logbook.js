import supabase from '@/lib/supabase/public'

export async function getAllLogbook() {
  try {
    const { data, error } = await supabase
      .from('logbook')
      .select('title, date, description, long_description, image_url, image_title, image_description, image_width, image_height')
      .order('date', { ascending: false })

    if (error) {
      console.info('Error fetching logbook from Supabase:', error)
      return []
    }

    return data.map((item) => ({
      title: item.title,
      date: item.date,
      description: item.description,
      long_description: item.long_description,
      image: item.image_url
        ? {
            url: item.image_url,
            title: item.image_title,
            description: item.image_description,
            width: item.image_width,
            height: item.image_height
          }
        : null
    }))
  } catch (error) {
    console.info('Error fetching logbook from Supabase:', error)
    return []
  }
}
