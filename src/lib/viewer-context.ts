import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

type OrganizationSummary = {
  id: string
  name: string
  slug: string
}

type CurrentOrganization = OrganizationSummary & {
  openclaw_url: string
  openclaw_api_key: string | null
}

export type ViewerContext = {
  session: NonNullable<Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getSession']>>['data']['session']>
  userId: string
  currentOrgId: string | null
  currentOrg: CurrentOrganization | null
  organizations: OrganizationSummary[]
}

export const getViewerContext = cache(async (): Promise<ViewerContext | null> => {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const [existingProfile, memberships] = await Promise.all([
    prisma.profiles.findUnique({
      where: { id: session.user.id },
      select: {
        current_org_id: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            openclaw_url: true,
            openclaw_api_key: true,
          },
        },
      },
    }),
    prisma.organization_members.findMany({
      where: { user_id: session.user.id },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        joined_at: 'asc',
      },
    }),
  ])

  const profile =
    existingProfile ??
    (await prisma.profiles.create({
      data: {
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
        avatar_url: session.user.user_metadata?.avatar_url || null,
      },
      select: {
        current_org_id: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            openclaw_url: true,
            openclaw_api_key: true,
          },
        },
      },
    }))

  return {
    session,
    userId: session.user.id,
    currentOrgId: profile.current_org_id,
    currentOrg: profile.organization,
    organizations: memberships.map((membership) => membership.organization),
  }
})
