import * as cheerio from 'cheerio';

async function testDeepFetch() {
  const q = encodeURIComponent("DeepSeek V4 分析");
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
  
  const top4 = results.slice(0, 4);
  console.log("Fetching details...");
  await Promise.all(top4.map(async (item) => {
    if (!item.link || item.link.includes('zhihu.com')) return; // Zhihu bots blocker might block us
    try {
      const resp = await fetch(item.link, { 
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000) 
      });
      if (resp.headers.get("content-type")?.includes("text/html")) {
         const pageHtml = await resp.text();
         const page$ = cheerio.load(pageHtml);
         const text = page$('body').text().replace(/\s+/g, ' ').substring(0, 800);
         if (text.length > 100) item.snippet = text;
      }
    } catch(e) {
      // Ignored
    }
  }));
  
  console.log(top4);
}

testDeepFetch();
