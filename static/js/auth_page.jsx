const { useState, useRef, useMemo } = React;

const MAJORS = [
  "Computer Science",
  "Computing with Business",
  "IT",
  "Network & Security",
  "Web Development",
];

// ─── File Upload Drop Zone ────────────────────────────────────────────────────
function FileDropZone({ inputRef }) {
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
      setFileName(file.name);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging ? "border-accent bg-accent/5" : fileName ? "border-green-400 bg-green-50" : "border-premium-200 bg-premium-50/50"
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        name="transcript_pdf"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        onChange={handleChange}
      />
      <div className="p-6 text-center pointer-events-none">
        {fileName ? (
          <React.Fragment>
            <svg className="w-7 h-7 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-[11px] font-bold text-green-700 truncate max-w-[220px] mx-auto">{fileName}</p>
            <p className="text-[9px] text-green-500 mt-1 uppercase tracking-wider">Ready to upload</p>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <svg className="w-7 h-7 text-premium-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p className="text-[10px] font-bold text-premium-500 uppercase tracking-wider">Click or Drag PDF / Image</p>
            <p className="text-[9px] text-premium-400 mt-1">PDF, PNG, JPG — max 16 MB</p>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

function LoginFields() {
  return (
    <React.Fragment>
      <div className="space-y-2">
        <label htmlFor="login_student_id" className="text-xs font-bold text-premium-900 uppercase tracking-widest ml-1">Student ID</label>
        <input id="login_student_id" name="student_id" type="text" required placeholder="e.g. 2024101" className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-premium-500/50 text-premium-900" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="login_password" className="text-xs font-bold text-premium-900 uppercase tracking-widest ml-1">Password</label>
          <a href="#" className="text-[10px] font-bold text-accent uppercase tracking-wider">Forgot?</a>
        </div>
        <input id="login_password" name="password" type="password" required placeholder="••••••••" className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-premium-500/50 text-premium-900" />
      </div>
    </React.Fragment>
  );
}

function RegisterFields({ fileInputRef }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-2">
        <label htmlFor="reg_student_id" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">Student ID</label>
        <input id="reg_student_id" name="student_id" required className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900" />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg_full_name" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">Full Name</label>
        <input id="reg_full_name" name="full_name" required className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="reg_email" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">University Email</label>
        <input id="reg_email" name="email" type="email" required className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900" />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg_major" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">Major</label>
        <select id="reg_major" name="major" required className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900 appearance-none">
          {MAJORS.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>
      <div className="space-y-2">
        <label htmlFor="reg_phone" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">Phone <span className="normal-case font-normal text-premium-400">(optional)</span></label>
        <input id="reg_phone" name="phone" type="tel" className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900" />
      </div>

      <div className="md:col-span-2 pt-4 border-t border-premium-100 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-brand uppercase tracking-widest">
            Transcript
          </label>
          <span className="text-[9px] font-bold bg-premium-100 text-premium-500 px-2 py-1 rounded-full uppercase tracking-wider">
            Optional — can upload after sign-up
          </span>
        </div>
        <FileDropZone inputRef={fileInputRef} />
        <div className="flex items-start gap-2 bg-brand/5 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-[10px] text-brand/70 leading-relaxed">
            PDFs are parsed with <strong>column-splitting</strong> logic — left column then right — to correctly read two-column university transcripts.
          </p>
        </div>
      </div>

      <div className="space-y-2 md:col-span-2">
        <label htmlFor="reg_password" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">Password</label>
        <input id="reg_password" name="password" type="password" required minLength={6} placeholder="Min. 6 characters" className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900 placeholder:text-premium-400/50" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="reg_confirm" className="text-xs font-bold text-premium-700 uppercase tracking-widest ml-1">Confirm Password</label>
        <input id="reg_confirm" name="confirm" type="password" required placeholder="••••••••" className="w-full bg-white border border-premium-300 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand text-premium-900 placeholder:text-premium-400/50" />
      </div>
    </div>
  );
}

// ─── Auth Page ────────────────────────────────────────────────────────────────
function AuthPage() {
  const cfg = window.__ACADEMO_AUTH__ || {};
  const flashes = useMemo(() => cfg.flashes || [], [cfg.flashes]);
  const next = cfg.next || "";
  const loginAction = cfg.login_action || "/login";
  const registerAction = cfg.register_action || "/register";
  const toolsHomeUrl = cfg.tools_home_url || "/home";

  const [tab, setTab] = useState(
    cfg.initial_tab === "register" ? "register" : "login"
  );

  const fileInputRef = useRef(null);
  const guestHref = toolsHomeUrl;

  return (
    <div className="min-h-screen flex bg-premium-50 font-sans selection:bg-accent/20">
      {/* Left Side: Brand & Visuals (Desktop only) */}
      <div className="hidden lg:flex w-[45%] bg-brand relative overflow-hidden flex-col justify-between p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-brand via-brand-light to-brand opacity-90" />
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-accent/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[5%] left-[-5%] w-[50%] h-[30%] bg-brand-accent/10 blur-[100px] rounded-full" />

        <div className="relative z-10">
          <a href={guestHref} className="inline-flex items-center gap-4 group">
            <div className="group-hover:scale-110 transition-transform duration-700">
              <img
                src="/static/images/logo_small.png"
                alt="ACADEMO"
                className="w-24 h-24 object-contain filter invert brightness-0 opacity-95 drop-shadow-2xl"
              />
            </div>
            <div>
              <h2 className="text-2xl font-display font-extrabold tracking-tight text-white">
                ACADEMO
              </h2>
              <p className="text-brand-accent/90 text-[10px] font-bold tracking-[0.3em] uppercase">
                Academic Intelligence
              </p>
            </div>
          </a>
        </div>

        <div className="relative z-10 mb-20">
          <h1 className="text-5xl font-display font-extrabold text-white leading-[1.1] mb-6 animate-fade-in">
            Master your <span className="text-brand-accent">academic journey</span> with precision.
          </h1>
          <p className="text-indigo-100/70 text-lg max-w-md leading-relaxed mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            The ultimate hub for transcript management, GPA planning, and AI-driven course advice.
          </p>

          <div className="space-y-4 animate-fade-in max-w-sm" style={{ animationDelay: '0.2s' }}>
            {/* Tool 1: Advisor */}
            <div className="glass p-4 rounded-[2rem] flex items-center gap-5 group hover:bg-white/10 transition-all duration-500 cursor-default">
              <div className="w-14 h-14 rounded-[1.25rem] bg-brand-accent/10 flex items-center justify-center text-brand-accent group-hover:scale-110 group-hover:bg-brand-accent/20 transition-all duration-500 shadow-xl">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm tracking-tight">Course Advisor</h4>
                <p className="text-brand-accent/60 text-[11px] font-medium leading-tight mt-0.5">AI-powered recommendations</p>
              </div>
            </div>
            
            {/* Tool 2: GPA */}
            <div className="glass p-4 rounded-[2rem] flex items-center gap-5 group hover:bg-white/10 transition-all duration-500 cursor-default">
              <div className="w-14 h-14 rounded-[1.25rem] bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 group-hover:bg-accent/20 transition-all duration-500 shadow-xl">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm tracking-tight">GPA Planner</h4>
                <p className="text-brand-accent/60 text-[11px] font-medium leading-tight mt-0.5">Real-time grade projections</p>
              </div>
            </div>

            {/* Tool 3: Roadmap */}
            <div className="glass p-4 rounded-[2rem] flex items-center gap-5 group hover:bg-white/10 transition-all duration-500 cursor-default">
              <div className="w-14 h-14 rounded-[1.25rem] bg-emerald-400/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-400/20 transition-all duration-500 shadow-xl">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              </div>
              <div>
                <h4 className="text-white font-bold text-sm tracking-tight">Graduation Plan</h4>
                <p className="text-brand-accent/60 text-[11px] font-medium leading-tight mt-0.5">Automated roadmap generator</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-indigo-200/40 text-xs font-medium">
          <span>Trusted by 10,000+ students</span>
          <div className="w-1 h-1 rounded-full bg-brand-accent/40" />
          <span>v2.4.0</span>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
        {/* Mobile Header */}
        <div className="lg:hidden w-full flex justify-center mb-8">
           <div className="flex items-center gap-4">
             <img src="/static/images/logo_small.png" alt="ACADEMO" className="w-16 h-16 object-contain filter brightness-0 contrast-125" />
             <div className="text-left">
               <h2 className="font-display font-black text-brand text-2xl tracking-tighter leading-none">ACADEMO</h2>
               <p className="text-[10px] font-bold text-premium-500 uppercase tracking-widest mt-1">Intelligence</p>
             </div>
           </div>
        </div>

        <div className={`w-full ${tab === "register" ? "max-w-xl" : "max-w-md"} transition-all duration-500`}>
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-display font-extrabold text-brand mb-3">
              {tab === "login" ? "Welcome Back" : "Start your journey"}
            </h1>
            <p className="text-premium-600 text-sm font-medium">
              {tab === "login" 
                ? "Manage your academic excellence with ease." 
                : "Join the elite circle of organized students."}
            </p>
          </div>

          {/* Decision Portal: Three Entry Paths */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => setTab("login")}
              className={`relative overflow-hidden p-5 rounded-[2rem] border-2 text-left transition-all duration-500 group ${
                tab === "login" 
                ? "bg-white border-brand shadow-premium-hover scale-[1.02]" 
                : "bg-white/50 border-premium-100 hover:border-brand/30 hover:bg-white"
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                tab === "login" ? "bg-brand text-white" : "bg-premium-100 text-premium-500 group-hover:bg-brand/10 group-hover:text-brand"
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
              </div>
              <h4 className={`font-display font-bold text-sm ${tab === "login" ? "text-brand" : "text-premium-700"}`}>Sign In</h4>
              <p className="text-[10px] text-premium-400 mt-1 font-medium leading-tight">Welcome back</p>
              {tab === "login" && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand" />}
            </button>

            <button
              onClick={() => setTab("register")}
              className={`relative overflow-hidden p-5 rounded-[2rem] border-2 text-left transition-all duration-500 group ${
                tab === "register" 
                ? "bg-white border-brand shadow-premium-hover scale-[1.02]" 
                : "bg-white/50 border-premium-100 hover:border-brand/30 hover:bg-white"
              }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                tab === "register" ? "bg-brand text-white" : "bg-premium-100 text-premium-500 group-hover:bg-brand/10 group-hover:text-brand"
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
              </div>
              <h4 className={`font-display font-bold text-sm ${tab === "register" ? "text-brand" : "text-premium-700"}`}>Join Now</h4>
              <p className="text-[10px] text-premium-400 mt-1 font-medium leading-tight">Create account</p>
              {tab === "register" && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand" />}
            </button>

            <a
              href={guestHref}
              className="relative overflow-hidden p-5 rounded-[2rem] border-2 bg-white/50 border-premium-100 text-left hover:border-brand/30 hover:bg-white transition-all duration-500 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-premium-100 text-premium-500 group-hover:bg-brand/10 group-hover:text-brand flex items-center justify-center mb-3 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </div>
              <h4 className="font-display font-bold text-sm text-premium-700">Quick Guest</h4>
              <p className="text-[10px] text-premium-400 mt-1 font-medium leading-tight">Try without credit</p>
            </a>
          </div>

          {/* Flash messages */}
          {flashes.length > 0 && (
            <div className="mb-8 space-y-3 animate-fade-in">
              {flashes.map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
                  item.category === "error" ? "bg-red-50 text-red-700 border-red-100" : "bg-blue-50 text-blue-700 border-blue-100"
                }`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.category === "error" ? "bg-red-400" : "bg-blue-400"}`} />
                  {item.message}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] shadow-premium border border-premium-100 p-8 lg:p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 group-hover:bg-brand/10 transition-colors" />
            
            <form
              method="post"
              action={tab === "login" ? loginAction : registerAction}
              encType={tab === "register" ? "multipart/form-data" : undefined}
              className="space-y-6 relative z-10"
            >
              <input type="hidden" name="next" value={next} />
              
              {tab === "login" ? <LoginFields /> : <RegisterFields fileInputRef={fileInputRef} />}

              <button
                type="submit"
                className="w-full py-5 rounded-2xl bg-brand text-white font-bold text-sm tracking-widest uppercase shadow-premium hover:shadow-premium-hover hover:bg-brand-light transition-all active:scale-[0.98] flex items-center justify-center gap-3 lg:mt-4"
              >
                {tab === "login" ? "Sign In Now" : "Complete Registration"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
          </div>

          <p className="text-[10px] font-bold text-premium-300 uppercase tracking-widest text-center mt-6">
            {"© 2026 ACADEMO Academic Intelligence"}
          </p>
        </div>
      </div>
    </div>
  );
}

;(function mountAuth() {
  const el = document.getElementById("root");
  if (!el || typeof ReactDOM === "undefined" || !ReactDOM.createRoot) return;
  const root = ReactDOM.createRoot(el);
  root.render(<AuthPage />);
})();
