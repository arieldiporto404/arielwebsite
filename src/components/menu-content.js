import Link from 'next/link'

import { NavigationLink } from '@/components/navigation-link'
import { LINKS, PROFILES } from '@/lib/constants'

export const MenuContent = () => (
  <div className="flex flex-1 flex-col text-sm">
    <div className="flex flex-col gap-4 pb-4">
      <Link href="/" className="link-card inline-flex items-center gap-2 p-2">
        <img
          src="/assets/image.png"
          alt="Onur Şuyalçınkaya"
          width={40}
          height={40}
          loading="lazy"
          className="rounded-full border shadow-xs"
          // eslint-disable-next-line react/no-unknown-property
          nopin="nopin"
        />
        <div className="flex flex-col">
          <span className="font-semibold tracking-tight">Onur Şuyalçınkaya</span>
          <span className="text-gray-600">Software Engineer</span>
        </div>
      </Link>
      <div className="flex flex-col gap-1">
        {LINKS.map((link, linkIndex) => (
          <NavigationLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            shortcutNumber={linkIndex + 1}
          />
        ))}
      </div>
    </div>
    <div className="flex-1" />
    <hr className="mb-4" />
    <div className="flex flex-col gap-2 pb-4 text-sm">
      <span className="px-2 text-xs leading-relaxed font-medium text-gray-600">Online</span>
      <div className="flex flex-col gap-1">
        {Object.values(PROFILES)
          .filter((profile) => profile.enabled !== false)
          .map((profile, index) => (
            <div
              key={profile.url}
              className="animate-in slide-in-from-bottom-2 fade-in duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <NavigationLink href={profile.url} label={profile.title} icon={profile.icon} />
            </div>
          ))}
      </div>
    </div>
  </div>
)
