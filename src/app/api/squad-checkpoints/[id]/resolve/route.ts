import { NextRequest, NextResponse } from 'next/server'

import { getCurrentOrganizationContext } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'
import { SquadRunner } from '@/lib/services/squad-runner'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const context = await getCurrentOrganizationContext()
    if (!context) {
      return NextResponse.json({ error: 'Nao autorizado ou organizacao nao selecionada' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const action = typeof body?.action === 'string' ? body.action : ''
    const feedbackText = typeof body?.feedback_text === 'string' ? body.feedback_text.trim() : ''

    const checkpoint = await prisma.squad_checkpoints.findUnique({
      where: { id: params.id },
      include: { run: true },
    })

    if (!checkpoint) {
      return NextResponse.json({ error: 'Checkpoint nao encontrado' }, { status: 404 })
    }

    if (checkpoint.organization_id !== context.orgId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (checkpoint.status !== 'open') {
      return NextResponse.json({ error: 'Checkpoint ja resolvido' }, { status: 409 })
    }

    const runner = new SquadRunner(checkpoint.run_id)

    switch (action) {
      case 'approve': {
        await prisma.squad_checkpoints.update({
          where: { id: params.id },
          data: {
            status: 'approved',
            action: 'approve',
            resolved_at: new Date(),
            resolved_by: context.userId,
          },
        })

        runner.execute().catch((error: unknown) => console.error('Erro ao retomar run (approve):', error))
        break
      }

      case 'feedback': {
        if (!feedbackText) {
          return NextResponse.json({ error: 'Feedback obrigatorio' }, { status: 400 })
        }

        await prisma.squad_checkpoints.update({
          where: { id: params.id },
          data: {
            status: 'feedback',
            action: 'feedback',
            feedback_text: feedbackText,
            resolved_at: new Date(),
            resolved_by: context.userId,
          },
        })

        runner.retryCurrentStep(feedbackText).catch((error: unknown) =>
          console.error('Erro ao retomar run (feedback):', error),
        )
        break
      }

      case 'abort': {
        await prisma.$transaction([
          prisma.squad_checkpoints.update({
            where: { id: params.id },
            data: {
              status: 'aborted',
              action: 'abort',
              resolved_at: new Date(),
              resolved_by: context.userId,
            },
          }),
          prisma.squad_runs.update({
            where: { id: checkpoint.run_id },
            data: {
              status: 'aborted',
              failed_at: new Date(),
            },
          }),
        ])
        break
      }

      default:
        return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      checkpoint_id: params.id,
      action,
    })
  } catch (error) {
    console.error('[API Checkpoints] Erro ao resolver:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
