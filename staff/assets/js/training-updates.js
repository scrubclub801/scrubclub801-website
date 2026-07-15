(function () {
  function formatDate(value) {
    if (!value) {
      return "Not scheduled";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not scheduled";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function canManageUpdates() {
    return window.StaffAuth.canAccessRole(document.body.dataset.currentRole || "guest", "manager");
  }

  function renderUpdate(update, completedMap) {
    const completion = completedMap[update.id];
    const completedLabel = completion ? `Completed ${formatDate(completion.completed_at)}` : "Not completed";

    return `
      <article class="staff-card">
        <h3>${update.title || "Untitled update"}</h3>
        <p>${update.summary || ""}</p>
        <ul class="staff-detail-list">
          <li>Published: ${formatDate(update.published_at)}</li>
          <li>Due: ${formatDate(update.due_at)}</li>
          <li>Status: ${update.status || "draft"}</li>
          <li>Your completion: ${completedLabel}</li>
        </ul>
        <div class="staff-inline-actions">
          <button class="staff-button" type="button" data-update-acknowledge="${update.id}">Acknowledge</button>
          ${update.quiz_required ? `<button class="staff-admin-cancel" type="button" data-update-quiz="${update.id}">Open Quiz</button>` : ""}
        </div>
      </article>
    `;
  }

  async function loadTrainingUpdates() {
    const root = document.querySelector("[data-monthly-training-root]");
    if (!root) {
      return;
    }

    if (!window.StaffDb?.isSupabaseConfigured()) {
      root.innerHTML = '<div class="staff-empty-state"><h3>No secure training backend connected.</h3><p>Connect Supabase and publish monthly updates to show compliance tasks.</p></div>';
      return;
    }

    const [updates, completions] = await Promise.all([
      window.StaffDb.fetchMonthlyTrainingUpdates(),
      window.StaffDb.fetchTrainingCompletions(),
    ]);

    if (!updates.length) {
      root.innerHTML = '<div class="staff-empty-state"><h3>No monthly updates yet.</h3><p>Managers can publish a new training update from the admin panel.</p></div>';
      return;
    }

    const currentEmail = (document.body.dataset.currentEmail || "").toLowerCase();
    const ownedCompletions = completions.filter((row) => (row.employee_id || "").toLowerCase() === currentEmail);
    const completedMap = Object.fromEntries(ownedCompletions.map((row) => [row.update_id, row]));

    root.innerHTML = `
      <div class="staff-grid staff-grid-3x">
        ${updates.map((update) => renderUpdate(update, completedMap)).join("")}
      </div>
      ${
        canManageUpdates()
          ? '<div class="staff-empty-state small"><p>Managers can publish or update monthly content through secure backend actions only.</p></div>'
          : ''
      }
    `;

    root.querySelectorAll("[data-update-acknowledge]").forEach((button) => {
      button.addEventListener("click", async () => {
        const updateId = button.getAttribute("data-update-acknowledge");
        if (!updateId) {
          return;
        }
        try {
          await window.StaffDb.recordTrainingCompletion({
            update_id: updateId,
            employee_id: currentEmail,
            acknowledged_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            overdue: false,
          });
          await loadTrainingUpdates();
        } catch (_err) {
          button.textContent = "Failed";
        }
      });
    });

    root.querySelectorAll("[data-update-quiz]").forEach((button) => {
      button.addEventListener("click", () => {
        button.textContent = "Quiz opens from secure LMS";
      });
    });
  }

  window.StaffTrainingUpdates = {
    initTrainingUpdatesPage() {
      loadTrainingUpdates();
    },
  };
})();
