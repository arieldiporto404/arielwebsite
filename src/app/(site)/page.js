import Link from 'next/link'
import { Suspense } from 'react'

import { FloatingHeader } from '@/components/floating-header'
import { PageTitle } from '@/components/page-title'
import { ScreenLoadingSpinner } from '@/components/screen-loading-spinner'
import { ScrollArea } from '@/components/scroll-area'
import { Button } from '@/components/ui/button'
import { ServicesSection } from '@/components/services-section'
import { WritingList } from '@/components/writing-list'
import { getAllPosts } from '@/lib/contentful'
import { getAllServices } from '@/lib/supabase/services'
import { getItemsByYear, getSortedPosts } from '@/lib/utils'

async function fetchData() {
  const [allPosts, services] = await Promise.all([getAllPosts(), getAllServices()])
  const sortedPosts = getSortedPosts(allPosts)
  const items = getItemsByYear(sortedPosts)
  return { items, services }
}

export default async function Home() {
  const { items, services } = await fetchData()

  return (
    <ScrollArea useScrollAreaId>
      <FloatingHeader scrollTitle="Onur Şuyalçınkaya" />
      <div className="content-wrapper">
        <div className="content">
          <PageTitle title="Home" className="lg:hidden" />
          <div className="flex flex-col-reverse items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-4">
              <p>
                Ciao 👋 I'm Onur (meaning "Honour" in English), a software engineer, dj, writer, and minimalist based in
                Amsterdam, The Netherlands.
              </p>
              <p>
                I develop things as a Senior Frontend Software Engineer. Previously, I worked as a Senior Frontend
                Software Engineer at heycar, Frontend Software Engineer at Yemeksepeti, Fullstack Software Engineer at
                Sistas, Mobile Developer at Tanbula, and Specialist at Apple.
              </p>
            </div>
            <img
              src="/assets/image.png"
              alt="Ariel Di Porto"
              width={300}
              height={300}
              className="size-[300px] shrink-0 rounded-2xl object-cover"
              // eslint-disable-next-line react/no-unknown-property
              nopin="nopin"
            />
          </div>
          <ServicesSection services={services} calLink="https://cal.com/it/" />
          <Button asChild variant="link" className="inline px-0">
            <Link href="/writing">
              <h2 className="mt-8 mb-4">Writing</h2>
            </Link>
          </Button>
          <Suspense fallback={<ScreenLoadingSpinner />}>
            <WritingList items={items} header="Writing" />
          </Suspense>
        </div>
      </div>
    </ScrollArea>
  )
}
