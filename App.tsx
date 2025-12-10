
import React, { useState, useEffect, useCallback } from 'react';
import { AnalysisResult, AppState, GeneratedArticle, VideoConcept, TabView } from './types';
import { analyzeVideoContent, generateArticle, generateVideoConcept, refineNotes } from './services/geminiService';
import { PlayIcon, FileTextIcon, VideoIcon, PenToolIcon, LoaderIcon, CheckCircleIcon, YoutubeIcon } from './components/Icons';

// Icons for Copy functionality
const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);

// Simple markdown renderer replacement
const MarkdownViewer: React.FC<{ content: string }> = ({ content }) => {
  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-bold text-blue-400 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold text-blue-300 mt-6 mb-3 border-b border-gray-700 pb-2">{line.replace('## ', '')}</h2>;
      if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-bold text-blue-200 mt-8 mb-4">{line.replace('# ', '')}</h1>;
      if (line.startsWith('- ')) return <li key={index} className="ml-4 text-gray-300 mb-1 list-disc">{line.replace('- ', '')}</li>;
      if (line.startsWith('* ')) return <li key={index} className="ml-4 text-gray-300 mb-1 list-disc">{line.replace('* ', '')}</li>;
      if (line.trim() === '') return <br key={index} />;
      return <p key={index} className="text-gray-300 mb-2 leading-relaxed text-justify">{line}</p>;
    });
  };

  return <div className="prose prose-invert max-w-none">{formatText(content)}</div>;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  
  // Analysis Data
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [concept, setConcept] = useState<VideoConcept | null>(null);
  const [userNotes, setUserNotes] = useState('');
  
  // UI States
  const [loadingText, setLoadingText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      alert("لطفا لینک ویدیو یوتیوب را وارد کنید.");
      return;
    }

    setAppState(AppState.ANALYZING);
    setLoadingText("در حال کالبدشکافی دقیق محتوا و استخراج داده‌ها (کمی زمان می‌برد)...");

    try {
      const result = await analyzeVideoContent(url);
      setAnalysis(result);
      setAppState(AppState.COMPLETE);
      setActiveTab(TabView.DASHBOARD);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      alert("خطا در تحلیل ویدیو. لطفا دوباره تلاش کنید.");
    }
  };

  const handleGenerateArticle = async () => {
    if (!analysis?.summary) return;
    setLoadingText("در حال نگارش مقاله تخصصی...");
    const prevTab = activeTab;
    setActiveTab(TabView.ARTICLE); 
    
    setArticle({ title: "در حال نگارش...", content: "هوش مصنوعی در حال نوشتن یک مقاله جامع است..." });

    try {
      const result = await generateArticle(analysis.summary + "\n" + analysis.fullTranscript);
      setArticle(result);
    } catch (e) {
      console.error(e);
      setArticle({ title: "Error", content: "Failed to generate article." });
    }
  };

  const handleGenerateConcept = async () => {
    if (!analysis?.summary) return;
    setLoadingText("در حال طراحی سناریو ویدیوی وایرال...");
    setActiveTab(TabView.CONCEPT);
    setConcept({ title: "در حال تحلیل ترندها...", hook: "...", outline: [], targetAudience: "..." });

    try {
      const result = await generateVideoConcept(analysis.summary);
      setConcept(result);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefineNotes = async () => {
    if (!userNotes.trim() || !analysis?.summary) return;
    setLoadingText("در حال پردازش و تکمیل یادداشت‌ها...");
    try {
      const refined = await refineNotes(userNotes, analysis.fullTranscript || analysis.summary);
      setUserNotes(refined);
    } catch (e) {
      console.error(e);
    }
  };

  const copyTranscript = () => {
    if (analysis?.fullTranscript) {
      navigator.clipboard.writeText(analysis.fullTranscript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render Functions
  const renderSidebar = () => (
    <div className="w-20 md:w-64 bg-slate-800 border-l border-slate-700 flex flex-col h-screen fixed right-0 top-0 z-10 transition-all">
      <div className="p-6 flex items-center justify-center md:justify-start gap-3 border-b border-slate-700">
        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
          <PlayIcon className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-black text-white hidden md:block tracking-tight">TubeMind PRO</span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <button 
          onClick={() => setActiveTab(TabView.DASHBOARD)}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${activeTab === TabView.DASHBOARD ? 'bg-blue-600 text-white shadow-blue-900/50 shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
        >
          <PlayIcon className="w-5 h-5" />
          <span className="hidden md:block font-medium">داشبورد تحلیل</span>
        </button>

        <button 
          onClick={() => setActiveTab(TabView.ARTICLE)}
          disabled={appState !== AppState.COMPLETE}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${activeTab === TabView.ARTICLE ? 'bg-blue-600 text-white shadow-blue-900/50 shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'} ${appState !== AppState.COMPLETE ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <FileTextIcon className="w-5 h-5" />
          <span className="hidden md:block font-medium">مقاله ساز حرفه‌ای</span>
        </button>

        <button 
          onClick={() => setActiveTab(TabView.CONCEPT)}
          disabled={appState !== AppState.COMPLETE}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${activeTab === TabView.CONCEPT ? 'bg-blue-600 text-white shadow-blue-900/50 shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'} ${appState !== AppState.COMPLETE ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <VideoIcon className="w-5 h-5" />
          <span className="hidden md:block font-medium">مهندسی معکوس ویدیو</span>
        </button>

        <button 
          onClick={() => setActiveTab(TabView.NOTES)}
          disabled={appState !== AppState.COMPLETE}
          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${activeTab === TabView.NOTES ? 'bg-blue-600 text-white shadow-blue-900/50 shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'} ${appState !== AppState.COMPLETE ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <PenToolIcon className="w-5 h-5" />
          <span className="hidden md:block font-medium">یادداشت هوشمند</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center md:text-right">
        <p className="hidden md:block font-mono">Gemini 3 Pro Model</p>
      </div>
    </div>
  );

  const renderInputScreen = () => (
    <div className="max-w-4xl mx-auto mt-20 p-6 fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-red-500 mb-6 leading-tight">
          تحلیلگر فوق پیشرفته<br/>محتوای ویدیویی
        </h1>
        <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          دستیار هوشمند شما برای کالبدشکافی ویدیوهای یوتیوب. 
          <br/>
          <span className="text-sm text-slate-500 mt-2 block">استخراج متن کامل • کشف مضامین پنهان • تولید محتوای جدید</span>
        </p>
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700/50 backdrop-blur-sm">
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-300 mb-3">لینک ویدیو را وارد کنید</label>
          <div className="relative group">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <YoutubeIcon className="h-6 w-6 text-red-500 group-focus-within:scale-110 transition-transform" />
            </div>
            <input
              type="text"
              className="block w-full pr-12 pl-4 py-4 bg-slate-900 border border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-600 transition-all text-lg shadow-inner"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!url || appState === AppState.ANALYZING}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white py-5 rounded-xl font-bold text-xl shadow-lg shadow-blue-900/40 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {appState === AppState.ANALYZING ? (
            <>
              <LoaderIcon className="animate-spin w-6 h-6" />
              <span className="text-base">{loadingText || 'در حال پردازش...'}</span>
            </>
          ) : (
            <>
              <span>شروع تحلیل حرفه‌ای</span>
              <PlayIcon className="w-6 h-6" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (!analysis) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Left Column: Key Stats & Sources */}
        <div className="space-y-8">
          
          {/* Summary Card */}
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-4 flex items-center gap-2">
              <span className="text-blue-500">#</span> خلاصه راهبردی
            </h2>
            <div className="text-slate-300 leading-8 text-justify">
              <MarkdownViewer content={analysis.summary} />
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700 grid grid-cols-2 gap-6">
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <span className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">اتمسفر محتوا</span>
                <span className={`text-xl font-black ${analysis.sentiment === 'positive' ? 'text-green-400' : analysis.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {analysis.sentiment === 'positive' ? 'مثبت و سازنده' : analysis.sentiment === 'negative' ? 'انتقادی / منفی' : 'خنثی / خبری'}
                </span>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <span className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">تراکم محتوا</span>
                <span className="text-xl font-black text-white">{analysis.keywords.length} <span className="text-sm font-normal text-slate-400">کلیدواژه اصلی</span></span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-blue-500 rounded-full"></span>
                مضامین و مفاهیم اصلی
             </h3>
             <div className="flex flex-wrap gap-3">
                {analysis.themes.map((theme, i) => (
                  <span key={i} className="px-4 py-2 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors cursor-default">
                    {theme}
                  </span>
                ))}
             </div>
          </div>
          
           {/* Sources Section */}
           {analysis.sources && analysis.sources.length > 0 && (
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                   <span className="w-1.5 h-6 bg-slate-500 rounded-full"></span>
                   منابع شناسایی شده
                </h3>
                <ul className="space-y-3">
                   {analysis.sources.map((source, i) => (
                     <li key={i} className="flex items-center gap-2">
                       <ExternalLinkIcon className="w-4 h-4 text-slate-500" />
                       <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate text-sm">
                         {source.title || source.uri}
                       </a>
                     </li>
                   ))}
                </ul>
             </div>
           )}
        </div>

        {/* Right Column: Educational Points & Full Transcript */}
        <div className="space-y-8">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-green-500 rounded-full"></span>
                نکات کلیدی و آموزش‌ها
             </h3>
             <ul className="space-y-4">
                {analysis.educationalPoints.map((point, i) => (
                  <li key={i} className="flex gap-4 text-slate-300 items-start">
                    <div className="mt-1 bg-green-900/30 p-1 rounded-full">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                    </div>
                    <span className="leading-7">{point}</span>
                  </li>
                ))}
             </ul>
          </div>

          {/* Full Transcript Section */}
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex-1 shadow-xl">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="w-1.5 h-8 bg-purple-500 rounded-full"></span>
                شرح تفصیلی / متن کامل
              </h2>
              {analysis.fullTranscript && (
                <button 
                  onClick={copyTranscript}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-900/30"
                >
                  {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                  {copied ? 'کپی شد' : 'کپی متن کامل'}
                </button>
              )}
            </div>
            <div className="bg-slate-900/80 rounded-xl p-6 max-h-[800px] overflow-y-auto border border-slate-700/50 custom-scrollbar shadow-inner">
              <div className="text-slate-300 text-base leading-8 whitespace-pre-line text-justify font-light">
                {analysis.fullTranscript ? (
                  analysis.fullTranscript
                ) : (
                  <span className="text-slate-500 italic flex items-center gap-2 justify-center py-10">
                    <LoaderIcon className="animate-spin" /> در حال تلاش برای بازسازی متن...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderArticleView = () => (
    <div className="max-w-4xl mx-auto">
       <div className="flex justify-between items-center mb-8">
         <h2 className="text-3xl font-bold text-white">مقاله ساز هوشمند</h2>
         {!article && (
           <button 
             onClick={handleGenerateArticle}
             className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/40 transition-all hover:scale-105"
           >
             شروع نگارش مقاله
           </button>
         )}
       </div>

       {article ? (
         <div className="bg-slate-800 p-10 rounded-2xl border border-slate-700 shadow-2xl fade-in">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 mb-10 text-center leading-tight">{article.title}</h1>
            <div className="prose prose-invert prose-lg max-w-none prose-headings:text-blue-300 prose-p:text-slate-300 prose-li:text-slate-300">
              <MarkdownViewer content={article.content} />
            </div>
         </div>
       ) : (
         <div className="text-center py-24 bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center">
           <FileTextIcon className="w-20 h-20 text-slate-600 mb-6 opacity-50" />
           <p className="text-xl text-slate-400 font-light">تبدیل محتوای ویدیو به یک مقاله جامع و سئو شده</p>
           <p className="text-sm text-slate-600 mt-2">برای شروع دکمه بالا را بزنید</p>
         </div>
       )}
    </div>
  );

  const renderConceptView = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
         <h2 className="text-3xl font-bold text-white">استودیوی خلاقیت</h2>
         {!concept && (
           <button 
             onClick={handleGenerateConcept}
             className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-900/40 transition-all hover:scale-105"
           >
             طراحی کانسپت جدید
           </button>
         )}
       </div>

       {concept ? (
         <div className="space-y-8 fade-in">
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-10 rounded-2xl border border-purple-500/30 shadow-2xl relative overflow-hidden group hover:border-purple-500/50 transition-colors">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
             
             <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
                <div className="bg-purple-900/30 p-4 rounded-xl shrink-0">
                    <VideoIcon className="w-10 h-10 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-3">عنوان پیشنهادی ویدیو</h3>
                    <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">{concept.title}</h1>
                </div>
             </div>
             
             <div className="bg-purple-500/5 p-6 rounded-xl border border-purple-500/10 mb-8">
                <h4 className="font-bold text-purple-300 mb-2 text-sm uppercase">قلاب آغازین (Hook)</h4>
                <p className="text-xl md:text-2xl text-purple-100 italic font-serif leading-relaxed">"{concept.hook}"</p>
             </div>

             <div className="flex items-center gap-3">
               <span className="text-slate-400 font-medium">مخاطب هدف:</span>
               <span className="bg-slate-700 text-white px-4 py-1.5 rounded-full text-sm shadow-md border border-slate-600">{concept.targetAudience}</span>
             </div>
           </div>

           <div className="bg-slate-800 p-10 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                ساختار و سناریو (Outline)
              </h3>
              <div className="space-y-6">
                {concept.outline.map((step, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 group-hover:bg-purple-600 transition-colors border border-slate-600 flex items-center justify-center text-lg font-bold text-white shadow-lg z-10">
                        {idx + 1}
                      </div>
                      {idx !== concept.outline.length - 1 && <div className="w-0.5 h-full bg-slate-700 group-hover:bg-slate-600 transition-colors mt-2"></div>}
                    </div>
                    <div className="pb-8 pt-1">
                      <p className="text-slate-200 text-lg leading-relaxed font-medium">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
         </div>
       ) : (
         <div className="text-center py-24 bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center">
           <VideoIcon className="w-20 h-20 text-slate-600 mb-6 opacity-50" />
           <p className="text-xl text-slate-400 font-light">طراحی سناریو برای یک ویدیوی جدید بر اساس الگوی موفق</p>
           <p className="text-sm text-slate-600 mt-2">برای دریافت ایده دکمه بالا را بزنید</p>
         </div>
       )}
    </div>
  );

  const renderNotesView = () => (
    <div className="h-[calc(100vh-140px)] flex flex-col max-w-6xl mx-auto">
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-bold text-white">یادداشت‌برداری هوشمند</h2>
         <button 
           onClick={handleRefineNotes}
           className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-900/30"
         >
           <PenToolIcon className="w-4 h-4" />
           بهینه‌سازی و تکمیل با هوش مصنوعی
         </button>
       </div>
       <div className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
         <div className="bg-slate-900/50 p-3 border-b border-slate-700 text-xs text-slate-400 flex justify-between px-6 items-center">
            <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> در حال آماده به کار</span>
            <span className="font-mono opacity-50">Markdown Supported</span>
         </div>
         <textarea 
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            className="flex-1 w-full bg-transparent text-slate-200 p-8 focus:outline-none resize-none text-lg leading-8 font-light custom-scrollbar"
            placeholder="نکات خود را اینجا بنویسید... (سپس دکمه بالا را بزنید تا هوش مصنوعی آن را کامل، مرتب و حرفه‌ای کند)"
         ></textarea>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar Navigation */}
      {renderSidebar()}

      {/* Main Content Area */}
      <main className="md:pr-64 min-h-screen transition-all">
        {appState === AppState.IDLE ? (
          renderInputScreen()
        ) : (
          <div className="p-6 md:p-10 max-w-7xl mx-auto">
             <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-red-600/20 p-3 rounded-xl border border-red-500/20">
                     <YoutubeIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">گزارش تحلیل محتوا</h1>
                    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:text-blue-300 hover:underline truncate max-w-md block transition-colors">
                      {url}
                    </a>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setAppState(AppState.IDLE);
                    setAnalysis(null);
                    setArticle(null);
                    setConcept(null);
                    setUrl('');
                    setLoadingText('');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 text-sm font-medium"
                >
                  تحلیل ویدیوی جدید
                </button>
             </header>

             <div className="fade-in">
               {activeTab === TabView.DASHBOARD && renderDashboard()}
               {activeTab === TabView.ARTICLE && renderArticleView()}
               {activeTab === TabView.CONCEPT && renderConceptView()}
               {activeTab === TabView.NOTES && renderNotesView()}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
