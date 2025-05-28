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

async function main() {
  console.log('Starting site build process...');
  
  // Read links from JSON file
  const linksData = await fs.readJson(LINKS_FILE);
  const links = linksData.links;
  
  console.log(`Found ${links.length} links to process`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new'
  });
  
  const cardsHtml = [];
  
  // Process each link
  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    console.log(`Processing ${i+1}/${links.length}: ${url}`);
    
    try {
      const page = await browser.newPage();
      
      // Set viewport size
      await page.setViewport({
        width: 1280,
        height: 800
      });
      
      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Take screenshot
      const screenshotFileName = `screenshot-${i+1}.jpg`;
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
      
      cardsHtml.push(cardHtml);
      
      await page.close();
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      
      // Create error card
      const cardHtml = `
        <div class="card">
          <div class="card-content">
            <h3 class="card-title">Error Loading Site</h3>
            <p class="card-description">There was an error loading ${url}. The site may be temporarily unavailable.</p>
            <a href="${url}" class="card-link" target="_blank">Try Visiting Site</a>
          </div>
        </div>
      `;
      
      cardsHtml.push(cardHtml);
    }
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
}

// Run the main function
main().catch(error => {
  console.error('Build process failed:', error);
  process.exit(1);
});
