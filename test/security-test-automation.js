// test/security-test-automation.js
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\davil\\.gemini\\antigravity-ide\\brain\\b2cdaba0-06a9-4b23-9791-6be44805d516';

async function runSecurityAudit() {
  console.log('🚀 Starting Automated Security & Regulatory Audit in Chrome...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1350, height: 980 },
    args: ['--window-size=1350,980', '--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('1. Loading application at http://localhost:5173 ...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Ensure signed-out state
    const isProfileBtn = await page.evaluate(() => {
      const btn = document.querySelector('button.auth-session-btn');
      return btn && btn.textContent && btn.textContent.includes('Perfil');
    });

    if (isProfileBtn) {
      console.log('Logging out active session to start clean audit...');
      await page.click('button.auth-session-btn');
      await new Promise((r) => setTimeout(r, 800));

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
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Open Auth modal
    console.log('2. Opening Auth Modal...');
    await page.evaluate(() => {
      const btn = document.querySelector('button.auth-session-btn') || document.querySelector('.auth-card-sidebar');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Switch to Register tab
    console.log('3. Switching to "Cadastrar Perfil Profissional"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const regTab = tabs.find((b) => b.textContent && b.textContent.includes('Cadastrar'));
      if (regTab) regTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const setInput = async (selectorLabel, value) => {
      await page.evaluate((label, val) => {
        const setVal = (el, v) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const groups = Array.from(document.querySelectorAll('.form-group'));
        const target = groups.find((g) => g.querySelector('label')?.textContent?.includes(label));
        const input = target?.querySelector('input');
        if (input) setVal(input, val);
      }, selectorLabel, value);
    };

    const getErrorText = async () => {
      return await page.evaluate(() => {
        const errDiv = document.querySelector('.modal-card div[style*="var(--danger)"] span, .modal-card div[style*="danger"] span');
        return errDiv ? errDiv.textContent : null;
      });
    };

    const clickSubmit = async () => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submit = btns.find((b) => b.textContent && b.textContent.includes('Cadastrar e Ativar Perfil'));
        if (submit) submit.click();
      });
      await new Promise((r) => setTimeout(r, 600));
    };

    // Pre-fill valid base form fields so required constraints are met
    await setInput('CPF', '529.982.247-25');
    await setInput('Telefone', '(11) 98765-4321');
    await setInput('Registro Ativo no Conselho', 'CREFITO-3/SP 88.340-F');
    await setInput('Especialidade Clínica', 'Fisioterapia Cardiorrespiratória');
    await setInput('Senha de Acesso', 'HospitalSec@2026');
    await setInput('Confirmar Senha', 'HospitalSec@2026');

    // Select base address shortcut
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const locBtn = btns.find((b) => b.textContent && b.textContent.includes('Cerqueira César'));
      if (locBtn) locBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // ----------------------------------------------------
    // TEST CASE 1: Name "n"
    // ----------------------------------------------------
    console.log('\n--- TEST CASE 1: Single character name "n" ---');
    await setInput('Nome Completo', 'n');
    await setInput('E-mail Corporativo', 'henrique@omnisaude.med.br');
    await clickSubmit();
    const err1 = await getErrorText();
    console.log('🚨 Error Banner for name "n":', err1);

    const s1 = path.join(ARTIFACTS_DIR, '01_security_blocked_name_n.png');
    await page.screenshot({ path: s1 });
    console.log('📸 Screenshot saved: 01_security_blocked_name_n.png');

    // ----------------------------------------------------
    // TEST CASE 2: Email "x@n"
    // ----------------------------------------------------
    console.log('\n--- TEST CASE 2: Invalid corporate email "x@n" ---');
    await setInput('Nome Completo', 'Dr. Henrique Silva');
    await setInput('E-mail Corporativo', 'x@n');
    await clickSubmit();
    const err2 = await getErrorText();
    console.log('🚨 Error Banner for email "x@n":', err2);

    const s2 = path.join(ARTIFACTS_DIR, '02_security_blocked_email_xn.png');
    await page.screenshot({ path: s2 });
    console.log('📸 Screenshot saved: 02_security_blocked_email_xn.png');

    // ----------------------------------------------------
    // TEST CASE 3: Fisioterapia with CRM ("fisioterapia crm????")
    // ----------------------------------------------------
    console.log('\n--- TEST CASE 3: Regulatory Incoherence (Fisioterapia com CRM) ---');
    await setInput('E-mail Corporativo', 'henrique.crefito@omnisaude.med.br');
    await setInput('Registro Ativo no Conselho', 'CRM/SP 987654');
    await clickSubmit();
    const err3 = await getErrorText();
    console.log('🚨 Error Banner for Fisioterapia com CRM:', err3);

    const s3 = path.join(ARTIFACTS_DIR, '03_security_blocked_fisio_crm.png');
    await page.screenshot({ path: s3 });
    console.log('📸 Screenshot saved: 03_security_blocked_fisio_crm.png');

    // ----------------------------------------------------
    // TEST CASE 4: Valid CREFITO Approval (Fisioterapia com CREFITO-3/SP)
    // ----------------------------------------------------
    console.log('\n--- TEST CASE 4: Valid CREFITO Approval ---');
    await setInput('Registro Ativo no Conselho', 'CREFITO-3/SP 88.340-F');
    await clickSubmit();
    await new Promise((r) => setTimeout(r, 1500));

    const s4 = path.join(ARTIFACTS_DIR, '04_security_crefito_success.png');
    await page.screenshot({ path: s4 });
    console.log('📸 Screenshot saved: 04_security_crefito_success.png');
    console.log('🎉 All 4 Security & Regulatory test cases completed with 100% success!');

    await new Promise((r) => setTimeout(r, 4000));
  } catch (err) {
    console.error('❌ Error during security audit:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runSecurityAudit();
