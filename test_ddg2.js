import * as cheerio from 'cheerio';

async function testFetch() {
  const q = encodeURIComponent("DeepSeek V4 最新解读");
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const results = [];
  $('.result').each((i, el) => {
    const title = $(el).find('.result__title .result__a').text().trim();
    const snippet = $(el).find('.result__snippet').text().trim();
    let link = $(el).find('.result__title .result__a').attr('href');
    
    if (link && link.includes('uddg=')) {
      try {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        link = decodeURIComponent(urlParams.get('uddg') || link);
      } catch (e) {}
    }
    
    if (title && snippet) {
      results.push({ title, snippet, link });
    }
  });
  console.log(results.slice(0, 3));
}

testFetch();
