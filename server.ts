import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for reports
const reportsDB: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Trigger agent workflow
  app.post("/api/agents/run", async (req, res) => {
    try {
      const { keywords, llmProvider, llmApiKey, customBaseUrl, customModel, webhookUrl, webhookKeyword, webhookSecret, collectorSource, searchApiKey } = req.body;

      if (!llmApiKey) {
        return res.status(400).json({ error: "您尚未提供任何 LLM API Key，请在页面中配置对应模型的 API Key。" });
      }

      let aiClient: any = null;
      let modelToUse = "deepseek-chat";

      try {
        let baseURL: string | undefined = undefined;
        let defaultModel = "deepseek-v4-pro";
        if (llmProvider === 'deepseek') {
          baseURL = "https://api.deepseek.com";
          defaultModel = "deepseek-v4-pro";
        } else if (llmProvider === 'openai') {
          baseURL = undefined; // Uses default OpenAI
          defaultModel = "gpt-4o";
        } else if (llmProvider === 'moonshot') {
          baseURL = "https://api.moonshot.cn/v1";
          defaultModel = "moonshot-v1-8k";
        } else if (llmProvider === 'zhipu') {
          baseURL = "https://open.bigmodel.cn/api/paas/v4";
          defaultModel = "glm-4";
        } else if (llmProvider === 'qwen') {
          baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
          defaultModel = "qwen-max";
        } else if (llmProvider === 'custom') {
          baseURL = customBaseUrl;
          defaultModel = "custom-model";
        }

        modelToUse = customModel || defaultModel;

        aiClient = new OpenAI({
          apiKey: llmApiKey,
          baseURL,
        });
      } catch (err: any) {
         return res.status(500).json({ error: `初始化模型客户端失败: ${err.message}` });
      }

      // ==========================================
      // Helper function to call the LLM
      // ==========================================
      async function callLLM(prompt: string, expectJson: boolean) {
        const completion = await aiClient.chat.completions.create({
          messages: [{ role: "system", content: prompt }],
          model: modelToUse,
          response_format: expectJson ? { type: "json_object" } : undefined
        });
        return completion.choices[0].message.content || "";
      }

      // ==========================================
      // Agent 1: Data Collection
      // ==========================================
      let collectionContent = "";
      
      // Free Web Crawler via DuckDuckGo
      const cheerio = await import('cheerio');
      let rawData: any[] = [];
      
      const queries = [
        `最新消息 ${keywords.join(' ')}`,
        `深度分析 ${keywords.join(' ')}`
      ];

      for (const query of queries) {
        const q = encodeURIComponent(query);
        try {
          const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (!res.ok) continue;
          const html = await res.text();
          const $ = cheerio.load(html);
          
          $('.result').each((i, el) => {
            const title = $(el).find('.result__title .result__a').text().trim();
            const snippet = $(el).find('.result__snippet').text().trim();
            let link = $(el).find('.result__title .result__a').attr('href') || '';
            
            if (link && link.includes('uddg=')) {
              try {
                const urlParams = new URLSearchParams(link.split('?')[1]);
                link = decodeURIComponent(urlParams.get('uddg') || link);
              } catch (e) {}
            }
            
            if (title && snippet && !rawData.find(item => item.url === link)) {
              rawData.push({
                 title,
                 source: 'DuckDuckGo',
                 content: snippet,
                 date: new Date().toISOString(),
                 url: link
              });
            }
          });
        } catch(e) {
          console.error("DDG fetch error", e);
        }
      }

      if (rawData.length === 0) {
        throw new Error("内置爬虫未返回任何结果，搜索可能被限制，请尝试修改关键词。");
      }

      // Take top 8 results total
      rawData = rawData.slice(0, 8);
      
      // Deep fetch for top 6 items to enrich content
      await Promise.all(rawData.slice(0, 6).map(async (item) => {
        if (!item.url || item.url.includes('zhihu.com')) return; // Zhihu bots blocker
        try {
          const resp = await fetch(item.url, { 
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            signal: AbortSignal.timeout(3000) 
          });
          if (resp.headers.get("content-type")?.includes("text/html")) {
             const pageHtml = await resp.text();
             const page$ = cheerio.load(pageHtml);
             // remove scripts and styles for cleaner text extraction
             page$('script, style').remove();
             const text = page$('body').text().replace(/\s+/g, ' ').trim().substring(0, 1000);
             if (text.length > item.content.length) item.content = text;
          }
        } catch(e) {
          // Ignore fetch timeouts or errors
        }
      }));

      collectionContent = JSON.stringify(rawData);

      // ==========================================
      // Agent 2: Deep Analysis (Reasoning Layer)
      // ==========================================
      const analysisPrompt = `You are an elite Deep Analysis Agent, an expert in PR, corporate strategy, and threat assessment.
Analyze the following collected data about recent news/events:
${JSON.stringify(rawData)}

Task:
1. Extract core entities (companies, products, individuals) and summarize the main events accurately.
2. Deduce the deep strategic intent behind these events. What are these entities trying to achieve?
3. Perform an objective sentiment analysis and assign an overall threat level assessment (Low, Medium, High) to the user's company (assuming the user is a targeted competitor or related entity in the industry).
4. Output a deep, insightful, and professionally formatted Markdown report.

**CRITICAL FORMATTING RULES:**
- DO NOT use Markdown tables for long text. Tables with large amounts of text break the layout easily.
- Use nested bullet points (ul/ol) or bold headers for lists of competitors and their strategic intents.
- Use clear visual hierarchy with H2 (##), H3 (###) tags and bold text (**text**).
- Ensure the overall Threat Level (e.g., **High**) is prominently displayed at the beginning of the Threat Rating section.

Output MUST follow this exact structure (in Chinese):

## 📢 舆情摘要 (Summary)
[Provide a high-level executive summary of the events]

## 🏢 竞品动向 & 战略意图 (Competitor Moves & Intent)
[Use structured bullet points (not tables) breaking down each competitor, their core action, and deduced strategic intent]
* **[Competitor Name]**:
  * **核心动向**: ...
  * **战略意图**: ...

## ⚠️ 威胁评级 & 风险点 (Threat Rating & Risks)
**综合威胁评级：[低/中/高] (Low/Medium/High)**

[Use structured bullet points (not tables) detailing specific risk factors]
* **[Risk Point]**: ...
  * **影响分析**: ...

## 💡 行动建议 (Actionable Advice)
[Provide 3 actionable, strategic recommendations to counter the risks]
1. ...
2. ...
3. ...

Output language MUST BE ENTIRELY IN CHINESE (except for specific proper nouns).`;

      let reportContent = "";
      try {
        reportContent = await callLLM(analysisPrompt, false);
      } catch (apiError: any) {
        console.error("LLM API Failed in Agent 2:", apiError);
        reportContent = `## 📢 舆情摘要 (模拟报告)
当前侦测到执行异常（常见原因为 API Key 未提供、不合法或调用额度耗尽）。本次工作流已自动降级为【脱机演示模式】。

监测到 ${rawData.length} 条模拟的近线动态。主要集中在大模型产品的发布及潜在的数据隐私舆论事件。

## 🏢 竞品动向 & 战略意图
*   **企业级落地**：加速商业化落地，系统判定战略侧重偏向垂直领域的解决方案。

## ⚠️ 威胁评级 & 风险点
**评级：高 (High)**
*   **风险点一**：行业内爆发的数据安全危机可能波及全行业，监管力度或将加大。

## 💡 行动建议
1.  **公关层面**：立即发布关于我司数据安全与合规声明，打消客户顾虑。
*(注意：此为降级容错内容。捕获到的真实错误原因：${apiError.message})*`;
      }
      
      // Determine threat level for UI
      let threatLevel = 'Low';
      if (reportContent?.includes('高') && reportContent?.includes('威胁')) threatLevel = 'High';
      else if (reportContent?.includes('中')) threatLevel = 'Medium';

      const newReport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        keywords,
        content: reportContent,
        threatLevel,
        rawDataCount: rawData.length
      };

      reportsDB.unshift(newReport);

      // ==========================================
      // Agent 3: Dispatch (Webhook)
      // ==========================================
      let dispatchStatus = "Not Configured";
      if (webhookUrl) {
        try {
          // Detect webhook type and format payload appropriately
          let payload: any = {
             msg_type: "text",
             content: { text: `【舆情预警】\n威胁评级: ${threatLevel}\n发现 ${rawData.length} 条相关动态。` }
          };

          const keywordSuffix = webhookKeyword ? `\n[${webhookKeyword}]` : '';
          const textContent = `【竞品舆情预警】通知\n威胁评级: ${threatLevel}\n发现 ${rawData.length} 条相关动态。\n\n======== 简报摘要 ========\n${reportContent}\n========================\n请登录竞品监测系统查看详细分析。${keywordSuffix}`;

          let finalWebhookUrl = webhookUrl;

          if (webhookUrl.includes('qyapi.weixin.qq.com')) {
             // 企业微信 (Enterprise WeChat Bot)
             payload = {
                msgtype: "markdown",
                markdown: { content: textContent }
             };
          } else if (webhookUrl.includes('dingtalk.com')) {
             // 钉钉 (DingTalk Bot)
             payload = {
                msgtype: "markdown",
                markdown: { title: `竞品舆情预警 (${threatLevel})`, text: textContent }
             };
             if (webhookSecret) {
                const timestamp = Date.now().toString();
                const stringToSign = timestamp + "\n" + webhookSecret;
                const sign = crypto.createHmac('sha256', webhookSecret).update(stringToSign).digest('base64');
                const signEncoded = encodeURIComponent(sign);
                finalWebhookUrl += `&timestamp=${timestamp}&sign=${signEncoded}`;
             }
          } else if (webhookUrl.includes('sctapi.ftqq.com')) {
             // Server酱 (Push to Personal WeChat)
             payload = {
                title: `竞品舆情预警 (${threatLevel})`,
                desp: textContent
             };
          } else {
             // 默认飞书 (Feishu) 或其他
             // 飞书不支持顶层的 markdown 类型，这里为了兼容使用 interactive 或直接使用普通文本。使用普通文本并去除多余 Markdown 格式以防报错。
             payload = {
                msg_type: "text",
                content: { text: textContent }
             };
             if (webhookSecret) {
                const timestamp = Math.floor(Date.now() / 1000).toString();
                const stringToSign = timestamp + "\n" + webhookSecret;
                const sign = crypto.createHmac('sha256', stringToSign).update('').digest('base64');
                payload.timestamp = timestamp;
                payload.sign = sign;
             }
          }

          // Send to Webhook
          const webhookResp = await fetch(finalWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (!webhookResp.ok) {
             const respText = await webhookResp.text();
             console.error("Webhook failed with status", webhookResp.status, respText);
             dispatchStatus = "Failed";
          } else {
             dispatchStatus = "Success";
          }
        } catch (webhookErr) {
          console.error("Webhook exception:", webhookErr);
          dispatchStatus = "Failed";
        }
      }

      res.json({ status: "success", report: newReport, dispatchStatus });
    } catch (error: any) {
      console.error("Agent Workflow Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get latest reports
  app.get("/api/reports", (req, res) => {
    res.json({ reports: reportsDB });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
