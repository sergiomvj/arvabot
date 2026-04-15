import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { BrowserService } from './browser'

export type RunStatus = 'queued' | 'running' | 'checkpoint' | 'completed' | 'failed' | 'aborted'

type StartSquadRunInput = {
  squadId: string
  organizationId: string
  startedBy: string
  inputPayload?: unknown
}

export class SquadRunner {
  private runId: string

  constructor(runId: string) {
    this.runId = runId
  }

  /**
   * Executa ou retoma uma run de squad
   */
  async execute(): Promise<void> {
    console.log(`[SquadRunner] Iniciando execução da run: ${this.runId}`)

    // 1. Carregar a run e o cenário
    const run = await prisma.squad_runs.findUnique({
      where: { id: this.runId },
      include: {
        squad: {
          include: {
            steps: {
              orderBy: { order: 'asc' }
            }
          }
        },
        steps: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    })

    if (!run) throw new Error('Run não encontrada')
    if (['completed', 'failed', 'aborted'].includes(run.status)) {
      console.log(`[SquadRunner] Run já finalizada com status: ${run.status}`)
      return
    }

    // 2. Determinar o próximo step
    const nextOrder = run.current_step ? run.current_step + 1 : 1
    const nextStepDefinition = run.squad.steps.find(s => s.order === nextOrder)

    if (!nextStepDefinition) {
      // Fim do squad
      await prisma.squad_runs.update({
        where: { id: this.runId },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      })
      console.log(`[SquadRunner] Squad concluído com sucesso.`)
      return
    }

    // 3. Iniciar o Step
    await prisma.squad_runs.update({
      where: { id: this.runId },
      data: {
        status: 'running',
        current_step: nextOrder
      }
    })

    const runStep = await prisma.squad_run_steps.create({
      data: {
        run_id: this.runId,
        squad_step_id: nextStepDefinition.id,
        status: 'running',
        started_at: new Date()
      }
    })

    try {
      console.log(`[SquadRunner] Executando Step ${nextOrder}: ${nextStepDefinition.title || nextStepDefinition.agent_id}`)
      
      let outputText = ''
      let handoffSummary = ''

      // --- LOGICA DE EXECUÇÃO REAL (BATCH 6) ---
      if (nextStepDefinition.skill_code === 'browser-investigation') {
        const browser = new BrowserService(run.organization_id)
        const targetUrl = (run.input_payload as any)?.url || 'https://google.com'
        const result = await browser.investigate(targetUrl)
        outputText = `Investigação concluída para ${result.url}. Título: ${result.title}. Conteúdo: ${result.content.slice(0, 200)}...`
        handoffSummary = `Sherlock extraiu dados de ${result.title}`
      } else {
        // Mock para outros agents
        outputText = `Resultado do step ${nextOrder} processado pelo agente ${nextStepDefinition.agent_id}.`
        handoffSummary = `Handoff concluído pelo agente ${nextStepDefinition.agent_id}`
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Atualizar o step com o resultado
      await prisma.squad_run_steps.update({
        where: { id: runStep.id },
        data: {
          status: 'completed',
          completed_at: new Date(),
          output_text: outputText,
          handoff_summary: handoffSummary
        }
      })

      // 4. Verificar Checkpoint
      if (nextStepDefinition.checkpoint_required) {
        console.log(`[SquadRunner] Checkpoint solicitado para o step ${nextOrder}. Pausando run.`)
        
        await prisma.squad_runs.update({
          where: { id: this.runId },
          data: { status: 'checkpoint' }
        })

        await prisma.squad_checkpoints.create({
          data: {
            organization_id: run.organization_id,
            run_id: this.runId,
            run_step_id: runStep.id,
            status: 'open',
            feedback_text: null
          }
        })

        // Interrompemos a execução aqui. O runner será chamado novamente via API /resolve
        return
      }

      // 5. Recursão para o próximo step
      await this.execute()
      return

    } catch (error) {
      console.error(`[SquadRunner] Erro ao executar step ${nextOrder}:`, error)
      
      await prisma.squad_run_steps.update({
        where: { id: runStep.id },
        data: {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      })

      await prisma.squad_runs.update({
        where: { id: this.runId },
        data: {
          status: 'failed',
          failed_at: new Date()
        }
      })
    }
  }

  /**
   * Retoma a execução após um feedback (reexecuta o mesmo step)
   */
  async retryCurrentStep(feedback: string) {
    const run = await prisma.squad_runs.findUnique({
      where: { id: this.runId }
    })

    if (!run || run.status !== 'checkpoint') return

    console.log(`[SquadRunner] Retentando step ${run.current_step} com feedback: ${feedback}`)
    
    // Voltamos o contador para bater no execute() corretamente
    await prisma.squad_runs.update({
      where: { id: this.runId },
      data: {
        current_step: run.current_step ? run.current_step - 1 : 0,
        status: 'running'
      }
    })

    return this.execute()
  }
}

export async function startSquadRun(input: StartSquadRunInput) {
  const squad = await prisma.squads.findFirst({
    where: {
      id: input.squadId,
      organization_id: input.organizationId,
      active: true,
    },
    select: { id: true },
  })

  if (!squad) {
    throw new Error('Squad não encontrado para a organização atual.')
  }

  const run = await prisma.squad_runs.create({
    data: {
      squad_id: input.squadId,
      organization_id: input.organizationId,
      started_by: input.startedBy,
      input_payload:
        input.inputPayload === undefined ? undefined : (input.inputPayload as Prisma.InputJsonValue),
      status: 'queued',
    },
  })

  const runner = new SquadRunner(run.id)
  await runner.execute()

  return prisma.squad_runs.findUnique({
    where: { id: run.id },
    include: {
      steps: true,
      checkpoints: true,
    },
  })
}
