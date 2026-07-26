const STORAGE_KEY = "examCommandCenter.v1";
const PLANNING_START_DATE = "2026-07-26";
const EXAM_PERIOD_START_DATE = "2026-10-15";
const TIMELINE_VERSION = "2026-07-26-82-day-coverage-plan";
const DEFAULT_REVIEW_SCHEDULE = [1, 2, 7, 14, 30];

const SUBJECT_SEEDS = [
  { name: "Sejarah", difficulty: 5, confidence: 2, priority: "High", color: "#b84a43" },
  { name: "Bahasa Melayu", difficulty: 5, confidence: 2, priority: "High", color: "#d4862a" },
  { name: "Geografi", difficulty: 4, confidence: 2, priority: "High", color: "#426f9b" },
  { name: "English", difficulty: 4, confidence: 3, priority: "Medium", color: "#256b5a" },
  { name: "Science", difficulty: 3, confidence: 3, priority: "Medium", color: "#6d5b9a" },
  { name: "RBT", difficulty: 3, confidence: 3, priority: "Medium", color: "#887233" },
  { name: "Mathematics", difficulty: 2, confidence: 4, priority: "Low", color: "#2f7d78" },
  { name: "Elementary Chinese", difficulty: 1, confidence: 4, priority: "Low", color: "#8a5f45" }
];

const CHAPTER_SEEDS = {
  Sejarah: ["Bab 1: Mengenali Sejarah", "Bab 2: Zaman Air Batu", "Bab 3: Zaman Prasejarah", "Bab 4: Tamadun Dunia", "Bab 5: Tamadun Awal Dunia"],
  "Bahasa Melayu": ["Tatabahasa", "Pemahaman", "Ringkasan", "Karangan", "Peribahasa"],
  Geografi: ["Arah", "Kedudukan", "Peta Lakar", "Bumi", "Cuaca dan Iklim"],
  English: ["Grammar", "Reading Comprehension", "Writing", "Vocabulary", "Literature"],
  Science: ["Scientific Skills", "Cell as Basic Unit", "Coordination", "Reproduction", "Matter"],
  RBT: ["Design Process", "Project Brief", "Tools and Materials", "Systems", "Evaluation"],
  Mathematics: ["Integers", "Factors and Multiples", "Squares and Cubes", "Algebraic Expressions", "Linear Equations"],
  "Elementary Chinese": ["Vocabulary", "Sentence Patterns", "Reading", "Writing", "Listening"]
};

const SUBJECT_SUBTOPIC_TEMPLATES = {
  Sejarah: [
    ["location and meaning", "Explain where it happened and what the key term means."],
    ["important features", "Identify the main features and why they mattered."],
    ["cause and effect", "Connect events, reasons, and consequences in your own words."],
    ["key terms and evidence", "Recall important terms and use them in short answers."]
  ],
  "Bahasa Melayu": [
    ["rule and usage", "Understand the rule and use it correctly in sentences."],
    ["guided example practice", "Study examples, then create your own accurate answer."],
    ["common exam mistakes", "Avoid the mistakes that usually cost marks."],
    ["short response practice", "Answer clearly with correct structure and language."]
  ],
  Geografi: [
    ["definition and diagram", "Explain the idea and connect it to a simple diagram."],
    ["map or data skill", "Use the skill on a small map, table, or example."],
    ["cause and impact", "Describe causes, effects, and real-life examples."],
    ["exam keyword practice", "Use the correct geography words in short answers."]
  ],
  English: [
    ["grammar pattern", "Understand the pattern and use it in original sentences."],
    ["vocabulary in context", "Learn meanings and apply words in a sentence."],
    ["reading strategy", "Find evidence and answer with the right detail."],
    ["writing improvement", "Improve one paragraph, sentence type, or expression."]
  ],
  Science: [
    ["key concept", "Explain the concept using simple scientific language."],
    ["function and process", "Describe what each part does and how the process works."],
    ["diagram labeling", "Label and explain a diagram accurately."],
    ["practice question", "Apply the concept to one or two exam-style questions."]
  ],
  RBT: [
    ["design purpose", "Explain the purpose, user need, and design problem."],
    ["tools and materials", "Identify suitable tools, materials, and safety points."],
    ["process steps", "Describe the process in the correct sequence."],
    ["evaluation criteria", "Judge a design using clear strengths and improvements."]
  ],
  Mathematics: [
    ["core method", "Learn the method step by step without skipping working."],
    ["worked example", "Understand one example, then solve a similar one."],
    ["common error check", "Spot and fix the mistake that usually happens here."],
    ["short practice set", "Complete a small set and check every correction."]
  ],
  "Elementary Chinese": [
    ["new vocabulary", "Recognize, pronounce, and understand the words."],
    ["sentence pattern", "Use the pattern to make simple correct sentences."],
    ["reading meaning", "Read a short line and explain the meaning."],
    ["writing practice", "Write carefully and check form, spacing, and meaning."]
  ]
};

let state = loadState();
let activeView = "dashboard";
let plannerMode = "today";
let currentFlashcardId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function todayISO() {
  return toISO(new Date());
}

function toISO(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function fromISO(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value, days) {
  const date = fromISO(value);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch (error) {
      console.warn("Could not read saved study data.", error);
    }
  }
  return createSeedState();
}

function normalizeState(value) {
  const seeded = createSeedState();
  const normalized = {
    ...seeded,
    ...value,
    settings: { ...seeded.settings, ...(value.settings || {}) },
    subjects: value.subjects?.length ? value.subjects : seeded.subjects,
    chapters: value.chapters?.length ? value.chapters : seeded.chapters,
    subtopics: value.subtopics?.length ? value.subtopics : [],
    tasks: value.tasks || [],
    reviews: value.reviews || [],
    mistakes: value.mistakes || [],
    flashcards: value.flashcards || [],
    studyLog: value.studyLog || [],
    streak: value.streak || { count: 0, lastCompletedDate: null }
  };

  if (normalized.settings.timelineVersion !== TIMELINE_VERSION) {
    normalized.settings.studyStartDate = PLANNING_START_DATE;
    normalized.settings.examDate = EXAM_PERIOD_START_DATE;
    normalized.settings.dailyTarget = 6;
    normalized.settings.timelineVersion = TIMELINE_VERSION;
    normalized.settings.timelineNotes = "Updated for 81 days from 26 July 2026 to the exam-period start on 15 October 2026.";
    if (!normalized.subtopics.length) normalized.subtopics = createSubtopicsForChapters(normalized.subjects, normalized.chapters);
    recalculateReviewAssumptions(normalized);
  }

  if (!normalized.subtopics.length) {
    normalized.subtopics = createSubtopicsForChapters(normalized.subjects, normalized.chapters);
  }
  normalized.subtopics = normalized.subtopics.map((subtopic) => normalizeSubtopic(subtopic, normalized));

  return normalized;
}

function normalizeSubtopic(subtopic, draftState) {
  const subject = draftState.subjects.find((item) => item.id === subtopic.subjectId);
  return {
    objective: "Understand and recall this small learning unit.",
    status: "Not Started",
    firstLearningDate: null,
    reviewHistory: [],
    mistakes: 0,
    confidence: subject?.confidence || 3,
    difficulty: subject?.difficulty || 3,
    nextReviewDate: null,
    interval: 1,
    reviewStep: 0,
    reviewCount: DEFAULT_REVIEW_SCHEDULE.length,
    reviewSchedule: [...DEFAULT_REVIEW_SCHEDULE],
    notes: "",
    ...subtopic,
    reviewHistory: subtopic.reviewHistory || [],
    reviewSchedule: subtopic.reviewSchedule?.length ? subtopic.reviewSchedule : [...DEFAULT_REVIEW_SCHEDULE]
  };
}

