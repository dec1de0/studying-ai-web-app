const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const toast = document.getElementById("toast");
const uploadForm = document.getElementById("upload-form");
const agentForm = document.getElementById("agent-form");
const logoutButton = document.getElementById("logout-button");
const agentThread = document.getElementById("agent-thread");
const openUploadButton = document.getElementById("open-upload-button");
const topbarUploadButton = document.getElementById("topbar-upload-button");
const EMAIL_STORAGE_KEY = "studypro:last-email";
const TOKEN_STORAGE_KEY = "studypro:token";
const FILE_NAME_STORAGE_KEY = "studypro:last-file-name";
const FILE_CHARS_STORAGE_KEY = "studypro:last-file-chars";
const FILE_HISTORY_STORAGE_KEY = "studypro:file-history";
const ACTION_COUNTS_STORAGE_KEY = "studypro:action-counts";
const CURRENT_FILE_ID_STORAGE_KEY = "studypro:current-file-id";

let apiBase = "";
let workspaceState = {
    fileUploaded: false,
    email: "",
};

async function detectApiBase() {
    if (window.location.protocol !== "file:") {
        apiBase = "";
        return;
    }

    const candidates = [
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8001",
        "http://localhost:8000",
        "http://localhost:8001",
    ];

    for (const candidate of candidates) {
        try {
            const response = await fetch(`${candidate}/health`);
            const payload = await response.json().catch(() => ({}));
            if (response.ok && payload.status === "ok") {
                apiBase = candidate;
                return;
            }
        } catch (_error) {
            // Try the next candidate.
        }
    }

    throw new Error("Could not find the backend server. Start FastAPI on port 8000 or 8001.");
}

function getErrorMessage(payload) {
    if (typeof payload.detail === "string") {
        return payload.detail;
    }

    if (Array.isArray(payload.detail) && payload.detail.length) {
        const firstError = payload.detail[0];
        if (firstError && typeof firstError.msg === "string") {
            return firstError.msg;
        }
    }

    return "Request failed";
}

