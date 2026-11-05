/**
 * Shared transcript input: Upload PDF | Paste text | Use saved (DB).
 * Expects parent to load session via GET /api/session/context
 */
function TranscriptInputPanel({
  inputType,
  setInputType,
  transcriptText,
  setTranscriptText,
  file,
  setFile,
  fileInputRef,
  dragOver,
  setDragOver,
  onDrop,
  onFileSelect,
  isAuthenticated,
  hasSavedTranscript,
  sessionLoaded,
  onSaveTranscript,
  saveBusy,
  saveMessage,
  description,
}) {
  const canUseSaved = isAuthenticated && hasSavedTranscript;

  const handleTab = (id) => {
    if (id === "saved" && !canUseSaved) return;
    setInputType(id);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-sm font-semibold text-gray-700 mb-2">Transcript</label>
      {description && (
        <p className="text-gray-500 text-sm mb-4">{description}</p>
      )}

      <div className="flex flex-wrap gap-1 p-1 bg-surfaceHigh rounded-2xl shadow-inner mb-4">
        {[
          { id: "pdf", label: "Upload PDF" },
          { id: "text", label: "Paste text" },
          { id: "saved", label: "Use saved" },
        ].map((tab) => {
          const disabled = tab.id === "saved" && !canUseSaved;
          const active = inputType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={disabled}
              onClick={() => handleTab(tab.id)}
              className={`flex-1 min-w-[100px] py-3 px-2 text-sm font-semibold rounded-xl transition-all ${
                disabled
                  ? "text-gray-400 cursor-not-allowed opacity-60"
                  : active
                  ? "bg-white text-brand shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!sessionLoaded ? (
        <p className="text-xs text-gray-400 mb-3">Checking account…</p>
      ) : !isAuthenticated ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
          Login to use your saved transcript.
        </p>
      ) : !hasSavedTranscript ? (
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-3">
          Paste your transcript below and choose &ldquo;Save to my account&rdquo; to reuse it here later.
        </p>
      ) : null}

      {inputType === "text" && (
        <div className="animate-fade-in">
          <textarea
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all resize-none text-sm font-mono text-gray-700 placeholder-gray-400"
            placeholder="Paste your raw academic transcript record here..."
          />
          {isAuthenticated && transcriptText.trim() && onSaveTranscript && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSaveTranscript}
                disabled={saveBusy}
                className="text-sm font-semibold text-accent hover:text-brand border border-blue-200 bg-white px-4 py-2 rounded-full shadow-sm disabled:opacity-50"
              >
                {saveBusy ? "Saving…" : "Save to my account"}
              </button>
              {saveMessage && <span className="text-xs text-gray-600">{saveMessage}</span>}
            </div>
          )}
        </div>
      )}

      {inputType === "pdf" && (
        <div className="animate-fade-in">
          <div
            className={`border-3 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[200px] ${
              dragOver ? "bg-blue-50 border-accent scale-[1.02]" : "bg-surface border-blue-200 hover:border-accent hover:bg-surfaceHigh"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop || handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-brand/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-bold text-brand mb-1">Drag and drop your file here</p>
            <p className="text-gray-500 text-sm mb-4">PDF, PNG, or JPG</p>
            <span className="px-6 py-2 bg-white text-brand border border-blue-100 font-semibold rounded-full shadow-sm hover:shadow transition-all hover:bg-gray-50">
              Browse files
            </span>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileSelect}
              accept=".pdf,.png,.jpg,.jpeg"
            />
            {file && (
              <div className="mt-6 inline-flex items-center bg-blue-50 text-accent py-2 px-4 rounded-full text-sm font-medium border border-blue-100">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {file.name}
              </div>
            )}
          </div>
          <p className="mt-3 inline-flex items-center text-xs text-red-500 font-medium">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            For PDF or images, ensure the transcript is clearly legible.
          </p>
        </div>
      )}

      {inputType === "saved" && canUseSaved && (
        <div className="animate-fade-in rounded-2xl border border-blue-100 bg-surface p-6 text-sm text-gray-700">
          <p className="font-semibold text-brand mb-1">Using your saved transcript</p>
          <p className="text-gray-600">We will load the text stored on your account and normalize it with the same rules as PDF and paste.</p>
        </div>
      )}
    </div>
  );
}

window.TranscriptInputPanel = TranscriptInputPanel;