function createSeedState() {
  const subjects = SUBJECT_SEEDS.map((subject, index) => ({
    id: uid("subject"),
    name: subject.name,
    difficulty: subject.difficulty,
    confidence: subject.confidence,
    priority: subject.priority,
    color: subject.color,
    completedChapters: 0,
    weakTopics: [],
    nextRevisionDate: addDays(todayISO(), index % 4)
  }));

  const chapters = subjects.flatMap((subject) => CHAPTER_SEEDS[subject.name].map((title, index) => ({
    id: uid("chapter"),
    subjectId: subject.id,
    title,
    status: index === 0 ? "Learning" : "Not Started",
    notes: "",
    confidence: subject.confidence,
    difficulty: subject.difficulty,
    nextReviewDate: addDays(todayISO(), index + 1),
    interval: 1,
    reviewStep: 0,
    mistakes: 0
  })));
  const subtopics = createSubtopicsForChapters(subjects, chapters);

  return {
    settings: {
      examName: "Form 1 Exam",
      studyStartDate: PLANNING_START_DATE,
      examDate: EXAM_PERIOD_START_DATE,
      dailyTarget: 6,
      timelineVersion: TIMELINE_VERSION,
      timelineNotes: "Approximately 82 study days including 26 July 2026, with the exam period starting on 15 October 2026."
    },
    subjects,
    chapters,
    subtopics,
    tasks: [],
    reviews: [],
    mistakes: [],
    flashcards: [],
    studyLog: [],
    streak: { count: 0, lastCompletedDate: null }
  };
}