async function request(path, options = {}) {
    const response = await fetch(`${apiBase}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(getErrorMessage(payload));
    }

    return payload;
}

async function requestWithAuth(path, options = {}) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
        throw new Error("Login required");
    }

    return request(path, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
}

async function requestForm(path, formData) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
        throw new Error("Login required");
    }

    const response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(getErrorMessage(payload));
    }

    return payload;
}

function showToast(message, isError = false) {
    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.toggle("error", isError);

    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
        toast.classList.add("hidden");
        toast.classList.remove("error");
    }, 3200);
}

function setButtonLoading(form, isLoading, pendingLabel) {
    const button = form ? form.querySelector("button[type='submit']") : null;
    if (!button) {
        return;
    }

    const idleLabel = button.dataset.idleLabel || button.textContent.trim();
    button.dataset.idleLabel = idleLabel;
    button.disabled = isLoading;
    button.textContent = isLoading ? pendingLabel : idleLabel;
}

function rememberEmail(email) {
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
}

function clearSession() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(FILE_NAME_STORAGE_KEY);
    localStorage.removeItem(FILE_CHARS_STORAGE_KEY);
    localStorage.removeItem(CURRENT_FILE_ID_STORAGE_KEY);
}

function redirectToSuccess(mode, email = "") {
    const params = new URLSearchParams({ mode });
    if (email) {
        params.set("email", email);
    }
    window.location.href = `./success.html?${params.toString()}`;
}

function prefillKnownEmail() {
    const loginEmail = document.getElementById("login-email");
    const lastEmail = localStorage.getItem(EMAIL_STORAGE_KEY);

    if (loginEmail && lastEmail) {
        loginEmail.value = lastEmail;
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    try {
        setButtonLoading(registerForm, true, "Creating account...");
        await request("/register", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        rememberEmail(email);
        redirectToSuccess("register", email);
    } catch (error) {
        showToast(error.message, true);
    } finally {
        setButtonLoading(registerForm, false, "Creating account...");
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
        setButtonLoading(loginForm, true, "Signing in...");
        const payload = await request("/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        });
        rememberEmail(email);
        if (payload.access_token) {
            localStorage.setItem(TOKEN_STORAGE_KEY, payload.access_token);
        }
        window.location.href = "./study.html";
    } catch (error) {
        showToast(error.message, true);
    } finally {
        setButtonLoading(loginForm, false, "Signing in...");
    }
}

function setupSuccessPage() {
    const title = document.getElementById("success-title");
    const subtitle = document.getElementById("success-subtitle");
    const state = document.getElementById("success-state");
    const email = document.getElementById("success-email");
    const note = document.getElementById("success-note");
    const primaryAction = document.getElementById("success-primary-action");
    const secondaryAction = document.getElementById("success-secondary-action");
    const canvas = document.getElementById("confetti-canvas");

    if (!title || !subtitle || !state || !email || !note || !primaryAction || !secondaryAction || !canvas) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const accountEmail = params.get("email") || localStorage.getItem(EMAIL_STORAGE_KEY) || "Ready";

    if (mode === "register") {
        title.textContent = "Registration is successful";
        subtitle.textContent = "Your account was created successfully.";
        state.textContent = "Account created";
        note.textContent = "Your account is ready. Continue to login when you want to start an authenticated session.";
        primaryAction.textContent = "Continue to login";
        primaryAction.href = "./login.html";
        secondaryAction.textContent = "Back to register";
        secondaryAction.href = "./index.html";
    } else {
        title.textContent = "Login is successful";
        subtitle.textContent = "You signed in successfully.";
        state.textContent = "Authenticated";
        note.textContent = "Your access token has been stored locally. Enter the workspace to upload a file and use the study AI tools.";
        primaryAction.textContent = "Open workspace";
        primaryAction.href = "./study.html";
        secondaryAction.textContent = "Back to login";
        secondaryAction.href = "./login.html";
    }
    email.textContent = accountEmail;

    const context = canvas.getContext("2d");
    if (!context) {
        return;
    }

    const pieces = Array.from({ length: 140 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -window.innerHeight,
        size: 8 + Math.random() * 10,
        speed: 1.2 + Math.random() * 2.8,
        drift: -1 + Math.random() * 2,
        rotation: Math.random() * Math.PI,
        color: ["#205c4f", "#d0aa6b", "#d66a58", "#6f8f7f", "#f3efe7"][Math.floor(Math.random() * 5)],
    }));

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function draw() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (const piece of pieces) {
            piece.y += piece.speed;
            piece.x += piece.drift;
            piece.rotation += 0.05;

            if (piece.y > canvas.height + piece.size) {
                piece.y = -20;
                piece.x = Math.random() * canvas.width;
            }

            context.save();
            context.translate(piece.x, piece.y);
            context.rotate(piece.rotation);
            context.fillStyle = piece.color;
            context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.5);
            context.restore();
        }

        window.requestAnimationFrame(draw);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    draw();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function createAgentMessage(role, html, metaLabel = "") {
    if (!agentThread) {
        return null;
    }

    const message = document.createElement("article");
    message.className = `agent-message agent-message-${role}`;

    const meta = document.createElement("div");
    meta.className = "agent-meta";
    meta.textContent = metaLabel || (role === "user" ? "You" : "Study AI Agent");

    const bubble = document.createElement("div");
    bubble.className = "agent-bubble";
    bubble.innerHTML = html;

    message.append(meta, bubble);
    agentThread.appendChild(message);
    agentThread.scrollTop = agentThread.scrollHeight;
    return bubble;
}

function renderIntroMessage() {
    if (!agentThread || agentThread.children.length) {
        return;
    }

    createAgentMessage(
        "assistant",
        [
            "<p>I can work with the AI routes that already exist in your backend.</p>",
            "<p>Upload one study file, then ask me to create lecture notes, a quiz, or flashcards.</p>",
            "<p>If the backend was restarted, upload the file again so I have fresh material to work with.</p>",
        ].join("")
    );
}

function getStoredHistory() {
    try {
        const parsed = JSON.parse(localStorage.getItem(FILE_HISTORY_STORAGE_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function setStoredHistory(history) {
    localStorage.setItem(FILE_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 8)));
}

function getActionCounts() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ACTION_COUNTS_STORAGE_KEY) || "{}");
        return {
            quiz: Number(parsed.quiz) || 0,
            flashcards: Number(parsed.flashcards) || 0,
            notes: Number(parsed.notes) || 0,
        };
    } catch (_error) {
        return { quiz: 0, flashcards: 0, notes: 0 };
    }
}

function setActionCounts(counts) {
    localStorage.setItem(ACTION_COUNTS_STORAGE_KEY, JSON.stringify(counts));
}

function getFileKind(name) {
    const normalized = String(name || "").toLowerCase();
    if (normalized.endsWith(".pdf")) {
        return { className: "pdf", label: "PDF" };
    }
    if (normalized.endsWith(".docx")) {
        return { className: "docx", label: "DOC" };
    }
    return { className: "txt", label: "TXT" };
}

function formatRelativeTime(timestamp) {
    const diffMs = Date.now() - Number(timestamp || Date.now());
    const minutes = Math.max(0, Math.round(diffMs / 60000));

    if (minutes < 1) {
        return "uploaded just now";
    }
    if (minutes < 60) {
        return `uploaded ${minutes}m ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `uploaded ${hours}h ago`;
    }

    const days = Math.round(hours / 24);
    return `uploaded ${days}d ago`;
}

