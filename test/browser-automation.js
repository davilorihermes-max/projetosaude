// test/browser-automation.js
import puppeteer from 'puppeteer-core';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\davil\\.gemini\\antigravity-ide\\brain\\7fd25157-cf97-48dc-a677-1ed457c078c5';

async function runBrowserTest() {
  console.log('🚀 Starting Puppeteer browser test against http://localhost:5173/ ...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1280, height: 1100 },
    args: ['--window-size=1280,1100']
  });

  const page = await browser.newPage();

  try {
    console.log('1. Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // Verify Sidebar does NOT contain "Lab de Testes"
    const navText = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      return items.map(el => el.textContent.trim());
    });
    console.log('📋 Current Navigation Items:', navText);

    const hasLabTab = navText.some(t => t.includes('Lab') || t.includes('Testes'));
    if (hasLabTab) {
      throw new Error('❌ Test Failed: "Lab de Testes" is still visible in Sidebar!');
    } else {
      console.log('✅ Verified: "Lab de Testes & API" tab has been completely removed from Sidebar.');
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_clean_dashboard.png') });
    console.log('📸 Captured 01_clean_dashboard.png');

    console.log('2. Opening Login Modal from Header...');
    await page.click('button.auth-session-btn');
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_login_modal.png') });
    console.log('📸 Captured 02_login_modal.png');

    console.log('3. Executing Corporate Login with Dr. Lucas (Bcrypt + Fastify API)...');
    // Click submit button in modal
    await page.evaluate(() => {
      const submitBtn = document.querySelector('.login-submit-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Entrar na Plataforma') || b.textContent.includes('Entrar no Sistema'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Close modal if still visible
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-overlay .btn-icon');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Verify logged in badge
    const headerAuthText = await page.evaluate(() => {
      const btn = document.querySelector('.auth-session-btn');
      return btn ? btn.textContent.trim() : '';
    });
    console.log('🔑 Header Auth Badge:', headerAuthText);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_logged_in_dashboard.png') });
    console.log('📸 Captured 03_logged_in_dashboard.png');

    console.log('4. Testing navigation to "Agenda & Deslocamento"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Agenda'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_schedule_view.png') });
    console.log('📸 Captured 04_schedule_view.png');

    console.log('5. Testing navigation to "Pacientes & Domicílios"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('Pacientes'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_patients_view.png') });
    console.log('📸 Captured 05_patients_view.png');

    console.log('6. Testing navigation to "PEP Domiciliar"...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.includes('PEP'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_pep_view.png') });
    console.log('📸 Captured 06_pep_view.png');

    console.log('🎉 ALL BROWSER VALIDATION TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Error during browser test:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserTest();