function createSubtopicsForChapters(subjects, chapters) {
  return chapters.flatMap((chapter) => {
    const subject = subjects.find((item) => item.id === chapter.subjectId);
    const templates = SUBJECT_SUBTOPIC_TEMPLATES[subject?.name] || SUBJECT_SUBTOPIC_TEMPLATES.Science;
    return templates.map(([focus, objective], index) => ({
      id: uid("subtopic"),
      subjectId: chapter.subjectId,
      chapterId: chapter.id,
      title: `${chapter.title} — ${focus}`,
      objective,
      status: chapter.status === "Learning" && index === 0 ? "Learning" : "Not Started",
      firstLearningDate: null,
      reviewHistory: [],
      mistakes: 0,
      confidence: subject?.confidence || chapter.confidence || 3,
      difficulty: subject?.difficulty || chapter.difficulty || 3,
      nextReviewDate: null,
      interval: 1,
      reviewStep: 0,
      reviewCount: DEFAULT_REVIEW_SCHEDULE.length,
      reviewSchedule: [...DEFAULT_REVIEW_SCHEDULE],
      notes: ""
    }));
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const synced = ensureAutomaticReviewTasks(todayISO());
  if (synced) saveState();
  populateSelects();
  renderDashboard();
  renderPlanner();
  renderSubjects();
  renderChapters();
  renderReviews();
  renderMistakes();
  renderFlashcards();
  renderAnalytics();
  renderSettings();
  $("#streakSummary").textContent = `${state.streak.count} day streak`;
}

function ensureAutomaticReviewTasks(date) {
  const target = getRecommendedDailyTarget(date);
  let slots = Math.max(0, target - tasksForDate(date).length);
  let created = 0;
  if (!slots) return 0;

  for (const item of getDueReviews(date)) {
    if (!slots || created >= 2) break;
    const task = item.kind === "mistake" ? createMistakeReviewTask(item, date) : createSubtopicReviewTask(item, date);
    if (task) {
      created += 1;
      slots -= 1;
    }
  }

  return created;
}

function subjectById(id) {
  return state.subjects.find((subject) => subject.id === id);
}

function chapterById(id) {
  return state.chapters.find((chapter) => chapter.id === id);
}

function subtopicById(id) {
  return state.subtopics.find((subtopic) => subtopic.id === id);
}

function tasksForDate(date) {
  return state.tasks.filter((task) => task.date === date).sort((a, b) => {
    const typeCompare = taskTypeWeight(b) - taskTypeWeight(a);
    if (typeCompare !== 0) return typeCompare;
    return priorityWeight(b.priority) - priorityWeight(a.priority);
  });
}

function priorityWeight(priority) {
  return { High: 3, Medium: 2, Low: 1 }[priority] || 2;
}

function taskTypeWeight(task) {
  return {
    "Mistake Review": 5,
    "Spaced Review": 4,
    Practice: 3,
    "New Learning": 2,
    Study: 1
  }[task.type] || 1;
}

function getPreparationPhase() {
  const remaining = getDaysUntilExam();
  if (remaining < 0) return "Exam Period";
  if (remaining <= 7) return "Final Review Phase";
  if (remaining <= 28) return "Exam Preparation Phase";
  if (remaining <= 56) return "Strengthening Phase";
  return "Learning Phase";
}

function getPhaseGuidance() {
  const phase = getPreparationPhase();
  const guidance = {
    "Learning Phase": "Cover 2-4 new subtopics daily while keeping reviews active.",
    "Strengthening Phase": "Finish important gaps, review older subtopics, and keep practice small but regular.",
    "Exam Preparation Phase": "Practice more exam questions. Turn every mistake into a short review task.",
    "Final Review Phase": "Prioritize memory, formulas, facts, writing plans, and calm confidence.",
    "Exam Period": "Use short reviews only. Protect sleep, confidence, and exam routines."
  };
  return guidance[phase];
}

function getRecommendedDailyTarget(date = todayISO()) {
  const remaining = getDaysUntilExam(date);
  const learningTarget = getNewLearningTarget(date);
  const dueReviews = getPriorityReviewItems(date).filter((item) => item.dueDate <= date).length;
  if (remaining < 0) return 2;
  if (remaining <= 7) return clamp(learningTarget + Math.min(2, dueReviews) + 1, 3, 6);
  return clamp(learningTarget + Math.min(2, Math.max(1, dueReviews)) + 1, 4, 7);
}

function getRemainingStudyDays(date = todayISO()) {
  return Math.max(1, getDaysUntilExam(date) + 1);
}

function getRemainingNewSubtopics() {
  return state.subtopics.filter((subtopic) => ["Not Started", "Learning"].includes(subtopic.status)).length;
}

function getNewLearningTarget(date = todayISO()) {
  const remaining = getRemainingNewSubtopics();
  if (!remaining) return 0;
  const neededPerDay = Math.ceil(remaining / getRemainingStudyDays(date));
  const difficultWaiting = state.subtopics.filter((subtopic) => ["Not Started", "Learning"].includes(subtopic.status) && Number(subtopic.difficulty || 3) >= 4).length;
  const hardRatio = difficultWaiting / Math.max(1, remaining);
  const adjusted = hardRatio > 0.55 ? Math.max(2, neededPerDay) : neededPerDay + 1;
  return clamp(adjusted, 2, 4);
}

function recalculateReviewAssumptions(draftState) {
  draftState.chapters.forEach((chapter, index) => {
    const subject = draftState.subjects.find((item) => item.id === chapter.subjectId);
    chapter.difficulty = chapter.difficulty || subject?.difficulty || 3;
    chapter.confidence = chapter.confidence || subject?.confidence || 3;
    chapter.interval = getReviewSchedule(chapter)[0];
    chapter.reviewStep = 0;
    if (chapter.status === "Not Started") {
      chapter.nextReviewDate = addDays(PLANNING_START_DATE, 7 + (index % 21));
    } else {
      chapter.nextReviewDate = addDays(PLANNING_START_DATE, 1 + (index % 7));
    }
  });

  draftState.subjects.forEach((subject, index) => {
    subject.nextRevisionDate = addDays(PLANNING_START_DATE, 1 + (index % 7));
  });

  draftState.subtopics.forEach((subtopic) => {
    const subject = draftState.subjects.find((item) => item.id === subtopic.subjectId);
    subtopic.difficulty = subtopic.difficulty || subject?.difficulty || 3;
    subtopic.confidence = subtopic.confidence || subject?.confidence || 3;
    subtopic.reviewSchedule = getReviewSchedule(subtopic);
    subtopic.reviewCount = subtopic.reviewCount || subtopic.reviewSchedule.length;
    subtopic.interval = subtopic.reviewSchedule[0];
    if (!subtopic.reviewHistory) subtopic.reviewHistory = [];
    if (!subtopic.status) subtopic.status = "Not Started";
    if (subtopic.status === "Not Started" || subtopic.status === "Learning") subtopic.nextReviewDate = null;
  });
}

function getReviewSchedule(item) {
  if (Array.isArray(item.reviewSchedule) && item.reviewSchedule.length) {
    return expandReviewSchedule(item.reviewSchedule, clamp(item.reviewCount || item.reviewSchedule.length, 1, 10));
  }

  return expandReviewSchedule(buildAdaptiveReviewSchedule(item), clamp(item.reviewCount || DEFAULT_REVIEW_SCHEDULE.length, 1, 10));
}

function buildAdaptiveReviewSchedule(item) {
  const difficulty = Number(item.difficulty || 3);
  const confidence = Number(item.confidence || 3);
  const mistakes = Number(item.mistakes || 0);

  if (difficulty <= 2 && confidence >= 4 && mistakes === 0) return [1, 7, 30];
  if (difficulty >= 4 || confidence <= 2 || mistakes > 1) return [...DEFAULT_REVIEW_SCHEDULE];
  return [1, 2, 7, 30];
}

function expandReviewSchedule(schedule, count) {
  const expanded = [...schedule].sort((a, b) => a - b);
  while (expanded.length < count) {
    const last = expanded[expanded.length - 1] || 30;
    expanded.push(last + Math.min(30, Math.max(7, Math.round(last / 2))));
  }
  return expanded.slice(0, count);
}

function getDaysUntilExam(dateValue = todayISO()) {
  const today = fromISO(dateValue);
  const exam = fromISO(state.settings.examDate);
  return Math.ceil((exam - today) / 86400000);
}

function renderDashboard() {
  const today = todayISO();
  const tasks = tasksForDate(today);
  const completed = tasks.filter((task) => task.completed);
  const remaining = tasks.filter((task) => !task.completed);
  const dueReviews = getDueReviews(today).slice(0, 5);

  $("#todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  $("#completedMetric").textContent = completed.length;
  $("#remainingMetric").textContent = remaining.length;
  $("#weeklyMetric").textContent = `${getWeeklyCompletion()}%`;
  $("#streakMetric").textContent = state.streak.count;
  $("#phasePill").textContent = `${getPreparationPhase()} · ${getRecommendedDailyTarget()} sessions/day`;

  const countdown = getDaysUntilExam();
  $("#countdownMetric").textContent = countdown >= 0 ? countdown : "Done";
  $("#examDateText").textContent = `${state.settings.examName}: ${formatDate(state.settings.examDate)}`;
  $("#motivationMessage").textContent = getMotivationMessage(remaining.length, dueReviews.length);
  $("#timelineNote").textContent = `Plan starts ${formatDate(state.settings.studyStartDate)}. Exam period begins ${formatDate(state.settings.examDate)}.`;

  const nextLearning = chooseNewLearningSubtopic();
  const reviewPrompt = getPriorityReviewItems(today)[0];
  $("#newLearningPrompt").innerHTML = nextLearning
    ? renderPromptSubtopic(nextLearning, "New Learning")
    : `<p class="task-title">No new subtopics waiting.</p><p class="task-meta">Add chapters or review mastered topics.</p>`;
  $("#reviewPrompt").innerHTML = reviewPrompt
    ? renderPromptSubtopic(reviewPrompt, reviewPrompt.kind === "mistake" ? "Mistake Review" : "Spaced Review")
    : `<p class="task-title">No urgent reviews.</p><p class="task-meta">Reviews will appear here when they are due.</p>`;

  $("#nextTaskCard").innerHTML = remaining.length
    ? taskCardContent(remaining[0], true)
    : `<p class="task-title">All clear for today.</p><p class="task-meta">Use reviews or flashcards if you still have energy.</p>`;

  $("#nextTaskCard").insertAdjacentHTML("beforeend", `<p class="task-meta">${getPhaseGuidance()}</p>`);

  $("#todayTaskList").innerHTML = tasks.length
    ? tasks.map(renderTaskItem).join("")
    : emptyState("No sessions yet. Generate today to get a balanced plan.");

  $("#dueReviewList").innerHTML = dueReviews.length
    ? dueReviews.map(renderReviewCompact).join("")
    : emptyState("No reviews due today.");

  renderMiniWeek();
}

function renderPromptSubtopic(item, label) {
  const subject = subjectById(item.subjectId);
  const chapter = chapterById(item.chapterId);
  return `<p class="task-title">${subject?.name || "Study"}: ${escapeHTML(item.title || item.topic)}</p>
    <p class="task-meta">${chapter?.title || item.chapter || "Subtopic"} · ${escapeHTML(item.objective || item.reason || "Review carefully.")}</p>
    <span class="pill">${label}</span>`;
}

function getMotivationMessage(remainingCount, reviewCount) {
  if (remainingCount === 0 && reviewCount === 0) return "You did the important work. Stop proudly, not randomly.";
  if (remainingCount === 1) return "One focused session left. Finish small, finish clean.";
  if (reviewCount > 2) return "Reviews matter today. Memory gets stronger when you return to it.";
  return "Start with the first task only. Consistency beats panic.";
}

function renderMiniWeek() {
  const start = startOfWeek(todayISO());
  $("#miniWeek").innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const done = tasksForDate(date).some((task) => task.completed);
    return `<div class="mini-day ${done ? "done" : ""}">${weekdayShort(date)}</div>`;
  }).join("");
}

function renderPlanner() {
  const content = $("#plannerContent");
  if (plannerMode === "today") {
    const tasks = tasksForDate(todayISO());
    content.innerHTML = `<div class="task-list">${tasks.length ? tasks.map(renderTaskItem).join("") : emptyState("Generate today or add a session manually.")}</div>`;
    return;
  }

  const start = startOfWeek(todayISO());
  content.innerHTML = `<div class="week-grid">${Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const tasks = tasksForDate(date);
    return `<section class="day-column">
      <h3>${weekdayLong(date)} <span class="small-meta">${formatShortDate(date)}</span></h3>
      <div class="task-list">${tasks.length ? tasks.map(renderTaskItem).join("") : `<p class="muted">No sessions.</p>`}</div>
    </section>`;
  }).join("")}</div>`;
}

function renderTaskItem(task) {
  return `<article class="task-item ${task.completed ? "done" : ""}">
    <input type="checkbox" data-action="toggle-task" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Complete task" />
    <div>${taskCardContent(task, false)}</div>
    <div class="row-actions">
      <button class="small-button" data-action="reschedule-task" data-id="${task.id}" type="button">Tomorrow</button>
      <button class="small-button" data-action="delete-task" data-id="${task.id}" type="button">Delete</button>
    </div>
  </article>`;
}

function taskCardContent(task, withPrompt) {
  const subject = subjectById(task.subjectId);
  const priority = task.priority || "Medium";
  return `${withPrompt ? `<p class="eyebrow">Do this first</p>` : ""}
    <p class="task-title">${subject?.name || "Study"}: ${escapeHTML(task.subtopic)}</p>
    <p class="task-meta">${escapeHTML(task.chapter)} · ${task.minutes} min · ${priority} priority</p>
    ${task.objective ? `<p class="task-meta">Objective: ${escapeHTML(task.objective)}</p>` : ""}
    <span class="pill ${priority.toLowerCase()}">${task.type || "Study"}</span>`;
}

function renderSubjects() {
  $("#subjectGrid").innerHTML = state.subjects.map((subject) => {
    const chapters = state.chapters.filter((chapter) => chapter.subjectId === subject.id);
    const subtopics = state.subtopics.filter((subtopic) => subtopic.subjectId === subject.id);
    const mastered = subtopics.filter((subtopic) => subtopic.status === "Mastered").length;
    const progress = subtopics.length ? Math.round((mastered / subtopics.length) * 100) : 0;
    const weakTopics = subject.weakTopics.length ? subject.weakTopics.join(", ") : "None logged";
    const current = state.subtopics.find((subtopic) => subtopic.subjectId === subject.id && ["Learning", "Learned", "Reviewing"].includes(subtopic.status))
      || chapters.find((chapter) => chapter.status === "Learning" || chapter.status === "Reviewing")
      || chapters[0];

    return `<article class="subject-card">
      <header>
        <h3>${subject.name}</h3>
        <span class="pill ${subject.priority.toLowerCase()}">${subject.priority}</span>
      </header>
      <p class="small-meta">Current: ${current ? escapeHTML(current.title) : "No chapter"}</p>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%; background:${subject.color}"></div></div>
      <p class="small-meta">${progress}% progress · ${mastered}/${subtopics.length} subtopics mastered</p>
      <p class="small-meta">Weak topics: ${escapeHTML(weakTopics)}</p>
      <p class="small-meta">Next revision: ${formatDate(subject.nextRevisionDate)}</p>
      <div class="subject-controls">
        <label>Confidence
          <input data-action="update-subject-confidence" data-id="${subject.id}" type="number" min="1" max="5" value="${subject.confidence}" />
        </label>
        <label>Difficulty
          <input data-action="update-subject-difficulty" data-id="${subject.id}" type="number" min="1" max="5" value="${subject.difficulty}" />
        </label>
      </div>
    </article>`;
  }).join("");
}

function renderChapters() {
  const filter = $("#chapterSubjectFilter").value || "all";
  const chapters = filter === "all" ? state.chapters : state.chapters.filter((chapter) => chapter.subjectId === filter);
  $("#chapterList").innerHTML = chapters.length ? chapters.map((chapter) => {
    const subject = subjectById(chapter.subjectId);
    const subtopics = state.subtopics.filter((subtopic) => subtopic.chapterId === chapter.id);
    return `<article class="chapter-item">
      <header>
        <div>
          <h3>${escapeHTML(chapter.title)}</h3>
          <p class="small-meta">${subject?.name || "Subject"} · Next review ${formatDate(chapter.nextReviewDate)}</p>
        </div>
        <span class="pill">${chapter.status}</span>
      </header>
      <p class="muted">${chapter.notes ? escapeHTML(chapter.notes) : "No notes yet."}</p>
      <div class="status-row">
        ${["Not Started", "Learning", "Reviewing", "Mastered"].map((status) => `<button class="small-button" data-action="set-chapter-status" data-id="${chapter.id}" data-status="${status}" type="button">${status}</button>`).join("")}
      </div>
      <div class="subtopic-list">${subtopics.map(renderSubtopicItem).join("")}</div>
      <div class="subject-controls">
        <label>Next review date
          <input data-action="update-chapter-review-date" data-id="${chapter.id}" type="date" value="${chapter.nextReviewDate}" />
        </label>
        <label>Review interval days
          <input data-action="update-chapter-interval" data-id="${chapter.id}" min="1" max="60" type="number" value="${chapter.interval}" />
        </label>
        <label>Confidence
          <input data-action="update-chapter-confidence" data-id="${chapter.id}" min="1" max="5" type="number" value="${chapter.confidence}" />
        </label>
        <label>Notes
          <textarea data-action="update-chapter-notes" data-id="${chapter.id}" rows="2">${escapeHTML(chapter.notes)}</textarea>
        </label>
      </div>
    </article>`;
  }).join("") : emptyState("No chapters yet.");
}

function renderSubtopicItem(subtopic) {
  const historyCount = subtopic.reviewHistory?.length || 0;
  return `<article class="subtopic-item">
    <header>
      <div>
        <h4>${escapeHTML(subtopic.title)}</h4>
        <p class="task-meta">Objective: ${escapeHTML(subtopic.objective)}</p>
        <p class="task-meta">First learned: ${subtopic.firstLearningDate ? formatDate(subtopic.firstLearningDate) : "Not yet"} · Reviews ${historyCount}/${subtopic.reviewCount || DEFAULT_REVIEW_SCHEDULE.length}</p>
      </div>
      <span class="pill">${subtopic.status}</span>
    </header>
    <div class="status-row">
      ${["Not Started", "Learning", "Learned", "Reviewing", "Mastered"].map((status) => `<button class="small-button" data-action="set-subtopic-status" data-id="${subtopic.id}" data-status="${status}" type="button">${status}</button>`).join("")}
      <button class="small-button" data-action="learn-subtopic-now" data-id="${subtopic.id}" type="button">Mark learned</button>
      <button class="small-button" data-action="review-subtopic-now" data-id="${subtopic.id}" type="button">Review now</button>
    </div>
    <div class="subject-controls">
      <label>Next review date
        <input data-action="update-subtopic-review-date" data-id="${subtopic.id}" type="date" value="${subtopic.nextReviewDate || ""}" />
      </label>
      <label>Review interval days
        <input data-action="update-subtopic-interval" data-id="${subtopic.id}" min="1" max="60" type="number" value="${subtopic.interval || 1}" />
      </label>
      <label>Number of reviews
        <input data-action="update-subtopic-review-count" data-id="${subtopic.id}" min="1" max="10" type="number" value="${subtopic.reviewCount || DEFAULT_REVIEW_SCHEDULE.length}" />
      </label>
      <label>Difficulty
        <input data-action="update-subtopic-difficulty" data-id="${subtopic.id}" min="1" max="5" type="number" value="${subtopic.difficulty || 3}" />
      </label>
      <label>Confidence
        <input data-action="update-subtopic-confidence" data-id="${subtopic.id}" min="1" max="5" type="number" value="${subtopic.confidence || 3}" />
      </label>
      <label>Notes
        <textarea data-action="update-subtopic-notes" data-id="${subtopic.id}" rows="2">${escapeHTML(subtopic.notes || "")}</textarea>
      </label>
    </div>
  </article>`;
}

function renderReviews() {
  const today = todayISO();
  const due = getDueReviews(today);
  const upcoming = getUpcomingReviews(today);
  const mastered = state.subtopics.filter((subtopic) => subtopic.status === "Mastered").slice(0, 8);

  $("#reviewBoard").innerHTML = [
    reviewColumn("Due now", due),
    reviewColumn("Upcoming", upcoming),
    reviewColumn("Mastered", mastered)
  ].join("");
}

function reviewColumn(title, items) {
  return `<section class="review-column">
    <h3>${title}</h3>
    <div class="compact-list">${items.length ? items.map(renderReviewCompact).join("") : `<p class="muted">Nothing here.</p>`}</div>
  </section>`;
}

function renderReviewCompact(item) {
  const subject = subjectById(item.subjectId);
  const isMistake = item.kind === "mistake" || Boolean(item.futureReviewDate);
  return `<article class="compact-item">
    <span class="pill">${subject?.name || "Study"}</span>
    <div>
      <p class="task-title">${escapeHTML(item.title || item.topic || item.subtopic || "Review")}</p>
      <p class="task-meta">Due ${formatDate(item.nextReviewDate || item.futureReviewDate || item.date)}</p>
    </div>
    <button class="small-button" data-action="complete-review" data-id="${item.id}" data-kind="${isMistake ? "mistake" : "subtopic"}" type="button">Done</button>
  </article>`;
}

function getDueReviews(date) {
  return getPriorityReviewItems(date).filter((item) => (item.nextReviewDate || item.futureReviewDate) <= date);
}

function getUpcomingReviews(date) {
  return state.subtopics
    .filter((subtopic) => subtopic.nextReviewDate > date && ["Learned", "Reviewing"].includes(subtopic.status))
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
    .slice(0, 10);
}

function getPriorityReviewItems(date) {
  const subtopics = state.subtopics
    .filter((subtopic) => subtopic.nextReviewDate && ["Learned", "Reviewing"].includes(subtopic.status))
    .map((subtopic) => ({ ...subtopic, kind: "subtopic", dueDate: subtopic.nextReviewDate }));
  const mistakes = state.mistakes
    .filter((mistake) => mistake.futureReviewDate)
    .map((mistake) => ({ ...mistake, kind: "mistake", dueDate: mistake.futureReviewDate }));

  return [...subtopics, ...mistakes].sort((a, b) => {
    const overdueA = a.dueDate < date ? 1 : 0;
    const overdueB = b.dueDate < date ? 1 : 0;
    if (overdueA !== overdueB) return overdueB - overdueA;
    const dueCompare = a.dueDate.localeCompare(b.dueDate);
    if (dueCompare !== 0) return dueCompare;
    const difficultyCompare = Number(b.difficulty || 3) - Number(a.difficulty || 3);
    if (difficultyCompare !== 0) return difficultyCompare;
    return Number(a.confidence || 3) - Number(b.confidence || 3);
  });
}

function chooseNewLearningSubtopic(excludeSubjectIds = []) {
  const learningStatuses = ["Learning", "Not Started"];
  return state.subtopics
    .filter((subtopic) => learningStatuses.includes(subtopic.status) && !excludeSubjectIds.includes(subtopic.subjectId))
    .map((subtopic) => {
      const subject = subjectById(subtopic.subjectId);
      const chapter = chapterById(subtopic.chapterId);
      const chapterBoost = chapter?.status === "Learning" ? 2 : 0;
      return {
        subtopic,
        score: (6 - Number(subtopic.confidence || subject?.confidence || 3)) * 2
          + Number(subtopic.difficulty || subject?.difficulty || 3)
          + priorityWeight(subject?.priority)
          + chapterBoost
          + Math.random()
      };
    })
    .sort((a, b) => b.score - a.score)[0]?.subtopic || null;
}

function renderMistakes() {
  $("#mistakeList").innerHTML = state.mistakes.length ? state.mistakes.map((mistake) => {
    const subject = subjectById(mistake.subjectId);
    return `<article class="mistake-item">
      <header>
        <div>
          <h3>${escapeHTML(mistake.topic)}</h3>
          <p class="small-meta">${subject?.name || "Subject"} · ${escapeHTML(mistake.chapter)} · Review ${formatDate(mistake.futureReviewDate)}</p>
        </div>
        <span class="pill high">${mistake.reason}</span>
      </header>
      <p><strong>Mistake:</strong> ${escapeHTML(mistake.mistake)}</p>
      <p><strong>Correct method:</strong> ${escapeHTML(mistake.correctMethod)}</p>
      <div class="row-actions">
        <button class="small-button" data-action="mistake-reviewed" data-id="${mistake.id}" type="button">Reviewed</button>
        <button class="small-button" data-action="delete-mistake" data-id="${mistake.id}" type="button">Delete</button>
      </div>
    </article>`;
  }).join("") : emptyState("No mistakes logged yet. Add mistakes after practice so they become reviews.");
}

function renderFlashcards() {
  const dueCards = state.flashcards.filter((card) => card.nextReviewDate <= todayISO()).sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));
  const card = dueCards.find((item) => item.id === currentFlashcardId) || dueCards[0] || state.flashcards[0];
  currentFlashcardId = card?.id || null;

  $("#flashcardReview").innerHTML = card ? `<div class="study-card">
    <span class="pill">${subjectById(card.subjectId)?.name || "Subject"}</span>
    <h3>${escapeHTML(card.question)}</h3>
    <div class="answer-box" id="flashcardAnswerBox">${escapeHTML(card.answer)}</div>
    <div class="row-actions">
      <button class="secondary-button" id="showAnswerBtn" type="button">Show answer</button>
      <button class="small-button" data-action="rate-card" data-id="${card.id}" data-rating="1" type="button">Forgot</button>
      <button class="small-button" data-action="rate-card" data-id="${card.id}" data-rating="3" type="button">Okay</button>
      <button class="small-button" data-action="rate-card" data-id="${card.id}" data-rating="5" type="button">Easy</button>
    </div>
  </div>` : emptyState("No flashcards yet. Add cards for facts, formulas, vocabulary, and definitions.");

  $("#flashcardList").innerHTML = state.flashcards.length ? state.flashcards.map((card) => `
    <article class="compact-item">
      <span class="pill">${subjectById(card.subjectId)?.name || "Subject"}</span>
      <div>
        <p class="task-title">${escapeHTML(card.question)}</p>
        <p class="task-meta">Confidence ${card.confidence}/5 · Due ${formatDate(card.nextReviewDate)}</p>
      </div>
      <button class="small-button" data-action="delete-card" data-id="${card.id}" type="button">Delete</button>
    </article>`).join("") : emptyState("No cards saved.");
}

