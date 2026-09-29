# Sistema de Gestão de Atendimentos, Escalas, Check-in e Fechamento em Saúde

Sistema integrado para gestão de atendimentos em saúde (Fisioterapia, Fonoaudiologia, Terapia Ocupacional, etc.), suportando tanto escalas institucionais quanto atuação autônoma independente, com controle rigoroso de **Care Team**, matriz de deslocamento urbano, prontuário assistido por IA (RAG) e fechamento financeiro contextual multidimensional.

Desenvolvido por **Sérgio** e **Davi**.

---

## 🚀 Principais Módulos do Sistema

1. **Gestão Clínica & Care Team Restrito:**
   - Cada paciente possui uma equipe designada de profissionais de saúde habilitados (`Care Team`).
   - Validação estrita: profissionais fora da equipe do paciente não podem ser escalados nem realizar atendimentos/substituições para ele.
   - Gestão de múltiplos endereços com calendário de exceções para definir o local ativo em cada data.

2. **Motor de Escalas & Tempo de Deslocamento:**
   - Suporte duplo: **Escala Institucional da Clínica** e **Modo Autônomo com Agenda Própria**.
   - Heurística de roteirização com cálculo de distância (Haversine + tortuosidade urbana) e janelas obrigatórias de trânsito entre atendimentos.
   - Chatbot do Gestor com *Tool Calling* para identificar gargalos e sugerir permutas viáveis em linguagem natural.

3. **Check-in Georreferenciado & Prontuário Inteligente:**
   - Registro de presença no local com geofencing opcional.
   - Prontuário com gravação/transcrição de áudio e sumarização clínica automática.
   - Copiloto com RAG de 3 Pilares (Anamnese Estruturada + Histórico Longitudinal da Equipe + Base Curada de Protocolos no `pgvector`).

4. **Fechamento Financeiro Contextual:**
   - Precificação flexível: **Profissional x Paciente x Endereço**.
   - Fechamentos periódicos (semanal, decendial, mensal) com snapshot imutável e conferência em duas etapas.

---

## 📂 Estrutura do Repositório

```text
projetosaude/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pipeline de integração contínua (CI)
├── backend/                           # Serviços de domínio (RAG, Geofencing, Financeiro)
├── prisma/                            # Schema relacional, migrações e seed
├── src/                               # Servidor Fastify, rotas e Frontend React/Vite
├── test/                              # Suíte de testes automatizados (Vitest e E2E)
├── docker-compose.yml                 # PostgreSQL 16 com extensão pgvector
├── .env.example                       # Variáveis de ambiente
├── .gitignore                         # Regras de exclusão do Git
└── README.md
```

---

## 🛠️ Como Iniciar o Ambiente de Desenvolvimento

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) v20+ ou v22+
- [Docker Desktop](https://www.docker.com/) (opcional para o PostgreSQL)
- [Git](https://git-scm.com/)

### 2. Instalar Dependências e Gerar Prisma
```bash
npm install
npx prisma generate
```

### 3. Rodar Testes Automatizados (Vitest)
```bash
npm run test
```

### 4. Iniciar a Aplicação
```bash
# Terminal 1: Servidor Fastify (API na porta 3001)
npm run start:server

# Terminal 2: Frontend Vite (Web na porta 5173)
npm run dev
```

---

## 👥 Fluxo de Trabalho (Sérgio & Davi)

1. Crie uma branch para cada funcionalidade:
   ```bash
   git checkout -b feat/nome-da-funcionalidade
   ```
2. Ao concluir, envie sua branch e abra um **Pull Request (PR)** para revisão do parceiro:
   ```bash
   git push origin feat/nome-da-funcionalidade
   ```
3. O CI do GitHub Actions validará automaticamente o schema do Prisma, tipos TypeScript e testes unitários.
