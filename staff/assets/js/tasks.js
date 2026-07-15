(function () {
  const STORAGE_KEYS = {
    tasks: "staff_tasks_v1",
  };

  function nowIso() {
    return new Date().toISOString();
  }

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

  function currentSession() {
    return {
      role: document.body.dataset.currentRole || "employee",
      email: (document.body.dataset.currentEmail || "").toLowerCase(),
      name: document.body.dataset.currentName || "Staff",
    };
  }

  function formatDate(value) {
    if (!value) {
      return "Not set";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not set";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function taskPriority(task) {
    return task.priority || "Medium";
  }

  function allTasks() {
    return readStorage(STORAGE_KEYS.tasks, []);
  }

  function saveTasks(items) {
    writeStorage(STORAGE_KEYS.tasks, items);
  }

  function visibleTasks() {
    const session = currentSession();
    return allTasks()
      .filter((task) => {
        if (!task.assignedEmployeeEmail) {
          return true;
        }
        if (window.StaffAuth.canAccessRole(session.role, "manager")) {
          return true;
        }
        return task.assignedEmployeeEmail.toLowerCase() === session.email;
      })
      .sort((a, b) => new Date(a.dueDate || nowIso()).getTime() - new Date(b.dueDate || nowIso()).getTime());
  }

  function taskBuckets(tasks) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfToday = startOfToday + 86400000;

    const dueToday = [];
    const upcoming = [];
    const overdue = [];
    const completed = [];

    tasks.forEach((task) => {
      if (task.status === "Completed") {
        completed.push(task);
        return;
      }
      const dueAt = new Date(task.dueDate || nowIso()).getTime();
      if (dueAt < startOfToday) {
        overdue.push(task);
      } else if (dueAt >= startOfToday && dueAt < endOfToday) {
        dueToday.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { dueToday, upcoming, overdue, completed };
  }

  function deriveSuggestedTasks() {
    const session = currentSession();
    const suggestions = [];

    if (window.StaffTraining) {
      const progress = window.StaffTraining.getProgressForUser({
        role: session.role,
        email: session.email,
        name: session.name,
      });
      if (!progress.complete) {
        suggestions.push({
          title: "Complete monthly training",
          description: "Finish required training modules and quiz requirements.",
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          priority: "High",
          relatedType: "training",
          relatedPath: "/staff/training/",
          source: "Suggested Task",
          type: "Training Tasks",
        });
      }
    }

    if (window.StaffRecords) {
      const reminders = window.StaffRecords.getVisibleReminders(session).filter((item) => item.status === "open");
      reminders.slice(0, 5).forEach((reminder) => {
        suggestions.push({
          title: `Follow up with ${reminder.clientName || "client"}`,
          description: reminder.reason || "Follow up on saved reminder.",
          dueDate: reminder.dueDate || new Date(Date.now() + 2 * 86400000).toISOString(),
          priority: reminder.priority === "high" ? "High" : "Medium",
          relatedType: "client",
          relatedPath: "/staff/customer-health/",
          source: "Suggested Task",
          type: "Job Follow-Ups",
        });
      });

      const upcomingAppointments = window.StaffRecords
        .getVisibleAppointments(session)
        .filter((item) => item.status === "scheduled")
        .slice(0, 4);

      upcomingAppointments.forEach((appointment) => {
        suggestions.push({
          title: `Confirm appointment for ${appointment.clientName || "client"}`,
          description: "Review job details and confirm assignment readiness.",
          dueDate: appointment.scheduledStart || new Date(Date.now() + 86400000).toISOString(),
          priority: "Medium",
          relatedType: "appointment",
          relatedPath: "/staff/appointments/",
          source: "Suggested Task",
          type: "Due Today",
        });
      });
    }

    const inventoryReminders = readStorage("staff_inventory_reminders_v1", []).filter((item) => item.status === "Open");
    inventoryReminders.slice(0, 5).forEach((reminder) => {
      suggestions.push({
        title: `Review low stock item: ${reminder.item}`,
        description: reminder.reason || "Inventory reminder generated from saved stock status.",
        dueDate: reminder.dueDate || new Date(Date.now() + 2 * 86400000).toISOString(),
        priority: reminder.priority || "Medium",
        relatedType: "inventory",
        relatedPath: "/staff/inventory/",
        source: "Suggested Task",
        type: "Inventory Tasks",
      });
    });

    return suggestions;
  }

  function taskCard(task) {
    const sourceBadge = task.source === "Suggested Task" ? '<span class="badge info">Suggested Task</span>' : "";
    return `
      <article class="staff-reminder-card" data-task-id="${task.id}">
        <div class="staff-reminder-head">
          <h3>${task.title}</h3>
          <span class="badge ${taskPriority(task) === "High" ? "danger" : "warning"}">${taskPriority(task)}</span>
        </div>
        <p><strong>Description:</strong> ${task.description || "No description"}</p>
        <p><strong>Due date:</strong> ${formatDate(task.dueDate)}</p>
        <p><strong>Assigned employee:</strong> ${task.assignedEmployeeName || "Unassigned"}</p>
        <p><strong>Status:</strong> ${task.status || "Open"}</p>
        <p><strong>Type:</strong> ${task.type || "General"}</p>
        ${sourceBadge}
        <div class="staff-inline-actions">
          <button type="button" class="staff-admin-cancel" data-task-complete="${task.id}">Mark Complete</button>
          <button type="button" class="staff-admin-cancel" data-task-snooze="${task.id}">Snooze</button>
          <button type="button" class="staff-admin-cancel" data-task-open="${task.id}">Open Related Record</button>
        </div>
      </article>
    `;
  }

  function suggestionCard(suggestion, idx) {
    return `
      <article class="staff-reminder-card" data-task-suggestion="${idx}">
        <div class="staff-reminder-head">
          <h3>${suggestion.title}</h3>
          <span class="badge info">Suggested Task</span>
        </div>
        <p><strong>Description:</strong> ${suggestion.description}</p>
        <p><strong>Due date:</strong> ${formatDate(suggestion.dueDate)}</p>
        <p><strong>Priority:</strong> ${suggestion.priority}</p>
        <div class="staff-inline-actions">
          <button type="button" class="staff-admin-cancel" data-approve-task="${idx}">Approve</button>
          <button type="button" class="staff-admin-cancel" data-dismiss-task="${idx}">Dismiss</button>
        </div>
      </article>
    `;
  }

  function initMyTasks(rootSelector) {
    const root = document.querySelector(rootSelector || "[data-my-tasks-root]");
    if (!root) {
      return;
    }

    const session = currentSession();
    let suggestionState = deriveSuggestedTasks();

    function render() {
      const tasks = visibleTasks();
      const buckets = taskBuckets(tasks);
      const assignedByManager = tasks.filter((item) => item.assignedByRole === "manager").length;
      const byAI = tasks.filter((item) => item.source === "Suggested Task").length;
      const trainingTasks = tasks.filter((item) => item.type === "Training Tasks").length;
      const followUps = tasks.filter((item) => item.type === "Job Follow-Ups").length;
      const inventoryTasks = tasks.filter((item) => item.type === "Inventory Tasks").length;

      root.innerHTML = `
        <section class="staff-card staff-panel">
          <div class="staff-panel-head"><h2 class="staff-section-title">My Tasks</h2></div>
          <div class="staff-kpi-grid staff-kpi-grid-4">
            <article class="staff-kpi-card"><p class="staff-kpi-label">Due Today</p><p class="staff-kpi-value">${buckets.dueToday.length}</p></article>
            <article class="staff-kpi-card"><p class="staff-kpi-label">Upcoming</p><p class="staff-kpi-value">${buckets.upcoming.length}</p></article>
            <article class="staff-kpi-card"><p class="staff-kpi-label">Overdue</p><p class="staff-kpi-value">${buckets.overdue.length}</p></article>
            <article class="staff-kpi-card"><p class="staff-kpi-label">Completed</p><p class="staff-kpi-value">${buckets.completed.length}</p></article>
          </div>
          <ul class="staff-detail-list">
            <li>Assigned by Manager: ${assignedByManager}</li>
            <li>Created by AI Suggestion: ${byAI}</li>
            <li>Training Tasks: ${trainingTasks}</li>
            <li>Job Follow-Ups: ${followUps}</li>
            <li>Inventory Tasks: ${inventoryTasks}</li>
          </ul>
        </section>

        <section class="staff-card staff-panel">
          <div class="staff-panel-head"><h2 class="staff-section-title">Pending Suggested Tasks</h2></div>
          <div class="staff-grid staff-grid-3x" data-suggestion-list>
            ${suggestionState.length ? suggestionState.map(suggestionCard).join("") : '<div class="staff-empty-state small"><p>No suggested tasks are waiting for approval.</p></div>'}
          </div>
        </section>

        <section class="staff-card staff-panel" data-section-key="my-tasks-list">
          <div class="staff-panel-head"><h2 class="staff-section-title">Task List</h2></div>
          <div class="staff-grid staff-grid-3x" data-task-list>
            ${tasks.length ? tasks.map(taskCard).join("") : '<div class="staff-empty-state small"><p>No tasks are assigned yet.</p></div>'}
          </div>
        </section>
      `;

      root.querySelectorAll("[data-approve-task]").forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.getAttribute("data-approve-task"));
          const suggestion = suggestionState[index];
          if (!suggestion) {
            return;
          }
          const tasksNow = allTasks();
          tasksNow.push({
            id: `tsk_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
            title: suggestion.title,
            description: suggestion.description,
            dueDate: suggestion.dueDate,
            priority: suggestion.priority,
            relatedType: suggestion.relatedType,
            relatedPath: suggestion.relatedPath,
            relatedRef: suggestion.relatedRef || "",
            assignedEmployeeName: session.name,
            assignedEmployeeEmail: session.email,
            assignedByRole: "ai",
            source: "Suggested Task",
            status: "Open",
            type: suggestion.type,
            createdAt: nowIso(),
          });
          saveTasks(tasksNow);
          suggestionState = suggestionState.filter((_item, idx) => idx !== index);
          render();
          const taskList = root.querySelector("[data-section-key='my-tasks-list']");
          if (taskList && window.StaffPortal?.scrollToElement) {
            window.StaffPortal.scrollToElement(taskList);
          }
        });
      });

      root.querySelectorAll("[data-dismiss-task]").forEach((button) => {
        button.addEventListener("click", () => {
          const index = Number(button.getAttribute("data-dismiss-task"));
          suggestionState = suggestionState.filter((_item, idx) => idx !== index);
          render();
        });
      });

      root.querySelectorAll("[data-task-complete]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-task-complete");
          const updated = allTasks().map((task) => (task.id === id ? { ...task, status: "Completed", completedAt: nowIso() } : task));
          saveTasks(updated);
          render();
        });
      });

      root.querySelectorAll("[data-task-snooze]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-task-snooze");
          const updated = allTasks().map((task) => {
            if (task.id !== id) {
              return task;
            }
            const nextDue = new Date(task.dueDate || nowIso());
            nextDue.setDate(nextDue.getDate() + 1);
            return { ...task, dueDate: nextDue.toISOString(), status: "Open" };
          });
          saveTasks(updated);
          render();
        });
      });

      root.querySelectorAll("[data-task-open]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-task-open");
          const task = allTasks().find((item) => item.id === id);
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

    render();
  }

  window.StaffTasks = {
    initMyTasks,
    allTasks,
    visibleTasks,
    deriveSuggestedTasks,
  };
})();
