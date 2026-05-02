# 🤖 Multi-Agent 竞品舆情全自动监测系统 (OSINT & Competitor Analysis)

一款基于多智能体 (Multi-Agent) 协同架构的全自动化竞品舆情监测与分析系统。系统通过自动化检索搜集互联网动态，借助大语言模型 (LLM) 进行深度分析与威胁分级，并自动将预警简报推送到企业办公群或个人微信。

## ✨ 核心功能

*   🔍 **Agent 1: 智能聚合采集 (Collector)**
    *   支持根据指定关键词矩阵（如品牌名、高管名、产品线）全网检索相关动态。
    *   支持接入多种搜索引擎 API (System Default, Tavily, Serper)。
*   🧠 **Agent 2: 深度舆情分析 (Analyst)**
    *   深度整合多种主流 LLM (DeepSeek, OpenAI, Moonshot Kimi, 智谱 GLM, Qwen, 并支持自定义 OpenAI 兼容接口)。
    *   自动提炼摘要内容、识别负面舆情，并进行威胁分类与降级评级判断（高/中/低危评估）。
*   🚀 **Agent 3: 决策分发网络 (Dispatch)**
    *   支持无缝对接 **企业微信**、**钉钉**、**飞书** 机器人，及 **Server酱** (个人微信提醒)。
    *   **深度兼容企业级安全设置**：完美支持机器人**自定义关键词 (Keyword)** 及 **加签校验 (Secret Sign)**，彻底解决跨平台消息拦截问题。

## 🛠️ 技术栈

*   **前端**: React + Vite + Tailwind CSS + Lucide Icons
*   **后端**: Node.js + Express
*   **大模型调度**: 兼容 OpenAI 格式的全量化模型聚合支持

## 🚀 快速开始

### 1. 环境准备
确保本机已安装 Node.js (推荐 v18+)。

### 2. 克隆与安装依赖
```bash
# 克隆仓库后，安装项目依赖
npm install
```

### 3. 本地开发
```bash
# 启动全栈开发服务器
npm run dev
```

### 4. 生产环境构建与运行
```bash
# 编译前端代码
npm run build

# 启动生产服务
npm start
```
*启动后，默认监听 3000 端口，浏览器访问 `http://localhost:3000` 即可进入系统控制台面板。*

## ⚙️ 进阶配置指南：Webhook 机器人安全说明

各大办公平台的机器人在被调用时，通常有严格的安全策略。本系统已做完全兼容：

- **针对自定义关键词 (Keyword):** 如果机器人在设置中启用了“自定义关键词”，只需在系统界面填入该词，系统便会在每次推送中动态附带。
- **针对加签密钥 (Secret):** 如果钉钉或飞书等机器人在设置中启用了“加签安全设置”，只需将平台分配的 Secret 密钥填入系统中，后台底层服务会自动计算 `HMAC-SHA256` 及 Base64 签名发送。

---
📝 *Exported from Google AI Studio Build.*
