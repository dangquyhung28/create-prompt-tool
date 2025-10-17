import React, { useState, useCallback, useEffect } from 'react';
import { generatePromptFromRequest, type SceneMap, type Scene } from './services/geminiService';
import { CopyIcon, SparklesIcon, CheckIcon, ExclamationTriangleIcon, CogIcon, SaveIcon, DownloadIcon } from './components/Icons';
import { Spinner } from './components/Spinner';

type Tab = 'architect' | 'settings';

const App: React.FC = () => {
  const [videoIdea, setVideoIdea] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<string>('');
  const [generatedScenes, setGeneratedScenes] = useState<SceneMap | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('architect');
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const storedApiKey = localStorage.getItem('gemini_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setTempApiKey(storedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('gemini_api_key', tempApiKey);
      setApiKey(tempApiKey);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleGeneratePrompt = useCallback(async () => {
    if (!apiKey) {
      setError('Please set your API key in the Settings tab first.');
      return;
    }
    if (!videoIdea.trim() || !videoDuration.trim()) {
      setError('Please provide both a video idea and the desired duration.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    setGeneratedScenes(null);

    try {
      const scenes = await generatePromptFromRequest(videoIdea, videoDuration, apiKey);
      setGeneratedScenes(scenes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during prompt generation.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [videoIdea, videoDuration, apiKey]);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handleDownloadJson = () => {
    if (!generatedScenes || Object.keys(generatedScenes).length === 0) return;
    const jsonString = JSON.stringify(generatedScenes, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video_scenes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const TabButton: React.FC<{tabName: Tab, icon: React.ReactNode, label: string}> = ({tabName, icon, label}) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-white/20 text-white'
          : 'text-white/80 hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white font-sans">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-7 h-7 text-white" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Auto Prompt Architect</h1>
          </div>
          <nav className="flex items-center gap-2">
            <TabButton tabName="architect" icon={<SparklesIcon className="w-5 h-5" />} label="Thiết kế Prompt" />
            <TabButton tabName="settings" icon={<CogIcon className="w-5 h-5" />} label="Cài đặt" />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'architect' && (
          <div>
            {!apiKey && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-6 flex items-start gap-3" role="alert">
                  <ExclamationTriangleIcon className="w-5 h-5 mt-0.5" />
                  <div>
                    <p className="font-semibold">Cần cấu hình API Key</p>
                    <p>Vào mục <button onClick={() => setActiveTab('settings')} className="font-semibold underline hover:text-yellow-900">Cài đặt</button> để nhập Gemini API key.</p>
                  </div>
              </div>
            )}

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-md mb-8 flex items-center gap-3" role="alert">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                    <div>
                        <p className="font-bold">An error occurred</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: User Input */}
              <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col h-full">
                <h2 className="text-xl font-semibold mb-4 text-slate-700">1. Describe Your Video</h2>
                <p className="text-slate-500 mb-4 text-sm">Provide your core idea and the desired video length. The tool will generate a sequence of prompts (1 prompt ≈ 8 seconds of video).</p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="video-idea" className="block text-sm font-medium text-slate-700 mb-1">Ý tưởng video</label>
                    <textarea
                      id="video-idea"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 resize-none min-h-[150px]"
                      placeholder="Ví dụ: Câu chuyện về Kai và Luna trong hang động, phong cách điện ảnh 4K..."
                      value={videoIdea}
                      onChange={(e) => setVideoIdea(e.target.value)}
                      disabled={isGenerating || !apiKey}
                    />
                  </div>
                  <div>
                    <label htmlFor="video-duration" className="block text-sm font-medium text-slate-700 mb-1">Thời lượng mong muốn</label>
                    <input
                      id="video-duration"
                      type="text"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                      placeholder="Ví dụ: 30s, 1 phút, 2m 30s"
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(e.target.value)}
                      disabled={isGenerating || !apiKey}
                    />
                  </div>
                </div>

                <button
                  onClick={handleGeneratePrompt}
                  disabled={isGenerating || !videoIdea.trim() || !videoDuration.trim() || !apiKey}
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:shadow-md disabled:from-indigo-300 disabled:to-purple-300 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isGenerating ? <Spinner /> : <SparklesIcon className="w-5 h-5" />}
                  <span>{isGenerating ? 'Đang tạo...' : 'Tạo kịch bản'}</span>
                </button>
              </div>

              {/* Right Column: Generated Scenes */}
              <div className="bg-white p-6 rounded-2xl shadow border border-slate-200 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">2. Kết quả cảnh (JSON)</h2>
                  <button
                      onClick={handleDownloadJson}
                      disabled={!generatedScenes || Object.keys(generatedScenes).length === 0}
                      className="inline-flex items-center gap-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 font-medium py-2 px-3 rounded-md border border-slate-200 transition"
                      title="Tải xuống JSON"
                  >
                      <DownloadIcon className="w-4 h-4" />
                      <span>Tải JSON</span>
                  </button>
                </div>
                <div className="w-full flex-grow rounded-lg bg-slate-50 min-h-[320px] overflow-y-auto p-2">
                  {generatedScenes && Object.keys(generatedScenes).length > 0 ? (
                     <div className="space-y-3">
                        {(Object.entries(generatedScenes as SceneMap) as [string, Scene][])
                          .sort(([aKey], [bKey]) => {
                            const a = parseInt(aKey.replace('scene_', '')) || 0;
                            const b = parseInt(bKey.replace('scene_', '')) || 0;
                            return a - b;
                          })
                          .map(([sceneKey, scene], index, arr) => {
                            const total = arr.length;
                            const summary = (scene as any)?.Objective_vi || scene?.Objective || '';
                            const pretty = JSON.stringify(scene, null, 2);
                            return (
                              <div key={sceneKey} className="bg-white p-3 rounded-md shadow-sm border border-slate-200">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-grow text-sm text-slate-800">
                                    <p className="font-mono"><span className="font-semibold text-indigo-600">[{sceneKey} {index + 1}/{total}]</span> {summary}</p>
                                    <pre className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-200 overflow-x-auto max-h-64">{pretty}</pre>
                                  </div>
                                  <button
                                    onClick={() => handleCopy(pretty, index)}
                                    className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-1 px-2 rounded-md transition"
                                  >
                                    {copiedIndex === index ? <CheckIcon className="w-3 h-3 text-green-600" /> : <CopyIcon className="w-3 h-3" />}
                                    {copiedIndex === index ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                     </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      Kết quả sẽ hiển thị tại đây...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
           <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-slate-800">API Key Settings</h2>
                <p className="text-slate-600 mb-6">
                    To use this tool, you need a Gemini API key. Your key is stored securely in your browser's local storage and is never sent to our servers.
                </p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="api-key" className="block text-sm font-medium text-slate-700 mb-1">
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            id="api-key"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                            placeholder="Enter your API key here"
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                        />
                         <p className="text-xs text-slate-500 mt-2">
                            You can get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.
                        </p>
                    </div>
                     <button
                        onClick={handleSaveApiKey}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-all duration-300 transform hover:scale-105"
                    >
                       <SaveIcon className="w-5 h-5" />
                       <span>Save Key</span>
                    </button>
                    {saveStatus === 'success' && (
                        <div className="text-green-600 text-sm text-center">API Key saved successfully!</div>
                    )}
                    {saveStatus === 'error' && (
                        <div className="text-red-600 text-sm text-center">Please enter a valid API key.</div>
                    )}
                </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
