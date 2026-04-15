import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export type CurrentOrganizationContext = {
  userId: string
  email: string | null
  orgId: string
  role: string
}

export async function getCurrentOrganizationContext(): Promise<CurrentOrganizationContext | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { current_org_id: true },
  })

  if (!profile?.current_org_id) return null

  const membership = await prisma.organization_members.findUnique({
    where: {
      organization_id_user_id: {
        organization_id: profile.current_org_id,
        user_id: session.user.id,
      },
    },
    select: { role: true },
  })

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    orgId: profile.current_org_id,
    role: membership?.role ?? 'member',
  }
}

export function requireRole(role: string, allowed: string[]) {
  return allowed.includes(role)
}
