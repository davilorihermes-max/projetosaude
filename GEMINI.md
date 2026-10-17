# Diretrizes e Contexto do Projeto Saúde (Google Antigravity)

Bem-vindo ao **Projeto Saúde**, um sistema robusto de gestão clínica, escalas com roteirização urbana, prontuário com IA (RAG) e fechamento financeiro, desenvolvido em conjunto por **Sérgio Hermes Meyer** ([@sergiohermesmeyer](https://github.com/sergiohermesmeyer)) e seu filho **Davi Lori Hermes** ([@davilorihermes-max](https://github.com/davilorihermes-max)).

---

## 🏗️ 1. Arquitetura do Sistema

### Stack Tecnológica
- **Linguagem & Runtime:** Node.js (v20+ / v24) com TypeScript 5.6+
- **ORM & Banco de Dados:** Prisma ORM 5.22+ com PostgreSQL 16 e extensão `pgvector`
- **Validação de Schemas:** Zod
- **Autenticação:** JWT com bcrypt/argon2
- **Containerização:** Docker Compose (`docker-compose.yml` para banco e pgvector)

### Principais Módulos do Backend
1. **`scheduling` (Motor de Escala & Deslocamento):**
   - Regra de Ouro: **Care Team Restrito**. Profissionais fora da equipe autorizada do paciente jamais podem ser escalados.
   - Roteirização inteligente: Cálculo de deslocamento geográfico (Haversine + fator de tortuosidade urbana) entre os atendimentos consecutivos.
   - Suporte dual: Atendimento por escala institucional da clínica vs. atendimento autônomo.
2. **`clinical-records` (Prontuário & RAG Clínico):**
   - Copiloto clínico com RAG de 3 pilares: Anamnese estruturada + Histórico longitudinal da equipe + Base curada de protocolos no `pgvector`.
3. **`ai-agent` (Chatbot do Gestor com Tool Calling):**
   - Agente inteligente que permite identificar gargalos na escala, vagas ociosas e sugerir permutas viáveis em linguagem natural.
4. **`financial` (Fechamento Financeiro Contextual):**
   - Matriz de precificação multidimensional: **Profissional x Paciente x Endereço**.

---

## 👥 2. Diretrizes de Pair Programming & Matriz de Responsabilidades

### Divisão Oficial de Módulos & Ownership
- **Sérgio Hermes Meyer ([@sergiohermesmeyer](https://github.com/sergiohermesmeyer)):**
  - 🛡️ **Servidor HTTP, Segurança & Auth:** Fastify, rotas de autenticação, tokens JWT, hash Bcrypt e middlewares de autorização (`requireRole`).
  - 📅 **Integração do Scheduler & Escalas:** Serviços de agendamento, avaliação de viabilidade geodésica, motor de cruzamento de demandas e travas do Care Team.
  - 💰 **Fechamento Financeiro Contextual:** Matriz tridimensional de precificação (Profissional x Paciente x Endereço) e snapshots imutáveis.
  - *Branches de Trabalho:* `feat/sergio-<descricao>`

- **Davi Lori Hermes ([@davilorihermes-max](https://github.com/davilorihermes-max)):**
  - 🧠 **Prontuário Eletrônico (PEP) com Copiloto RAG & IA:** Anamnese estruturada, histórico longitudinal e busca vetorial por similaridade no `pgvector`.
  - 📍 **Check-in & Presença com Geofencing:** Validação espacial de presença no domicílio, raio de tolerância em metros e resolução de endereços.
  - 🎨 **Frontend & Experiência do Usuário (UI):** Telas React/Vite, dashboard de rotas domiciliares, gestão de temas e componentes visuais.
  - *Branches de Trabalho:* `feat/davi-<descricao>`

### Princípios de Trabalho em Dupla
- O Antigravity atua como **Tech Lead, Arquiteto e Pair Programmer** amigável e didático.
- **Explicações Claras:** Ao sugerir novas funções, schemas ou refatorações, explique brevemente o porquê de cada decisão técnica para enriquecer a experiência de aprendizado contínuo da dupla.
- **Tipagem Estrita:** Sempre manter tipos TypeScript estritos e seguros, aproveitando as tipagens geradas pelo Prisma Client.
- **Qualidade & Testes:** Validar código executando checagem de tipos (`npx tsc --noEmit` ou `npm run build`) antes de finalizar mudanças.

---

## 🌿 3. Fluxo de Trabalho Git & Versionamento

- **Branch principal:** `main` (código estável e validado pelo CI).
- **Trabalho em Branches:**
  - `feat/sergio-<descricao>` para tarefas implementadas pelo Sérgio.
  - `feat/davi-<descricao>` para tarefas implementadas pelo Davi.
- **Conventional Commits obrigatório:**
  - `feat: nova funcionalidade`
  - `fix: correção de bug`
  - `docs: documentação`
  - `refactor: refatoração de código`
  - `test: testes unitários/integrados`
- **Sincronização:** Antes de iniciar qualquer tarefa, executar:
  ```bash
  git pull origin main
  ```

---

## 🔒 4. Segurança e Privacidade em Saúde

- **Zero vazamento de segredos:** Nunca subir chaves, senhas ou tokens. Usar exclusivamente variáveis de ambiente (`.env`).
- **Anonimização & Conformidade:** Dados clínicos e cadastrais são confidenciais. Nunca expor identificadores pessoais em logs de erro ou payloads de depuração.

---

## 🚀 5. Deploy na Vercel (Desenvolvimento & Produção)

### 🛑 Regra de Ouro Obrigatória: Deploy SEMPRE da branch `main` do GitHub
- **Todo deploy DEVE ser feito SEMPRE e EXCLUSIVAMENTE a partir da branch `main` do GitHub.**
- **Nunca executar deploy a partir de branches de feature (`feat/...`) ou com alterações locais não integradas.**
- O comando `npm run deploy` possui trava de segurança automatizada (`scripts/deploy.js`) que:
  1. Bloqueia imediatamente o deploy caso você esteja em qualquer branch diferente de `main`.
  2. Bloqueia o deploy se houver alterações de código locais não commitadas.
  3. Atualiza automaticamente a `main` local com o GitHub (`git pull --ff-only origin main`), garantindo que alterações e PRs recém-aprovados do Sérgio ou do Davi sempre entrem em produção.
  4. Bloqueia o deploy se houver commits locais ainda não enviados ao GitHub (`git push origin main`).

O processo de deploy está unificado para **Sérgio** e **Davi**, garantindo que ambos possam atualizar a aplicação facilmente:

### Opção 1: Comando Unificado via Terminal
Basta executar na raiz do projeto:
```bash
npm run deploy
```
*O script `scripts/deploy.js` inicializa automaticamente o arquivo `.vercel/project.json` (se necessário), compila a aplicação, sobe para o Vercel e atualiza ambos os domínios de uma só vez:*
1. **Development / Staging:** `https://projetosaude-gamma.vercel.app`
2. **Production Oficial:** `https://omnihomecare.vercel.app`

### Opção 2: Deploy Automático via GitHub Actions (Recomendado para o Sérgio)
- Ao fazer merge de qualquer Pull Request para a branch `main`, o GitHub Actions roda os testes e faz o deploy de produção automaticamente.
- Também é possível disparar manualmente: acesse a aba **Actions** no GitHub ➔ selecione **CD - Deploy Vercel Produção** ➔ clique em **Run workflow**.
- *Requisito:* configurar o secret `VERCEL_TOKEN` no repositório GitHub (`Settings ➔ Secrets and variables ➔ Actions`).

### Autenticação Local do Sérgio (`@sergiohermesmeyer`):
- O Sérgio pode se autenticar no terminal com `npx vercel login` ou simplesmente adicionar no `.env.local`:
  ```env
  VERCEL_TOKEN=seu_token_aqui
  ```