function renderAnalytics() {
  const totalMinutes = state.studyLog.reduce((sum, entry) => sum + entry.minutes, 0);
  $("#totalHoursMetric").textContent = (totalMinutes / 60).toFixed(1);

  const ranked = [...state.subjects].sort((a, b) => b.confidence - a.confidence || a.difficulty - b.difficulty);
  $("#strongSubjects").innerHTML = ranked.slice(0, 3).map(renderSubjectRank).join("");
  $("#weakSubjects").innerHTML = [...state.subjects].sort((a, b) => a.confidence - b.confidence || b.difficulty - a.difficulty).slice(0, 3).map(renderSubjectRank).join("");
  renderWeeklyChart();
  renderProgressChart();
}

function renderSubjectRank(subject) {
  return `<article class="compact-item">
    <span class="pill">${subject.confidence}/5</span>
    <div>
      <p class="task-title">${subject.name}</p>
      <p class="task-meta">Difficulty ${subject.difficulty}/5 · ${subject.priority} priority</p>
    </div>
  </article>`;
}

function renderWeeklyChart() {
  const start = startOfWeek(todayISO());
  $("#weeklyChart").innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const tasks = tasksForDate(date);
    const completed = tasks.filter((task) => task.completed).length;
    const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    return `<div class="bar-row">
      <span>${weekdayShort(date)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
      <strong>${percent}%</strong>
    </div>`;
  }).join("");
}

