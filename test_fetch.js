import * as cheerio from 'cheerio';

async function testFetch() {
  const url = "https://example.com";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $('body').text().replace(/\s+/g, ' ').substring(0, 500);
    console.log("Success:", text);
  } catch (e) {
    console.log("Failed:", e.message);
  }
}

testFetch();
