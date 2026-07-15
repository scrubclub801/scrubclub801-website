(function () {
  const STORAGE_KEYS = {
    assistantTasks: "staff_assistant_tasks_v1",
    assistantSuggestions: "staff_assistant_suggested_tasks_v1",
    monthlyUpdates: "staff_monthly_training_updates_v1",
    monthlyProgress: "staff_monthly_training_progress_v1",
    announcements: "staff_internal_announcements_v1",
  };

  const QUICK_TEMPLATES = {
    payments: [
      "Summarize unpaid payments for this week.",
      "Show payments that need manual review.",
      "Find payout records pending confirmation.",
    ],
    clients: [
      "Find clients that need follow-up.",
      "Show clients with incomplete profile details.",
      "Locate client notes added in the last 7 days.",
    ],
    appointments: [
      "Find unassigned appointments.",
      "Show upcoming appointments by day.",
      "List appointments missing checklist completion.",
    ],
    customerHealth: [
      "Summarize customers marked at risk.",
      "Find overdue customer follow-up records.",
      "Show customers with no recent service activity.",
    ],
  };

  const MANAGEMENT_ACTIONS = [
    "add_client",
    "update_client",
    "add_employee_note",
    "update_appointment",
    "assign_employee_to_job",
    "update_inventory_quantity",
    "create_reminder",
    "publish_monthly_training_update",
    "create_internal_announcement",
    "prepare_restock_list",
    "update_follow_up_status",
    "draft_thank_you_email",
    "draft_review_request",
    "summarize_employee_activity",
    "suggest_role_permission_change",
  ];

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) {
      return "Not set";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not set";
    }
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  }

  function currentActor() {
    return {
      role: document.body.dataset.currentRole || "employee",
      email: (document.body.dataset.currentEmail || "").toLowerCase(),
      name: document.body.dataset.currentName || "Staff",
    };
  }

  function canRenderAssistant() {
    const role = currentActor().role;
    return Boolean(window.StaffAuth && window.StaffAuth.canAccessRole(role, "employee"));
  }

  function isNellaOwnerAdmin() {
    const actor = currentActor();
    const isElevated = window.StaffAuth && window.StaffAuth.canAccessRole(actor.role, "admin");
    return isElevated && actor.email === "nellamaglic@gmail.com";
  }

  function aiConfig() {
    return window.STAFF_PORTAL_CONFIG?.ai || {};
  }

  function isSecureAIConnected() {
    const cfg = aiConfig();
    return Boolean(cfg.enabled && cfg.endpoint);
  }

  function permissionScopeLabel(actor, isNella, activeTab) {
    if (isNella && activeTab === "management") {
      return "Nella Management Mode";
    }
    if (window.StaffAuth && window.StaffAuth.canAccessRole(actor.role, "manager")) {
      return "Manager View";
    }
    return "Employee View";
  }

  async function writeAuditLog(action, payload) {
    const actor = currentActor();
    const logEntry = {
      id: uid("audit"),
      actor_name: actor.name,
      actor_email: actor.email,
      action,
      target_table: payload?.targetTable || "assistant",
      target_id: payload?.targetId || "",
      previous_value: JSON.stringify(payload?.previousValue || {}),
      new_value: JSON.stringify(payload?.newValue || {}),
      created_at: nowIso(),
    };

    if (window.StaffDb?.isSupabaseConfigured && window.StaffDb.isSupabaseConfigured()) {
      try {
        await window.StaffDb.createOne("audit_logs", logEntry);
        return;
      } catch (_err) {
        // Fall through to local backup log.
      }
    }

    const backup = readStorage("staff_local_audit_logs_v1", []);
    backup.unshift(logEntry);
    writeStorage("staff_local_audit_logs_v1", backup.slice(0, 500));
  }

  async function sendSecureRequest(payload) {
    if (!isSecureAIConnected()) {
      return {
        ok: false,
        reply: "Scrub Assistant will become available after the secure AI service is connected.",
        proposedMutation: null,
      };
    }

    try {
      const response = await fetch(aiConfig().endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          ok: false,
          reply: "Secure AI service is unavailable right now.",
          proposedMutation: null,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        reply: data.reply || "No response returned.",
        proposedMutation: data.proposedMutation || null,
        mutationToken: data.mutationToken || "",
      };
    } catch (_err) {
      return {
        ok: false,
        reply: "Secure AI service could not be reached.",
        proposedMutation: null,
      };
    }
  }

  function addMessage(stream, sender, text) {
    const card = document.createElement("article");
    card.className = `assistant-msg ${sender}`;
    card.innerHTML = `<p>${escapeHtml(text)}</p>`;
    stream.appendChild(card);
    stream.scrollTop = stream.scrollHeight;
  }

  function getAssistantTasks() {
    const actor = currentActor();
    return readStorage(STORAGE_KEYS.assistantTasks, []).filter((task) => {
      if (!task.assignedEmployeeEmail) {
        return true;
      }
      if (window.StaffAuth.canAccessRole(actor.role, "manager")) {
        return true;
      }
      return task.assignedEmployeeEmail.toLowerCase() === actor.email;
    });
  }

  function saveAssistantTasks(tasks) {
    writeStorage(STORAGE_KEYS.assistantTasks, tasks);
  }

  function deriveTaskSuggestions() {
    const suggestions = [];
    const actor = currentActor();

    if (window.StaffRecords) {
      const reminders = window.StaffRecords.getVisibleReminders(actor).filter((item) => item.status === "open");
      reminders.slice(0, 4).forEach((item) => {
        suggestions.push({
          id: uid("sug"),
          title: `Follow up with ${item.clientName || "client"}`,
          description: item.reason || "Reminder requires follow-up.",
          dueDate: item.dueDate || nowIso(),
          priority: item.priority === "high" ? "High" : "Medium",
          relatedPath: "/staff/customer-health/",
          type: "Job Follow-Ups",
          source: "Suggested Task",
        });
      });

      const appointments = window.StaffRecords.getVisibleAppointments(actor).filter((item) => item.status === "scheduled");
      appointments.slice(0, 3).forEach((item) => {
        suggestions.push({
          id: uid("sug"),
          title: `Confirm appointment: ${item.clientName || "client"}`,
          description: "Confirm assignment and checklist readiness.",
          dueDate: item.scheduledStart || nowIso(),
          priority: "Medium",
          relatedPath: "/staff/appointments/",
          type: "Due Today",
          source: "Suggested Task",
        });
      });
    }

    const inventoryReminders = readStorage("staff_inventory_reminders_v1", []).filter((item) => item.status === "Open");
    inventoryReminders.slice(0, 3).forEach((item) => {
      suggestions.push({
        id: uid("sug"),
        title: `Review inventory alert: ${item.item}`,
        description: item.reason || "Inventory reminder requires review.",
        dueDate: item.dueDate || nowIso(),
        priority: item.priority || "Medium",
        relatedPath: "/staff/inventory/",
        type: "Inventory Tasks",
        source: "Suggested Task",
      });
    });

    if (window.StaffTraining) {
      const progress = window.StaffTraining.getProgressForUser(actor);
      if (!progress.complete) {
        suggestions.push({
          id: uid("sug"),
          title: "Complete monthly training",
          description: "Finish required modules and quiz to update training status.",
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          priority: "High",
          relatedPath: "/staff/training/",
          type: "Training Tasks",
          source: "Suggested Task",
        });
      }
    }

    return suggestions;
  }

  function monthlyUpdates() {
    return readStorage(STORAGE_KEYS.monthlyUpdates, []);
  }

  function saveMonthlyUpdates(items) {
    writeStorage(STORAGE_KEYS.monthlyUpdates, items);
  }

  function monthlyProgress() {
    return readStorage(STORAGE_KEYS.monthlyProgress, []);
  }

  function saveMonthlyProgress(items) {
    writeStorage(STORAGE_KEYS.monthlyProgress, items);
  }

  function renderTaskTab(root) {
    const actor = currentActor();
    let tasks = getAssistantTasks();
    let suggestions = deriveTaskSuggestions();

    function rerender() {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const end = start + 86400000;
      const dueToday = tasks.filter((t) => t.status !== "Completed" && new Date(t.dueDate || nowIso()).getTime() >= start && new Date(t.dueDate || nowIso()).getTime() < end);
      const upcoming = tasks.filter((t) => t.status !== "Completed" && new Date(t.dueDate || nowIso()).getTime() >= end);
      const overdue = tasks.filter((t) => t.status !== "Completed" && new Date(t.dueDate || nowIso()).getTime() < start);
      const completed = tasks.filter((t) => t.status === "Completed");

      root.innerHTML = `
        <section class="assistant-tab-panel">
          <div class="staff-kpi-grid staff-kpi-grid-4">
            <article class="staff-kpi-card"><p class="staff-kpi-label">Due Today</p><p class="staff-kpi-value">${dueToday.length}</p></article>
            <article class="staff-kpi-card"><p class="staff-kpi-label">Upcoming</p><p class="staff-kpi-value">${upcoming.length}</p></article>
            <article class="staff-kpi-card"><p class="staff-kpi-label">Overdue</p><p class="staff-kpi-value">${overdue.length}</p></article>
            <article class="staff-kpi-card"><p class="staff-kpi-label">Completed</p><p class="staff-kpi-value">${completed.length}</p></article>
          </div>
          <ul class="staff-detail-list">
            <li>Assigned by Manager: ${tasks.filter((t) => t.assignedByRole === "manager").length}</li>
            <li>Created by AI Suggestion: ${tasks.filter((t) => t.source === "Suggested Task").length}</li>
            <li>Training Tasks: ${tasks.filter((t) => t.type === "Training Tasks").length}</li>
            <li>Job Follow-Ups: ${tasks.filter((t) => t.type === "Job Follow-Ups").length}</li>
            <li>Inventory Tasks: ${tasks.filter((t) => t.type === "Inventory Tasks").length}</li>
          </ul>

          <h3 class="assistant-section-title">Suggested Tasks</h3>
          <div class="assistant-list-grid">
            ${
              suggestions.length
                ? suggestions
                    .map(
                      (item, idx) => `
                  <article class="assistant-item-card">
                    <h4>${escapeHtml(item.title)}</h4>
                    <p>${escapeHtml(item.description)}</p>
                    <p><strong>Due:</strong> ${formatDate(item.dueDate)}</p>
                    <span class="badge info">Suggested Task</span>
                    <div class="assistant-inline-actions">
                      <button type="button" class="staff-admin-cancel" data-approve-task="${idx}">Approve</button>
                      <button type="button" class="staff-admin-cancel" data-dismiss-task="${idx}">Dismiss</button>
                    </div>
                  </article>
                `
                    )
                    .join("")
                : '<div class="staff-empty-state small"><p>No suggested tasks are waiting for approval.</p></div>'
            }
          </div>

          <h3 class="assistant-section-title">Task List</h3>
          <div class="assistant-list-grid">
            ${
              tasks.length
                ? tasks
                    .map(
                      (task) => `
                  <article class="assistant-item-card">
                    <h4>${escapeHtml(task.title)}</h4>
                    <p>${escapeHtml(task.description || "")}</p>
                    <p><strong>Due:</strong> ${formatDate(task.dueDate)}</p>
                    <p><strong>Priority:</strong> ${escapeHtml(task.priority || "Medium")}</p>
                    <p><strong>Status:</strong> ${escapeHtml(task.status || "Open")}</p>
                    <p><strong>Assigned employee:</strong> ${escapeHtml(task.assignedEmployeeName || actor.name)}</p>
                    ${task.source === "Suggested Task" ? '<span class="badge info">Suggested Task</span>' : ""}
                    <div class="assistant-inline-actions">
                      <button type="button" class="staff-admin-cancel" data-task-complete="${task.id}">Mark Complete</button>
                      <button type="button" class="staff-admin-cancel" data-task-snooze="${task.id}">Snooze</button>
                      <button type="button" class="staff-admin-cancel" data-task-open="${task.id}">Open Related Record</button>
                    </div>
                  </article>
                `
                    )
                    .join("")
                : '<div class="staff-empty-state small"><p>No tasks are assigned yet.</p></div>'
            }
          </div>
        </section>
      `;

      root.querySelectorAll("[data-approve-task]").forEach((button) => {
        button.addEventListener("click", () => {
          const idx = Number(button.getAttribute("data-approve-task"));
          const item = suggestions[idx];
          if (!item) {
            return;
          }
          const nextTask = {
            id: uid("tsk"),
            title: item.title,
            description: item.description,
            dueDate: item.dueDate,
            priority: item.priority,
            relatedPath: item.relatedPath,
            type: item.type,
            status: "Open",
            source: "Suggested Task",
            assignedByRole: "ai",
            assignedEmployeeName: actor.name,
            assignedEmployeeEmail: actor.email,
            createdAt: nowIso(),
          };
          const stored = readStorage(STORAGE_KEYS.assistantTasks, []);
          stored.push(nextTask);
          saveAssistantTasks(stored);
          suggestions = suggestions.filter((_x, i) => i !== idx);
          tasks = getAssistantTasks();
          rerender();
        });
      });

      root.querySelectorAll("[data-dismiss-task]").forEach((button) => {
        button.addEventListener("click", () => {
          const idx = Number(button.getAttribute("data-dismiss-task"));
          suggestions = suggestions.filter((_x, i) => i !== idx);
          rerender();
        });
      });

      root.querySelectorAll("[data-task-complete]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-task-complete");
          const stored = readStorage(STORAGE_KEYS.assistantTasks, []).map((task) =>
            task.id === id ? { ...task, status: "Completed", completedAt: nowIso() } : task
          );
          saveAssistantTasks(stored);
          tasks = getAssistantTasks();
          rerender();
        });
      });

      root.querySelectorAll("[data-task-snooze]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-task-snooze");
          const stored = readStorage(STORAGE_KEYS.assistantTasks, []).map((task) => {
            if (task.id !== id) {
              return task;
            }
            const nextDate = new Date(task.dueDate || nowIso());
            nextDate.setDate(nextDate.getDate() + 1);
            return { ...task, dueDate: nextDate.toISOString(), status: "Open" };
          });
          saveAssistantTasks(stored);
          tasks = getAssistantTasks();
          rerender();
        });
      });

      root.querySelectorAll("[data-task-open]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-task-open");
          const task = readStorage(STORAGE_KEYS.assistantTasks, []).find((item) => item.id === id);
          if (!task?.relatedPath) {
            return;
          }
          try {
            sessionStorage.setItem("staff-scroll-top-on-load", "1");
          } catch (_err) {
            // Ignore.
          }
          window.location.assign(task.relatedPath);
        });
      });
    }

    rerender();
  }

  function renderMonthlyTrainingTab(root) {
    const actor = currentActor();
    const isNella = isNellaOwnerAdmin();
    let updates = monthlyUpdates();
    let progress = monthlyProgress();

    function employeeProgress(updateId, email) {
      return progress.find((row) => row.updateId === updateId && row.email === email) || null;
    }

    function rerender() {
      root.innerHTML = `
        <section class="assistant-tab-panel">
          ${
            isNella
              ? `
              <h3 class="assistant-section-title">Create Monthly Training Update</h3>
              <form class="assistant-form-grid" data-create-update>
                <label>Title<input name="title" required /></label>
                <label>Due date<input type="date" name="dueDate" required /></label>
                <label>Required employees (comma-separated emails)<input name="requiredEmployees" placeholder="employee@example.com" /></label>
                <label>Guide<textarea name="guide" rows="2" required></textarea></label>
                <label>Quiz question<textarea name="quiz" rows="2"></textarea></label>
                <button type="submit" class="staff-button">Publish Update</button>
              </form>
            `
              : ""
          }

          <h3 class="assistant-section-title">New Training Update</h3>
          <div class="assistant-list-grid">
            ${
              updates.length
                ? updates
                    .map((update) => {
                      const myProgress = employeeProgress(update.id, actor.email);
                      return `
                        <article class="assistant-item-card">
                          <h4>${escapeHtml(update.title)}</h4>
                          <p>${escapeHtml(update.guide)}</p>
                          <p><strong>Due date:</strong> ${formatDate(update.dueDate)}</p>
                          <p><strong>Progress:</strong> ${myProgress?.status || "Not Started"}</p>
                          <div class="assistant-inline-actions">
                            <button type="button" class="staff-admin-cancel" data-start-update="${update.id}">Start Training</button>
                            ${update.quiz ? `<button type="button" class="staff-admin-cancel" data-complete-quiz="${update.id}">Complete Quiz</button>` : ""}
                            ${isNella ? `<button type="button" class="staff-admin-cancel" data-send-reminder="${update.id}">Send Reminders</button>` : ""}
                          </div>
                        </article>
                      `;
                    })
                    .join("")
                : '<div class="staff-empty-state small"><p>No monthly training updates have been published.</p></div>'
            }
          </div>
        </section>
      `;

      root.querySelector("[data-create-update]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const update = {
          id: uid("upd"),
          title: String(formData.get("title") || "").trim(),
          dueDate: String(formData.get("dueDate") || ""),
          guide: String(formData.get("guide") || "").trim(),
          quiz: String(formData.get("quiz") || "").trim(),
          requiredEmployees: String(formData.get("requiredEmployees") || "")
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
          publishedBy: actor.email,
          createdAt: nowIso(),
        };

        updates.unshift(update);
        saveMonthlyUpdates(updates);
        await writeAuditLog("monthly_training_published", {
          targetTable: "monthly_training_updates",
          targetId: update.id,
          newValue: update,
        });
        rerender();
      });

      root.querySelectorAll("[data-start-update]").forEach((button) => {
        button.addEventListener("click", () => {
          const updateId = button.getAttribute("data-start-update");
          const existing = employeeProgress(updateId, actor.email);
          if (existing) {
            existing.status = "In Progress";
            existing.startedAt = existing.startedAt || nowIso();
          } else {
            progress.push({
              id: uid("prg"),
              updateId,
              email: actor.email,
              status: "In Progress",
              startedAt: nowIso(),
              completedAt: "",
            });
          }
          saveMonthlyProgress(progress);
          rerender();
        });
      });

      root.querySelectorAll("[data-complete-quiz]").forEach((button) => {
        button.addEventListener("click", () => {
          const updateId = button.getAttribute("data-complete-quiz");
          const existing = employeeProgress(updateId, actor.email);
          if (!existing) {
            progress.push({
              id: uid("prg"),
              updateId,
              email: actor.email,
              status: "Completed",
              startedAt: nowIso(),
              completedAt: nowIso(),
            });
          } else {
            existing.status = "Completed";
            existing.completedAt = nowIso();
          }
          saveMonthlyProgress(progress);
          rerender();
        });
      });

      root.querySelectorAll("[data-send-reminder]").forEach((button) => {
        button.addEventListener("click", async () => {
          const updateId = button.getAttribute("data-send-reminder");
          await writeAuditLog("monthly_training_reminder_sent", {
            targetTable: "monthly_training_updates",
            targetId: updateId,
            newValue: { reminderSentAt: nowIso() },
          });
          button.textContent = "Reminders Sent";
        });
      });
    }

    rerender();
  }

  function applyNellaManagementAction(proposal) {
    if (!proposal || !isNellaOwnerAdmin()) {
      return { ok: false, message: "Only Nella can approve management changes." };
    }

    if (proposal.action === "update_inventory_quantity") {
      const itemId = proposal.referenceId;
      const nextQty = Number(proposal.newValue);
      const items = readStorage("staff_inventory_items_v1", []);
      const target = items.find((item) => item.id === itemId);
      if (!target || !Number.isFinite(nextQty)) {
        return { ok: false, message: "Inventory update requires a valid item ID and quantity." };
      }
      target.quantityOnHand = Math.max(0, nextQty);
      target.updatedAt = nowIso();
      target.updatedBy = currentActor().email;
      writeStorage("staff_inventory_items_v1", items);
      return { ok: true, message: "Inventory quantity was updated." };
    }

    if (proposal.action === "create_reminder") {
      const reminders = readStorage("staff_reminders_v1", []);
      reminders.push({
        id: uid("rem"),
        clientId: proposal.referenceId || "",
        clientName: proposal.referenceLabel || "",
        reason: proposal.reason,
        dueDate: proposal.dueDate || nowIso(),
        priority: proposal.priority || "normal",
        assignedEmployeeName: proposal.assignedEmployeeName || currentActor().name,
        assignedEmployeeEmail: proposal.assignedEmployeeEmail || currentActor().email,
        status: "open",
        sourceType: "assistant",
        createdAt: nowIso(),
      });
      writeStorage("staff_reminders_v1", reminders);
      return { ok: true, message: "Reminder was created." };
    }

    if (proposal.action === "publish_monthly_training_update") {
      const updates = monthlyUpdates();
      updates.unshift({
        id: uid("upd"),
        title: proposal.referenceLabel || "Monthly Training Update",
        guide: proposal.newValue,
        dueDate: proposal.dueDate || nowIso(),
        quiz: proposal.quiz || "",
        requiredEmployees: proposal.requiredEmployees || [],
        createdAt: nowIso(),
        publishedBy: currentActor().email,
      });
      saveMonthlyUpdates(updates);
      return { ok: true, message: "Monthly training update was published." };
    }

    if (proposal.action === "create_internal_announcement") {
      const announcements = readStorage(STORAGE_KEYS.announcements, []);
      announcements.unshift({
        id: uid("ann"),
        title: proposal.referenceLabel || "Internal Announcement",
        message: proposal.newValue,
        createdAt: nowIso(),
        createdBy: currentActor().email,
      });
      writeStorage(STORAGE_KEYS.announcements, announcements);
      return { ok: true, message: "Internal announcement was created." };
    }

    return { ok: true, message: "Management proposal was approved and logged." };
  }

  function renderManagementTab(root) {
    let pendingProposal = null;

    function rerender() {
      root.innerHTML = `
        <section class="assistant-tab-panel">
          <h3 class="assistant-section-title">Nella Management Mode</h3>
          <form class="assistant-form-grid" data-management-form>
            <label>Action
              <select name="action">
                ${MANAGEMENT_ACTIONS.map((action) => `<option value="${action}">${action.replaceAll("_", " ")}</option>`).join("")}
              </select>
            </label>
            <label>Reference ID<input name="referenceId" placeholder="Item ID, client ID, appointment ID" /></label>
            <label>Reference Label<input name="referenceLabel" placeholder="Client name, item name, update title" /></label>
            <label>Current value<textarea name="currentValue" rows="2"></textarea></label>
            <label>New value<textarea name="newValue" rows="2" required></textarea></label>
            <label>Reason<textarea name="reason" rows="2" required></textarea></label>
            <button type="submit" class="staff-button">Propose Change</button>
          </form>

          ${
            pendingProposal
              ? `
                <article class="assistant-mutation">
                  <h4>Proposed ${escapeHtml(pendingProposal.action.replaceAll("_", " "))}</h4>
                  <p><strong>Current value:</strong> ${escapeHtml(pendingProposal.currentValue || "Not provided")}</p>
                  <p><strong>New value:</strong> ${escapeHtml(pendingProposal.newValue || "Not provided")}</p>
                  <p><strong>Reason:</strong> ${escapeHtml(pendingProposal.reason || "Not provided")}</p>
                  <div class="assistant-inline-actions">
                    <button type="button" class="staff-admin-cancel" data-approve-proposal>Approve Change</button>
                    <button type="button" class="staff-admin-cancel" data-edit-proposal>Edit</button>
                    <button type="button" class="staff-admin-cancel" data-cancel-proposal>Cancel</button>
                  </div>
                </article>
              `
              : '<div class="staff-empty-state small"><p>No management proposal is waiting for approval.</p></div>'
          }
          <p class="staff-message" data-management-status></p>
        </section>
      `;

      root.querySelector("[data-management-form]")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        pendingProposal = {
          action: String(formData.get("action") || ""),
          referenceId: String(formData.get("referenceId") || "").trim(),
          referenceLabel: String(formData.get("referenceLabel") || "").trim(),
          currentValue: String(formData.get("currentValue") || "").trim(),
          newValue: String(formData.get("newValue") || "").trim(),
          reason: String(formData.get("reason") || "").trim(),
          dueDate: "",
          priority: "normal",
        };
        await writeAuditLog("assistant_management_proposed", {
          targetTable: "assistant_management",
          targetId: pendingProposal.referenceId,
          newValue: pendingProposal,
        });
        rerender();
      });

      root.querySelector("[data-cancel-proposal]")?.addEventListener("click", async () => {
        await writeAuditLog("assistant_management_cancelled", {
          targetTable: "assistant_management",
          targetId: pendingProposal?.referenceId || "",
          newValue: pendingProposal || {},
        });
        pendingProposal = null;
        rerender();
      });

      root.querySelector("[data-edit-proposal]")?.addEventListener("click", () => {
        const form = root.querySelector("[data-management-form]");
        if (!form || !pendingProposal) {
          return;
        }
        form.querySelector("[name='action']").value = pendingProposal.action;
        form.querySelector("[name='referenceId']").value = pendingProposal.referenceId;
        form.querySelector("[name='referenceLabel']").value = pendingProposal.referenceLabel;
        form.querySelector("[name='currentValue']").value = pendingProposal.currentValue;
        form.querySelector("[name='newValue']").value = pendingProposal.newValue;
        form.querySelector("[name='reason']").value = pendingProposal.reason;
      });

      root.querySelector("[data-approve-proposal]")?.addEventListener("click", async () => {
        if (!pendingProposal) {
          return;
        }
        await writeAuditLog("assistant_management_approved", {
          targetTable: "assistant_management",
          targetId: pendingProposal.referenceId,
          previousValue: { currentValue: pendingProposal.currentValue },
          newValue: pendingProposal,
        });

        const result = applyNellaManagementAction(pendingProposal);
        await writeAuditLog(result.ok ? "assistant_management_applied" : "assistant_management_failed", {
          targetTable: "assistant_management",
          targetId: pendingProposal.referenceId,
          newValue: { result },
        });

        const status = root.querySelector("[data-management-status]");
        if (status) {
          status.textContent = result.message;
        }
        pendingProposal = null;
        rerender();
      });
    }

    rerender();
  }

  function mountAssistant() {
    if (!canRenderAssistant()) {
      return;
    }

    if (document.querySelector("[data-scrub-assistant-root]")) {
      return;
    }

    const actor = currentActor();
    const isNella = isNellaOwnerAdmin();

    const root = document.createElement("div");
    root.className = "scrub-assistant-root";
    root.setAttribute("data-scrub-assistant-root", "true");
    root.innerHTML = `
      <button type="button" class="scrub-assistant-toggle" aria-expanded="false" data-assistant-toggle>Scrub Assistant</button>
      <section class="scrub-assistant-panel" hidden data-assistant-panel>
        <header class="scrub-assistant-head">
          <div>
            <h2>Scrub Assistant</h2>
            <p>Use real saved staff data only.</p>
          </div>
          <div class="scrub-assistant-head-meta">
            <span class="assistant-scope-indicator" data-assistant-scope></span>
            <button type="button" data-assistant-close aria-label="Close assistant">Close</button>
          </div>
        </header>

        <nav class="assistant-tab-nav">
          <button type="button" class="assistant-tab active" data-tab="assistant">Assistant</button>
          <button type="button" class="assistant-tab" data-tab="tasks">My Tasks</button>
          <button type="button" class="assistant-tab" data-tab="monthly">Monthly Training Update</button>
          ${isNella ? '<button type="button" class="assistant-tab" data-tab="management">Nella Management</button>' : ""}
        </nav>

        <section class="assistant-tab-content" data-tab-content="assistant">
          <div class="scrub-assistant-body" data-assistant-body></div>
          <div class="scrub-assistant-prompts" data-assistant-prompts></div>
          <form class="scrub-assistant-form" data-assistant-form>
            <textarea data-assistant-input rows="2" placeholder="Ask Scrub Assistant..."></textarea>
            <button type="submit" class="staff-button">Send</button>
          </form>
        </section>

        <section class="assistant-tab-content" data-tab-content="tasks" hidden></section>
        <section class="assistant-tab-content" data-tab-content="monthly" hidden></section>
        ${isNella ? '<section class="assistant-tab-content" data-tab-content="management" hidden></section>' : ""}
      </section>
    `;

    document.body.appendChild(root);

    const panel = root.querySelector("[data-assistant-panel]");
    const toggle = root.querySelector("[data-assistant-toggle]");
    const closeBtn = root.querySelector("[data-assistant-close]");
    const stream = root.querySelector("[data-assistant-body]");
    const prompts = root.querySelector("[data-assistant-prompts]");
    const form = root.querySelector("[data-assistant-form]");
    const input = root.querySelector("[data-assistant-input]");
    const tabs = Array.from(root.querySelectorAll("[data-tab]"));
    const scope = root.querySelector("[data-assistant-scope]");

    let pending = false;
    let activeTab = "assistant";

    function updateScopeIndicator() {
      if (!scope) {
        return;
      }
      scope.textContent = permissionScopeLabel(actor, isNella, activeTab);
    }

    updateScopeIndicator();

    Object.keys(QUICK_TEMPLATES).forEach((key) => {
      const group = document.createElement("section");
      group.className = "assistant-template-group";
      group.innerHTML = `<h3 class="assistant-template-title">${escapeHtml(key.replaceAll("_", " "))}</h3>`;
      QUICK_TEMPLATES[key].forEach((template) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "assistant-prompt-chip";
        chip.textContent = template;
        chip.addEventListener("click", () => {
          input.value = template;
          input.focus();
        });
        group.appendChild(chip);
      });
      prompts.appendChild(group);
    });

    const connected = isSecureAIConnected();
    if (!connected) {
      addMessage(stream, "assistant", "Scrub Assistant will become available after the secure AI service is connected.");
      input.disabled = true;
      form.querySelector("button[type='submit']")?.setAttribute("disabled", "true");
    } else {
      addMessage(stream, "assistant", "Ask for summaries, reminders, or proposed updates based on real records.");
    }

    async function handleUserMessage(text) {
      if (!text || pending || !connected) {
        return;
      }
      pending = true;
      addMessage(stream, "user", text);

      const payload = {
        mode: "analyze",
        message: text,
        scope: {
          role: actor.role,
          email: actor.email,
          page: window.location.pathname,
        },
      };

      const result = await sendSecureRequest(payload);
      addMessage(stream, "assistant", result.reply || "No response received.");

      if (result.proposedMutation) {
        const canApply = isNella;
        const proposal = result.proposedMutation;
        const card = document.createElement("article");
        card.className = "assistant-mutation";
        card.innerHTML = `
          <h4>Proposed Action</h4>
          <p><strong>Action:</strong> ${escapeHtml(proposal.summary || "Record update")}</p>
          <p><strong>Current value:</strong> ${escapeHtml(JSON.stringify(proposal.currentValue || {}))}</p>
          <p><strong>Proposed new value:</strong> ${escapeHtml(JSON.stringify(proposal.newValue || {}))}</p>
          <p><strong>Reason:</strong> ${escapeHtml(proposal.reason || "AI requested update")}</p>
          <div class="assistant-inline-actions">
            <button type="button" class="staff-admin-cancel" data-approve-ai ${canApply ? "" : "disabled"}>Approve Change</button>
            <button type="button" class="staff-admin-cancel" data-edit-ai>Edit</button>
            <button type="button" class="staff-admin-cancel" data-cancel-ai>Cancel</button>
          </div>
          ${canApply ? "" : "<p class='assistant-mutation-note'>Regular employees and managers can review suggestions. Only Nella can apply assistant changes.</p>"}
        `;
        stream.appendChild(card);
        stream.scrollTop = stream.scrollHeight;

        card.querySelector("[data-cancel-ai]").addEventListener("click", async () => {
          await writeAuditLog("assistant_proposal_cancelled", {
            targetTable: proposal.targetTable || "assistant",
            targetId: proposal.targetId || "",
            newValue: proposal,
          });
          card.remove();
        });

        card.querySelector("[data-edit-ai]").addEventListener("click", () => {
          input.value = `Edit proposal: ${proposal.summary || ""}`;
          input.focus();
        });

        card.querySelector("[data-approve-ai]").addEventListener("click", async () => {
          if (!isNellaOwnerAdmin()) {
            addMessage(stream, "assistant", "Only Nella can approve assistant changes.");
            return;
          }

          await writeAuditLog("assistant_ai_change_approved", {
            targetTable: proposal.targetTable || "assistant",
            targetId: proposal.targetId || "",
            previousValue: proposal.currentValue || {},
            newValue: proposal.newValue || {},
          });

          const applyResult = await sendSecureRequest({
            mode: "apply",
            mutationToken: result.mutationToken,
            proposedMutation: proposal,
            scope: payload.scope,
          });

          await writeAuditLog(applyResult.ok ? "assistant_ai_change_applied" : "assistant_ai_change_failed", {
            targetTable: proposal.targetTable || "assistant",
            targetId: proposal.targetId || "",
            newValue: { reply: applyResult.reply || "" },
          });

          addMessage(stream, "assistant", applyResult.reply || "Apply request sent.");
          card.remove();
        });
      }

      pending = false;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) {
        return;
      }
      input.value = "";
      await handleUserMessage(text);
    });

    function showTab(tab) {
      activeTab = tab;
      tabs.forEach((button) => {
        button.classList.toggle("active", button.getAttribute("data-tab") === tab);
      });
      root.querySelectorAll("[data-tab-content]").forEach((section) => {
        section.hidden = section.getAttribute("data-tab-content") !== tab;
      });
      updateScopeIndicator();

      if (tab === "tasks") {
        renderTaskTab(root.querySelector('[data-tab-content="tasks"]'));
      }
      if (tab === "monthly") {
        renderMonthlyTrainingTab(root.querySelector('[data-tab-content="monthly"]'));
      }
      if (tab === "management" && isNella) {
        renderManagementTab(root.querySelector('[data-tab-content="management"]'));
      }
    }

    tabs.forEach((button) => {
      button.addEventListener("click", () => {
        showTab(button.getAttribute("data-tab"));
      });
    });

    toggle.addEventListener("click", () => {
      const isHidden = panel.hidden;
      panel.hidden = !isHidden;
      toggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
      if (isHidden) {
        input.focus();
      }
    });

    closeBtn.addEventListener("click", () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  window.StaffAssistant = {
    init() {
      mountAssistant();
    },
  };
})();