function renderProgressChart() {
  $("#progressChart").innerHTML = state.subjects.map((subject) => {
    const subtopics = state.subtopics.filter((subtopic) => subtopic.subjectId === subject.id);
    const progress = subtopics.length ? Math.round((subtopics.filter((subtopic) => subtopic.status === "Mastered").length / subtopics.length) * 100) : 0;
    return `<div class="progress-row">
      <span>${subject.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${progress}%; background:${subject.color}"></div></div>
      <strong>${progress}%</strong>
    </div>`;
  }).join("");
}

function renderSettings() {
  $("#examNameInput").value = state.settings.examName;
  $("#examDateInput").value = state.settings.examDate;
  $("#dailyTargetInput").value = state.settings.dailyTarget;
}

function populateSelects() {
  const subjectOptions = state.subjects.map((subject) => `<option value="${subject.id}">${subject.name}</option>`).join("");
  ["#taskSubject", "#chapterSubject", "#mistakeSubject", "#flashcardSubject"].forEach((selector) => {
    const element = $(selector);
    const current = element.value;
    element.innerHTML = subjectOptions;
    if (current) element.value = current;
  });

  const filter = $("#chapterSubjectFilter");
  const currentFilter = filter.value;
  filter.innerHTML = `<option value="all">All subjects</option>${subjectOptions}`;
  filter.value = currentFilter || "all";
}

