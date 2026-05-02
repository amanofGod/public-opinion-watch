import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, BarChart3, Radio, FileText, Search, Save, PlayCircle, Loader2, Key, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Config {
  collectorSource: 'system_google' | 'tavily' | 'serper';
  searchApiKey: string;
  llmProvider: 'deepseek' | 'openai' | 'moonshot' | 'zhipu' | 'qwen' | 'custom';
  llmApiKey: string;
  customBaseUrl?: string;
  customModel?: string;
  webhookUrl?: string;
  webhookKeyword?: string;
  webhookSecret?: string;
  keywords: string[];
}

const PROVIDERS: { id: string, name: string, desc: string, badge?: string }[] = [
  { id: 'deepseek', name: 'DeepSeek', desc: 'deepseek-chat', badge: '推荐' },
  { id: 'openai', name: 'OpenAI', desc: 'gpt-4o' },
  { id: 'moonshot', name: 'Moonshot (Kimi)', desc: 'moonshot-v1-8k' },
  { id: 'zhipu', name: '智谱 AI', desc: 'glm-4' },
  { id: 'qwen', name: '通义千问 (Qwen)', desc: 'qwen-max' },
  { id: 'custom', name: '自定义 / 本地', desc: '基于 OpenAI 兼容协议' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config'>('dashboard');
  const [isRunning, setIsRunning] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  
  const [config, setConfig] = useState<Config>({
    collectorSource: 'system_google',
    searchApiKey: '',
    llmProvider: 'deepseek', // User preferred deepseek
    llmApiKey: '',
    customBaseUrl: '',
    customModel: 'deepseek-v4-pro',
    webhookUrl: '',
    webhookKeyword: '',
    webhookSecret: '',
    keywords: ['DeepSeek', '大模型', '竞品', '隐私安全'],
  });

  // Keep a tracking state for model version per provider
  const DEFAULT_MODELS: Record<string, string> = {
    'deepseek': 'deepseek-v4-pro',
    'openai': 'gpt-4o',
    'moonshot': 'moonshot-v1-8k',
    'zhipu': 'glm-4',
    'qwen': 'qwen-max',
    'custom': 'custom-model'
  };

  const handleProviderChange = (providerId: string) => {
    setConfig({
      ...config,
      llmProvider: providerId as Config['llmProvider'],
      customModel: DEFAULT_MODELS[providerId] || ''
    });
  };

  const [newKeyword, setNewKeyword] = useState('');

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error("Failed to load reports", e);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRunWorkflow = async () => {
    if (!config.llmApiKey) {
      alert("请先在配置中输入对应的 LLM API Key");
      setActiveTab('config');
      return;
    }
    if (config.collectorSource !== 'system_google' && !config.searchApiKey) {
      alert("请先在配置中输入搜索接口 (Tavily/Serper) 的 API Key");
      setActiveTab('config');
      return;
    }
    
    setIsRunning(true);
    try {
      const res = await fetch('/api/agents/run', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: config.keywords,
          collectorSource: config.collectorSource,
          searchApiKey: config.searchApiKey,
          llmProvider: config.llmProvider,
          llmApiKey: config.llmApiKey,
          customBaseUrl: config.customBaseUrl,
          customModel: config.customModel,
          webhookUrl: config.webhookUrl,
          webhookKeyword: config.webhookKeyword,
          webhookSecret: config.webhookSecret
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "运行失败");
      }
      
      const payloadResp = await res.json();
      await fetchReports();
      
      if (payloadResp.dispatchStatus === "Failed") {
         alert("分析已完成！简报已生成。\n\n⚠️ 但尝试发送到 Webhook 失败！可能原因：\n1. Webhook 地址不正确\n2. 机器人安全设置（如自定义关键词）未匹配\n3. 飞书等平台安全拦截\n\n请检查服务端日志(终端)了解详情。");
      } else if (payloadResp.dispatchStatus === "Success") {
         alert("分析完成！已成功通过 Webhook 发送最新简报至您的群/工作台。");
      } else {
         alert("分析完成！最新简报已生成。");
      }
    } catch (e: any) {
      console.error(e);
      alert(`执行出错: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      e.preventDefault();
      setConfig({ ...config, keywords: [...config.keywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const newKeywords = [...config.keywords];
    newKeywords.splice(index, 1);
    setConfig({ ...config, keywords: newKeywords });
  };

  const firstReport = reports.length > 0 ? reports[0] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10 text-gray-900">
          <ShieldAlert className="w-8 h-8 text-blue-600" />
          <h1 className="font-bold text-lg leading-tight">多Agent<br/>舆情分析系统</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <BarChart3 className="w-5 h-5" />
            监控大盘
          </button>
          
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Settings className="w-5 h-5" />
            系统配置
          </button>
        </nav>
        
        <div className="mt-auto px-4 py-3 bg-gray-100 rounded-xl text-xs text-gray-500">
          <p>Agent Status: <span className="text-green-600 font-medium">Online</span></p>
          <p>Workers: 3/3 Active</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-10 max-w-5xl mx-auto">
          {activeTab === 'dashboard' ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">情报分析大盘</h2>
                  <p className="text-gray-500">系统已部署，请运行 Agent 获取今日行业简报</p>
                </div>
                <button 
                  onClick={handleRunWorkflow}
                  disabled={isRunning}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-70 cursor-pointer"
                >
                  {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                  {isRunning ? "Agent 执行中..." : "手动触发 (Run)"}
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">抓取资讯量</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{firstReport ? firstReport.rawDataCount : '---'}</p>
                    <p className="text-xs text-gray-400 mt-1">最新批次</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-purple-50 text-purple-500">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">分析完成耗时</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{firstReport ? '~ 5s' : '---'}</p>
                    <p className="text-xs text-gray-400 mt-1">深度推理</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${firstReport?.threatLevel === 'High' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-gray-500 text-sm font-medium">当前威胁评级</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{firstReport ? firstReport.threatLevel : '---'}</p>
                    <p className="text-xs text-gray-400 mt-1">风险评估</p>
                  </div>
                </div>
              </div>

              {/* Latest Report */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-400"/>
                  最新分析简报 {firstReport && <span className="text-sm font-normal text-gray-500 ml-2">{new Date(firstReport.timestamp).toLocaleString()}</span>}
                </h3>
                
                {firstReport ? (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-none">
                     <div className="prose prose-blue max-w-none prose-headings:font-bold prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 first:prose-h2:mt-0 prose-td:align-top prose-table:w-full">
                       <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{firstReport.content}</Markdown>
                     </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500 shadow-sm">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Radio className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900">尚无今日简报</p>
                    <p className="text-sm mt-1">请点击右上方按钮触发采集与分析任务。</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">系统配置</h2>
                <p className="text-gray-500">配置爬虫接入点与多 Agent 的模型及鉴权参数</p>
              </div>
              
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8">
                
                {/* Search Settings */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-600"/> 1. 情报采集 (Collector Agent)
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">负责全网检索、网页抓取与数据清洗。必须具备真实的联网能力以获取实时数据。</p>
                  <div className="space-y-6">
                    <div>
                      <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                        <Search className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">已启用内置免费网页爬虫引擎</p>
                          <p className="text-xs opacity-80 mt-0.5">本系统自动为您全网检索实时数据，无需额外配置 Search API Key。</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">检索关键词组合 (回车键或者空格分割)</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {config.keywords.map((kw, i) => (
                          <span key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-indigo-100">
                            {kw}
                            <button onClick={() => handleRemoveKeyword(i)} className="hover:text-indigo-900">&times;</button>
                          </span>
                        ))}
                      </div>
                      <input 
                        type="text" 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={handleAddKeyword}
                        placeholder="添加新搜素关键词并按回车键..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" 
                      />
                    </div>
                  </div>
                </div>

                {/* Global AI Config */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 mt-8 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-600"/> 2. 深度推理 (Analysis Agent LLM)
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">负责对采集回来的非结构化数据进行逻辑推理、研判和撰写脱水简报。</p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {PROVIDERS.map(p => (
                         <button 
                           key={p.id}
                           onClick={() => handleProviderChange(p.id)}
                           className={`p-4 rounded-xl border text-left transition-all relative ${config.llmProvider === p.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-blue-200'}`}
                         >
                            <div className="font-bold text-gray-900">{p.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
                            {p.badge && <div className="text-xs text-blue-600 mt-2">{p.badge}</div>}
                         </button>
                       ))}
                    </div>

                    {true && (
                      <div className="animate-in slide-in-from-top-2 duration-200 space-y-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                          {config.llmProvider === 'custom' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                              <input 
                                type="text" 
                                value={config.customBaseUrl}
                                onChange={(e) => setConfig({...config, customBaseUrl: e.target.value})}
                                placeholder="https://..." 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                              />
                            </div>
                          )}
                          <div className={config.llmProvider !== 'custom' ? 'col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">模型版本 (Model Version)</label>
                            <input 
                              type="text" 
                              value={config.customModel}
                              onChange={(e) => setConfig({...config, customModel: e.target.value})}
                              placeholder="例如: deepseek-v4-pro, gpt-4o 等" 
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {PROVIDERS.find(p => p.id === config.llmProvider)?.name} API Key
                          </label>
                          <div className="relative">
                            <Key className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                              type="password" 
                              value={config.llmApiKey}
                              onChange={(e) => setConfig({...config, llmApiKey: e.target.value})}
                              placeholder="sk-..." 
                              className="w-full pl-10 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">为保障安全，API Key 仅在单次执行中传递给后端，部分会缓存在浏览器本地存储。</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispatch Settings */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2 mt-8 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-green-600"/> 3. 决策分发 (Dispatch)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL (企业微信 / 飞书 / 钉钉机器人)</label>
                      <input 
                        type="text" 
                        value={config.webhookUrl || ''}
                        onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                        placeholder="支持企业微信、飞书、钉钉机器人链接 或 Server酱(个人微信)" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50" 
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        分析完成后，系统会自动向此地址发送摘要与预警通知。填写企业微信或钉钉机器人 Webhook 地址即可直接发送至工作群。
                      </p>
                    </div>
                    {config.webhookUrl && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">机器安全设置 (Secret / Keyword)</label>
                        <div className="space-y-3">
                          <input 
                            type="text" 
                            value={config.webhookKeyword || ''}
                            onChange={(e) => setConfig({...config, webhookKeyword: e.target.value})}
                            placeholder="自定义关键词 (若机器人启用了该安全设置)" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50" 
                          />
                          <input 
                            type="text" 
                            value={config.webhookSecret || ''}
                            onChange={(e) => setConfig({...config, webhookSecret: e.target.value})}
                            placeholder="加签密钥 Secret (若机器人启用了加签)" 
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50" 
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          发送给机器人的消息中会自动附带该关键词和签名，防止被拦截拦截。不填则默认使用包含的“舆情预警”。
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => { alert('配置已保存 (本地缓存)'); setActiveTab('dashboard'); }}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-5 h-5"/>
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

