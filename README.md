<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

<h1 align="center">Jardim do Lago &mdash; Gestao de Escalas</h1>

<p align="center">
  <strong>Sistema completo de gestao de escalas de atendimento para equipes de plantao.</strong><br/>
  Distribuicao automatica, controle de trocas, ferias, feriados e auditoria &mdash; tudo em uma PWA responsiva.
</p>

<p align="center">
  <a href="#-funcionalidades">Funcionalidades</a> &bull;
  <a href="#-screenshots">Screenshots</a> &bull;
  <a href="#%EF%B8%8F-arquitetura">Arquitetura</a> &bull;
  <a href="#-como-rodar">Como Rodar</a> &bull;
  <a href="#-stack-tecnica">Stack</a> &bull;
  <a href="#-estrutura-do-projeto">Estrutura</a> &bull;
  <a href="#-autor">Autor</a>
</p>

---

## Sobre o Projeto

O **Jardim do Lago - Gestao de Escalas** foi desenvolvido para resolver um problema real: automatizar e centralizar o controle de escalas de atendimento de consultoras em um empreendimento imobiliario.

Antes, o controle era feito manualmente via planilhas e mensagens de WhatsApp. Agora, a gestora administra tudo por um painel web e as consultoras visualizam seus plantoes em tempo real pelo celular.

### O problema que resolve

| Antes | Depois |
|-------|--------|
| Planilha manual no Excel | Geracao automatica com rotacao justa |
| Mensagens no WhatsApp para avisar trocas | Link de consulta em tempo real |
| Sem historico de quem trocou com quem | Auditoria completa de alteracoes |
| Esquecimento de feriados | Feriados cadastrados e respeitados |
| Sem controle de ferias | Gestao de ferias com redistribuicao automatica |
| Risco de perder dados | Backup e restauracao em JSON |

---

## Funcionalidades

### Painel Administrativo (protegido por login)

- **Geracao automatica de escala** &mdash; Distribui dias uteis e sabados entre consultoras em rotacao continua e equilibrada
- **Troca manual de consultora** &mdash; Altera qualquer dia da escala com um clique
- **Sabado com multiplas consultoras** &mdash; Permite escalar 2 ou mais consultoras no mesmo sabado
- **Gestao de feriados** &mdash; Cadastra feriados nacionais/locais que sao automaticamente removidos da rotacao
- **Gestao de ferias e folgas** &mdash; Marca periodos de ausencia e o sistema redistribui os dias automaticamente
- **Historico de trocas (auditoria)** &mdash; Registra toda alteracao com quem estava, quem entrou, data e hora
- **Estatisticas de equidade** &mdash; Mostra total de dias por consultora com indicador visual de balanceamento
- **Backup e restauracao** &mdash; Exporta todos os dados em JSON e permite restaurar a qualquer momento
- **Emissao de escala** &mdash; Botao para imprimir a escala formatada
- **Link compartilhavel** &mdash; Gera link de consulta para enviar as consultoras via WhatsApp

### Modo Consulta (acesso publico, somente leitura)

- **Visualizacao da escala** &mdash; As consultoras acessam pelo celular e veem seus plantoes
- **Atualizacao em tempo real** &mdash; Quando a gestora altera algo, reflete imediatamente no PWA
- **Navegacao entre meses** &mdash; Visualiza meses passados e futuros
- **Instalavel como app** &mdash; PWA com icone na tela inicial e splash screen

### Protecoes e validacoes

- Login com autenticacao por sessao
- Validacao de feriados duplicados
- Validacao de datas invalidas em ferias
- Validacao de consultoras duplicadas
- Confirmacao antes de deletar consultora
- Alerta visual quando todas estao de ferias
- Limite de 200 entradas no historico (rotacao automatica)
- Correcao de timezone para feriados (UTC-safe)

---

## Screenshots

> Para adicionar screenshots, salve as imagens na pasta `docs/` e descomente as linhas abaixo:

<!--
<p align="center">
  <img src="docs/admin-desktop.png" width="800" alt="Painel Admin - Desktop" />
</p>
<p align="center"><em>Painel Administrativo - Desktop</em></p>

<p align="center">
  <img src="docs/consulta-mobile.png" width="300" alt="Modo Consulta - Mobile" />
</p>
<p align="center"><em>Modo Consulta - Mobile (PWA)</em></p>
-->

---

## Arquitetura