function generatePlanForDate(date, count = getRecommendedDailyTarget(date)) {
  const target = clamp(count || getRecommendedDailyTarget(date), 3, 5);
  let slots = Math.max(0, target - tasksForDate(date).length);
  const added = [];
  const usedSubjects = new Set(tasksForDate(date).map((task) => task.subjectId));

  if (!slots) {
    showToast("That day already has enough focused sessions.");
    return;
  }

  const dueItems = getPriorityReviewItems(date).filter((item) => item.dueDate <= date);
  const heavyReviewDay = dueItems.filter((item) => item.dueDate < date).length >= 2;
  let reviewSlots = Math.min(slots, heavyReviewDay ? 3 : 2);

  for (const item of dueItems) {
    if (!reviewSlots || !slots) break;
    const task = item.kind === "mistake" ? createMistakeReviewTask(item, date) : createSubtopicReviewTask(item, date);
    if (task) {
      added.push(task);
      usedSubjects.add(task.subjectId);
      reviewSlots -= 1;
      slots -= 1;
    }
  }

  if (slots > 2) {
    const upcoming = getPriorityReviewItems(date).find((item) => item.dueDate > date && item.dueDate <= addDays(date, 2));
    const task = upcoming?.kind === "mistake" ? createMistakeReviewTask(upcoming, date) : upcoming ? createSubtopicReviewTask(upcoming, date) : null;
    if (task) {
      added.push(task);
      usedSubjects.add(task.subjectId);
      slots -= 1;
    }
  }

  if (slots > 1) {
    const practiceTask = createPracticeTask(date, [...usedSubjects]);
    if (practiceTask) {
      added.push(practiceTask);
      usedSubjects.add(practiceTask.subjectId);
      slots -= 1;
    }
  }

  while (slots > 0) {
    const subtopic = chooseNewLearningSubtopic([...usedSubjects]);
    const fallback = !subtopic ? chooseNewLearningSubtopic([]) : subtopic;
    const task = fallback ? createLearningTask(fallback, date) : null;
    if (!task) break;
    added.push(task);
    usedSubjects.add(task.subjectId);
    slots -= 1;
  }

  saveState();
  render();
  showToast(`Generated ${added.length} balanced sessions.`);
}

function hasTaskForSource(date, sourceKind, sourceId) {
  return state.tasks.some((task) => task.date === date && task.sourceKind === sourceKind && task.sourceId === sourceId);
}

function createLearningTask(subtopic, date) {
  if (hasTaskForSource(date, "subtopic-learning", subtopic.id)) return null;
  const subject = subjectById(subtopic.subjectId);
  const chapter = chapterById(subtopic.chapterId);
  const task = {
    id: uid("task"),
    subjectId: subtopic.subjectId,
    chapter: chapter?.title || "Chapter",
    chapterId: subtopic.chapterId,
    subtopic: subtopic.title,
    subtopicId: subtopic.id,
    objective: subtopic.objective,
    minutes: Number(subtopic.difficulty || subject?.difficulty || 3) >= 4 ? 40 : 30,
    priority: subject?.priority || "Medium",
    completed: false,
    date,
    type: "New Learning",
    sourceKind: "subtopic-learning",
    sourceId: subtopic.id,
    createdAt: new Date().toISOString()
  };
  subtopic.status = subtopic.status === "Not Started" ? "Learning" : subtopic.status;
  state.tasks.push(task);
  return task;
}

function createSubtopicReviewTask(subtopic, date, reviewNumber = null) {
  const sourceId = `${subtopic.id}:${reviewNumber || subtopic.reviewHistory.length + 1}`;
  if (hasTaskForSource(date, "subtopic-review", sourceId)) return null;
  const subject = subjectById(subtopic.subjectId);
  const chapter = chapterById(subtopic.chapterId);
  const task = {
    id: uid("task"),
    subjectId: subtopic.subjectId,
    chapter: chapter?.title || "Chapter",
    chapterId: subtopic.chapterId,
    subtopic: subtopic.title,
    subtopicId: subtopic.id,
    objective: `Review from memory, check notes, then answer one quick question. Review ${reviewNumber || subtopic.reviewHistory.length + 1}.`,
    minutes: Number(subtopic.difficulty || 3) >= 4 || Number(subtopic.confidence || 3) <= 2 ? 30 : 20,
    priority: getReviewPriority(subtopic),
    completed: false,
    date,
    type: "Spaced Review",
    sourceKind: "subtopic-review",
    sourceId,
    reviewNumber: reviewNumber || subtopic.reviewHistory.length + 1,
    createdAt: new Date().toISOString()
  };
  state.tasks.push(task);
  return task;
}

function createMistakeReviewTask(mistake, date) {
  if (hasTaskForSource(date, "mistake-review", mistake.id)) return null;
  const task = {
    id: uid("task"),
    subjectId: mistake.subjectId,
    chapter: mistake.chapter,
    chapterId: null,
    subtopic: `Mistake review: ${mistake.topic}`,
    objective: `Redo the question, explain the correct method, then write the reason for the mistake.`,
    minutes: 25,
    priority: "High",
    completed: false,
    date,
    type: "Mistake Review",
    sourceKind: "mistake-review",
    sourceId: mistake.id,
    createdAt: new Date().toISOString()
  };
  state.tasks.push(task);
  return task;
}

function createPracticeTask(date, excludeSubjectIds = []) {
  const subject = [...state.subjects]
    .filter((item) => !excludeSubjectIds.includes(item.id))
    .sort((a, b) => (6 - a.confidence + a.difficulty) < (6 - b.confidence + b.difficulty) ? 1 : -1)[0]
    || state.subjects[0];
  if (!subject) return null;
  if (state.tasks.some((task) => task.date === date && task.type === "Practice" && task.subjectId === subject.id)) return null;
  const weakTopic = subject.weakTopics[0] || "mixed exam questions";
  const task = {
    id: uid("task"),
    subjectId: subject.id,
    chapter: "Practice",
    chapterId: null,
    subtopic: `${subject.name}: ${weakTopic}`,
    objective: "Answer a small practice set and log any mistake immediately.",
    minutes: 30,
    priority: subject.priority,
    completed: false,
    date,
    type: "Practice",
    sourceKind: "practice",
    sourceId: `${subject.id}:${date}`,
    createdAt: new Date().toISOString()
  };
  state.tasks.push(task);
  return task;
}

function getReviewPriority(item) {
  if (Number(item.difficulty || 3) >= 4 || Number(item.confidence || 3) <= 2 || Number(item.mistakes || 0) > 0) return "High";
  if (Number(item.confidence || 3) >= 4) return "Low";
  return "Medium";
}

function completeTask(taskId, completed) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.completed = completed;
  if (completed) {
    task.completedAt = new Date().toISOString();
    state.studyLog.push({ taskId: task.id, subjectId: task.subjectId, minutes: task.minutes, date: task.date });
    updateStreak(task.date);
    if (task.subtopicId && task.type === "New Learning") {
      markSubtopicLearned(task.subtopicId, task.date);
    } else if (task.subtopicId && task.type === "Spaced Review") {
      completeSubtopicReview(task.subtopicId, task);
    } else if (task.sourceKind === "mistake-review") {
      const mistake = state.mistakes.find((item) => item.id === task.sourceId);
      if (mistake) mistake.futureReviewDate = addDays(task.date, mistake.confidence >= 4 ? 14 : 3);
    }
  }
  saveState();
  render();
}

function markSubtopicLearned(subtopicId, learnedDate = todayISO()) {
  const subtopic = subtopicById(subtopicId);
  if (!subtopic) return;
  subtopic.status = "Learned";
  subtopic.firstLearningDate = subtopic.firstLearningDate || learnedDate;
  subtopic.reviewHistory = subtopic.reviewHistory || [];
  subtopic.reviewSchedule = getReviewSchedule(subtopic);
  subtopic.reviewCount = clamp(subtopic.reviewCount || subtopic.reviewSchedule.length, 1, 10);
  subtopic.nextReviewDate = addDays(learnedDate, subtopic.reviewSchedule[0]);
  createFutureReviewTasks(subtopic, learnedDate);

  const chapter = chapterById(subtopic.chapterId);
  if (chapter && chapter.status === "Not Started") chapter.status = "Learning";
}

function createFutureReviewTasks(subtopic, learnedDate) {
  const schedule = getReviewSchedule(subtopic);
  schedule.slice(0, subtopic.reviewCount).forEach((interval, index) => {
    createSubtopicReviewTask(subtopic, addDays(learnedDate, interval), index + 1);
  });
}