function renderRecentFiles() {
    const list = document.getElementById("recent-files-list");
    if (!list) {
        return;
    }

    const history = getStoredHistory();
    if (!history.length) {
        list.innerHTML = `
            <div class="recent-item">
                <div class="file-info">
                    <div class="file-name">No files yet</div>
                    <div class="file-meta">Upload your first PDF, DOCX, or TXT file to begin.</div>
                </div>
            </div>
        `;
        return;
    }

    list.innerHTML = history.map((entry) => {
        const kind = getFileKind(entry.name);
        const badges = [];

        if (entry.actions && entry.actions.quiz) {
            badges.push('<span class="badge quiz">Quiz</span>');
        }
        if (entry.actions && entry.actions.flashcards) {
            badges.push('<span class="badge flash">Flashcards</span>');
        }
        if (entry.actions && entry.actions.notes) {
            badges.push('<span class="badge notes">Notes</span>');
        }

        return `
            <div class="recent-item">
                <div class="file-icon ${kind.className}">${kind.label}</div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(entry.name || "Untitled file")}</div>
                    <div class="file-meta">${escapeHtml(`${entry.chars || 0} chars · ${formatRelativeTime(entry.uploadedAt)}`)}</div>
                </div>
                <div class="file-badges">${badges.join("")}</div>
            </div>
        `;
    }).join("");
}

function renderDashboardStats() {
    const counts = getActionCounts();
    const history = getStoredHistory();
    const filesValue = document.getElementById("stat-files");
    const filesSub = document.getElementById("stat-files-sub");
    const quizzesValue = document.getElementById("stat-quizzes");
    const flashcardsValue = document.getElementById("stat-flashcards");
    const flashcardsSub = document.getElementById("stat-flashcards-sub");

    if (filesValue) {
        filesValue.textContent = String(history.length);
    }

    if (filesSub) {
        const latest = history[0];
        filesSub.textContent = latest ? `Latest: ${latest.name}` : "No uploads yet";
    }

    if (quizzesValue) {
        quizzesValue.textContent = String(counts.quiz);
    }

    if (flashcardsValue) {
        flashcardsValue.textContent = String(counts.flashcards);
    }

    if (flashcardsSub) {
        flashcardsSub.textContent = `${counts.notes} lecture note set${counts.notes === 1 ? "" : "s"} generated`;
    }
}

function addUploadedFileToHistory(fileName, charCount) {
    const history = getStoredHistory();
    const entry = {
        id: String(Date.now()),
        name: fileName,
        chars: Number(charCount) || 0,
        uploadedAt: Date.now(),
        actions: {
            quiz: false,
            flashcards: false,
            notes: false,
        },
    };

    history.unshift(entry);
    setStoredHistory(history);
    localStorage.setItem(CURRENT_FILE_ID_STORAGE_KEY, entry.id);
}

function markCurrentFileAction(action) {
    const history = getStoredHistory();
    const currentId = localStorage.getItem(CURRENT_FILE_ID_STORAGE_KEY);
    const entry = history.find((item) => item.id === currentId) || history[0];

    if (entry) {
        entry.actions = entry.actions || {};
        entry.actions[action] = true;
        setStoredHistory(history);
    }

    const counts = getActionCounts();
    if (typeof counts[action] === "number") {
        counts[action] += 1;
        setActionCounts(counts);
    }
}

function updateWorkspaceStatus() {
    const sessionEmail = document.getElementById("session-email");
    const sessionStatus = document.getElementById("session-status");
    const filePickerTitle = document.getElementById("file-picker-title");
    const fileName = localStorage.getItem(FILE_NAME_STORAGE_KEY);

    if (sessionEmail) {
        sessionEmail.textContent = workspaceState.email || localStorage.getItem(EMAIL_STORAGE_KEY) || "Unknown";
    }

    if (sessionStatus) {
        sessionStatus.textContent = workspaceState.fileUploaded ? "Ready for AI actions" : "Waiting for upload";
    }

    if (filePickerTitle) {
        filePickerTitle.textContent = fileName ? `Current file: ${fileName}` : "Supports PDF, DOCX, TXT";
    }

    setActionButtonsDisabled(!workspaceState.fileUploaded);
    renderDashboardStats();
    renderRecentFiles();
}

