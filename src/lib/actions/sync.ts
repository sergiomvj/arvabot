'use server'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { syncAgentsData } from '@/lib/services/openclaw'
import { createClient } from '@/lib/supabase/server'

export async function syncAgentsAction() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { success: false, error: 'Não autorizado.' } as const
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id },
    select: { current_org_id: true },
  })

  if (!profile?.current_org_id) {
    return { success: false, error: 'Nenhuma organização selecionada.' } as const
  }

  const result = await syncAgentsData(profile.current_org_id)

  if (result.success) {
    revalidatePath('/dashboard/agents')
    revalidatePath('/dashboard')
  }

  return result
}
