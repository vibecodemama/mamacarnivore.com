# Mama Carnivore

This is the repository for [mamacarnivore.com](https://mamacarnivore.com), a personal website showcasing various resources and tools related to carnivore nutrition and non-toxic living.

## How It Works

This website is automatically built and deployed using GitHub Actions. The build process:

1. Reads a list of links from `links.json`
2. Visits each website
3. Takes a screenshot
4. Extracts the title and description
5. Creates a card for each site
6. Updates the website with these cards

## Adding New Links

To add a new link to the website:

1. Edit the `links.json` file
2. Add your new URL to the "links" array
3. Commit and push your changes
4. GitHub Actions will automatically rebuild the site with the new link

Example:

```json
{
  "links": [
    "http://calculator.thecarnivoremama.com/",
    "https://tdee.thecarnivoremama.com/",
    "https://nontoxicgoods.com/",
    "https://your-new-link.com/"
  ]
}
```

## Local Development

To run this project locally:

1. Clone the repository
2. Install dependencies with `npm install`
3. Run the build script with `npm run build`

## Custom Domain Setup

To use a custom domain (e.g. mamacarnivore.com):

1. Go to your repository settings
2. Navigate to "Pages"
3. Under "Custom domain", enter "mamacarnivore.com"
4. Save
5. Add a CNAME file to the repository with "mamacarnivore.com" as its content

## Technologies Used

- HTML, CSS, JavaScript
- Node.js
- Puppeteer (for screenshots and site scraping)
- GitHub Actions (for automated builds)
- GitHub Pages (for hosting)

## License

MIT