function setActionButtonsDisabled(isDisabled) {
    const buttons = document.querySelectorAll("[data-agent-action]");
    for (const button of buttons) {
        button.disabled = isDisabled;
    }
}

function formatLectureNotes(payload) {
    const sections = Array.isArray(payload.sections) ? payload.sections : [];
    const sectionHtml = sections.map((section) => `
        <article class="result-item">
            <h3>${escapeHtml(section.title || "Section")}</h3>
            <p>${escapeHtml(section.content || "")}</p>
        </article>
    `).join("");

    return `
        <h2 class="result-title">${escapeHtml(payload.topic || "Lecture notes")}</h2>
        <p class="result-caption">Structured notes generated from the uploaded material.</p>
        <div class="result-stack">${sectionHtml || '<div class="result-item"><p>No sections returned.</p></div>'}</div>
    `;
}

function formatQuiz(payload) {
    const questions = Array.isArray(payload.questions) ? payload.questions : [];
    const questionHtml = questions.map((question, index) => {
        const options = Array.isArray(question.options) ? question.options : [];
        const optionsHtml = options.map((option) => `<li>${escapeHtml(option)}</li>`).join("");
        return `
            <article class="result-item">
                <h3>${index + 1}. ${escapeHtml(question.question || "Question")}</h3>
                <ul>${optionsHtml}</ul>
                <p><strong>Answer:</strong> ${escapeHtml(question.correct_answer || "Not provided")}</p>
            </article>
        `;
    }).join("");

    return `
        <h2 class="result-title">${escapeHtml(payload.topic || "Quiz")}</h2>
        <p class="result-caption">Multiple-choice questions generated from the uploaded material.</p>
        <div class="result-stack">${questionHtml || '<div class="result-item"><p>No questions returned.</p></div>'}</div>
    `;
}

function formatFlashcards(payload) {
    const flashcards = Array.isArray(payload.flashcards) ? payload.flashcards : [];
    const flashcardHtml = flashcards.map((flashcard, index) => `
        <article class="result-item">
            <h3>${index + 1}. ${escapeHtml(flashcard.question || "Prompt")}</h3>
            <p>${escapeHtml(flashcard.answer || "")}</p>
        </article>
    `).join("");

    return `
        <h2 class="result-title">${escapeHtml(payload.topic || "Flashcards")}</h2>
        <p class="result-caption">Review prompts generated from the uploaded material.</p>
        <div class="result-stack">${flashcardHtml || '<div class="result-item"><p>No flashcards returned.</p></div>'}</div>
    `;
}

function getActionConfig(action) {
    const config = {
        notes: {
            endpoint: "/read/lecture_notes",
            requestLabel: "Generate lecture notes from my uploaded file.",
            pendingLabel: "Creating lecture notes...",
            formatter: formatLectureNotes,
        },
        quiz: {
            endpoint: "/read/generate_quiz",
            requestLabel: "Generate a quiz from my uploaded file.",
            pendingLabel: "Generating quiz...",
            formatter: formatQuiz,
        },
        flashcards: {
            endpoint: "/read/flashcards",
            requestLabel: "Generate flashcards from my uploaded file.",
            pendingLabel: "Generating flashcards...",
            formatter: formatFlashcards,
        },
    };

    return config[action] || null;
}

async function runAgentAction(action, customPrompt = "") {
    const config = getActionConfig(action);
    if (!config) {
        createAgentMessage(
            "assistant",
            "<p>I currently support three commands: lecture notes, quiz, and flashcards.</p>"
        );
        return;
    }

    if (!workspaceState.fileUploaded) {
        showToast("Upload a file before using the study agent.", true);
        createAgentMessage(
            "assistant",
            "<p>Upload a `.txt`, `.pdf`, or `.docx` file first. The backend needs that source before it can generate anything.</p>"
        );
        return;
    }

    createAgentMessage("user", `<p>${escapeHtml(customPrompt || config.requestLabel)}</p>`);
    const loadingBubble = createAgentMessage("assistant", `<p>${escapeHtml(config.pendingLabel)}</p>`);

    try {
        const payload = await requestWithAuth(config.endpoint, { method: "POST" });
        markCurrentFileAction(action);
        updateWorkspaceStatus();
        if (loadingBubble) {
            loadingBubble.innerHTML = config.formatter(payload);
        }
    } catch (error) {
        if (loadingBubble) {
            loadingBubble.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        }
        showToast(error.message, true);
    }
}