function completeSubtopicReview(subtopicId, task, performance = "good") {
  const subtopic = subtopicById(subtopicId);
  if (!subtopic) return;
  subtopic.status = "Reviewing";
  subtopic.reviewHistory = subtopic.reviewHistory || [];
  subtopic.reviewHistory.push({
    date: task.date || todayISO(),
    performance,
    confidence: Number(subtopic.confidence || 3),
    reviewNumber: task.reviewNumber || subtopic.reviewHistory.length + 1
  });

  const nextTask = state.tasks
    .filter((item) => item.subtopicId === subtopic.id && item.type === "Spaced Review" && !item.completed && item.date > task.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  subtopic.nextReviewDate = nextTask?.date || null;
  subtopic.reviewStep = subtopic.reviewHistory.length;
  subtopic.interval = nextTask ? Math.max(1, Math.round((fromISO(nextTask.date) - fromISO(task.date)) / 86400000)) : subtopic.interval;

  if (!nextTask && subtopic.reviewHistory.length >= subtopic.reviewCount && Number(subtopic.confidence || 3) >= 4) {
    subtopic.status = "Mastered";
  }
}

function updateStreak(date) {
  if (state.streak.lastCompletedDate === date) return;
  const yesterday = addDays(date, -1);
  state.streak.count = state.streak.lastCompletedDate === yesterday ? state.streak.count + 1 : 1;
  state.streak.lastCompletedDate = date;
}

function scheduleNextChapterReview(chapter, performance) {
  const schedule = getReviewSchedule(chapter);
  if (performance === "hard") {
    chapter.reviewStep = Math.max(0, chapter.reviewStep - 1);
    chapter.interval = Math.max(1, Math.round(chapter.interval / 2));
  } else {
    chapter.reviewStep = Math.min(schedule.length - 1, (chapter.reviewStep || 0) + 1);
    chapter.interval = schedule[chapter.reviewStep];
  }
  chapter.nextReviewDate = addDays(todayISO(), chapter.interval);
  if (chapter.reviewStep >= 3 && chapter.confidence >= 4) chapter.status = "Mastered";
  else if (chapter.status !== "Mastered") chapter.status = "Reviewing";
}

function completeReview(id, kind) {
  if (kind === "subtopic") {
    const subtopic = subtopicById(id);
    if (subtopic) {
      const manualTask = { id: uid("manual_review"), date: todayISO(), reviewNumber: subtopic.reviewHistory.length + 1 };
      completeSubtopicReview(id, manualTask);
    }
  } else {
    const mistake = state.mistakes.find((item) => item.id === id);
    if (mistake) mistake.futureReviewDate = addDays(todayISO(), mistake.confidence >= 4 ? 14 : 3);
  }
  saveState();
  render();
  showToast("Review rescheduled.");
}

function startOfWeek(dateValue) {
  const date = fromISO(dateValue);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toISO(date);
}

function getWeeklyCompletion() {
  const start = startOfWeek(todayISO());
  const dates = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const tasks = state.tasks.filter((task) => dates.includes(task.date));
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}

function formatDate(value) {
  if (!value) return "Not set";
  return fromISO(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(value) {
  return fromISO(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function weekdayShort(value) {
  return fromISO(value).toLocaleDateString(undefined, { weekday: "short" });
}

function weekdayLong(value) {
  return fromISO(value).toLocaleDateString(undefined, { weekday: "long" });
}

function emptyState(message) {
  return `<p class="muted">${message}</p>`;
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2400);
}

function setView(view) {
  activeView = view;
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((section) => section.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  $("#viewTitle").textContent = view[0].toUpperCase() + view.slice(1);
  render();
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function makeICS() {
  const events = state.tasks.map((task) => {
    const subject = subjectById(task.subjectId);
    const start = task.date.replaceAll("-", "") + "T090000";
    const endHour = task.minutes > 45 ? "100000" : "094500";
    return [
      "BEGIN:VEVENT",
      `UID:${task.id}@exam-command-center`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${start}`,
      `DTEND:${task.date.replaceAll("-", "")}T${endHour}`,
      `SUMMARY:${subject?.name || "Study"} - ${task.subtopic}`,
      `DESCRIPTION:${task.chapter} | Priority: ${task.priority}`,
      "END:VEVENT"
    ].join("\r\n");
  });

  const examDate = state.settings.examDate.replaceAll("-", "");
  events.push([
    "BEGIN:VEVENT",
    "UID:exam-date@exam-command-center",
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${examDate}`,
    `SUMMARY:${state.settings.examName}`,
    "DESCRIPTION:Exam day",
    "END:VEVENT"
  ].join("\r\n"));

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Exam Command Center//Offline Study Dashboard//EN", ...events, "END:VCALENDAR"].join("\r\n");
}

document.addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-view]");
  if (navButton) setView(navButton.dataset.view);

  const jumpButton = event.target.closest("[data-view-jump]");
  if (jumpButton) setView(jumpButton.dataset.viewJump);

  const modalButton = event.target.closest("[data-open-modal]");
  if (modalButton) {
    if (modalButton.dataset.openModal === "taskModal") $("#taskDate").value = todayISO();
    if (modalButton.dataset.openModal === "mistakeModal") $("#mistakeReviewDate").value = addDays(todayISO(), 1);
    $(`#${modalButton.dataset.openModal}`).showModal();
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;

  if (action === "reschedule-task") {
    const task = state.tasks.find((item) => item.id === id);
    if (task) task.date = addDays(task.date, 1);
    saveState();
    render();
  }

  if (action === "delete-task") {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    saveState();
    render();
  }

  if (action === "set-chapter-status") {
    const chapter = chapterById(id);
    if (chapter) chapter.status = actionButton.dataset.status;
    saveState();
    render();
  }

  if (action === "set-subtopic-status") {
    const subtopic = subtopicById(id);
    if (subtopic) {
      if (actionButton.dataset.status === "Learned") markSubtopicLearned(id, todayISO());
      else subtopic.status = actionButton.dataset.status;
    }
    saveState();
    render();
  }

  if (action === "learn-subtopic-now") {
    markSubtopicLearned(id, todayISO());
    saveState();
    render();
    showToast("Subtopic learned. Reviews were scheduled automatically.");
  }

  if (action === "review-subtopic-now") completeReview(id, "subtopic");
  if (action === "complete-review") completeReview(id, actionButton.dataset.kind);

  if (action === "mistake-reviewed") {
    const mistake = state.mistakes.find((item) => item.id === id);
    if (mistake) mistake.futureReviewDate = addDays(todayISO(), 7);
    saveState();
    render();
  }

  if (action === "delete-mistake") {
    state.mistakes = state.mistakes.filter((mistake) => mistake.id !== id);
    saveState();
    render();
  }

  if (action === "rate-card") {
    const card = state.flashcards.find((item) => item.id === id);
    const rating = Number(actionButton.dataset.rating);
    if (card) {
      card.confidence = rating;
      card.forgotten = rating <= 2 ? (card.forgotten || 0) + 1 : card.forgotten || 0;
      card.nextReviewDate = addDays(todayISO(), rating <= 2 ? 1 : rating === 3 ? 3 : 14);
      currentFlashcardId = null;
    }
    saveState();
    render();
  }

  if (action === "delete-card") {
    state.flashcards = state.flashcards.filter((card) => card.id !== id);
    saveState();
    render();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches("[data-action='toggle-task']")) completeTask(target.dataset.id, target.checked);

  if (target.matches("[data-action='update-subject-confidence']")) {
    const subject = subjectById(target.dataset.id);
    if (subject) subject.confidence = clamp(target.value, 1, 5);
    saveState();
    render();
  }

  if (target.matches("[data-action='update-subject-difficulty']")) {
    const subject = subjectById(target.dataset.id);
    if (subject) subject.difficulty = clamp(target.value, 1, 5);
    saveState();
    render();
  }

  if (target.matches("[data-action='update-chapter-review-date']")) {
    const chapter = chapterById(target.dataset.id);
    if (chapter) chapter.nextReviewDate = target.value;
    saveState();
    render();
  }

  if (target.matches("[data-action='update-chapter-interval']")) {
    const chapter = chapterById(target.dataset.id);
    if (chapter) chapter.interval = clamp(target.value, 1, 60);
    saveState();
    render();
  }

  if (target.matches("[data-action='update-chapter-confidence']")) {
    const chapter = chapterById(target.dataset.id);
    if (chapter) chapter.confidence = clamp(target.value, 1, 5);
    saveState();
    render();
  }

  if (target.matches("[data-action='update-chapter-notes']")) {
    const chapter = chapterById(target.dataset.id);
    if (chapter) chapter.notes = target.value;
    saveState();
  }

  if (target.matches("[data-action='update-subtopic-review-date']")) {
    const subtopic = subtopicById(target.dataset.id);
    if (subtopic) {
      subtopic.nextReviewDate = target.value || null;
      if (target.value && subtopic.status === "Not Started") subtopic.status = "Learned";
    }
    saveState();
    render();
  }

  if (target.matches("[data-action='update-subtopic-interval']")) {
    const subtopic = subtopicById(target.dataset.id);
    if (subtopic) {
      subtopic.interval = clamp(target.value, 1, 60);
      subtopic.nextReviewDate = addDays(todayISO(), subtopic.interval);
    }
    saveState();
    render();
  }

  if (target.matches("[data-action='update-subtopic-review-count']")) {
    const subtopic = subtopicById(target.dataset.id);
    if (subtopic) {
      subtopic.reviewCount = clamp(target.value, 1, 10);
      subtopic.reviewSchedule = expandReviewSchedule(buildAdaptiveReviewSchedule(subtopic), subtopic.reviewCount);
    }
    saveState();
    render();
  }

  if (target.matches("[data-action='update-subtopic-difficulty']")) {
    const subtopic = subtopicById(target.dataset.id);
    if (subtopic) {
      subtopic.difficulty = clamp(target.value, 1, 5);
      subtopic.reviewSchedule = expandReviewSchedule(buildAdaptiveReviewSchedule(subtopic), subtopic.reviewCount || DEFAULT_REVIEW_SCHEDULE.length);
    }
    saveState();
    render();
  }

  if (target.matches("[data-action='update-subtopic-confidence']")) {
    const subtopic = subtopicById(target.dataset.id);
    if (subtopic) {
      subtopic.confidence = clamp(target.value, 1, 5);
      subtopic.reviewSchedule = expandReviewSchedule(buildAdaptiveReviewSchedule(subtopic), subtopic.reviewCount || DEFAULT_REVIEW_SCHEDULE.length);
    }
    saveState();
    render();
  }

  if (target.matches("[data-action='update-subtopic-notes']")) {
    const subtopic = subtopicById(target.dataset.id);
    if (subtopic) subtopic.notes = target.value;
    saveState();
  }

  if (target.id === "chapterSubjectFilter") renderChapters();
});

$("#generateTodayBtn").addEventListener("click", () => generatePlanForDate(todayISO()));
$("#generateWeekBtn").addEventListener("click", () => {
  const start = startOfWeek(todayISO());
  Array.from({ length: 7 }, (_, index) => addDays(start, index)).forEach((date) => {
    if (!tasksForDate(date).length) generatePlanForDate(date, Number(state.settings.dailyTarget));
  });
  render();
});

$$("[data-plan-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    plannerMode = button.dataset.planMode;
    $$("[data-plan-mode]").forEach((item) => item.classList.toggle("active", item === button));
    renderPlanner();
  });
});

$("#scheduleDueReviewsBtn").addEventListener("click", () => {
  getDueReviews(todayISO()).slice(0, 3).forEach((item) => {
    if (item.kind === "mistake") createMistakeReviewTask(item, todayISO());
    else createSubtopicReviewTask(item, todayISO());
  });
  saveState();
  render();
  showToast("Due reviews added to today.");
});

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.tasks.push({
    id: uid("task"),
    subjectId: $("#taskSubject").value,
    chapter: $("#taskChapter").value.trim(),
    chapterId: null,
    subtopic: $("#taskSubtopic").value.trim(),
    objective: $("#taskObjective").value.trim(),
    minutes: Number($("#taskMinutes").value),
    priority: $("#taskPriority").value,
    completed: false,
    date: $("#taskDate").value,
    type: "Study",
    createdAt: new Date().toISOString()
  });
  saveState();
  $("#taskModal").close();
  event.target.reset();
  render();
});