```
+---------------------------------------------------+
|                    NAVEGADOR                       |
|                                                    |
|  +----------------+       +---------------------+ |
|  |  App.jsx       |       |  ConsultaView.jsx   | |
|  |  (Admin)       |       |  (Somente Leitura)  | |
|  |                |       |                     | |
|  |  - Login       |       |  - Escala           | |
|  |  - Escala      | ====> |  - Navegacao        | |
|  |  - Trocas      | localStorage               | |
|  |  - Feriados    |       |  Listeners:         | |
|  |  - Ferias      |       |  - storage event    | |
|  |  - Historico   |       |  - visibilitychange | |
|  |  - Backup      |       |  - focus            | |
|  +-------+--------+       +---------------------+ |
|          |                                         |
|  +-------v--------+       +---------------------+ |
|  | scheduler.js   |       |   Service Worker    | |
|  |                |       |   (sw.js)           | |
|  | - Rotacao      |       |                     | |
|  | - Ferias       |       | - Cache assets      | |
|  | - Feriados     |       | - Offline support   | |
|  | - Timezone fix |       | - Network-first     | |
|  +----------------+       +---------------------+ |
|                                                    |
|  +----------------------------------------------+ |
|  |            localStorage (keys)                | |
|  |                                               | |
|  |  jl_consultants_v6  -> ["Roberta", ...]      | |
|  |  jl_holidays_v6     -> [{ date, name }]      | |
|  |  jl_overrides_v6    -> { "2026-03-15": ... } | |
|  |  jl_vacations_v6    -> [{ consultant, ... }] | |
|  |  jl_audit_log_v6    -> [{ from, to, ... }]   | |
|  |  jl_auth_session    -> sessionStorage         | |
|  +----------------------------------------------+ |
+---------------------------------------------------+
```

### Decisoes de arquitetura

| Decisao | Motivo |
|---------|--------|
| **100% client-side** | Zero custo de infraestrutura, sem backend ou banco de dados |
| **localStorage** | Persistencia simples, dados ficam no dispositivo da gestora |
| **Service Worker** | Permite uso offline e instalacao como PWA |
| **Rotacao continua** | Indices acumulam mes a mes para manter equidade a longo prazo |
| **`T12:00:00` em datas** | Evita shift de timezone UTC para local (bug classico no Brasil UTC-3) |
| **Eventos storage/visibility** | Sincroniza admin para consulta em tempo real no PWA |

---

## Como Rodar

### Pre-requisitos

