// test/browser-automation.js
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\davil\\.gemini\\antigravity-ide\\brain\\b2cdaba0-06a9-4b23-9791-6be44805d516';

async function runBrowserTest() {
  console.log('🚀 Starting Puppeteer browser automation against http://localhost:5173/ ...');

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1300, height: 980 },
    args: ['--window-size=1300,980', '--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('1. Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Check if user is currently logged in
    const isProfileBtn = await page.evaluate(() => {
      const btn = document.querySelector('button.auth-session-btn');
      return btn && btn.textContent && btn.textContent.includes('Perfil');
    });

    if (isProfileBtn) {
      console.log('2. Clicking "Perfil" button to open ProfileModal and logging out...');
      await page.click('button.auth-session-btn');
      await new Promise((r) => setTimeout(r, 800));

      // Click "Encerrar Sessão"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const encBtn = btns.find((b) => b.textContent && b.textContent.includes('Encerrar Sessão'));
        if (encBtn) encBtn.click();
      });
      await new Promise((r) => setTimeout(r, 600));

      // Click confirmation "Sim, Sair"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const confirmBtn = btns.find((b) => b.textContent && b.textContent.includes('Sim, Sair'));
        if (confirmBtn) confirmBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log('3. Opening Login / Registration Modal...');
    await page.click('button.auth-session-btn');
    await new Promise((r) => setTimeout(r, 800));

    console.log('4. Switching to "Cadastrar Perfil Profissional" (Tab 2)...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const registerTab = tabs.find((b) => b.textContent && b.textContent.includes('Cadastrar'));
      if (registerTab) registerTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const cleanModalPath = path.join(ARTIFACTS_DIR, '02_clean_profile_creation_form.png');
    await page.screenshot({ path: cleanModalPath });
    console.log('📸 Captured 02_clean_profile_creation_form.png');

    console.log('5. Filling in strict healthcare profile credentials with exact label targeting...');
    const generatedEmail = `beatriz.${Date.now()}@omnisaude.com.br`;

    await page.evaluate((email) => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const groups = Array.from(document.querySelectorAll('.form-group'));
      for (const g of groups) {
        const label = g.querySelector('label')?.textContent || '';
        const input = g.querySelector('input');
        if (!input) continue;

        if (label.includes('Nome Completo')) setVal(input, 'Dra. Beatriz Albuquerque');
        if (label.includes('E-mail Corporativo')) setVal(input, email);
        if (label.includes('CPF')) setVal(input, '529.982.247-25');
        if (label.includes('Telefone')) setVal(input, '(11) 98765-4321');
        if (label.includes('Registro Ativo no Conselho')) setVal(input, 'CREFITO-3/SP 88.340-F');
        if (label.includes('Especialidade Clínica')) setVal(input, 'Fisioterapia Cardiorrespiratória & Motora');
        if (label.includes('Senha de Acesso')) setVal(input, 'NeurologiaSec2026!');
        if (label.includes('Confirmar Senha')) setVal(input, 'NeurologiaSec2026!');
      }

      // Base address input
      const allInputs = Array.from(document.querySelectorAll('input'));
      const baseInput = allInputs.find(i => i.placeholder && i.placeholder.includes('Rua'));
      if (baseInput) {
        setVal(baseInput, 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP');
      }
    }, generatedEmail);

    await new Promise((r) => setTimeout(r, 800));

    // Scroll modal container down to reveal the interactive password checklist and strength meter
    await page.evaluate(() => {
      const scrollable = document.querySelector('.modal-container > div[style*="overflow-y"], .modal-container div[style*="overflow"]');
      if (scrollable) {
        scrollable.scrollTop = 420;
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    const filledModalPath = path.join(ARTIFACTS_DIR, '03_profile_checklist_and_strength.png');
    await page.screenshot({ path: filledModalPath });
    console.log('📸 Captured 03_profile_checklist_and_strength.png');

    console.log('6. Submitting profile registration...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find((b) => b.textContent && b.textContent.includes('Cadastrar e Ativar Perfil'));
      if (submitBtn) submitBtn.click();
    });

    await new Promise((r) => setTimeout(r, 3000));

    const finalPath = path.join(ARTIFACTS_DIR, '04_registered_dashboard_view.png');
    await page.screenshot({ path: finalPath });
    console.log('📸 Captured 04_registered_dashboard_view.png');

    console.log('🎉 Browser automation completed successfully!');
    console.log('Leaving Chrome open for 6 seconds so you can see it live...');
    await new Promise((r) => setTimeout(r, 6000));

  } catch (err) {
    console.error('❌ Error during browser test:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserTest();
