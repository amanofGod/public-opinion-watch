import * as cheerio from 'cheerio';

async function search() {
  const q = encodeURIComponent("DeepSeek 最新动态");
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
    const link = $(el).find('.result__title .result__a').attr('href');
    if (title && snippet) {
      results.push({ title, snippet, link });
    }
  });
  console.log(results);
}
search();
