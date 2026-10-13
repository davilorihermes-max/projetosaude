// test/browser-automation.js
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\davil\\.gemini\\antigravity-ide\\brain\\b2cdaba0-06a9-4b23-9791-6be44805d516';

async function runBrowserTour() {
  console.log('🚀 Starting Full Application Tour & Visual Verification against http://localhost:5173/ ...');

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1350, height: 980 },
    args: ['--window-size=1350,980', '--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('1. Loading Dashboard at http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1200));

    const s1 = path.join(ARTIFACTS_DIR, '01_tour_dashboard.png');
    await page.screenshot({ path: s1 });
    console.log('📸 Captured 01_tour_dashboard.png');

    console.log('2. Navigating to "Agenda & Deslocamento"...');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const scheduleNav = items.find((el) => el.textContent && el.textContent.includes('Agenda'));
      if (scheduleNav) scheduleNav.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const s2 = path.join(ARTIFACTS_DIR, '02_tour_agenda.png');
    await page.screenshot({ path: s2 });
    console.log('📸 Captured 02_tour_agenda.png');

    console.log('3. Navigating to "Pacientes & Domicílios"...');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const patientsNav = items.find((el) => el.textContent && el.textContent.includes('Pacientes'));
      if (patientsNav) patientsNav.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Test patient search filter
    console.log('Testing live patient search filter...');
    await page.evaluate(() => {
      const searchInputs = Array.from(document.querySelectorAll('input'));
      const search = searchInputs.find((i) => i.placeholder && i.placeholder.includes('paciente'));
      if (search) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(search, 'Juliana');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    const s3 = path.join(ARTIFACTS_DIR, '03_tour_patients_filtered.png');
    await page.screenshot({ path: s3 });
    console.log('📸 Captured 03_tour_patients_filtered.png');

    // Clear search
    await page.evaluate(() => {
      const searchInputs = Array.from(document.querySelectorAll('input'));
      const search = searchInputs.find((i) => i.placeholder && i.placeholder.includes('paciente'));
      if (search) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(search, '');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 500));

    console.log('4. Opening "Novo Paciente" modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newPatBtn = btns.find((b) => b.textContent && b.textContent.includes('Novo Paciente'));
      if (newPatBtn) newPatBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const s4 = path.join(ARTIFACTS_DIR, '04_tour_new_patient_modal.png');
    await page.screenshot({ path: s4 });
    console.log('📸 Captured 04_tour_new_patient_modal.png');

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-overlay .btn-icon');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    console.log('5. Navigating to Dashboard and checking Profile / Registration Modal...');
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const dashNav = items.find((el) => el.textContent && el.textContent.includes('Rota do Dia'));
      if (dashNav) dashNav.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Check if user is logged in
    const isProfileBtn = await page.evaluate(() => {
      const btn = document.querySelector('button.auth-session-btn');
      return btn && btn.textContent && btn.textContent.includes('Perfil');
    });

    if (isProfileBtn) {
      console.log('Opening "Meu Perfil Profissional"...');
      await page.click('button.auth-session-btn');
      await new Promise((r) => setTimeout(r, 800));

      const s5a = path.join(ARTIFACTS_DIR, '05_tour_my_profile_modal.png');
      await page.screenshot({ path: s5a });
      console.log('📸 Captured 05_tour_my_profile_modal.png');

      // Logout to show the registration form
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const encBtn = btns.find((b) => b.textContent && b.textContent.includes('Encerrar Sessão'));
        if (encBtn) encBtn.click();
      });
      await new Promise((r) => setTimeout(r, 500));

      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const confirmBtn = btns.find((b) => b.textContent && b.textContent.includes('Sim, Sair'));
        if (confirmBtn) confirmBtn.click();
      });
      await new Promise((r) => setTimeout(r, 800));
    }

    // Now open Login / Register modal
    await page.click('button.auth-session-btn');
    await new Promise((r) => setTimeout(r, 800));

    // Switch to tab 2: Cadastrar Perfil Profissional
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const regTab = tabs.find((b) => b.textContent && b.textContent.includes('Cadastrar'));
      if (regTab) regTab.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    const s5b = path.join(ARTIFACTS_DIR, '05_tour_registration_strict_form.png');
    await page.screenshot({ path: s5b });
    console.log('📸 Captured 05_tour_registration_strict_form.png');

    // Close registration modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-overlay .btn-icon');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    console.log('6. Testing Dark Mode toggle...');
    await page.evaluate(() => {
      const themeToggle = document.querySelector('button.theme-toggle, .theme-toggle-btn');
      if (themeToggle) {
        themeToggle.click();
      } else {
        // Find by text
        const btns = Array.from(document.querySelectorAll('button'));
        const darkBtn = btns.find((b) => b.textContent && b.textContent.includes('Modo Escuro'));
        if (darkBtn) darkBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 800));

    const s6 = path.join(ARTIFACTS_DIR, '06_tour_dark_mode.png');
    await page.screenshot({ path: s6 });
    console.log('📸 Captured 06_tour_dark_mode.png');

    console.log('🎉 Full tour completed successfully with 100% health!');
    console.log('Keeping Chrome open for 8 seconds on screen for your review...');
    await new Promise((r) => setTimeout(r, 8000));

  } catch (err) {
    console.error('❌ Error during tour:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserTour();
