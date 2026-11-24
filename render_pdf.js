const path = require('path');
const fs = require('fs');

async function run() {
  const playwrightPath = path.resolve(__dirname, 'makemytour', 'node_modules', 'playwright');
  let playwright;
  try {
    playwright = require(playwrightPath);
  } catch (e) {
    console.error('Failed to load playwright from makemytour/node_modules:', e.message);
    process.exit(1);
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const htmlPath = path.resolve(__dirname, 'MakeMyTour_Full_Project_Master_Guide.html');
  const pdfPath = path.resolve(__dirname, 'MakeMyTour_Full_Project_Master_Guide.pdf');

  console.log('Launching browser...');
  const browser = await playwright.chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Loading HTML file:', htmlPath);
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle' });

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '12mm',
      right: '12mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #888; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between;">
        <span>MakeMyTour Enterprise Full-Stack Master Guide</span>
        <span>Internship & Interview Technical Reference</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #888; width: 100%; padding: 0 12mm; display: flex; justify-content: space-between;">
        <span>Spring Boot 3.3.4 + React 18 + PostgreSQL + Render</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();
  console.log('PDF generated successfully at:', pdfPath);
}

run().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
