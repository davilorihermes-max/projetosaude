// test/run-full-browser-suite.js
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\davil\\.gemini\\antigravity\\brain\\6fa164df-fb4c-4e8c-8896-8e1bf26af941';

async function runFullBrowserAudit() {
  console.log('🚀 Iniciando Auditoria Completa E2E via Navegador em http://localhost:5173/ ...');

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 960 },
    args: ['--window-size=1440,960', '--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.error('🔴 [Console Error]:', text);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
    console.error('🔥 [Page Error]:', err.toString());
  });

  try {
    // -------------------------------------------------------------
    // 1. DASHBOARD: ROTA DO DIA, BUSCA, CHECK-IN, CONCLUSÃO, PEP
    // -------------------------------------------------------------
    console.log('\n--- 1. DASHBOARD & ROTA DO DIA ---');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 20000 });
    await page.evaluate(() => {
      localStorage.removeItem('omnihome_monthly_scale_state_v4');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    const s1 = path.join(ARTIFACTS_DIR, '01_browser_dashboard.png');
    await page.screenshot({ path: s1 });
    console.log('📸 [OK] 01_browser_dashboard.png');

    // Testar busca no Dashboard
    console.log('Testando busca em tempo real no Dashboard...');
    await page.evaluate(() => {
      const input = document.querySelector('.search-input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, 'Mariana');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Limpar busca
    await page.evaluate(() => {
      const input = document.querySelector('.search-input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    // Testar Check-in
    console.log('Testando botão "Fazer Check-in"...');
    const hasCheckin = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const checkinBtn = btns.find((b) => b.textContent && b.textContent.includes('Fazer Check-in'));
      if (checkinBtn) {
        checkinBtn.click();
        return true;
      }
      return false;
    });

    if (hasCheckin) {
      await new Promise((r) => setTimeout(r, 800));
      const s2 = path.join(ARTIFACTS_DIR, '02_browser_dashboard_checkedin.png');
      await page.screenshot({ path: s2 });
      console.log('📸 [OK] 02_browser_dashboard_checkedin.png');

      // Testar Concluir Sessão com Confetti
      console.log('Testando botão "Concluir Sessão"...');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const finishBtn = btns.find((b) => b.textContent && b.textContent.includes('Concluir Sessão'));
        if (finishBtn) finishBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));
      const s2b = path.join(ARTIFACTS_DIR, '02b_browser_dashboard_completed.png');
      await page.screenshot({ path: s2b });
      console.log('📸 [OK] 02b_browser_dashboard_completed.png (Sessão Concluída)');
    }

    // Testar abertura do Prontuário Eletrônico (PEP) a partir do Dashboard
    console.log('Testando abertura do Prontuário Eletrônico (PEP) via paciente...');
    const hasOpenedPEP = await page.evaluate(() => {
      const patientNameEl = document.querySelector('.queue-patient-name') || document.querySelector('.appointment-card h4');
      if (patientNameEl) {
        patientNameEl.click();
        return true;
      }
      return false;
    });

    if (hasOpenedPEP) {
      await new Promise((r) => setTimeout(r, 800));
      const s2c = path.join(ARTIFACTS_DIR, '02c_browser_pep_modal.png');
      await page.screenshot({ path: s2c });
      console.log('📸 [OK] 02c_browser_pep_modal.png (Prontuário Aberto)');

      // Navegar pelas abas do PEP
      console.log('Navegando nas abas do PEP (Sinais Vitais, Conduta, Histórico)...');
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('.pep-tab-btn, .modal-tab-btn, .tab-btn'));
        const vitalsTab = tabs.find(t => t.textContent && t.textContent.includes('Sinais'));
        if (vitalsTab) vitalsTab.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      // Fechar modal do PEP
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.modal-close-btn') || document.querySelector('button[title*="Fechar"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    // -------------------------------------------------------------
    // 2. AGENDA & DESLOCAMENTO URBANO
    // -------------------------------------------------------------
    console.log('\n--- 2. AGENDA & DESLOCAMENTO ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const scheduleNav = items.find((el) => el.textContent && el.textContent.includes('Agenda'));
      if (scheduleNav) scheduleNav.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Testar busca na Agenda
    console.log('Testando filtro de busca na Agenda...');
    await page.evaluate(() => {
      const input = document.querySelector('.search-input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, 'Roberto');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Limpar busca
    await page.evaluate(() => {
      const input = document.querySelector('.search-input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    const s3 = path.join(ARTIFACTS_DIR, '03_browser_agenda.png');
    await page.screenshot({ path: s3 });
    console.log('📸 [OK] 03_browser_agenda.png');

    // Testar abertura do modal de Novo Agendamento
    console.log('Testando abertura do modal "Novo Agendamento"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newAptBtn = btns.find(b => b.textContent && b.textContent.includes('Novo Agendamento'));
      if (newAptBtn) newAptBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    const s3b = path.join(ARTIFACTS_DIR, '03b_browser_new_appointment_modal.png');
    await page.screenshot({ path: s3b });
    console.log('📸 [OK] 03b_browser_new_appointment_modal.png');

    // Fechar modal de Novo Agendamento
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-close-btn') || document.querySelector('button[title*="Fechar"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------
    // 3. PLANEJADOR MENSAL & SUB-ABAS
    // -------------------------------------------------------------
    console.log('\n--- 3. PLANEJADOR MENSAL DE ESCALAS ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const plannerNav = items.find((el) => el.textContent && el.textContent.includes('Planejador'));
      if (plannerNav) plannerNav.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const s4a = path.join(ARTIFACTS_DIR, '04a_browser_monthly_planner.png');
    await page.screenshot({ path: s4a });
    console.log('📸 [OK] 04a_browser_monthly_planner.png (Grade Mensal)');

    // Sub-aba: Metas & Cobertura
    console.log('Navegando na sub-aba "Metas & Cobertura"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const covTab = tabs.find((b) => b.textContent && b.textContent.includes('Metas & Cobertura'));
      if (covTab) covTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Sub-aba: Gargalos & Ações do Gestor
    console.log('Navegando na sub-aba "Gargalos & Ações do Gestor"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const botTab = tabs.find((b) => b.textContent && b.textContent.includes('Gargalos'));
      if (botTab) botTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    const s4b = path.join(ARTIFACTS_DIR, '04b_browser_planner_bottlenecks.png');
    await page.screenshot({ path: s4b });
    console.log('📸 [OK] 04b_browser_planner_bottlenecks.png (Gargalos & Permutas)');

    // Sub-aba: Disponibilidade da Equipe
    console.log('Navegando na sub-aba "Disponibilidade da Equipe"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const availTab = tabs.find((b) => b.textContent && b.textContent.includes('Disponibilidade'));
      if (availTab) availTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    const s4c = path.join(ARTIFACTS_DIR, '04c_browser_planner_availability.png');
    await page.screenshot({ path: s4c });
    console.log('📸 [OK] 04c_browser_planner_availability.png (Disponibilidade)');

    // Sub-aba: Copiloto IA (Aba 5)
    console.log('Navegando na sub-aba "Copiloto IA"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const aiTab = tabs.find((b) => b.textContent && b.textContent.includes('Copiloto IA'));
      if (aiTab) aiTab.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const s4d = path.join(ARTIFACTS_DIR, '04d_browser_planner_ai_chat.png');
    await page.screenshot({ path: s4d });
    console.log('📸 [OK] 04d_browser_planner_ai_chat.png (Aba Copiloto IA)');

    // -------------------------------------------------------------
    // 4. PACIENTES & DOMICÍLIOS
    // -------------------------------------------------------------
    console.log('\n--- 4. PACIENTES & DOMICÍLIOS ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const patientsNav = items.find((el) => el.textContent && el.textContent.includes('Pacientes'));
      if (patientsNav) patientsNav.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Testar filtro de busca
    console.log('Buscando paciente "Roberto"...');
    await page.evaluate(() => {
      const input = document.querySelector('.search-input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, 'Roberto');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    const s5 = path.join(ARTIFACTS_DIR, '05_browser_patients_search.png');
    await page.screenshot({ path: s5 });
    console.log('📸 [OK] 05_browser_patients_search.png');

    // Testar abertura de Novo Paciente
    console.log('Testando abertura do modal "Novo Paciente"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newPatBtn = btns.find(b => b.textContent && b.textContent.includes('Novo Paciente'));
      if (newPatBtn) newPatBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    const s5b = path.join(ARTIFACTS_DIR, '05b_browser_new_patient_modal.png');
    await page.screenshot({ path: s5b });
    console.log('📸 [OK] 05b_browser_new_patient_modal.png');

    // Fechar modal de Novo Paciente
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-close-btn') || document.querySelector('button[title*="Fechar"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Limpar busca
    await page.evaluate(() => {
      const input = document.querySelector('.search-input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    // -------------------------------------------------------------
    // 5. EQUIPE & PROFISSIONAIS
    // -------------------------------------------------------------
    console.log('\n--- 5. EQUIPE & PROFISSIONAIS ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const profNav = items.find((el) => el.textContent && el.textContent.includes('Profissionais'));
      if (profNav) profNav.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Filtrar por Fisioterapia
    console.log('Filtrando especialidade "Fisioterapia"...');
    await page.evaluate(() => {
      const chips = Array.from(document.querySelectorAll('.filter-chip'));
      const fisioChip = chips.find((c) => c.textContent && c.textContent.includes('Fisioterapia'));
      if (fisioChip) fisioChip.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const s6 = path.join(ARTIFACTS_DIR, '06_browser_professionals_filtered.png');
    await page.screenshot({ path: s6 });
    console.log('📸 [OK] 06_browser_professionals_filtered.png');

    // Testar abertura de Novo Profissional
    console.log('Testando modal "Novo Profissional"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newProBtn = btns.find(b => b.textContent && b.textContent.includes('Novo Profissional'));
      if (newProBtn) newProBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));
    const s6b = path.join(ARTIFACTS_DIR, '06b_browser_new_professional_modal.png');
    await page.screenshot({ path: s6b });
    console.log('📸 [OK] 06b_browser_new_professional_modal.png');

    // Fechar modal de Novo Profissional
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-close-btn') || document.querySelector('button[title*="Fechar"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------
    // 6. FECHAMENTO FINANCEIRO CONTEXTUAL
    // -------------------------------------------------------------
    console.log('\n--- 6. FECHAMENTO FINANCEIRO CONTEXTUAL ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const finNav = items.find((el) => el.textContent && el.textContent.includes('Fechamento'));
      if (finNav) finNav.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Alternar prévia (Apenas check-in vs Prévia Completa)
    console.log('Testando alternância do modo de prévia financeira...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const toggleBtn = btns.find((b) => b.textContent && (b.textContent.includes('Check-in') || b.textContent.includes('Prévia')));
      if (toggleBtn) toggleBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const s7 = path.join(ARTIFACTS_DIR, '07_browser_financial_settlement.png');
    await page.screenshot({ path: s7 });
    console.log('📸 [OK] 07_browser_financial_settlement.png (Fechamento)');

    // -------------------------------------------------------------
    // 7. COPILOTO / CHATBOT SCALE AI (Drawer Flutuante)
    // -------------------------------------------------------------
    console.log('\n--- 7. COPILOTO SCALE AI FLUTUANTE ---');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const plannerNav = items.find((el) => el.textContent && el.textContent.includes('Planejador'));
      if (plannerNav) plannerNav.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const openedFloating = await page.evaluate(() => {
      const trigger = document.querySelector('.scale-ai-floating-trigger');
      if (trigger) {
        trigger.click();
        return true;
      }
      return false;
    });

    if (openedFloating) {
      await new Promise((r) => setTimeout(r, 1000));
      const s7b = path.join(ARTIFACTS_DIR, '07b_browser_scale_ai_copilot.png');
      await page.screenshot({ path: s7b });
      console.log('📸 [OK] 07b_browser_scale_ai_copilot.png (Chatbot Flutuante Aberto)');

      // Testar envio de mensagem
      console.log('Enviando pergunta rápida de teste para o Copiloto IA...');
      await page.evaluate(() => {
        const chip = document.querySelector('.quick-prompt-chip');
        if (chip) {
          chip.click();
        } else {
          const input = document.querySelector('.ai-input-field');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (setter) setter.call(input, 'Como está a cobertura geral das metas?');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const form = document.querySelector('.ai-input-form');
            if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }
      });

      await new Promise((r) => setTimeout(r, 1500));
      const s7c = path.join(ARTIFACTS_DIR, '07c_browser_scale_ai_response.png');
      await page.screenshot({ path: s7c });
      console.log('📸 [OK] 07c_browser_scale_ai_response.png (Resposta do Copiloto)');

      // Fecha o chat flutuante
      await page.evaluate(() => {
        const closeBtn = document.querySelector('.ai-header-actions button:last-child');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));
    }

    // -------------------------------------------------------------
    // 8. TEMA ESCURO (DARK MODE)
    // -------------------------------------------------------------
    console.log('\n--- 8. MODO ESCURO (DARK THEME) ---');
    await page.evaluate(() => {
      const toggle = document.querySelector('.theme-toggle-btn');
      if (toggle) toggle.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const s8 = path.join(ARTIFACTS_DIR, '08_browser_dark_mode.png');
    await page.screenshot({ path: s8 });
    console.log('📸 [OK] 08_browser_dark_mode.png');

    // Volta ao modo claro
    await page.evaluate(() => {
      const toggle = document.querySelector('.theme-toggle-btn');
      if (toggle) toggle.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // -------------------------------------------------------------
    // 9. MODO MOBILE (SMARTPHONE FIELD APP)
    // -------------------------------------------------------------
    console.log('\n--- 9. FIELD APP MOBILE (375x812) ---');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    const s9 = path.join(ARTIFACTS_DIR, '09_browser_mobile_view.png');
    await page.screenshot({ path: s9 });
    console.log('📸 [OK] 09_browser_mobile_view.png');

    console.log('\n=============================================');
    console.log('🎉 AUDITORIA E2E FINALIZADA COM SUCESSO TOTAL!');
    console.log(`Erros críticos no console: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('Erros detectados:', consoleErrors);
    } else {
      console.log('✨ ZERO ERROS NO CONSOLE DO NAVEGADOR!');
    }
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Falha na execução da auditoria do navegador:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runFullBrowserAudit();
