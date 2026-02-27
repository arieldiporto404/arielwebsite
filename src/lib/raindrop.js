import 'server-only'

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.RAINDROP_ACCESS_TOKEN}`
}

const options = {
  method: 'GET',
  headers,
  next: {
    revalidate: 60 * 60 * 24 * 2 // 2 days
  }
}

const noStoreOptions = {
  method: 'GET',
  headers,
  cache: 'no-store'
}

const RAINDROP_API_URL = 'https://api.raindrop.io/rest/v1'

export const getBookmarkItems = async (id, pageIndex = 0) => {
  if (!id) throw new Error('Bookmark ID is required')
  if (typeof pageIndex !== 'number' || pageIndex < 0) {
    throw new Error('Invalid page index')
  }

  try {
    const response = await fetch(
      `${RAINDROP_API_URL}/raindrops/${id}?` +
        new URLSearchParams({
          page: pageIndex,
          perpage: 50
        }),
      noStoreOptions
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Failed to fetch bookmark items: ${error.message}`)
    return null
  }
}

export const getBookmarks = async () => {
  try {
    const [rootResponse, childrenResponse] = await Promise.all([
      fetch(`${RAINDROP_API_URL}/collections`, noStoreOptions),
      fetch(`${RAINDROP_API_URL}/collections/childrens`, noStoreOptions)
    ])

    if (!rootResponse.ok) throw new Error(`HTTP error! status: ${rootResponse.status}`)
    if (!childrenResponse.ok) throw new Error(`HTTP error! status: ${childrenResponse.status}`)

    const [rootData, childrenData] = await Promise.all([rootResponse.json(), childrenResponse.json()])

    const all = [...(rootData.items ?? []), ...(childrenData.items ?? [])]
    const unique = Array.from(new Map(all.map((c) => [c._id, c])).values())
    return unique.filter((c) => c.count > 0)
  } catch (error) {
    console.error(`Failed to fetch bookmarks: ${error.message}`)
    return null
  }
}

export const getBookmarksTree = async () => {
  try {
    const [rootResponse, childrenResponse] = await Promise.all([
      fetch(`${RAINDROP_API_URL}/collections`, noStoreOptions),
      fetch(`${RAINDROP_API_URL}/collections/childrens`, noStoreOptions)
    ])

    if (!rootResponse.ok) throw new Error(`HTTP error! status: ${rootResponse.status}`)
    if (!childrenResponse.ok) throw new Error(`HTTP error! status: ${childrenResponse.status}`)

    const [rootData, childrenData] = await Promise.all([rootResponse.json(), childrenResponse.json()])

    const childrenByParent = {}
    ;(childrenData.items ?? []).forEach((child) => {
      const parentId = child.parent?.$id
      if (parentId) {
        if (!childrenByParent[parentId]) childrenByParent[parentId] = []
        childrenByParent[parentId].push(child)
      }
    })

    return (rootData.items ?? [])
      .filter((root) => root.count > 0)
      .map((root) => ({
        ...root,
        children: (childrenByParent[root._id] ?? []).filter((c) => c.count > 0)
      }))
      .sort((a, b) => a.title.localeCompare(b.title))
  } catch (error) {
    console.error('Failed to fetch bookmarks tree:', error.message)
    return []
  }
}

export const getBookmark = async (id) => {
  try {
    const response = await fetch(`${RAINDROP_API_URL}/collection/${id}`, options)
    return await response.json()
  } catch (error) {
    console.info(error)
    return null
  }
}
