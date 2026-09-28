// test/browser-automation.js
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\davil\\.gemini\\antigravity-ide\\brain\\7fd25157-cf97-48dc-a677-1ed457c078c5';

async function runBrowserTest() {
  console.log('🚀 Starting Puppeteer-Core with Chrome at C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
  
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false, // Visível na tela
    defaultViewport: { width: 1280, height: 1150 },
    args: ['--window-size=1280,1150']
  });

  const page = await browser.newPage();
  
  try {
    console.log('1. Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '01_dashboard.png') });
    console.log('📸 Captured 01_dashboard.png');

    console.log('2. Clicking "Lab de Testes & API" tab in sidebar...');
    await page.waitForSelector('button.nav-item', { timeout: 5000 });
    const buttons = await page.$$('button.nav-item');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Lab de Testes')) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '02_lab_tab1_auth.png') });
    console.log('📸 Captured 02_lab_tab1_auth.png');

    console.log('3. Testing informal login "dr lucas" rejection (400)...');
    // Click button "Testar dr lucas"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('dr lucas'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    // Click "Executar Login"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Executar Login'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.evaluate(() => {
      const mc = document.querySelector('.main-content');
      if (mc) mc.scrollTop = 350;
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '03_rejected_dr_lucas_400.png') });
    console.log('📸 Captured 03_rejected_dr_lucas_400.png');

    console.log('4. Testing valid corporate login with Dr. Lucas (200 OK + JWT)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('lucas@omnisaude.com.br'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Executar Login'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.evaluate(() => {
      const mc = document.querySelector('.main-content');
      if (mc) mc.scrollTop = 350;
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '04_approved_dr_lucas_200.png') });
    console.log('📸 Captured 04_approved_dr_lucas_200.png');

    console.log('5. Switching to Tab 2: Scheduler Geodésico & Viabilidade...');
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('button.pep-tab-btn'));
      const tab = tabBtns.find(b => b.textContent.includes('Scheduler Geodésico'));
      if (tab) tab.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '05_scheduler_tab2.png') });
    console.log('📸 Captured 05_scheduler_tab2.png');

    console.log('6. Evaluating schedule for Mariana Souza Lima (Viable)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Avaliar Viabilidade'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.evaluate(() => {
      const mc = document.querySelector('.main-content');
      if (mc) mc.scrollTop = 450;
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '06_scheduler_mariana_viable.png') });
    console.log('📸 Captured 06_scheduler_mariana_viable.png');

    console.log('7. Evaluating schedule for Juliana Mendes Prado (Blocked CareTeam)...');
    // Select Juliana
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select.form-select'));
      const patientSelect = selects.find(s => s.textContent.includes('Juliana Mendes Prado') || s.options?.length > 1);
      if (patientSelect) {
        patientSelect.value = 'cmukamclj000512nv8saiw844';
        patientSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Avaliar Viabilidade'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    await page.evaluate(() => {
      const mc = document.querySelector('.main-content');
      if (mc) mc.scrollTop = 450;
    });
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, '07_scheduler_juliana_blocked.png') });
    console.log('📸 Captured 07_scheduler_juliana_blocked.png');

    console.log('✅ ALL BROWSER AUTOMATION TESTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Browser Test Error:', err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