- [Node.js](https://nodejs.org/) 18+
- npm ou yarn

### Instalacao

```bash
# Clone o repositorio
git clone https://github.com/graeff01/gestao_de_escala.git

# Entre na pasta
cd gestao_de_escala

# Instale as dependencias
npm install

# Rode em modo desenvolvimento
npm run dev
```

O app abrira em `http://localhost:5173`

### Build para producao

```bash
npm run build
```

Os arquivos ficam na pasta `dist/` &mdash; basta servir com qualquer servidor estatico.

### Deploy

Compativel com qualquer plataforma de hospedagem estatica:

- **Vercel** &mdash; `vercel deploy`
- **Netlify** &mdash; arraste a pasta `dist/`
- **GitHub Pages** &mdash; via GitHub Actions
- **Firebase Hosting** &mdash; `firebase deploy`

---

## Stack Tecnica

| Tecnologia | Versao | Funcao |
|------------|--------|--------|
| **React** | 19.2 | Biblioteca de UI com hooks e componentes funcionais |
| **Vite** | 7.3 | Bundler ultrarrapido com HMR |
| **Tailwind CSS** | 3.4 | Estilizacao utility-first responsiva |
| **Framer Motion** | 12.x | Animacoes fluidas e microinteracoes |
| **date-fns** | 4.1 | Manipulacao de datas com suporte a pt-BR |
| **Lucide React** | 0.575 | Biblioteca de icones SVG |
| **clsx + tailwind-merge** | &mdash; | Composicao de classes CSS condicionais |
| **Service Worker** | &mdash; | Cache inteligente e suporte offline |
| **PWA** | &mdash; | Instalacao como app nativo em mobile |
| **Cypress** | 15.x | Testes E2E automatizados |

---

## Testes E2E (Cypress)

Suite completa com **80 testes** distribuidos em **18 suites**, cobrindo seguranca, usabilidade e integridade:

| Suite | Qtd | O que valida |
|-------|-----|-------------|
| Autenticacao | 10 | Login, logout, credenciais invalidas, trim, case-sensitive, sessao |
| Protecao de Rotas | 2 | Bloqueio de conteudo admin sem login |
| Dashboard | 6 | Tabela, consultoras, mes, ano, perfil, estatisticas |
| Navegacao | 2 | Avancar/voltar meses via sidebar |
| Gestao de Consultoras | 6 | Adicionar, duplicata case-insensitive, remover com confirmacao, persistencia |
| Busca | 2 | Filtro por nome com destaque, limpeza de filtro |
| Edicao de Escala | 5 | Override manual, modal, overlay, audit log, persistencia |
| Gestao de Feriados | 5 | CRUD, duplicatas, modal open/close |
| Gestao de Ferias | 5 | CRUD, validacao data fim < inicio, persistencia localStorage |
| Historico de Trocas | 4 | Registro apos edicao, visualizacao, limpeza |
| Persistencia | 3 | Chaves localStorage, dados apos reload, limite 200 no audit log |
| View de Consulta | 4 | Acesso publico sem login, sem botoes admin, navegacao |
| Seguranca XSS | 5 | Injecao HTML, event handlers, img onerror, SQL injection no login |
| Backup/Restauracao | 3 | Botoes visiveis, validacao de versao do JSON |
| Botoes da Sidebar | 4 | Emitir Escala, Link Consultoras, clipboard, Sair |
| Integridade | 5 | 31 dias, sabados, feriados em janeiro, equidade, domingos = folga |
| Responsividade | 4 | Sidebar oculta, hamburger, tabela oculta, mini-stats mobile |
| Seguranca de Sessao | 3 | sessionStorage vs localStorage, credenciais nao expostas |

### Executar testes

```bash
# UI interativa (recomendado para desenvolvimento)
npx cypress open

# Headless (CI/CD)
npx cypress run
```

---

## Estrutura do Projeto

```
gestao_de_escala/
|
|-- public/
|   |-- sw.js                 # Service Worker (cache + offline)
|   |-- manifest.json         # Configuracao PWA
|   |-- favicon.svg           # Icone do navegador
|   |-- icon-192.svg          # Icone PWA (192x192)
|   |-- icon-512.svg          # Icone PWA (512x512)
|   +-- perfil.png            # Foto de perfil da gestora
|
|-- src/
|   |-- main.jsx              # Entry point - roteamento admin/consulta
|   |-- App.jsx               # Painel administrativo completo
|   |-- ConsultaView.jsx      # Tela de visualizacao (somente leitura)
|   |-- index.css             # Estilos globais + Tailwind
|   +-- utils/
|       +-- scheduler.js      # Motor de geracao de escalas
|
|-- index.html                # HTML base
|-- vite.config.js            # Configuracao Vite
|-- tailwind.config.js        # Configuracao Tailwind
|-- postcss.config.js         # Configuracao PostCSS
|-- package.json              # Dependencias e scripts
+-- README.md                 # Este arquivo
|
|-- cypress/
|   |-- e2e/
|   |   +-- login.cy.js       # Suite completa E2E (18 suites, 80 testes)
|   |-- support/
|   |   |-- commands.js        # Comandos customizados Cypress
|   |   +-- e2e.js             # Setup de suporte E2E
|   +-- fixtures/              # Dados de teste
+-- cypress.config.js          # Configuracao Cypress
```

### Arquivos-chave

| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `App.jsx` | ~1450 | Todo o painel admin: login, sidebar, tabela, modais, estatisticas, backup |
| `ConsultaView.jsx` | ~280 | Visualizacao publica com reatividade a mudancas em tempo real |
| `scheduler.js` | ~120 | Algoritmo de rotacao com suporte a ferias, feriados e timezone |
| `sw.js` | ~55 | Service Worker com estrategias de cache diferenciadas |

---

## Acesso

| Modo | URL | Autenticacao |
|------|-----|--------------|
| **Admin** | `https://seusite.com` | Login necessario |
| **Consulta** | `https://seusite.com?modo=consulta` | Acesso livre |

---

## Roadmap

- [x] Testes E2E com Cypress (18 suites, 80 testes)
- [ ] Exportar escala como PDF
- [ ] Notificacao via WhatsApp Web
- [ ] Tema claro/escuro na consulta
- [ ] Dashboard anual com visao compacta
- [ ] Migracao para backend (Firebase/Supabase) para multi-dispositivo

---

## Autor

**Graeff** &mdash; [@graeff01](https://github.com/graeff01)

---

<p align="center">
  <sub>Desenvolvido com React + Vite + Tailwind CSS</sub><br/>
  <sub>Design premium com tema dark (admin) e tema claro (consulta)</sub>
</p>
