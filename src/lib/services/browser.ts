import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { prisma } from '@/lib/prisma'

export type BrowserResult = {
  url: string
  title: string
  content: string
  metadata: Record<string, any>
  screenshot?: string // Base64 optional
}

export class BrowserService {
  private organizationId: string
  private platform: string

  constructor(organizationId: string, platform: string = 'generic') {
    this.organizationId = organizationId
    this.platform = platform
  }

  /**
   * Executa uma navegação e extração de dados
   */
  async investigate(url: string): Promise<BrowserResult> {
    console.log(`[BrowserService] Investigando URL: ${url} para Org: ${this.organizationId}`)
    
    const browser = await chromium.launch({ headless: true })
    
    // 1. Carregar estado da sessão do banco
    const session = await prisma.browser_sessions.findUnique({
      where: {
        organization_id_platform: {
          organization_id: this.organizationId,
          platform: this.platform
        }
      }
    })

    const contextOptions = session?.storage_state ? (session.storage_state as any) : {}
    const context = await browser.newContext(contextOptions)
    const page = await context.newPage()

    try {
      // 2. Navegar
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

      // 3. Extrair dados
      const title = await page.title()
      const content = await page.innerText('body')
      const metadata = await page.evaluate(() => {
        const metas = document.getElementsByTagName('meta')
        const results: Record<string, string> = {}
        for (let i = 0; i < metas.length; i++) {
          const name = metas[i].getAttribute('name') || metas[i].getAttribute('property')
          if (name) results[name] = metas[i].getAttribute('content') || ''
        }
        return results
      })

      // 4. Salvar estado da sessão (se mudou)
      const newState = await context.storageState()
      await prisma.browser_sessions.upsert({
        where: {
          organization_id_platform: {
            organization_id: this.organizationId,
            platform: this.platform
          }
        },
        update: {
          storage_state: newState as any,
          updated_at: new Date()
        },
        create: {
          organization_id: this.organizationId,
          platform: this.platform,
          storage_state: newState as any
        }
      })

      return {
        url,
        title,
        content: content.slice(0, 5000), // Limitar tamanho para não estourar contexto de LLM
        metadata
      }

    } finally {
      await browser.close()
    }
  }
}
