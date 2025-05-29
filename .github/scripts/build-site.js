const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// Paths
const LINKS_FILE = path.join(process.cwd(), 'links.json');
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');
const INDEX_FILE = path.join(process.cwd(), 'index.html');

// Ensure screenshots directory exists
fs.ensureDirSync(SCREENSHOTS_DIR);

// Set a global timeout for the entire process (15 minutes)
const GLOBAL_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

async function main() {
  console.log('Starting site build process...');
  
  // Set a global timeout to prevent the process from hanging indefinitely
  const timeout = setTimeout(() => {
    console.error('Build process timed out after 15 minutes');
    process.exit(1);
  }, GLOBAL_TIMEOUT);
  
  // Read links from JSON file
  const linksData = await fs.readJson(LINKS_FILE);
  const links = linksData.links;
  
  console.log(`Found ${links.length} links to process`);
  
  // Launch browser with additional CI-friendly configuration
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-accelerated-2d-canvas'
    ],
    headless: 'new',
    timeout: 30000
  });
  
  const cardsHtml = [];
  
  // Helper function to process a single link with retries
  async function processLink(browser, url, index, maxRetries = 2) {
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        console.log(`Processing ${index+1}/${links.length}: ${url}${retries > 0 ? ` (retry ${retries}/${maxRetries})` : ''}`);
        
        const page = await browser.newPage();
      
      // Set viewport size
      await page.setViewport({
        width: 1280,
        height: 800
      });
      
      // Set a reasonable timeout for navigation
      await page.setDefaultNavigationTimeout(30000);
      
      // Set a reasonable timeout for other operations
      await page.setDefaultTimeout(30000);
      
      // Navigate to the page with more reliable wait conditions
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Take screenshot
      const screenshotFileName = `screenshot-${index+1}.jpg`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFileName);
      await page.screenshot({
        path: screenshotPath,
        type: 'jpeg',
        quality: 80,
        fullPage: false
      });
      
      // Get page title and description
      const pageTitle = await page.title();
      
      // Get meta description or generate one from content
      let pageDescription = await page.evaluate(() => {
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          return metaDescription.getAttribute('content');
        }
        
        // If no meta description, get text from the first paragraph or heading
        const firstParagraph = document.querySelector('p');
        if (firstParagraph) {
          const text = firstParagraph.textContent.trim();
          return text.length > 150 ? text.substring(0, 147) + '...' : text;
        }
        
        return 'Visit this site to learn more.';
      });
      
      // Limit description length
      if (pageDescription.length > 150) {
        pageDescription = pageDescription.substring(0, 147) + '...';
      }
      
      // Create card HTML
      const cardHtml = `
        <div class="card">
          <img src="screenshots/${screenshotFileName}" alt="${pageTitle}" class="card-image">
          <div class="card-content">
            <h3 class="card-title">${pageTitle}</h3>
            <p class="card-description">${pageDescription}</p>
            <a href="${url}" class="card-link" target="_blank">Visit Site</a>
          </div>
        </div>
      `;
      
        await page.close();
        
        // If we get here, processing was successful
        return cardHtml;
      } catch (error) {
        await page?.close().catch(() => {}); // Close page if it exists and ignore errors
        
        if (retries < maxRetries) {
          console.log(`Error processing ${url}, retrying (${retries+1}/${maxRetries}):`, error.message);
          retries++;
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          console.error(`Failed to process ${url} after ${maxRetries} retries:`, error);
          
          // Create error card
          return `
            <div class="card">
              <div class="card-content">
                <h3 class="card-title">Error Loading Site</h3>
                <p class="card-description">There was an error loading ${url}. The site may be temporarily unavailable.</p>
                <a href="${url}" class="card-link" target="_blank">Try Visiting Site</a>
              </div>
            </div>
          `;
        }
      }
    }
  }
  
  // Process each link with a more resilient approach
  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    const cardHtml = await processLink(browser, url, i);
    cardsHtml.push(cardHtml);
  }
  
  // Close browser
  await browser.close();
  
  // Update index.html with cards
  let indexHtml = await fs.readFile(INDEX_FILE, 'utf8');
  
  // Replace loading div with cards
  indexHtml = indexHtml.replace(
    '<div class="loading">Loading resources...</div>',
    cardsHtml.join('\n')
  );
  
  // Write updated index.html
  await fs.writeFile(INDEX_FILE, indexHtml);
  
  console.log('Site build completed successfully!');
  
  // Clear the global timeout since we completed successfully
  clearTimeout(timeout);
}

// Run the main function
main().catch(error => {
  console.error('Build process failed:', error);
  process.exit(1);
});