function resolvePromptToAction(prompt) {
    const normalized = prompt.trim().toLowerCase();

    if (!normalized) {
        return "";
    }

    if (normalized.includes("flash")) {
        return "flashcards";
    }

    if (normalized.includes("quiz") || normalized.includes("test") || normalized.includes("question")) {
        return "quiz";
    }

    if (normalized.includes("note") || normalized.includes("summary") || normalized.includes("summar")) {
        return "notes";
    }

    return "";
}

function handleAgentShortcutClick(event) {
    const button = event.target.closest("[data-agent-action]");
    if (!button) {
        return;
    }

    runAgentAction(button.dataset.agentAction);
}

async function handleUpload(event) {
    if (event) {
        event.preventDefault();
    }

    const fileInput = document.getElementById("study-file");
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
        showToast("Choose a file before uploading.", true);
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        if (topbarUploadButton) {
            topbarUploadButton.disabled = true;
            topbarUploadButton.textContent = "Uploading...";
        }
        if (openUploadButton) {
            openUploadButton.disabled = true;
        }
        const payload = await requestForm("/read", formData);
        workspaceState.fileUploaded = true;
        localStorage.setItem(FILE_NAME_STORAGE_KEY, file.name);
        localStorage.setItem(FILE_CHARS_STORAGE_KEY, String(payload.chars || 0));
        addUploadedFileToHistory(file.name, payload.chars || 0);
        updateWorkspaceStatus();
        showToast("File uploaded successfully.");
        createAgentMessage(
            "user",
            `<p>I uploaded <strong>${escapeHtml(file.name)}</strong>.</p>`
        );
        createAgentMessage(
            "assistant",
            `<p>File processed successfully. I extracted ${escapeHtml(payload.chars || 0)} characters and I am ready to generate notes, a quiz, or flashcards.</p>`
        );
    } catch (error) {
        showToast(error.message, true);
        createAgentMessage("assistant", `<p>${escapeHtml(error.message)}</p>`);
    } finally {
        if (topbarUploadButton) {
            topbarUploadButton.disabled = false;
            topbarUploadButton.textContent = "↑ Upload file";
        }
        if (openUploadButton) {
            openUploadButton.disabled = false;
        }
        if (fileInput) {
            fileInput.value = "";
        }
    }
}

async function loadWorkspaceSession() {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
        window.location.href = "./login.html";
        return;
    }

    try {
        const user = await requestWithAuth("/me", { method: "GET" });
        workspaceState.email = user.email || "";
        rememberEmail(workspaceState.email);
        updateWorkspaceStatus();
    } catch (error) {
        clearSession();
        showToast("Session expired. Please login again.", true);
        window.location.href = "./login.html";
    }
}

function setupWorkspacePage() {
    if (!agentThread) {
        return;
    }

    workspaceState.fileUploaded = Boolean(localStorage.getItem(FILE_NAME_STORAGE_KEY));
    updateWorkspaceStatus();
    renderIntroMessage();
    loadWorkspaceSession();

    if (uploadForm) {
        uploadForm.addEventListener("submit", handleUpload);
    }

    if (agentForm) {
        agentForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const input = document.getElementById("agent-input");
            const prompt = input ? input.value.trim() : "";
            const action = resolvePromptToAction(prompt);

            if (!prompt) {
                showToast("Enter a request for the study agent.", true);
                return;
            }

            if (!action) {
                createAgentMessage("user", `<p>${escapeHtml(prompt)}</p>`);
                createAgentMessage(
                    "assistant",
                    "<p>I can currently turn your uploaded material into lecture notes, a quiz, or flashcards. Ask for one of those directly.</p>"
                );
                if (input) {
                    input.value = "";
                }
                return;
            }

            if (input) {
                input.value = "";
            }

            await runAgentAction(action, prompt);
        });
    }

    document.addEventListener("click", handleAgentShortcutClick);

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            clearSession();
            window.location.href = "./login.html";
        });
    }

    const studyFileInput = document.getElementById("study-file");
    if (studyFileInput) {
        studyFileInput.addEventListener("change", () => {
            const file = studyFileInput.files[0];
            if (file) {
                const title = document.getElementById("file-picker-title");
                if (title) {
                    title.textContent = `Selected: ${file.name}`;
                }
                handleUpload();
            }
        });
    }

    if (openUploadButton && studyFileInput) {
        openUploadButton.addEventListener("click", () => {
            studyFileInput.click();
        });
    }

    if (topbarUploadButton && studyFileInput) {
        topbarUploadButton.addEventListener("click", () => {
            studyFileInput.click();
        });
    }
}

async function init() {
    try {
        await detectApiBase();
    } catch (error) {
        showToast(error.message, true);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    prefillKnownEmail();
    setupSuccessPage();
    setupWorkspacePage();
}

init();