$("#subjectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.subjects.push({
    id: uid("subject"),
    name: $("#subjectName").value.trim(),
    confidence: clamp($("#subjectConfidence").value, 1, 5),
    difficulty: clamp($("#subjectDifficulty").value, 1, 5),
    priority: $("#subjectPriority").value,
    color: "#256b5a",
    completedChapters: 0,
    weakTopics: [],
    nextRevisionDate: addDays(todayISO(), 2)
  });
  saveState();
  $("#subjectModal").close();
  event.target.reset();
  render();
});

$("#chapterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const subject = subjectById($("#chapterSubject").value);
  const chapter = {
    id: uid("chapter"),
    subjectId: $("#chapterSubject").value,
    title: $("#chapterTitle").value.trim(),
    status: $("#chapterStatus").value,
    notes: $("#chapterNotes").value.trim(),
    confidence: subject?.confidence || 3,
    difficulty: subject?.difficulty || 3,
    nextReviewDate: addDays(todayISO(), 1),
    interval: 1,
    reviewStep: 0,
    mistakes: 0
  };
  state.chapters.push(chapter);
  state.subtopics.push(...createSubtopicsForChapters(state.subjects, [chapter]));
  saveState();
  $("#chapterModal").close();
  event.target.reset();
  render();
});

$("#mistakeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const subjectId = $("#mistakeSubject").value;
  const topic = $("#mistakeTopic").value.trim();
  state.mistakes.push({
    id: uid("mistake"),
    subjectId,
    chapter: $("#mistakeChapter").value.trim(),
    topic,
    mistake: $("#mistakeText").value.trim(),
    correctMethod: $("#mistakeCorrect").value.trim(),
    reason: $("#mistakeReason").value,
    futureReviewDate: $("#mistakeReviewDate").value,
    confidence: 2,
    createdAt: new Date().toISOString()
  });
  const subject = subjectById(subjectId);
  if (subject && !subject.weakTopics.includes(topic)) subject.weakTopics.push(topic);
  saveState();
  $("#mistakeModal").close();
  event.target.reset();
  render();
});

$("#flashcardForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.flashcards.push({
    id: uid("card"),
    subjectId: $("#flashcardSubject").value,
    question: $("#flashcardQuestion").value.trim(),
    answer: $("#flashcardAnswer").value.trim(),
    confidence: clamp($("#flashcardConfidence").value, 1, 5),
    forgotten: 0,
    nextReviewDate: addDays(todayISO(), 1),
    createdAt: new Date().toISOString()
  });
  saveState();
  $("#flashcardModal").close();
  event.target.reset();
  render();
});

$("#settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings.examName = $("#examNameInput").value.trim() || "Exam";
  state.settings.examDate = $("#examDateInput").value;
  state.settings.dailyTarget = clamp($("#dailyTargetInput").value, 3, 5);
  saveState();
  render();
  showToast("Settings saved.");
});

$("#exportDataBtn").addEventListener("click", () => download("study-dashboard-data.json", JSON.stringify(state, null, 2), "application/json"));
$("#downloadIcsBtn").addEventListener("click", () => download("study-schedule.ics", makeICS(), "text/calendar"));
$("#importDataBtn").addEventListener("click", () => $("#importDataInput").click());
$("#importDataInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  state = normalizeState(JSON.parse(await file.text()));
  saveState();
  render();
  showToast("Data imported.");
});

$("#resetDataBtn").addEventListener("click", () => {
  const confirmed = confirm("Reset all study dashboard data?");
  if (!confirmed) return;
  state = createSeedState();
  saveState();
  render();
});

document.addEventListener("click", (event) => {
  if (event.target.id === "showAnswerBtn") $("#flashcardAnswerBox")?.classList.add("visible");
});

saveState();
render();
