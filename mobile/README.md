# 📱 OmniSaúde Mobile (React Native + Expo)

Aplicativo móvel multiplataforma (Android & iOS) do **Projeto Saúde / OmniHome Care**, desenvolvido com **React Native**, **Expo SDK 57**, **TypeScript** estrito e suporte nativo a **Geofencing GPS**.

---

## 🌟 Funcionalidades Principais

### 1. Modo Profissional de Campo (Home Care)
- **Itinerário do Dia:** Ordem sequencial de visitas, distância urbana estimada com fator de tortuosidade (1.25x) e tempo em trânsito.
- **Validação de Presença com Geofencing GPS:**
  - Cálculo de distância geodésica linear (Haversine) em tempo real entre a coordenada do satélite e o domicílio do paciente.
  - Perímetro de segurança com raio de tolerância de **150 metros**.
  - Status automático: `ON_SITE_VALIDATED` (dentro do domicílio) ou `OUT_OF_BOUNDS_ACCEPTED` (com justificativa clínica obrigatória).
- **Navegação Integrada:** Deep linking direto com aplicativos de mapas (Google Maps / Apple Maps / Waze).
- **Prontuário Eletrônico do Paciente (PEP):**
  - Registro de Anamnese estruturada no formato **SOAP** (Subjetivo, Objetivo, Avaliação e Plano).
  - Aferição de sinais vitais no leito (PA, FC, SpO2, Temperatura, Glicemia).
  - **Copiloto Clínico com IA (RAG):** Consulta inteligente a protocolos assistenciais curados para cuidados domiciliares.
  - Histórico longitudinal multiprofissional sincronizado.

### 2. Modo Gestor (Coordenação Clínica)
- **Planejador de Escalas:** Visão da cobertura de escalas no mês, vagas em aberto e distribuição por profissional.
- **Trava de Segurança (Care Team Restrito):** Validação rígida que impede profissionais fora da equipe do paciente de receberem escalas.
- **Gestão de Pacientes Domiciliares:** Busca instantânea por nome, CPF ou endereço, e cadastro de novo paciente com geocodificação de domicílio.
- **Fechamento Financeiro Contextual:** Matriz tridimensional (*Profissional x Paciente x Endereço*), com 100% dos atendimentos auditados por Geofencing.

### 3. Design System & Temas
- Suporte nativo completo a **Tema Claro** e **Tema Escuro** (Dark Mode).
- Alta acessibilidade e contraste médico com paleta Teal/Cyan e badges de estado clínico.

---

## 🚀 Como Executar o Aplicativo

### Pré-requisitos
- Node.js 20+
- Dispositivo físico com o app **Expo Go** (disponível no Google Play / App Store) OU emulador Android Studio / simulador Xcode.

### Passos:
```bash
# Navegar até a pasta mobile
cd mobile

# Iniciar o servidor de desenvolvimento Expo
npm run start
```

- Para testar na Web: pressione `w` ou execute `npm run web`.
- Para testar no Android: pressione `a` ou execute `npm run android`.
- Para testar no iOS: pressione `i` ou execute `npm run ios`.
- Para testar no celular físico: escaneie o QR Code exibido no terminal pelo app **Expo Go**.

---

## 📂 Estrutura de Pastas

```
mobile/
├── App.tsx                  # Ponto de entrada, alternância de papéis e barra de navegação
├── src/
│   ├── components/          # Componentes visuais (Header, GeofenceCheckInModal, etc.)
│   ├── data/                # Mock data de demonstração e protocolos
│   ├── screens/             # Telas principais (Route, ClinicalRecord, ScalePlanner, Patients, Financial)
│   ├── services/            # Serviços de Geofencing GPS (Haversine) e Storage Offline
│   ├── theme/               # Design tokens e temas Claro/Escuro
│   └── types/               # Tipagens TypeScript estritas
├── package.json
└── tsconfig.json
```
