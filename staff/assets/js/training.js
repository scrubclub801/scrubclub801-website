(function () {
  const TRAINING_STORAGE_KEY = "staff_training_records_v1";
  const TRAINING_CUSTOM_MODULES_KEY = "staff_training_custom_modules_v1";

  const REQUIRED_MODULES = [
    {
      id: "welcome",
      title: "Welcome to Scrub Club 801",
      summary: "Company values, professionalism, and communication expectations.",
      details: [
        "Company values",
        "Professionalism",
        "Customer service expectations",
        "Appearance standards",
        "Communication standards",
      ],
      mediaPlaceholder: "Orientation briefing video",
    },
    {
      id: "cleaning-standards",
      title: "Cleaning Standards",
      summary: "Core room-by-room cleaning process with step-by-step guides.",
      details: [
        "Kitchen cleaning procedure",
        "Bathroom cleaning procedure",
        "Bedroom cleaning",
        "Living room cleaning",
        "Floors",
        "Dusting",
        "Trash removal",
      ],
      expandable: true,
    },
    {
      id: "products-equipment",
      title: "Products and Equipment",
      summary: "Correct product usage and equipment safety.",
      details: [
        "Which cleaner to use on which surface",
        "Vacuum usage",
        "Mop usage",
        "Microfiber cloth color system",
        "Safety precautions",
      ],
      mediaPlaceholder: "Tools and products reference library",
    },
    {
      id: "vehicle-prep",
      title: "Vehicle Preparation",
      summary: "Pre-job readiness checklist for every route.",
      details: [
        "Load supplies",
        "Check inventory",
        "Fuel vehicle if applicable",
        "Organize equipment",
      ],
    },
    {
      id: "customer-service",
      title: "Customer Service",
      summary: "How to create a professional and respectful customer experience.",
      details: [
        "Greeting customers",
        "Professional communication",
        "Respecting customer property",
        "Handling pets",
        "Handling special requests",
        "Ending appointments professionally",
      ],
    },
    {
      id: "safety",
      title: "Safety Training",
      summary: "Safe work standards for people, property, and products.",
      details: [
        "Slip hazards",
        "Chemical safety",
        "Lifting techniques",
        "Emergency procedures",
        "Reporting incidents",
      ],
    },
    {
      id: "photos",
      title: "Before and After Photos",
      summary: "Documentation standards and privacy expectations.",
      details: [
        "When to take photos",
        "Where to upload them",
        "Customer privacy guidelines",
      ],
    },
    {
      id: "job-checklist",
      title: "Job Checklist Training",
      summary: "Full cleaning checklist walkthrough and section-by-section guidance.",
      details: [
        "Arrival preparation",
        "Room sequence",
        "Quality check",
        "Customer walk-through",
      ],
    },
    {
      id: "end-report",
      title: "End of Job Report Training",
      summary: "How to close out a job and submit complete reporting.",
      details: [
        "Complete reports",
        "Upload photos",
        "Submit notes",
        "Request reviews",
      ],
    },
  ];

  const QUIZ_QUESTIONS = [
    {
      id: "q1",
      prompt: "Which best reflects Scrub Club 801 professionalism expectations?",
      choices: [
        "Casual timing and optional communication",
        "Consistent punctuality, clear updates, and respectful conduct",
        "Only focus on speed",
        "Skip introductions to save time",
      ],
      answerIndex: 1,
    },
    {
      id: "q2",
      prompt: "What is the correct first step before starting a job?",
      choices: ["Start cleaning immediately", "Review customer notes and checklist", "Take break", "Only unload vacuum"],
      answerIndex: 1,
    },
    {
      id: "q3",
      prompt: "Which room should receive disinfectant attention for high-touch surfaces?",
      choices: ["Garage only", "Bathroom and kitchen", "Closets only", "Patio only"],
      answerIndex: 1,
    },
    {
      id: "q4",
      prompt: "What should you do if a customer has a special request?",
      choices: ["Ignore if it is extra work", "Acknowledge and document it clearly", "Wait until the end without mention", "Ask another customer"],
      answerIndex: 1,
    },
    {
      id: "q5",
      prompt: "The microfiber cloth color system is used to:",
      choices: ["Make kits look better", "Prevent cross-contamination", "Track inventory only", "Replace gloves"],
      answerIndex: 1,
    },
    {
      id: "q6",
      prompt: "Before leaving for appointments, team members should:",
      choices: ["Skip inventory checks", "Load supplies and organize equipment", "Take only chemicals", "Wait for customer call"],
      answerIndex: 1,
    },
    {
      id: "q7",
      prompt: "If a slip hazard is spotted, the right action is:",
      choices: ["Ignore if small", "Mark, clean, and report if needed", "Only tell customer later", "Continue working around it"],
      answerIndex: 1,
    },
    {
      id: "q8",
      prompt: "Chemical safety includes:",
      choices: ["Mix products for stronger results", "Using products per label and surface type", "Store open bottles in vehicle", "Use any cleaner on any surface"],
      answerIndex: 1,
    },
    {
      id: "q9",
      prompt: "Correct lifting technique helps prevent:",
      choices: ["Schedule delays only", "Injury and fatigue", "Customer complaints only", "Equipment wear only"],
      answerIndex: 1,
    },
    {
      id: "q10",
      prompt: "When should before and after photos be taken?",
      choices: ["Only after the job", "At defined checkpoints before and after service", "Only if customer asks", "Never indoors"],
      answerIndex: 1,
    },
    {
      id: "q11",
      prompt: "Customer privacy in photos means:",
      choices: ["Include personal documents", "Avoid personal identifiers and private items", "Upload to personal social media", "Share with friends"],
      answerIndex: 1,
    },
    {
      id: "q12",
      prompt: "A proper job checklist walkthrough should include:",
      choices: ["Only final room", "Each checklist section in order", "No quality check", "Skip notes"],
      answerIndex: 1,
    },
    {
      id: "q13",
      prompt: "What should be included in end-of-job reporting?",
      choices: ["Only completion time", "Photos, notes, and report details", "No customer notes", "Personal opinions only"],
      answerIndex: 1,
    },
    {
      id: "q14",
      prompt: "How should a team member greet a customer?",
      choices: ["Brief and silent", "Friendly, professional, and clear", "Only by text", "No greeting needed"],
      answerIndex: 1,
    },
    {
      id: "q15",
      prompt: "If inventory is low before departure, you should:",
      choices: ["Leave anyway", "Restock and confirm required items", "Borrow from customer", "Skip checklist"],
      answerIndex: 1,
    },
    {
      id: "q16",
      prompt: "Appearance standards are important because they:",
      choices: ["Are optional", "Build trust and brand consistency", "Only matter to managers", "Replace quality cleaning"],
      answerIndex: 1,
    },
    {
      id: "q17",
      prompt: "How should pet-related concerns be handled?",
      choices: ["Ignore pets", "Respect household instructions and safety", "Feed pets without permission", "Close all doors without asking"],
      answerIndex: 1,
    },
    {
      id: "q18",
      prompt: "What is the minimum passing score for the final knowledge check?",
      choices: ["70%", "80%", "90%", "95%"],
      answerIndex: 2,
    },
    {
      id: "q19",
      prompt: "If an employee fails the final knowledge check, they can:",
      choices: ["Retake once", "Retake unlimited times", "Not retake", "Only retake next month"],
      answerIndex: 1,
    },
    {
      id: "q20",
      prompt: "Who can approve completed training?",
      choices: ["Any customer", "Managers and administrators", "Only coworkers", "Only new employees"],
      answerIndex: 1,
    },
  ];

  function readStorage(key, fallbackValue) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallbackValue;
      }
      return JSON.parse(raw);
    } catch (_error) {
      return fallbackValue;
    }
  }

  function writeStorage(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function toKey(value, fallback) {
    const input = (value || fallback || "staff").toLowerCase().trim();
    return input.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function getEmployeeDisplayName(session) {
    if (session?.name) {
      return session.name;
    }
    if (session?.email && session.email.includes("@")) {
      return session.email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "Staff Employee";
  }

  function getEmployeeKey(session) {
    return toKey(session?.email, session?.name || "staff-employee");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function ensureRecordShape(record, session) {
    const moduleState = {};
    REQUIRED_MODULES.forEach((module) => {
      moduleState[module.id] = Boolean(record?.modules?.[module.id]);
    });

    const normalized = {
      employeeKey: record?.employeeKey || getEmployeeKey(session),
      employeeName: record?.employeeName || getEmployeeDisplayName(session),
      email: record?.email || session?.email || "",
      role: record?.role || session?.role || "employee",
      firstSeenAt: record?.firstSeenAt || nowIso(),
      modules: moduleState,
      quiz: {
        attempts: Number(record?.quiz?.attempts || 0),
        highestScore: Number(record?.quiz?.highestScore || 0),
        lastScore: Number(record?.quiz?.lastScore || 0),
        passed: Boolean(record?.quiz?.passed),
        passedAt: record?.quiz?.passedAt || null,
      },
      completionDate: record?.completionDate || null,
      adminApproved: Boolean(record?.adminApproved),
      adminApprovedBy: record?.adminApprovedBy || null,
      adminApprovedAt: record?.adminApprovedAt || null,
    };

    const completedCount = REQUIRED_MODULES.filter((module) => normalized.modules[module.id]).length;
    const totalUnits = REQUIRED_MODULES.length + 1;
    const completeUnits = completedCount + (normalized.quiz.passed ? 1 : 0);
    normalized.progressPercent = Math.round((completeUnits / totalUnits) * 100);
    normalized.complete = completedCount === REQUIRED_MODULES.length && normalized.quiz.passed;
    if (normalized.complete && !normalized.completionDate) {
      normalized.completionDate = nowIso();
    }
    return normalized;
  }

  function getRecords() {
    return readStorage(TRAINING_STORAGE_KEY, {});
  }

  function setRecords(records) {
    writeStorage(TRAINING_STORAGE_KEY, records);
  }

  function getCustomModules() {
    return readStorage(TRAINING_CUSTOM_MODULES_KEY, []);
  }

  function setCustomModules(modules) {
    writeStorage(TRAINING_CUSTOM_MODULES_KEY, modules);
  }

  function getProgressForUser(session) {
    const records = getRecords();
    const key = getEmployeeKey(session);
    const normalized = ensureRecordShape(records[key], session);
    records[key] = normalized;
    setRecords(records);
    return normalized;
  }

  function saveProgressForUser(session, updater) {
    const records = getRecords();
    const key = getEmployeeKey(session);
    const current = ensureRecordShape(records[key], session);
    const next = ensureRecordShape(updater(current), session);
    records[key] = next;
    setRecords(records);
    return next;
  }

  function getAllProgress() {
    const records = getRecords();
    return Object.keys(records)
      .map((key) => ensureRecordShape(records[key], records[key]))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  function canManageTraining(session) {
    return session?.role === "manager" || session?.role === "admin";
  }

  function isTrainingRequired(session) {
    if (!session || session.role !== "employee") {
      return false;
    }
    const progress = getProgressForUser(session);
    return !progress.complete;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderModules(progress, readOnly) {
    const customModules = getCustomModules();
    const moduleCards = REQUIRED_MODULES.map((module) => {
      const done = progress.modules[module.id];
      const checks = module.details
        .map((detail) => `<li>${escapeHtml(detail)}</li>`)
        .join("");

      const body = module.expandable
        ? `<details class="training-expand"><summary>Step-by-step guide</summary><ul>${checks}</ul></details>`
        : `<ul>${checks}</ul>`;

      const media = module.mediaPlaceholder
        ? `<div class="training-media-placeholder">${escapeHtml(module.mediaPlaceholder)}</div>`
        : "";

      return `
        <article class="training-module ${done ? "is-complete" : ""}">
          <div class="training-module-head">
            <h3>${escapeHtml(module.title)}</h3>
            <span class="training-check ${done ? "done" : ""}">${done ? "✓ Completed" : "Required"}</span>
          </div>
          <p>${escapeHtml(module.summary)}</p>
          ${body}
          ${media}
          ${
            readOnly
              ? ""
              : `<button class="staff-button training-complete-btn" type="button" data-complete-module="${module.id}">${done ? "Mark Incomplete" : "Mark Complete"}</button>`
          }
        </article>
      `;
    }).join("");

    const customCards = customModules
      .map((module, idx) => {
        return `
          <article class="training-module training-custom-module">
            <div class="training-module-head">
              <h3>${escapeHtml(module.title)}</h3>
              <span class="training-badge">${escapeHtml(module.type || "Resource")}</span>
            </div>
            <p>${escapeHtml(module.description || "")}</p>
            <p class="training-resource-meta">${escapeHtml(module.fileName || module.url || "Internal training resource")}</p>
            <div class="training-inline-actions">
              <button class="staff-admin-cancel" type="button" data-edit-custom-module="${idx}">Edit Lesson</button>
            </div>
          </article>
        `;
      })
      .join("");

    return `${moduleCards}${customCards}`;
  }

  function renderQuiz(progress, readOnly) {
    const quizRows = QUIZ_QUESTIONS.map((question, index) => {
      const choices = question.choices
        .map((choice, choiceIndex) => {
          return `<label><input type="radio" name="quiz-${question.id}" value="${choiceIndex}" ${readOnly ? "disabled" : ""} /> ${escapeHtml(choice)}</label>`;
        })
        .join("");

      return `
        <div class="training-quiz-question">
          <p><strong>${index + 1}. ${escapeHtml(question.prompt)}</strong></p>
          <div class="training-quiz-choices">${choices}</div>
        </div>
      `;
    }).join("");

    return `
      <section class="training-quiz-card">
        <div class="training-module-head">
          <h3>Final Knowledge Check</h3>
          <span class="training-badge">20 questions | 90% pass required</span>
        </div>
        <p>Attempts: <strong>${progress.quiz.attempts}</strong> | Highest score: <strong>${progress.quiz.highestScore}%</strong> | Last score: <strong>${progress.quiz.lastScore}%</strong></p>
        <p>Completion date: <strong>${progress.quiz.passedAt ? new Date(progress.quiz.passedAt).toLocaleString() : "Not passed yet"}</strong></p>
        <form data-training-quiz-form>
          ${quizRows}
          ${
            readOnly
              ? ""
              : `<button class="staff-button" type="submit">Submit Quiz</button><p class="staff-message" data-quiz-message role="status" aria-live="polite"></p>`
          }
        </form>
      </section>
    `;
  }

  function renderCertificate(progress) {
    if (!progress.quiz.passed) {
      return "";
    }

    return `
      <section class="training-certificate">
        <h3>Completion Certificate</h3>
        <p><strong>Employee Name:</strong> ${escapeHtml(progress.employeeName)}</p>
        <p><strong>Training Completed:</strong> ${progress.complete ? "Yes" : "In progress"}</p>
        <p><strong>Completion Date:</strong> ${progress.completionDate ? new Date(progress.completionDate).toLocaleDateString() : "Pending"}</p>
        <p><strong>Administrator Approval:</strong> ${progress.adminApproved ? `Approved by ${escapeHtml(progress.adminApprovedBy || "Manager")} on ${new Date(progress.adminApprovedAt).toLocaleDateString()}` : "Pending approval"}</p>
      </section>
    `;
  }

  function renderManagerOverview(records) {
    if (!records.length) {
      return `<div class="staff-empty">No employee training records are available yet.</div>`;
    }

    return `
      <section class="training-manager-overview">
        <h3>Team Training Progress</h3>
        <div class="training-team-grid">
          ${records
            .map((record) => {
              return `
                <article class="training-team-card">
                  <h4>${escapeHtml(record.employeeName)}</h4>
                  <p>${escapeHtml(record.email || "No email on file")}</p>
                  <p>Progress: <strong>${record.progressPercent}%</strong></p>
                  <p>Highest quiz score: <strong>${record.quiz.highestScore}%</strong></p>
                  <p>Attempts: <strong>${record.quiz.attempts}</strong></p>
                  <p>Completion date: <strong>${record.completionDate ? new Date(record.completionDate).toLocaleDateString() : "Not complete"}</strong></p>
                  <div class="training-inline-actions">
                    <button class="staff-admin-cancel" type="button" data-approve-training="${record.employeeKey}">${record.adminApproved ? "Remove Approval" : "Approve Training"}</button>
                    <button class="staff-admin-cancel" type="button" data-reset-training="${record.employeeKey}">Reset Progress</button>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function renderAdminTools() {
    return `
      <section class="training-admin-tools">
        <h3>Administrator Features</h3>
        <p class="staff-subtitle">Add modules, attach resources, add quizzes, edit lessons, reset progress, and approve training.</p>
        <form class="training-admin-form" data-custom-module-form>
          <div class="training-admin-row">
            <label>Module Title<input type="text" name="title" required /></label>
            <label>Resource Type
              <select name="type" required>
                <option value="PDF">PDF</option>
                <option value="Video">Video</option>
                <option value="Image">Image</option>
                <option value="Quiz">Quiz</option>
              </select>
            </label>
          </div>
          <label>Description<textarea name="description" rows="3"></textarea></label>
          <div class="training-admin-row">
            <label>Resource URL<input type="url" name="url" placeholder="https://" /></label>
            <label>Upload File<input type="file" name="file" /></label>
          </div>
          <button class="staff-button" type="submit">Add Training Module</button>
          <p class="staff-message" data-custom-module-message role="status" aria-live="polite"></p>
        </form>
      </section>
    `;
  }

  function renderTrainingPage(session) {
    const root = document.querySelector("[data-training-root]");
    if (!root) {
      return;
    }

    const managerView = canManageTraining(session);
    const progress = getProgressForUser(session);
    const completedCount = REQUIRED_MODULES.filter((module) => progress.modules[module.id]).length;

    root.innerHTML = `
      <section class="training-progress-card">
        <div class="training-module-head">
          <h2>Overall Training Progress</h2>
          <span class="training-progress-value">${progress.progressPercent}%</span>
        </div>
        <div class="training-progress-bar"><span style="width:${progress.progressPercent}%"></span></div>
        <p>${completedCount} of ${REQUIRED_MODULES.length} required training modules complete. Final knowledge check ${progress.quiz.passed ? "passed" : "pending"}.</p>
      </section>

      <section>
        <h2>Required Training Modules</h2>
        <div class="training-module-grid">${renderModules(progress, managerView)}</div>
      </section>

      ${renderQuiz(progress, managerView)}
      ${renderCertificate(progress)}
      ${managerView ? renderManagerOverview(getAllProgress()) : ""}
      ${managerView ? renderAdminTools() : ""}
    `;

    wireTrainingInteractions(session);
  }

  function gradeQuiz(form) {
    let correct = 0;
    QUIZ_QUESTIONS.forEach((question) => {
      const selected = form.querySelector(`input[name="quiz-${question.id}"]:checked`);
      if (selected && Number(selected.value) === question.answerIndex) {
        correct += 1;
      }
    });
    return Math.round((correct / QUIZ_QUESTIONS.length) * 100);
  }

  function wireTrainingInteractions(session) {
    document.querySelectorAll("[data-complete-module]").forEach((button) => {
      button.addEventListener("click", () => {
        const moduleId = button.getAttribute("data-complete-module");
        saveProgressForUser(session, (current) => {
          const next = { ...current, modules: { ...current.modules } };
          next.modules[moduleId] = !next.modules[moduleId];
          return next;
        });
        renderTrainingPage(session);
        window.setTimeout(() => {
          const nextIncomplete = document.querySelector('[data-complete-module]:not([data-complete-module="' + moduleId + '"])');
          if (nextIncomplete && window.StaffPortal?.scrollToElement) {
            window.StaffPortal.scrollToElement(nextIncomplete.closest(".training-module") || nextIncomplete, { focus: true });
          }
        }, 120);
      });
    });

    const quizForm = document.querySelector("[data-training-quiz-form]");
    const quizMessage = document.querySelector("[data-quiz-message]");
    if (quizForm) {
      quizForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const score = gradeQuiz(quizForm);
        const passed = score >= 90;

        saveProgressForUser(session, (current) => {
          const next = { ...current, quiz: { ...current.quiz } };
          next.quiz.attempts += 1;
          next.quiz.lastScore = score;
          next.quiz.highestScore = Math.max(next.quiz.highestScore, score);
          if (passed) {
            next.quiz.passed = true;
            next.quiz.passedAt = nowIso();
          }
          return next;
        });

        if (quizMessage) {
          quizMessage.textContent = passed
            ? `Passed with ${score}%. Great work.`
            : `Score ${score}%. A score of 90% is required. You can retake anytime.`;
          quizMessage.classList.toggle("error", !passed);
        }

        window.setTimeout(() => {
          renderTrainingPage(session);
          const target = document.querySelector(".training-certificate") || document.querySelector(".training-quiz-card");
          if (target && window.StaffPortal?.scrollToElement) {
            window.StaffPortal.scrollToElement(target);
          }
        }, 300);
      });
    }

    document.querySelectorAll("[data-reset-training]").forEach((button) => {
      button.addEventListener("click", () => {
        const employeeKey = button.getAttribute("data-reset-training");
        const records = getRecords();
        const target = records[employeeKey];
        if (!target) {
          return;
        }
        const resetModules = {};
        REQUIRED_MODULES.forEach((module) => {
          resetModules[module.id] = false;
        });
        target.modules = resetModules;
        target.quiz = {
          attempts: 0,
          highestScore: 0,
          lastScore: 0,
          passed: false,
          passedAt: null,
        };
        target.completionDate = null;
        target.adminApproved = false;
        target.adminApprovedBy = null;
        target.adminApprovedAt = null;
        records[employeeKey] = ensureRecordShape(target, target);
        setRecords(records);
        renderTrainingPage(session);
      });
    });

    document.querySelectorAll("[data-approve-training]").forEach((button) => {
      button.addEventListener("click", () => {
        const employeeKey = button.getAttribute("data-approve-training");
        const records = getRecords();
        const target = records[employeeKey];
        if (!target) {
          return;
        }

        const currentApproved = Boolean(target.adminApproved);
        target.adminApproved = !currentApproved;
        target.adminApprovedBy = !currentApproved ? (session.name || session.email || "Manager") : null;
        target.adminApprovedAt = !currentApproved ? nowIso() : null;
        records[employeeKey] = ensureRecordShape(target, target);
        setRecords(records);
        renderTrainingPage(session);
      });
    });

    const customForm = document.querySelector("[data-custom-module-form]");
    const customMessage = document.querySelector("[data-custom-module-message]");
    if (customForm) {
      customForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(customForm);
        const file = formData.get("file");

        const module = {
          id: `custom-${Date.now()}`,
          title: String(formData.get("title") || "").trim(),
          type: String(formData.get("type") || "Resource").trim(),
          description: String(formData.get("description") || "").trim(),
          url: String(formData.get("url") || "").trim(),
          fileName: file && file.name ? file.name : "",
          createdAt: nowIso(),
        };

        const modules = getCustomModules();
        modules.push(module);
        setCustomModules(modules);
        customForm.reset();
        if (customMessage) {
          customMessage.textContent = "Training module added.";
          customMessage.classList.remove("error");
        }
        renderTrainingPage(session);
      });
    }

    document.querySelectorAll("[data-edit-custom-module]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-edit-custom-module"));
        const modules = getCustomModules();
        const target = modules[index];
        if (!target) {
          return;
        }

        const title = window.prompt("Edit lesson title", target.title);
        if (!title) {
          return;
        }
        target.title = title.trim();
        modules[index] = target;
        setCustomModules(modules);
        renderTrainingPage(session);
      });
    });
  }

  function initTrainingPage() {
    if (!document.body.hasAttribute("data-training-page")) {
      return;
    }

    const session = {
      role: document.body.dataset.currentRole || "employee",
      email: document.body.dataset.currentEmail || "",
      name: document.body.dataset.currentName || "",
    };

    getProgressForUser(session);
    renderTrainingPage(session);
  }

  window.StaffTraining = {
    requiredModules: REQUIRED_MODULES,
    quizQuestions: QUIZ_QUESTIONS,
    getProgressForUser,
    getAllProgress,
    isTrainingRequired,
    canManageTraining,
    initTrainingPage,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTrainingPage);
  } else {
    initTrainingPage();
  }
})();
