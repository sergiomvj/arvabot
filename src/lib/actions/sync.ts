'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { syncAgentsData } from '@/lib/services/openclaw'
import { revalidatePath } from 'next/cache'

export async function syncAgentsAction() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('Não autorizado')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  })

  if (!profile?.current_org_id) throw new Error('Nenhuma organização selecionada')

  const result = await syncAgentsData(profile.current_org_id)

  revalidatePath('/dashboard/agents')
  revalidatePath('/dashboard')
  
  return result
}
