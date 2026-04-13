'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createOrganization(formData: FormData) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('No session found')

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  // 1. Criar organizao
  const org = await prisma.organizations.create({
    data: {
      name,
      slug,
      organization_members: {
        create: {
          user_id: session.user.id,
          role: 'owner'
        }
      }
    }
  })

  // 2. Atualizar perfil com a org atual
  await prisma.profiles.upsert({
    where: { id: session.user.id },
    update: { current_org_id: org.id },
    create: { 
      id: session.user.id,
      current_org_id: org.id
    }
  })

  revalidatePath('/')
  redirect('/dashboard/agents')
}

export async function switchOrganization(orgId: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) throw new Error('No session found')

  // Verificar se o usurio  membro da org
  const member = await prisma.organization_members.findUnique({
    where: {
      organization_id_user_id: {
        organization_id: orgId,
        user_id: session.user.id
      }
    }
  })

  if (!member) throw new Error('Not a member of this organization')

  // Atualizar org atual no perfil
  await prisma.profiles.update({
    where: { id: session.user.id },
    data: { current_org_id: orgId }
  })

  revalidatePath('/')
  return { success: true }
}

export async function acceptInvitation(token: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect(`/login?next=/invite/${token}`)

  // 1. Validar convite
  const invite = await prisma.invitations.findUnique({
    where: { token },
    include: { organization: true }
  })

  if (!invite || invite.expires_at < new Date()) {
    throw new Error('Convite inválido ou expirado')
  }

  // 2. Criar membro
  await prisma.organization_members.upsert({
    where: {
      organization_id_user_id: {
        organization_id: invite.organization_id,
        user_id: session.user.id
      }
    },
    update: { role: invite.role },
    create: {
      organization_id: invite.organization_id,
      user_id: session.user.id,
      role: invite.role
    }
  })

  // 3. Setar como org atual
  await prisma.profiles.upsert({
    where: { id: session.user.id },
    update: { current_org_id: invite.organization_id },
    create: {
      id: session.user.id,
      current_org_id: invite.organization_id
    }
  })

  // 4. Limpar convite
  await prisma.invitations.delete({ where: { id: invite.id } })

  revalidatePath('/')
  redirect('/dashboard/agents')
}

export async function updateOrganizationSettings(formData: FormData) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Não autorizado')

  const profile = await prisma.profiles.findUnique({
    where: { id: session.user.id }
  })
  if (!profile?.current_org_id) throw new Error('Nenhuma organização selecionada')

  const url = formData.get('openclaw_url') as string
  const apiKey = formData.get('openclaw_api_key') as string

  await prisma.organizations.update({
    where: { id: profile.current_org_id },
    data: {
      openclaw_url: url,
      openclaw_api_key: apiKey
    }
  })

  revalidatePath('/dashboard/settings')
  redirect('/dashboard/settings?success=true')
}
