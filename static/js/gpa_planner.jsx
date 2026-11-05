const { useState, useEffect, useRef } = React;
const MAJOR_STORAGE_KEY = "academoSelectedMajor";
const DEFAULT_MAJOR = "Computer Science";

const TranscriptInputPanel = window.TranscriptInputPanel;
const AcademoAuthNav = window.AcademoAuthNav;

function Loader() {
    return (
        <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
            <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-6 text-brand font-semibold text-lg animate-pulse">Analyzing your GPA...</p>
            <p className="mt-2 text-gray-500 text-sm max-w-sm text-center">Calculating projections and building personalized recommendations.</p>
        </div>
    );
}

function CourseRow({ course, index, onUpdate, onRemove, majorCourses }) {
    const handleNameChange = (val) => {
        onUpdate(index, 'name', val);
        // Auto-fill CH if found in majorCourses
        const matched = majorCourses.find(c => (c.code + " - " + c.title) === val || c.code === val);
        if (matched && matched.ch) {
            onUpdate(index, 'hours', String(matched.ch));
        }
    };

    return (
        <div className="bg-surfaceHigh/50 rounded-2xl p-4 mb-3 border border-blue-50 transition-all hover:shadow-sm animate-fade-in group">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Course Name</label>
                    <div className="relative">
                        <input
                            type="text"
                            list={`courses-list-${index}`}
                            value={course.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all text-sm text-gray-700 placeholder-gray-400"
                            placeholder="Type or select a course"
                        />
                        <datalist id={`courses-list-${index}`}>
                            {majorCourses.map((mc, idx) => (
                                <option key={idx} value={`${mc.code} - ${mc.title}`} />
                            ))}
                        </datalist>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Credit Hours</label>
                    <input
                        type="number"
                        value={course.hours}
                        onChange={(e) => onUpdate(index, 'hours', e.target.value)}
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all text-sm text-gray-700"
                        min="1" max="12" step="1"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Expected Grade</label>
                    <select
                        value={course.grade}
                        onChange={(e) => onUpdate(index, 'grade', e.target.value)}
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all text-sm text-gray-700 cursor-pointer"
                    >
                        <option value="">Select</option>
                        <option value="A">A (4.0)</option>
                        <option value="B+">B+ (3.5)</option>
                        <option value="B">B (3.0)</option>
                        <option value="C+">C+ (2.5)</option>
                        <option value="C">C (2.0)</option>
                        <option value="D">D (1.0)</option>
                        <option value="F">F (0.0)</option>
                    </select>
                </div>
                <button
                    onClick={() => onRemove(index)}
                    className="p-3 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all font-bold text-sm h-fit self-end border border-red-100 hover:border-red-200"
                    title="Remove course"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>
    );
}

const App = () => {
    const getSelectedMajor = () => {
        const majorFromQuery = new URLSearchParams(window.location.search).get("major");
        const major = (majorFromQuery || localStorage.getItem(MAJOR_STORAGE_KEY) || DEFAULT_MAJOR).trim();
        localStorage.setItem(MAJOR_STORAGE_KEY, major);
        return major;
    };

    const [inputType, setInputType] = useState('text');
    const [transcriptText, setTranscriptText] = useState('');
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hasSavedTranscript, setHasSavedTranscript] = useState(false);
    const [saveBusy, setSaveBusy] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [displayName, setDisplayName] = useState('');

    const [currentGpa, setCurrentGpa] = useState('');
    const [earnedHours, setEarnedHours] = useState('');
    const [targetGpa, setTargetGpa] = useState('');
    const [courses, setCourses] = useState([{ name: '', hours: '', grade: '' }]);
    const [selectedMajor, setSelectedMajor] = useState(getSelectedMajor);
    const [majorCourses, setMajorCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [outputHTML, setOutputHTML] = useState('');

    const fileInputRef = useRef(null);

    // Sync major from profile if authenticated
    useEffect(() => {
        fetch('/api/me/profile', { credentials: 'same-origin' })
            .then(r => r.json())
            .then(data => {
                if (data.specialization) {
                    setSelectedMajor(data.specialization);
                    localStorage.setItem(MAJOR_STORAGE_KEY, data.specialization);
                }
            })
            .catch(() => {});
    }, []);

    // Fetch courses for the selected major
    useEffect(() => {
        if (selectedMajor) {
            fetch(`/api/major-courses?major=${encodeURIComponent(selectedMajor)}`)
                .then(r => r.json())
                .then(data => {
                    if (data.courses) {
                        setMajorCourses(data.courses);
                    }
                })
                .catch(err => console.error("Error fetching major courses:", err));
        }
    }, [selectedMajor]);

    useEffect(() => {
        fetch('/api/session/context', { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data) => {
                setIsAuthenticated(!!data.is_authenticated);
                setHasSavedTranscript(!!data.has_saved_transcript);
                setDisplayName((data.display_name || '').trim());
            })
            .catch(() => {})
            .finally(() => setSessionLoaded(true));
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const saveTranscriptToAccount = async () => {
        if (!transcriptText.trim()) return;
        setSaveBusy(true);
        setSaveMessage('');
        try {
            const r = await fetch('/api/me/transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ raw_text: transcriptText }),
            });
            if (r.ok) {
                setSaveMessage('Saved.');
                setHasSavedTranscript(true);
            } else {
                const t = await r.text();
                setSaveMessage(t || 'Could not save.');
            }
        } catch (e) {
            setSaveMessage('Network error.');
        } finally {
            setSaveBusy(false);
        }
    };

    const convertMarkdownTables = (text) => {
        // Pre-process HTML tags generated by LLM for stunning UI
        text = text.replace(/<h1(.*?)>(.*?)<\/h1>/gi, `<h1 class="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand via-brandHover to-accent mb-10 mt-16 pb-4 border-b-2 border-blue-100 tracking-tight drop-shadow-sm leading-tight">$2</h1>`);
        
        text = text.replace(/<h3(.*?)>(.*?)<\/h3>/gi, `<h3 class="text-xl md:text-2xl font-extrabold text-brandHover mb-6 mt-14 flex items-center bg-gradient-to-r from-surface cursor-default to-transparent py-4 px-6 rounded-3xl border border-blue-100/60 shadow-sm transition-all hover:translate-x-2 hover:shadow-md"><span class="flex flex-shrink-0 items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-blue-500 text-white mr-4 shadow-lg text-lg ring-4 ring-blue-50">✦</span>$2</h3>`);
        
        text = text.replace(/<p(.*?)>(.*?)<\/p>/gi, `<p class="mb-6 text-gray-700 leading-relaxed text-lg bg-surface/40 p-6 rounded-3xl shadow-sm border border-white/60 backdrop-blur-sm">$2</p>`);

        // Safely parse Risk Bar Block
        text = text.replace(/<div class="risk-container">[\s\S]{1,400}style="width:\s*(\d+)%?"[\s\S]{1,150}<\/div>\s*<\/div>\s*<\/div>/gi, (match, width) => {
            let widthNum = parseFloat(width);
            let color = "bg-green-500";
            let bgLight = "bg-green-100 text-green-800 border-green-200";
            let riskText = "Low";
            
            if (widthNum >= 40) { color = "bg-yellow-400"; bgLight = "bg-yellow-100 text-yellow-800 border-yellow-200"; riskText = "Moderate"; }
            if (widthNum >= 75) { color = "bg-red-500 animate-pulse"; bgLight = "bg-red-100 text-red-800 border-red-200"; riskText = "High"; }
            
            return `
            <div class="my-12 p-8 md:p-10 bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 hover:shadow-[0_20px_50px_rgba(3,80,196,0.1)] transition-all duration-300 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-bl-[150px] -z-10 group-hover:scale-110 transition-transform duration-700"></div>
                <div class="flex items-center gap-6 w-full md:w-1/2">
                    <div class="w-20 h-20 rounded-3xl flex flex-shrink-0 items-center justify-center shadow-inner ring-8 ring-white ${bgLight}">
                       <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <div>
                        <h4 class="text-2xl font-black text-gray-800 mb-1 tracking-tight">Academic Workload Risk</h4>
                        <p class="text-sm text-gray-500 leading-relaxed max-w-sm">Calculated density of demanding courses and sequences for this semester.</p>
                    </div>
                </div>
                <div class="w-full md:w-1/2">
                    <div class="flex justify-between text-xs font-bold mb-3 uppercase tracking-wider">
                        <span class="text-green-600">Low</span>
                        <span class="text-yellow-600">Moderate</span>
                        <span class="text-red-600">High</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-6 overflow-hidden shadow-inner flex relative ring-1 ring-black/5">
                        <div class="${color} h-full rounded-full transition-all duration-1000 ease-out shadow-md relative overflow-hidden" style="width:${widthNum}%">
                            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                    <div class="mt-5 flex justify-end">
                        <span class="inline-flex items-center justify-center px-5 py-2 rounded-full text-sm font-black border shadow-sm tracking-wide ${bgLight}">Assessed: ${riskText} (${widthNum}%)</span>
                    </div>
                </div>
            </div>`;
        });
        
        // Remove old risk container tags just in case regex failed to match exact structure
        text = text.replace(/<div class="risk-container">/g, "");
        text = text.replace(/<div class="risk-label">(.*?)<\/div>/g, "");
        text = text.replace(/<div class="risk-bar">/g, "");
        text = text.replace(/<div class="risk-fill(.*?)LOW|MODERATE|HIGH(.*?)style="width:\s*(.*?)%?".*?>.*?<\/div>/gi, "");

        const lines = text.split("\n");
        let html = "";
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            if (line.startsWith("|") && line.endsWith("|")) {
                let cells = line.split("|").map(x => x.trim()).filter(x => x !== "");
                if (cells.every(c => c.replace(/-/g, '').trim() === '')) continue; 

                if (!inTable) {
                    html += "<div class='not-prose overflow-hidden rounded-[2rem] shadow-xl border border-blue-100 bg-white mb-12 transition-all hover:shadow-2xl ring-4 ring-surfaceHigh duration-300'>";
                    html += "<div class='overflow-x-auto w-full'>";
                    html += "<table class='w-full text-left border-collapse min-w-max'>";
                    html += "<thead class='bg-gradient-to-br from-brand via-brandHover to-accent text-white'><tr>";
                    cells.forEach(c => { html += `<th class='px-8 py-5 font-bold tracking-widest text-xs uppercase whitespace-nowrap border-b border-brandLight/20 opacity-95'>${c}</th>`; });
                    html += "</tr></thead><tbody class='divide-y divide-gray-50'>";
                    inTable = true;
                    continue;
                }

                html += "<tr class='hover:bg-blue-50/50 transition-colors duration-200 group bg-white'>";
                cells.forEach((c, index) => { 
                    let cellClass = "px-8 py-6 text-gray-700 align-middle text-base group-hover:text-brandHover transition-colors whitespace-nowrap";
                    let content = c;

                    // Parse Recommendation Badges
                    if (c.toLowerCase().includes("high recommendation") || c.toLowerCase() === "high") {
                        content = `<span class='inline-flex items-center px-4 py-2 rounded-full text-xs font-black bg-green-100 text-green-700 border border-green-200 shadow-sm transition-transform hover:scale-105 uppercase tracking-wide'><span class='w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse'></span>High Target</span>`;
                    } else if (c.toLowerCase().includes("medium recommendation") || c.toLowerCase() === "medium") {
                        content = `<span class='inline-flex items-center px-4 py-2 rounded-full text-xs font-black bg-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm transition-transform hover:scale-105 uppercase tracking-wide'><span class='w-2 h-2 rounded-full bg-yellow-500 mr-2'></span>Medium Priority</span>`;
                    } else if (c.toLowerCase().includes("low recommendation") || c.toLowerCase() === "low") {
                        content = `<span class='inline-flex items-center px-4 py-2 rounded-full text-xs font-black bg-gray-100 text-gray-700 border border-gray-300 shadow-sm transition-transform hover:scale-105 uppercase tracking-wide'><span class='w-2 h-2 rounded-full bg-gray-400 mr-2'></span>Low Priority</span>`;
                    } 
                    // Badges for Grades
                    else if (['a','b+','b','c+','c','d','s'].includes(c.toLowerCase())) {
                        content = `<span class='inline-flex items-center px-3.5 py-1.5 rounded-xl text-sm font-black bg-brand/5 text-brand border border-brand/10 uppercase drop-shadow-sm min-w-[2.5rem] justify-center'>${c}</span>`;
                    } else if (['f','fa','ff'].includes(c.toLowerCase())) {
                         content = `<span class='inline-flex items-center px-3.5 py-1.5 rounded-xl text-sm font-black bg-red-100 text-red-700 border border-red-200 uppercase drop-shadow-sm min-w-[2.5rem] justify-center'>${c}</span>`;
                    }
                    // For percentage logic like "85%"
                    else if (c.match(/^\d{1,3}%$/)) {
                        content = `<span class='font-bold text-accent'>${c}</span>`;
                    }

                    // Bold Course Codes
                    if (c.match(/^[A-Z]{2,4}\d{3}[A-Z]?$/i) || c.match(/^[A-Z]{1,4}-\d{1,4}/i) || c.match(/^[A-Z\-]{3,8}$/i)) {
                        cellClass += " font-black text-brand tracking-widest text-lg bg-gray-50/50";
                    } else if (!content.includes("<span")) {
                        cellClass += " font-medium";
                    }

                    html += `<td class='${cellClass}'>${content}</td>`; 
                });
                html += "</tr>";
            } else {
                if (inTable) {
                    html += "</tbody></table></div></div>";
                    inTable = false;
                }
                
                if (line.includes("<div") || line.includes("</div") || line.includes("<h1") || line.includes("</h1") || line.includes("<h3") || line.includes("</h3") || line.includes("<p") || line.includes("</p") || line.includes("<span") || line.includes("</span")) {
                    html += line + "\n";
                } else if (line.startsWith("# ")) {
                    html += `<h1 class='text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand via-brandHover to-accent mb-10 mt-16 pb-4 border-b-2 border-blue-100 tracking-tight drop-shadow-sm leading-tight'>${line.replace('# ', '')}</h1>`;
                } else if (line.startsWith("## ")) {
                    html += `<h2 class='text-2xl md:text-3xl font-black text-gray-800 mb-6 mt-12 tracking-tight flex items-center'><span class="w-2 h-8 bg-brand rounded-full mr-4 shadow-sm"></span>${line.replace('## ', '')}</h2>`;
                } else if (line.startsWith("### ")) {
                    html += `<h3 class='text-xl md:text-2xl font-extrabold text-brandHover mb-6 mt-14 flex items-center bg-gradient-to-r from-surface cursor-default to-transparent py-4 px-6 rounded-3xl border border-blue-100/60 shadow-sm transition-all hover:translate-x-2 hover:shadow-md'><span class="flex flex-shrink-0 items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-blue-500 text-white mr-4 shadow-lg text-lg ring-4 ring-blue-50">✦</span>${line.replace('### ', '')}</h3>`;
                } else if (line !== "") {
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                         html += `<li class='ml-6 mb-3 text-gray-700 leading-relaxed list-disc marker:text-accent font-medium text-lg'>${line.substring(2)}</li>`;
                    } else if (line.match(/^\d+\.\s/)) {
                         html += `<li class='ml-6 mb-3 text-gray-700 leading-relaxed list-decimal marker:text-brand font-bold text-lg'>${line.replace(/^\d+\.\s/, "")}</li>`;
                    } else if (!line.includes("</") && !line.includes("/>") && !line.includes(">")) {
                         // Loose text without tags
                         html += `<div class='mb-6 text-gray-700 font-medium text-lg leading-relaxed'>${line}</div>`;
                    } else {
                         // Fallback for random html blocks
                         html += line + "\n";
                    }
                }
            }
        }

        if (inTable) html += "</tbody></table></div></div>";
        return html;
    };

    const addCourse = () => {
        setCourses([...courses, { name: '', hours: '', grade: '' }]);
    };

    const removeCourse = (index) => {
        if (courses.length === 1) return;
        setCourses(courses.filter((_, i) => i !== index));
    };

    const updateCourse = (index, field, value) => {
        const updated = [...courses];
        updated[index][field] = value;
        setCourses(updated);
    };

    const resetForm = () => {
        setCurrentGpa('');
        setEarnedHours('');
        setTargetGpa('');
        setCourses([{ name: '', hours: '', grade: '' }]);
        setOutputHTML('');
        setTranscriptText('');
        setFile(null);
        setInputType('text');
        setSaveMessage('');
    };

    const submitForm = async () => {
        if (!currentGpa || !earnedHours) {
            alert('Please fill in your GPA and earned hours.');
            return;
        }

        const validCourses = courses.filter(c => c.name && c.hours && c.grade);
        if (validCourses.length === 0) {
            alert('Please add at least one course with all fields filled.');
            return;
        }

        if (inputType === 'pdf' && !file) {
            alert('Please upload a transcript file, or switch to paste / saved.');
            return;
        }
        if (inputType === 'saved' && (!isAuthenticated || !hasSavedTranscript)) {
            alert('No saved transcript available.');
            return;
        }

        setLoading(true);
        setOutputHTML('');

        try {
            const fd = new FormData();
            fd.append('type', inputType);
            fd.append('major', selectedMajor);
            fd.append('current_gpa', String(parseFloat(currentGpa)));
            fd.append('earned_hours', String(parseInt(earnedHours, 10)));
            fd.append('target_gpa', String(parseFloat(targetGpa) || 0));
            fd.append(
                'courses',
                JSON.stringify(validCourses.map((c) => ({ ...c, hours: parseInt(c.hours, 10) })))
            );
            if (inputType === 'text') {
                fd.append('transcript', transcriptText);
            } else if (inputType === 'pdf') {
                fd.append('file', file);
            }

            const response = await fetch('/api/gpa-plan', {
                method: 'POST',
                body: fd,
                credentials: 'same-origin',
            });

            if (!response.ok) {
                let msg = 'Server responded with error.';
                const responseText = await response.text();
                try {
                    const parsed = JSON.parse(responseText);
                    msg = parsed.error || responseText || msg;
                } catch {
                    msg = responseText || msg;
                }
                if (response.status === 401) {
                    msg = 'Please log in to use your saved transcript.';
                }
                throw new Error(msg);
            }

            const result = await response.text();
            setOutputHTML(convertMarkdownTables(result));

            // Scroll to output after a short delay
            setTimeout(() => {
                document.getElementById('output-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        } catch (error) {
            console.error('Error:', error);
            setOutputHTML(`<div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <p class="text-red-700 font-medium">Error occurred. Please try again.</p>
                <p class="text-sm text-red-500 mt-1">${error.message}</p>
            </div>`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate total semester hours live
    const totalHours = courses.reduce((sum, c) => sum + (parseInt(c.hours) || 0), 0);

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <header className="bg-brand text-white py-6 px-10 shadow-xl rounded-br-[80px] relative z-10 animate-fade-in">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <a href="/home" className="shrink-0">
                            <img src="/static/images/logo_small.png" alt="ACADEMO" className="w-20 h-20 object-contain drop-shadow-xl hover:scale-110 hover:-rotate-2 transition-transform duration-500" />
                        </a>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">ACADEMO</h1>
                            <p className="text-blue-200 text-sm mt-1 font-medium tracking-widest uppercase">GPA Planner & Analyzer</p>
                        </div>
                    </div>
                    {AcademoAuthNav && (
                        <AcademoAuthNav
                            sessionLoaded={sessionLoaded}
                            isAuthenticated={isAuthenticated}
                            displayName={displayName}
                        />
                    )}
                </div>
            </header>

            {/* Main */}
            <main className="max-w-4xl mx-auto mt-10 px-6">

                {/* Transcript (same options as other tools) */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 mb-6 animate-fade-in" style={{animationDelay: '0.05s'}}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand/10 to-accent/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Transcript</h2>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">Optional context for the advisor — normalized the same way as Course Advisor and Graduation Plan.</p>
                    {TranscriptInputPanel && (
                        <TranscriptInputPanel
                            inputType={inputType}
                            setInputType={setInputType}
                            transcriptText={transcriptText}
                            setTranscriptText={setTranscriptText}
                            file={file}
                            setFile={setFile}
                            fileInputRef={fileInputRef}
                            dragOver={dragOver}
                            setDragOver={setDragOver}
                            onDrop={handleDrop}
                            onFileSelect={handleFileSelect}
                            isAuthenticated={isAuthenticated}
                            hasSavedTranscript={hasSavedTranscript}
                            sessionLoaded={sessionLoaded}
                            onSaveTranscript={saveTranscriptToAccount}
                            saveBusy={saveBusy}
                            saveMessage={saveMessage}
                        />
                    )}
                </div>

                {/* Card 1: Academic Info */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 mb-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand/10 to-accent/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Your Academic Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Current GPA (0.0 - 4.0)</label>
                            <input
                                type="number"
                                value={currentGpa}
                                onChange={(e) => setCurrentGpa(e.target.value)}
                                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all text-sm text-gray-700 placeholder-gray-400"
                                step="0.01" min="0" max="4" placeholder="e.g., 3.50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Earned Credit Hours</label>
                            <input
                                type="number"
                                value={earnedHours}
                                onChange={(e) => setEarnedHours(e.target.value)}
                                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all text-sm text-gray-700 placeholder-gray-400"
                                placeholder="e.g., 45"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Target GPA (Optional)</label>
                        <input
                            type="number"
                            value={targetGpa}
                            onChange={(e) => setTargetGpa(e.target.value)}
                            className="w-full md:w-1/2 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-accent outline-none transition-all text-sm text-gray-700 placeholder-gray-400"
                            step="0.01" min="0" max="4" placeholder="e.g., 3.75"
                        />
                    </div>
                </div>

                {/* Card 2: Courses */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 mb-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand/10 to-accent/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Current Semester Courses</h2>
                        </div>
                        {totalHours > 0 && (
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${totalHours > 20 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-brand border-blue-200'}`}>
                                {totalHours} CH
                            </span>
                        )}
                    </div>

                    {courses.map((course, index) => (
                        <CourseRow 
                            key={index} 
                            course={course} 
                            index={index} 
                            onUpdate={updateCourse} 
                            onRemove={removeCourse}
                            majorCourses={majorCourses}
                        />
                    ))}

                    <button
                        onClick={addCourse}
                        className="w-full py-3 mt-2 bg-surfaceHigh text-brand font-semibold rounded-xl border-2 border-dashed border-blue-200 hover:border-accent hover:bg-blue-50 transition-all text-sm"
                    >
                        + Add Another Course
                    </button>
                </div>

                {/* Card 3: Actions */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 mb-8 animate-fade-in" style={{animationDelay: '0.3s'}}>
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <button 
                            onClick={resetForm}
                            className="px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-full hover:bg-gray-200 transition-all text-sm border border-gray-200"
                        >
                            Reset Form
                        </button>
                        <button 
                            onClick={submitForm}
                            disabled={loading}
                            className="group relative px-8 py-3.5 bg-brand text-white font-bold rounded-full overflow-hidden shadow-lg shadow-brand/30 hover:shadow-brand/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10 flex items-center justify-center">
                                Calculate GPA & Analyze <span className="ml-2 group-hover:rotate-12 transition-transform">✨</span>
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-brand to-brandHover opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                    </div>
                </div>

                {/* Output Area */}
                {loading && <Loader />}
                
                {outputHTML && !loading && (
                    <div id="output-section" className="academo-output-card animate-fade-in" style={{animationDelay: '0.2s'}}>
                        <div dangerouslySetInnerHTML={{ __html: outputHTML }} className="academo-output-content prose prose-blue max-w-none text-gray-800" />
                    </div>
                )}
            </main>
        </div>
    );
};

window.GpaPlannerApp = App;
