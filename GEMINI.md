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

## 👥 2. Diretrizes de Pair Programming (Pai & Filho)

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
