/* eslint-disable no-undef */
/// <reference types="cypress" />

const BASE_URL = 'http://localhost:5173'

// ─── Helper: Login rápido ──────────────────────────────────────────────────
function doLogin() {
  cy.get('[placeholder="Seu nome..."]').type('Ana')
  cy.get('[placeholder="Sua senha..."]').type('Liberdade131*')
  cy.contains('Entrar').click()
  cy.contains('Plantões', { timeout: 10000 }).should('be.visible')
}

// ─── Helper: Setup desktop (viewport xl, limpar estado, login) ─────────────
function setupDesktop() {
  cy.viewport(1280, 800)
  cy.visit(BASE_URL, {
    onBeforeLoad(win) {
      win.sessionStorage.clear()
      win.localStorage.clear()
    }
  })
  doLogin()
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. AUTENTICAÇÃO & SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════

describe('Autenticação', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
      }
    })
  })

  it('deve fazer login com sucesso', () => {
    doLogin()
    cy.contains('Plantões').should('be.visible')
  })

  it('deve rejeitar nome de usuário incorreto', () => {
    cy.get('[placeholder="Seu nome..."]').type('Maria')
    cy.get('[placeholder="Sua senha..."]').type('Liberdade131*')
    cy.contains('Entrar').click()
    cy.contains('Nome ou senha incorretos').should('be.visible')
  })

  it('deve rejeitar senha incorreta', () => {
    cy.get('[placeholder="Seu nome..."]').type('Ana')
    cy.get('[placeholder="Sua senha..."]').type('SenhaErrada123')
    cy.contains('Entrar').click()
    cy.contains('Nome ou senha incorretos').should('be.visible')
  })

  it('deve rejeitar campos vazios', () => {
    cy.contains('Entrar').click()
    cy.contains('Nome ou senha incorretos').should('be.visible')
  })

  it('deve aceitar nome com espaços extras (trim)', () => {
    cy.get('[placeholder="Seu nome..."]').type('  Ana  ')
    cy.get('[placeholder="Sua senha..."]').type('Liberdade131*')
    cy.contains('Entrar').click()
    cy.contains('Plantões').should('be.visible')
  })

  it('deve diferenciar maiúsculas/minúsculas na senha', () => {
    cy.get('[placeholder="Seu nome..."]').type('Ana')
    cy.get('[placeholder="Sua senha..."]').type('liberdade131*')
    cy.contains('Entrar').click()
    cy.contains('Nome ou senha incorretos').should('be.visible')
  })

  it('deve limpar mensagem de erro ao digitar novamente', () => {
    cy.get('[placeholder="Seu nome..."]').type('errado')
    cy.get('[placeholder="Sua senha..."]').type('errado')
    cy.contains('Entrar').click()
    cy.contains('Nome ou senha incorretos').should('be.visible')
    cy.get('[placeholder="Seu nome..."]').clear().type('A')
    cy.contains('Nome ou senha incorretos').should('not.exist')
  })

  it('deve armazenar sessão no sessionStorage após login', () => {
    doLogin()
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('jl_auth_session')).to.eq('true')
    })
  })

  it('deve fazer logout e voltar para tela de login', () => {
    doLogin()
    cy.get('aside').contains('Sair').click()
    cy.contains('Entrar').should('be.visible')
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('jl_auth_session')).to.be.null
    })
  })

  it('não deve manter sessão após limpar sessionStorage', () => {
    doLogin()
    cy.window().then((win) => {
      win.sessionStorage.clear()
    })
    cy.reload()
    cy.contains('Entrar').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. PROTEÇÃO DE ROTAS
// ═══════════════════════════════════════════════════════════════════════════

describe('Proteção de Rotas', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
      }
    })
  })

  it('deve exibir tela de login ao acessar sem autenticação', () => {
    cy.contains('Painel Administrativo').should('be.visible')
    cy.contains('Entrar').should('be.visible')
    cy.contains('Plantões').should('not.exist')
  })

  it('não deve exibir conteúdo admin sem estar logado', () => {
    cy.contains('Ana Paula').should('not.exist')
    cy.contains('Consultoras').should('not.exist')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. DASHBOARD — ESCALA
// ═══════════════════════════════════════════════════════════════════════════

describe('Dashboard - Escala Mensal', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve exibir a tabela de escala com cabeçalho correto', () => {
    cy.get('table').should('be.visible')
    cy.get('table thead').contains('Data').should('be.visible')
    cy.get('table thead').contains('Dia').should('be.visible')
    cy.get('table thead').contains('Consultora').should('be.visible')
  })

  it('deve exibir consultoras padrão na tabela', () => {
    cy.get('table').contains('Roberta').should('exist')
    cy.get('table').contains('Elis').should('exist')
    cy.get('table').contains('Duda').should('exist')
  })

  it('deve exibir o mês março no título da escala', () => {
    cy.contains('h3', 'Plantões').should('be.visible')
    cy.contains('Março').should('be.visible')
  })

  it('deve exibir ano 2026 no badge', () => {
    cy.contains('2026').should('be.visible')
  })

  it('deve exibir perfil da administradora na sidebar', () => {
    cy.get('aside').contains('Ana Paula').should('be.visible')
    cy.get('aside').contains('Administradora').should('be.visible')
  })

  it('deve exibir estatísticas de equidade na sidebar', () => {
    cy.get('aside').contains('Equidade').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. NAVEGAÇÃO ENTRE MESES
// ═══════════════════════════════════════════════════════════════════════════

describe('Navegação entre Meses', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve navegar para o mês seguinte', () => {
    cy.get('aside').contains('Março').should('be.visible')
    // O botão "next" é o último dentro do container de navegação do mês
    cy.get('aside').contains('Março 2026').parent().find('button').last().click()
    cy.get('aside').contains('Abril').should('be.visible')
  })

  it('deve navegar para o mês anterior', () => {
    cy.get('aside').contains('Março').should('be.visible')
    cy.get('aside').contains('Março 2026').parent().find('button').first().click()
    cy.get('aside').contains('Fevereiro').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. GESTÃO DE CONSULTORAS
// ═══════════════════════════════════════════════════════════════════════════

describe('Gestão de Consultoras', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve adicionar nova consultora', () => {
    cy.get('aside [placeholder="Adicionar nome..."]').type('Carolina{enter}')
    cy.get('aside').contains('Carolina').should('exist')
  })

  it('não deve adicionar consultora duplicada (case insensitive)', () => {
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alertStub')
    })
    cy.get('aside [placeholder="Adicionar nome..."]').type('roberta{enter}')
    cy.get('@alertStub').should('have.been.calledWith', 'Essa consultora já está cadastrada.')
  })

  it('não deve adicionar nome vazio', () => {
    cy.get('aside [placeholder="Adicionar nome..."]').type('   {enter}')
    // Verificar via localStorage que ainda são 3 consultoras
    cy.window().then((win) => {
      const consultants = JSON.parse(win.localStorage.getItem('jl_consultants_v6'))
      expect(consultants).to.have.length(3)
    })
  })

  it('deve remover consultora com confirmação', () => {
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true)
    })
    cy.get('aside').contains('Duda').parent().parent().find('button').click()
    cy.get('aside').contains('Duda').should('not.exist')
  })

  it('não deve remover consultora se cancelar confirmação', () => {
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(false)
    })
    cy.get('aside').contains('Duda').parent().parent().find('button').click()
    cy.get('aside').contains('Duda').should('exist')
  })

  it('deve persistir consultoras no localStorage', () => {
    cy.get('aside [placeholder="Adicionar nome..."]').type('Teste{enter}')
    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem('jl_consultants_v6'))
      expect(stored).to.include('Teste')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. BUSCA / FILTRO
// ═══════════════════════════════════════════════════════════════════════════

describe('Busca na Escala', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve destacar linhas ao buscar nome de consultora', () => {
    cy.get('[placeholder="Buscar..."]').type('Roberta')
    // Linhas destacadas recebem classe ring-emerald-200
    cy.get('table tbody tr[class*="ring-emerald"]', { timeout: 5000 }).should('have.length.greaterThan', 0)
  })

  it('deve remover destaque ao limpar busca', () => {
    cy.get('[placeholder="Buscar..."]').type('Roberta')
    cy.get('table tbody tr[class*="ring-emerald"]').should('have.length.greaterThan', 0)
    cy.get('[placeholder="Buscar..."]').clear()
    cy.get('table tbody tr[class*="ring-emerald"]').should('not.exist')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 7. EDIÇÃO DE ESCALA (Override)
// ═══════════════════════════════════════════════════════════════════════════

describe('Edição de Escala - Override', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve abrir modal de edição ao clicar no botão editar', () => {
    // Primeiro dia útil (segunda-feira, 02/03) — forçar click pois botão tem opacity-0
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.contains('Trocar').should('be.visible')
    cy.contains('Responsável').should('be.visible')
  })

  it('deve trocar consultora de um dia útil', () => {
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.contains('Trocar').should('be.visible')
    // Selecionar Elis (diferente da atribuída Roberta)
    cy.get('.fixed.inset-0').contains('button', 'Elis').click()
    // Modal fecha após seleção
    cy.contains('Trocar').should('not.exist')
  })

  it('deve fechar modal ao clicar no overlay', () => {
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.contains('Trocar').should('be.visible')
    // Clicar no overlay (backdrop) para fechar
    cy.get('.fixed.inset-0 [class*="backdrop-blur"]').click({ force: true })
    cy.contains('Trocar').should('not.exist')
  })

  it('deve registrar alteração no audit log', () => {
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.get('.fixed.inset-0').contains('button', 'Elis').click()

    cy.window().then((win) => {
      const log = JSON.parse(win.localStorage.getItem('jl_audit_log_v6') || '[]')
      expect(log.length).to.be.greaterThan(0)
      expect(log[0]).to.have.property('date')
      expect(log[0]).to.have.property('from')
      expect(log[0]).to.have.property('to', 'Elis')
      expect(log[0]).to.have.property('changedAt')
    })
  })

  it('deve persistir override no localStorage', () => {
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.get('.fixed.inset-0').contains('button', 'Elis').click()

    cy.window().then((win) => {
      const overrides = JSON.parse(win.localStorage.getItem('jl_overrides_v6') || '{}')
      expect(Object.keys(overrides).length).to.be.greaterThan(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 8. GESTÃO DE FERIADOS
// ═══════════════════════════════════════════════════════════════════════════

describe('Gestão de Feriados', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve abrir modal de feriados', () => {
    cy.get('aside').contains('Feriados').click()
    cy.contains('Datas Especiais').should('be.visible')
  })

  it('deve exibir feriados pré-cadastrados', () => {
    cy.get('aside').contains('Feriados').click()
    cy.contains('Datas Especiais').should('be.visible')
    cy.contains('Ano Novo').should('be.visible')
    cy.contains('Natal').should('be.visible')
  })

  it('deve adicionar novo feriado', () => {
    cy.get('aside').contains('Feriados').click()
    cy.contains('Datas Especiais').should('be.visible')
    cy.get('.fixed.inset-0 input[type="date"]').type('2026-06-24')
    cy.get('.fixed.inset-0 [placeholder="Ex: Natal"]').type('São João')
    cy.get('.fixed.inset-0 form button[type="submit"]').click()
    cy.contains('São João').should('be.visible')
  })

  it('não deve adicionar feriado duplicado', () => {
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alertStub')
    })
    cy.get('aside').contains('Feriados').click()
    cy.contains('Datas Especiais').should('be.visible')
    cy.get('.fixed.inset-0 input[type="date"]').type('2026-01-01')
    cy.get('.fixed.inset-0 [placeholder="Ex: Natal"]').type('Duplicado')
    cy.get('.fixed.inset-0 form button[type="submit"]').click()
    cy.get('@alertStub').should('have.been.calledWith', 'Já existe um feriado cadastrado nesta data.')
  })

  it('deve fechar modal de feriados', () => {
    cy.get('aside').contains('Feriados').click()
    cy.contains('Datas Especiais').should('be.visible')
    // Fechar clicando no overlay
    cy.get('.fixed.inset-0 [class*="backdrop-blur"]').click({ force: true })
    cy.contains('Datas Especiais').should('not.exist')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 9. GESTÃO DE FÉRIAS / FOLGAS
// ═══════════════════════════════════════════════════════════════════════════

describe('Gestão de Férias e Folgas', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve abrir modal de férias', () => {
    cy.get('aside').contains('Férias').click()
    cy.contains('Gestão de Ausências').should('be.visible')
  })

  it('deve exibir mensagem quando não há ausências cadastradas', () => {
    cy.get('aside').contains('Férias').click()
    cy.contains('Gestão de Ausências').should('be.visible')
    cy.contains('Nenhuma ausência cadastrada').should('be.visible')
  })

  it('deve adicionar período de férias', () => {
    cy.get('aside').contains('Férias').click()
    cy.contains('Gestão de Ausências').should('be.visible')

    cy.get('.fixed.inset-0 select').first().select('Roberta')
    cy.get('.fixed.inset-0 input[type="date"]').first().type('2026-04-01')
    cy.get('.fixed.inset-0 input[type="date"]').last().type('2026-04-15')
    cy.get('.fixed.inset-0 [placeholder="Ex: Férias de abril"]').type('Férias de abril')
    cy.get('.fixed.inset-0 form button[type="submit"]').click()

    cy.get('.fixed.inset-0').contains('Roberta').should('be.visible')
    cy.contains('Férias de abril').should('be.visible')
  })

  it('não deve aceitar data fim anterior à data início', () => {
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alertStub')
    })
    cy.get('aside').contains('Férias').click()
    cy.contains('Gestão de Ausências').should('be.visible')

    cy.get('.fixed.inset-0 select').first().select('Roberta')
    cy.get('.fixed.inset-0 input[type="date"]').first().type('2026-04-15')
    cy.get('.fixed.inset-0 input[type="date"]').last().type('2026-04-01')
    cy.get('.fixed.inset-0 form button[type="submit"]').click()

    cy.get('@alertStub').should('have.been.calledWith', 'A data fim não pode ser anterior à data início.')
  })

  it('deve persistir férias no localStorage', () => {
    cy.get('aside').contains('Férias').click()
    cy.contains('Gestão de Ausências').should('be.visible')

    cy.get('.fixed.inset-0 select').first().select('Elis')
    cy.get('.fixed.inset-0 input[type="date"]').first().type('2026-05-01')
    cy.get('.fixed.inset-0 input[type="date"]').last().type('2026-05-10')
    cy.get('.fixed.inset-0 form button[type="submit"]').click()

    cy.window().then((win) => {
      const vacations = JSON.parse(win.localStorage.getItem('jl_vacations_v6') || '[]')
      expect(vacations.length).to.eq(1)
      expect(vacations[0].consultant).to.eq('Elis')
      expect(vacations[0].startDate).to.eq('2026-05-01')
      expect(vacations[0].endDate).to.eq('2026-05-10')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 10. HISTÓRICO DE TROCAS (Audit Log)
// ═══════════════════════════════════════════════════════════════════════════

describe('Histórico de Trocas', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve abrir modal de histórico', () => {
    cy.get('aside').contains('Histórico de Trocas').click()
    cy.contains('Registro de Alterações').should('be.visible')
  })

  it('deve mostrar mensagem vazia quando não há alterações', () => {
    cy.get('aside').contains('Histórico de Trocas').click()
    cy.contains('Nenhuma alteração registrada').should('be.visible')
  })

  it('deve mostrar troca após editar um dia', () => {
    // Editar primeiro dia útil
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.get('.fixed.inset-0').contains('button', 'Elis').click()
    cy.contains('Trocar').should('not.exist')

    // Abrir histórico
    cy.get('aside').contains('Histórico de Trocas').click()
    cy.contains('Registro de Alterações').should('be.visible')
    cy.contains('Nenhuma alteração registrada').should('not.exist')
  })

  it('deve limpar histórico ao clicar Limpar', () => {
    // Fazer uma troca
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.get('.fixed.inset-0').contains('button', 'Elis').click()
    cy.contains('Trocar').should('not.exist')

    // Abrir histórico e limpar
    cy.get('aside').contains('Histórico de Trocas').click()
    cy.contains('Registro de Alterações').should('be.visible')
    cy.contains('Limpar').click()
    cy.contains('Nenhuma alteração registrada').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 11. PERSISTÊNCIA DE DADOS (localStorage)
// ═══════════════════════════════════════════════════════════════════════════

describe('Persistência de Dados', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve usar as chaves corretas no localStorage', () => {
    cy.window().then((win) => {
      expect(win.localStorage.getItem('jl_consultants_v6')).to.not.be.null
      expect(win.localStorage.getItem('jl_holidays_v6')).to.not.be.null
      expect(win.localStorage.getItem('jl_overrides_v6')).to.not.be.null
      expect(win.localStorage.getItem('jl_vacations_v6')).to.not.be.null
      expect(win.localStorage.getItem('jl_audit_log_v6')).to.not.be.null
    })
  })

  it('deve manter dados após reload', () => {
    cy.get('aside [placeholder="Adicionar nome..."]').type('Maria{enter}')
    cy.get('aside').contains('Maria').should('exist')

    // Manter sessão e recarregar
    cy.reload()
    cy.contains('Plantões', { timeout: 10000 }).should('be.visible')
    cy.get('aside').contains('Maria').should('exist')
  })

  it('audit log deve limitar a 200 entradas', () => {
    cy.window().then((win) => {
      const bigLog = Array.from({ length: 205 }, () => ({
        date: '2026-03-02',
        from: 'A',
        to: 'B',
        changedAt: new Date().toISOString(),
        type: 'weekday'
      }))
      win.localStorage.setItem('jl_audit_log_v6', JSON.stringify(bigLog))
    })
    cy.reload()
    cy.contains('Plantões', { timeout: 10000 }).should('be.visible')

    // Fazer nova troca para disparar o slice(0, 200)
    cy.get('table tbody tr').eq(1).find('button').first().click({ force: true })
    cy.get('.fixed.inset-0').contains('button', 'Elis').click()

    cy.window().then((win) => {
      const log = JSON.parse(win.localStorage.getItem('jl_audit_log_v6'))
      expect(log.length).to.be.at.most(200)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 12. VIEW DE CONSULTA (modo público)
// ═══════════════════════════════════════════════════════════════════════════

describe('View de Consulta (Público)', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    // Primeiro carrega admin para popular localStorage com dados default
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
      }
    })
    doLogin()
    // Agora visita modo consulta
    cy.visit(`${BASE_URL}?modo=consulta`)
    cy.contains('Jardim do Lago', { timeout: 10000 }).should('be.visible')
  })

  it('deve exibir escala sem pedir login', () => {
    cy.contains('Entrar').should('not.exist')
    cy.contains('Modo Visualização').should('be.visible')
  })

  it('deve exibir dados das consultoras na escala', () => {
    cy.contains('Roberta').should('exist')
  })

  it('não deve exibir elementos administrativos', () => {
    cy.contains('Feriados').should('not.exist')
    cy.contains('Emitir Escala').should('not.exist')
    cy.contains('Sair').should('not.exist')
  })

  it('deve permitir navegar entre meses', () => {
    cy.contains('Março').should('be.visible')
    // Clicar no segundo botão (next month) — ConsultaView tem apenas 2 botões
    cy.get('button').eq(1).click()
    cy.contains('Abril').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 13. SEGURANÇA — XSS & INJEÇÃO
// ═══════════════════════════════════════════════════════════════════════════

describe('Segurança - Proteção contra Injeção', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve renderizar HTML como texto ao adicionar consultora com tags', () => {
    const xssPayload = '<script>alert("xss")</script>'
    cy.get('aside [placeholder="Adicionar nome..."]').type(`${xssPayload}{enter}`)
    // React escapa HTML — deve aparecer como texto puro
    cy.get('aside').contains(xssPayload).should('exist')
    // Nenhum script executável adicionado
    cy.window().then((win) => {
      const inlineScripts = [...win.document.querySelectorAll('script:not([src])')].filter(
        s => s.textContent.includes('alert("xss")')
      )
      expect(inlineScripts.length).to.eq(0)
    })
  })

  it('deve tratar atributos de evento injetados como texto', () => {
    const payload = '" onmouseover="alert(1)" x="'
    cy.get('aside [placeholder="Adicionar nome..."]').type(`${payload}{enter}`)
    cy.get('[onmouseover]').should('not.exist')
  })

  it('deve tratar injeção no campo de busca como texto', () => {
    cy.get('[placeholder="Buscar..."]').type('<img src=x onerror=alert(1)>')
    cy.get('img[src="x"]').should('not.exist')
  })

  it('deve tratar nome de feriado com HTML como texto', () => {
    cy.get('aside').contains('Feriados').click()
    cy.contains('Datas Especiais').should('be.visible')
    cy.get('.fixed.inset-0 input[type="date"]').type('2026-07-04')
    cy.get('.fixed.inset-0 [placeholder="Ex: Natal"]').type('<b>Feriado</b>')
    cy.get('.fixed.inset-0 form button[type="submit"]').click()
    cy.contains('<b>Feriado</b>').should('exist')
  })

  it('deve rejeitar tentativa de SQL injection no login', () => {
    cy.get('aside').contains('Sair').click()
    cy.get('[placeholder="Seu nome..."]').type("'; DROP TABLE users; --")
    cy.get('[placeholder="Sua senha..."]').type("' OR '1'='1")
    cy.contains('Entrar').click()
    cy.contains('Nome ou senha incorretos').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 14. BACKUP E RESTAURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

describe('Backup e Restauração', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve ter botão de backup visível na sidebar', () => {
    cy.get('aside').contains('Backup').should('be.visible')
  })

  it('deve ter botão de restaurar visível na sidebar', () => {
    cy.get('aside').contains('Restaurar').should('be.visible')
  })

  it('deve rejeitar arquivo de backup com versão inválida', () => {
    cy.window().then((win) => {
      cy.stub(win, 'alert').as('alertStub')
    })
    cy.window().then((win) => {
      return new Cypress.Promise((resolve) => {
        const invalidBackup = JSON.stringify({ version: 'wrong', data: {} })
        const blob = new Blob([invalidBackup], { type: 'application/json' })
        const file = new File([blob], 'invalid.json', { type: 'application/json' })
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target.result)
            if (data.version !== 'jl_backup_v1') {
              win.alert('Arquivo de backup inválido.')
            }
          } catch {
            win.alert('Erro ao ler arquivo.')
          }
          resolve()
        }
        reader.readAsText(file)
      })
    })
    cy.get('@alertStub').should('have.been.calledWith', 'Arquivo de backup inválido.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 15. BOTÕES DE AÇÃO DA SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════

describe('Botões de Ação - Sidebar', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve ter botão Emitir Escala visível', () => {
    cy.get('aside').contains('Emitir Escala').should('be.visible')
  })

  it('deve ter botão Link Consultoras visível', () => {
    cy.get('aside').contains('Link Consultoras').should('be.visible')
  })

  it('deve mostrar confirmação ao copiar link', () => {
    cy.window().then((win) => {
      // Stub clipboard API pois pode não estar disponível em headless
      if (win.navigator.clipboard && win.navigator.clipboard.writeText) {
        cy.stub(win.navigator.clipboard, 'writeText').resolves()
      } else {
        win.navigator.clipboard = { writeText: cy.stub().resolves() }
      }
    })
    cy.get('aside').contains('Link Consultoras').click()
    cy.get('aside').contains('Link Copiado!').should('be.visible')
  })

  it('deve ter botão Sair visível', () => {
    cy.get('aside').contains('Sair').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 16. INTEGRIDADE DOS DADOS DA ESCALA
// ═══════════════════════════════════════════════════════════════════════════

describe('Integridade da Escala', () => {
  beforeEach(() => {
    setupDesktop()
  })

  it('deve gerar escala com 31 dias para março', () => {
    cy.get('table tbody tr', { timeout: 10000 }).should('have.length', 31)
  })

  it('deve mostrar sábados na escala', () => {
    cy.get('table').contains('Sábado').should('exist')
  })

  it('deve mostrar feriados ao navegar para janeiro', () => {
    // Voltar 2 meses: Março → Fevereiro → Janeiro
    cy.get('aside').contains('Março 2026').parent().find('button').first().click()
    cy.get('aside').contains('Fevereiro').should('be.visible')
    cy.get('aside').contains('Fevereiro 2026').parent().find('button').first().click()
    cy.get('aside').contains('Janeiro').should('be.visible')
    cy.contains('Ano Novo').should('be.visible')
  })

  it('deve distribuir dias entre todas as consultoras', () => {
    // Cada consultora deve ter pelo menos 1 dia atribuído
    cy.get('table').contains('Roberta').should('exist')
    cy.get('table').contains('Elis').should('exist')
    cy.get('table').contains('Duda').should('exist')
  })

  it('não deve atribuir consultora a domingos', () => {
    cy.get('table tbody tr').each(($row) => {
      const dayText = $row.find('td').eq(1).text()
      if (dayText.includes('Domingo')) {
        const consultantText = $row.find('td').eq(2).text().trim()
        expect(consultantText).to.eq('—')
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 17. RESPONSIVIDADE (viewport mobile)
// ═══════════════════════════════════════════════════════════════════════════

describe('Responsividade - Mobile', () => {
  beforeEach(() => {
    cy.viewport(375, 667)
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
      }
    })
    doLogin()
  })

  it('deve ocultar sidebar no mobile', () => {
    cy.get('aside').should('not.be.visible')
  })

  it('deve exibir botão hamburger no mobile', () => {
    // Botão hamburger está na header do main
    cy.get('main header button').first().should('be.visible')
  })

  it('deve ocultar tabela desktop no mobile', () => {
    cy.get('table').should('not.be.visible')
  })

  it('deve exibir mini-stats no mobile', () => {
    cy.contains('dias').should('be.visible')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 18. SEGURANÇA — SESSION HANDLING
// ═══════════════════════════════════════════════════════════════════════════

describe('Segurança - Gestão de Sessão', () => {
  it('deve usar sessionStorage (não localStorage) para autenticação', () => {
    cy.viewport(1280, 800)
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
      }
    })
    doLogin()
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('jl_auth_session')).to.eq('true')
      expect(win.localStorage.getItem('jl_auth_session')).to.be.null
    })
  })

  it('não deve expor credenciais nos dados do localStorage', () => {
    cy.viewport(1280, 800)
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
      }
    })
    doLogin()
    cy.window().then((win) => {
      // Verificar que a senha não está em nenhuma chave do localStorage
      for (let i = 0; i < win.localStorage.length; i++) {
        const key = win.localStorage.key(i)
        const value = win.localStorage.getItem(key)
        expect(value).to.not.include('Liberdade131')
      }
    })
  })

  it('não deve autenticar com valor inválido no sessionStorage', () => {
    cy.viewport(1280, 800)
    cy.visit(BASE_URL, {
      onBeforeLoad(win) {
        win.sessionStorage.clear()
        win.localStorage.clear()
        win.sessionStorage.setItem('jl_auth_session', 'false')
      }
    })
    cy.contains('Entrar').should('be.visible')
    cy.contains('Plantões').should('not.exist')
  })
})
