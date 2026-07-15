(function () {
  function getSessionFromBody() {
    return {
      role: document.body.dataset.currentRole || "employee",
      email: document.body.dataset.currentEmail || "",
      name: document.body.dataset.currentName || "",
    };
  }

  function formatMoney(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function formatDate(value) {
    if (!value) {
      return "Not scheduled";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Not scheduled";
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function healthLabel(status) {
    const labels = {
      new: "New",
      active: "Active",
      recurring: "Recurring",
      follow_up_needed: "Follow-Up Needed",
      at_risk: "At Risk",
      inactive: "Inactive",
    };
    return labels[status] || "New";
  }

  function frequencyLabel(frequency) {
    const labels = {
      one_time: "One Time",
      weekly: "Weekly",
      biweekly: "Biweekly",
      monthly: "Monthly",
      custom: "Custom",
    };
    return labels[frequency] || "One Time";
  }

  function clientMetricSummary(clients, reminders) {
    const recurring = clients.filter((client) => client.serviceFrequency !== "one_time").length;
    const oneTime = clients.filter((client) => client.serviceFrequency === "one_time").length;
    const followUp = reminders.filter((item) => item.status === "open").length;
    return {
      total: clients.length,
      recurring,
      oneTime,
      followUp,
    };
  }

  function renderClientsPage(session) {
    const clients = window.StaffRecords.getVisibleClients(session);
    const reminders = window.StaffRecords.getVisibleReminders(session);
    const metrics = clientMetricSummary(clients, reminders);

    const root = document.querySelector("[data-ops-clients]");
    if (!root) {
      return;
    }

    root.innerHTML = `
      <div class="staff-kpi-grid staff-kpi-grid-4">
        <article class="staff-kpi-card"><p class="staff-kpi-label">Total Clients</p><p class="staff-kpi-value">${metrics.total}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Active Recurring Clients</p><p class="staff-kpi-value">${metrics.recurring}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">One-Time Clients</p><p class="staff-kpi-value">${metrics.oneTime}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Follow-Ups Needed</p><p class="staff-kpi-value">${metrics.followUp}</p></article>
      </div>

      <div class="staff-toolbar">
        <label class="staff-input-wrap"><span>Search</span><input type="search" data-client-search placeholder="Search clients" /></label>
        <label class="staff-input-wrap"><span>Service Frequency</span>
          <select data-client-frequency-filter>
            <option value="all">All Frequencies</option>
            <option value="one_time">One Time</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label class="staff-input-wrap"><span>Health</span>
          <select data-client-health-filter>
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="recurring">Recurring</option>
            <option value="follow_up_needed">Follow-Up Needed</option>
            <option value="at_risk">At Risk</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div class="staff-empty-state" data-client-empty-state ${clients.length ? "hidden" : ""}>
        <h3>No clients have been added yet.</h3>
        <p>Client records will appear here after a quote or appointment is saved.</p>
      </div>

      <div class="staff-table-shell" data-client-table-shell ${clients.length ? "" : "hidden"}>
        <div class="staff-table-wrap staff-table-wrap-desktop">
          <table class="staff-table" aria-label="Clients table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service Type</th>
                <th>Frequency</th>
                <th>Assigned Employee</th>
                <th>Last Service</th>
                <th>Next Service</th>
                <th>Total Paid</th>
                <th>Completed</th>
                <th>Health</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody data-client-table-body></tbody>
          </table>
        </div>
        <div class="staff-mobile-cards" data-client-mobile-cards></div>
      </div>

      <article class="staff-card staff-panel">
        <div class="staff-panel-head"><h2 class="staff-section-title">AI-Assisted Client Summary</h2></div>
        <div data-ai-summary-root></div>
      </article>

      <article class="staff-card staff-panel">
        <div class="staff-panel-head"><h2 class="staff-section-title">Appointment History</h2></div>
        <div data-client-timeline-root class="staff-empty-state small"><p>Select a client row to review the chronological service timeline.</p></div>
      </article>
    `;

    const state = {
      search: "",
      frequency: "all",
      health: "all",
      selectedClientId: "",
    };

    const tableBody = root.querySelector("[data-client-table-body]");
    const cardRoot = root.querySelector("[data-client-mobile-cards]");
    const tableShell = root.querySelector("[data-client-table-shell]");
    const emptyNode = root.querySelector("[data-client-empty-state]");
    const timelineRoot = root.querySelector("[data-client-timeline-root]");

    function filteredClients() {
      return clients.filter((client) => {
        const suggested = window.StaffRecords.deriveHealthSuggestion(client, {
          appointments: window.StaffRecords.getVisibleAppointments(session),
          notes: window.StaffRecords.getClientNotes(),
          reports: window.StaffRecords.getJobReports(),
          quotes: window.StaffRecords.getQuotes(),
        });
        const status = client.healthStatusOverride || suggested.status;
        const searchHit = !state.search || JSON.stringify(client).toLowerCase().includes(state.search.toLowerCase());
        const frequencyHit = state.frequency === "all" || client.serviceFrequency === state.frequency;
        const healthHit = state.health === "all" || status === state.health;
        return searchHit && frequencyHit && healthHit;
      });
    }

    function fullDetailsHtml(client) {
      return `
        <details>
          <summary>View details</summary>
          <ul class="staff-detail-list">
            <li><strong>Phone:</strong> ${client.phone || "Not provided"}</li>
            <li><strong>Email:</strong> ${client.email || "Not provided"}</li>
            <li><strong>Address:</strong> ${client.address || "Not provided"}</li>
            <li><strong>Internal notes:</strong> ${client.internalNotes || "None"}</li>
            <li><strong>Customer-facing notes:</strong> ${client.customerFacingNotes || "None"}</li>
            <li><strong>Pet or access instructions:</strong> ${client.petOrAccessInstructions || "None"}</li>
            <li><strong>Preferred products:</strong> ${client.preferredProducts || "None"}</li>
          </ul>
        </details>
      `;
    }

    function renderTimeline(clientId) {
      if (!clientId) {
        timelineRoot.innerHTML = "<p>Select a client row to review the chronological service timeline.</p>";
        return;
      }

      const timeline = window.StaffRecords.getClientTimeline(clientId);
      if (!timeline.length) {
        timelineRoot.innerHTML = "<p>Client timeline events will appear after quotes, appointments, reports, and payments are saved.</p>";
        return;
      }

      timelineRoot.innerHTML = `<ul class="staff-timeline-list">${timeline
        .map((item) => `<li><span>${item.type}</span><strong>${formatDate(item.when)}</strong></li>`)
        .join("")}</ul>`;
    }

    function renderAiSummary() {
      const node = root.querySelector("[data-ai-summary-root]");
      if (!node) {
        return;
      }

      if (!window.STAFF_PORTAL_CONFIG?.aiSummariesEnabled) {
        node.innerHTML = '<div class="staff-empty-state small"><p>AI summaries will appear after the secure data system is connected.</p></div>';
        return;
      }

      if (!state.selectedClientId) {
        node.innerHTML = '<div class="staff-empty-state small"><p>Select a client to view Suggested Summary and Suggested Follow-Up guidance.</p></div>';
        return;
      }

      const client = clients.find((item) => item.id === state.selectedClientId);
      if (!client) {
        node.innerHTML = '<div class="staff-empty-state small"><p>Select a client to view Suggested Summary and Suggested Follow-Up guidance.</p></div>';
        return;
      }

      const suggestions = [];
      if (!client.nextScheduledService) {
        suggestions.push("No next appointment is scheduled.");
      }
      if (client.serviceFrequency !== "one_time") {
        suggestions.push("Recurring service is configured and should be reviewed against upcoming appointments.");
      }
      if (client.petOrAccessInstructions) {
        suggestions.push("Customer has saved access or pet instructions for the next visit.");
      }

      node.innerHTML = `
        <ul class="staff-summary-list">
          <li><strong>Suggested Summary</strong><p>${suggestions[0] || "No summary signals are available from saved records yet."}</p></li>
          <li><strong>Suggested Follow-Up</strong><p>${suggestions[1] || "No follow-up actions are currently suggested from saved records."}</p></li>
        </ul>
      `;
    }

    function renderRows() {
      const visible = filteredClients();
      emptyNode.hidden = Boolean(visible.length);
      tableShell.hidden = !visible.length;

      if (!visible.length) {
        tableBody.innerHTML = "";
        cardRoot.innerHTML = "";
        renderTimeline("");
        renderAiSummary();
        return;
      }

      tableBody.innerHTML = visible
        .map((client) => {
          const health = client.healthStatusOverride || window.StaffRecords.deriveHealthSuggestion(client, {
            appointments: window.StaffRecords.getVisibleAppointments(session),
            notes: window.StaffRecords.getClientNotes(),
            reports: window.StaffRecords.getJobReports(),
            quotes: window.StaffRecords.getQuotes(),
          }).status;
          return `
            <tr data-client-row="${client.id}">
              <td><button type="button" class="staff-link-button" data-open-client-timeline="${client.id}">${client.name || "Unnamed Client"}</button>${fullDetailsHtml(client)}</td>
              <td>${client.serviceType || "Not set"}</td>
              <td>
                <select data-frequency-select="${client.id}">
                  <option value="one_time" ${client.serviceFrequency === "one_time" ? "selected" : ""}>One Time</option>
                  <option value="weekly" ${client.serviceFrequency === "weekly" ? "selected" : ""}>Weekly</option>
                  <option value="biweekly" ${client.serviceFrequency === "biweekly" ? "selected" : ""}>Biweekly</option>
                  <option value="monthly" ${client.serviceFrequency === "monthly" ? "selected" : ""}>Monthly</option>
                  <option value="custom" ${client.serviceFrequency === "custom" ? "selected" : ""}>Custom</option>
                </select>
              </td>
              <td>${client.assignedEmployeeName || "Unassigned"}</td>
              <td>${formatDate(client.lastServiceDate)}</td>
              <td>${formatDate(client.nextScheduledService)}</td>
              <td>${formatMoney(client.totalAmountPaid)}</td>
              <td>${client.completedServicesCount || 0}</td>
              <td><span class="badge">${healthLabel(health)}</span></td>
              <td>${client.accountStatus || "Active"}</td>
            </tr>
          `;
        })
        .join("");

      cardRoot.innerHTML = visible
        .map((client) => {
          const health = client.healthStatusOverride || window.StaffRecords.deriveHealthSuggestion(client, {
            appointments: window.StaffRecords.getVisibleAppointments(session),
            notes: window.StaffRecords.getClientNotes(),
            reports: window.StaffRecords.getJobReports(),
            quotes: window.StaffRecords.getQuotes(),
          }).status;
          return `
            <article class="staff-mobile-card">
              <div class="staff-mobile-card-head">
                <h3>${client.name || "Unnamed Client"}</h3>
                <span class="badge">${healthLabel(health)}</span>
              </div>
              <p>${client.serviceType || "Service type not set"}</p>
              <p><strong>Frequency:</strong> ${frequencyLabel(client.serviceFrequency)}</p>
              <p><strong>Assigned:</strong> ${client.assignedEmployeeName || "Unassigned"}</p>
              <p><strong>Next Service:</strong> ${formatDate(client.nextScheduledService)}</p>
              <details>
                <summary>More details</summary>
                <ul class="staff-detail-list">
                  <li><strong>Phone:</strong> ${client.phone || "Not provided"}</li>
                  <li><strong>Email:</strong> ${client.email || "Not provided"}</li>
                  <li><strong>Address:</strong> ${client.address || "Not provided"}</li>
                  <li><strong>Total paid:</strong> ${formatMoney(client.totalAmountPaid)}</li>
                  <li><strong>Completed services:</strong> ${client.completedServicesCount || 0}</li>
                  <li><strong>Internal notes:</strong> ${client.internalNotes || "None"}</li>
                  <li><strong>Customer-facing notes:</strong> ${client.customerFacingNotes || "None"}</li>
                  <li><strong>Pet or access instructions:</strong> ${client.petOrAccessInstructions || "None"}</li>
                  <li><strong>Preferred products:</strong> ${client.preferredProducts || "None"}</li>
                  <li><strong>Account status:</strong> ${client.accountStatus || "Active"}</li>
                </ul>
              </details>
              <button type="button" class="staff-admin-cancel" data-open-client-timeline="${client.id}">Open Client</button>
            </article>
          `;
        })
        .join("");

      root.querySelectorAll("[data-open-client-timeline]").forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedClientId = button.getAttribute("data-open-client-timeline") || "";
          renderTimeline(state.selectedClientId);
          renderAiSummary();
          const timelinePanel = root.querySelector("[data-client-timeline-root]");
          if (timelinePanel && window.StaffPortal?.scrollToElement) {
            window.StaffPortal.scrollToElement(timelinePanel);
          }
        });
      });

      root.querySelectorAll("[data-frequency-select]").forEach((select) => {
        select.addEventListener("change", () => {
          const clientId = select.getAttribute("data-frequency-select") || "";
          window.StaffRecords.updateClientFrequency(clientId, select.value, session);
        });
      });

      renderAiSummary();
    }

    root.querySelector("[data-client-search]").addEventListener("input", (event) => {
      state.search = event.target.value || "";
      renderRows();
    });

    root.querySelector("[data-client-frequency-filter]").addEventListener("change", (event) => {
      state.frequency = event.target.value || "all";
      renderRows();
    });

    root.querySelector("[data-client-health-filter]").addEventListener("change", (event) => {
      state.health = event.target.value || "all";
      renderRows();
    });

    renderRows();
  }

  function renderAppointmentsPage(session) {
    const appointments = window.StaffRecords.getVisibleAppointments(session);
    const root = document.querySelector("[data-ops-appointments]");
    if (!root) {
      return;
    }

    const recurring = appointments.filter((item) => item.recurringConfirmed).length;
    const unassigned = appointments.filter((item) => !item.assignedEmployeeName).length;
    const followUps = appointments.filter((item) => item.status === "follow_up_needed").length;

    root.innerHTML = `
      <div class="staff-kpi-grid staff-kpi-grid-4">
        <article class="staff-kpi-card"><p class="staff-kpi-label">Total Appointments</p><p class="staff-kpi-value">${appointments.length}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Confirmed Recurring</p><p class="staff-kpi-value">${recurring}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Follow-Up Needed</p><p class="staff-kpi-value">${followUps}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Unassigned</p><p class="staff-kpi-value">${unassigned}</p></article>
      </div>

      <div class="staff-empty-state" ${appointments.length ? "hidden" : ""}>
        <h3>No appointments have been scheduled yet.</h3>
        <p>Appointment records will appear after a quote is accepted or a service is booked.</p>
      </div>

      <div class="staff-table-shell" ${appointments.length ? "" : "hidden"}>
        <div class="staff-table-wrap staff-table-wrap-desktop">
          <table class="staff-table" aria-label="Appointments table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Service</th>
                <th>Frequency</th>
                <th>Assigned Employee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${appointments
                .map(
                  (item) => `
                <tr>
                  <td>${formatDate(item.scheduledStart)}</td>
                  <td>${item.clientName || "Unknown Client"}</td>
                  <td>${item.serviceType || "Not set"}</td>
                  <td>${frequencyLabel(item.serviceFrequency)}</td>
                  <td>${item.assignedEmployeeName || "Unassigned"}</td>
                  <td><span class="badge">${(item.status || "scheduled").replaceAll("_", " ")}</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="staff-mobile-cards">
          ${appointments
            .map(
              (item) => `
            <article class="staff-mobile-card">
              <div class="staff-mobile-card-head">
                <h3>${item.clientName || "Unknown Client"}</h3>
                <span class="badge">${(item.status || "scheduled").replaceAll("_", " ")}</span>
              </div>
              <p><strong>Date:</strong> ${formatDate(item.scheduledStart)}</p>
              <p><strong>Service:</strong> ${item.serviceType || "Not set"}</p>
              <p><strong>Frequency:</strong> ${frequencyLabel(item.serviceFrequency)}</p>
              <p><strong>Assigned:</strong> ${item.assignedEmployeeName || "Unassigned"}</p>
            </article>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderPaymentsPage(session) {
    const payments = window.StaffRecords.getVisiblePayments(session);
    const root = document.querySelector("[data-ops-payments]");
    if (!root) {
      return;
    }

    const completed = payments.filter((payment) => payment.paymentStatus === "paid");
    const totalCustomerPayments = completed.reduce((sum, payment) => sum + payment.amountCharged + payment.additionalFees, 0);
    const totalPayouts = completed.reduce((sum, payment) => sum + payment.employeePayout, 0);
    const totalTips = completed.reduce((sum, payment) => sum + payment.tips, 0);
    const avg = completed.length ? totalCustomerPayments / completed.length : 0;

    root.innerHTML = `
      <div class="staff-kpi-grid staff-kpi-grid-4">
        <article class="staff-kpi-card"><p class="staff-kpi-label">Customer Payments</p><p class="staff-kpi-value">${formatMoney(totalCustomerPayments)}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Employee Payouts</p><p class="staff-kpi-value">${formatMoney(totalPayouts)}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Tips</p><p class="staff-kpi-value">${formatMoney(totalTips)}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Average Job Value</p><p class="staff-kpi-value">${formatMoney(avg)}</p></article>
      </div>

      <div class="staff-empty-state" ${payments.length ? "hidden" : ""}>
        <h3>No payments recorded yet.</h3>
        <p>Payment records will appear after completed services are posted.</p>
      </div>

      <div class="staff-table-shell" ${payments.length ? "" : "hidden"}>
        <div class="staff-table-wrap staff-table-wrap-desktop">
          <table class="staff-table" aria-label="Payments table">
            <thead>
              <tr>
                <th>Service Date</th>
                <th>Client</th>
                <th>Service Type</th>
                <th>Customer Payment</th>
                <th>Employee Payout</th>
                <th>Tips</th>
                <th>Additional Fees</th>
                <th>Status</th>
                <th>Method</th>
                <th>Assigned Employee</th>
              </tr>
            </thead>
            <tbody>
              ${payments
                .map(
                  (payment) => `
                <tr>
                  <td>${formatDate(payment.serviceDate)}</td>
                  <td>${payment.clientName || "Unknown Client"}</td>
                  <td>${payment.serviceType || "Not set"}</td>
                  <td>${formatMoney(payment.amountCharged)}</td>
                  <td>${formatMoney(payment.employeePayout)}</td>
                  <td>${formatMoney(payment.tips)}</td>
                  <td>${formatMoney(payment.additionalFees)}</td>
                  <td><span class="badge">${(payment.paymentStatus || "pending").replaceAll("_", " ")}</span></td>
                  <td>${payment.paymentMethod || "Not recorded"}</td>
                  <td>${payment.assignedEmployeeName || "Unassigned"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="staff-mobile-cards">
          ${payments
            .map(
              (payment) => `
            <article class="staff-mobile-card">
              <div class="staff-mobile-card-head">
                <h3>${payment.clientName || "Unknown Client"}</h3>
                <span class="badge">${(payment.paymentStatus || "pending").replaceAll("_", " ")}</span>
              </div>
              <p><strong>Service Date:</strong> ${formatDate(payment.serviceDate)}</p>
              <p><strong>Customer Payment:</strong> ${formatMoney(payment.amountCharged)}</p>
              <p><strong>Employee Payout:</strong> ${formatMoney(payment.employeePayout)}</p>
              <p><strong>Tips:</strong> ${formatMoney(payment.tips)}</p>
              <p><strong>Additional Fees:</strong> ${formatMoney(payment.additionalFees)}</p>
              <p><strong>Method:</strong> ${payment.paymentMethod || "Not recorded"}</p>
            </article>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderCustomerHealthPage(session) {
    const clients = window.StaffRecords.getVisibleClients(session);
    const appointments = window.StaffRecords.getVisibleAppointments(session);
    const notes = window.StaffRecords.getClientNotes();
    const reports = window.StaffRecords.getJobReports();
    const quotes = window.StaffRecords.getQuotes();
    const reminders = window.StaffRecords.getVisibleReminders(session).filter((item) => item.status === "open");

    const root = document.querySelector("[data-ops-customer-health]");
    if (!root) {
      return;
    }

    const suggested = clients.map((client) => {
      const suggestion = window.StaffRecords.deriveHealthSuggestion(client, { appointments, notes, reports, quotes });
      return {
        client,
        suggestion,
        currentStatus: client.healthStatusOverride || suggestion.status,
      };
    });

    const counts = {
      new: 0,
      active: 0,
      recurring: 0,
      follow_up_needed: 0,
      at_risk: 0,
      inactive: 0,
    };

    suggested.forEach((item) => {
      counts[item.currentStatus] += 1;
    });

    root.innerHTML = `
      <div class="staff-kpi-grid staff-kpi-grid-4">
        <article class="staff-kpi-card"><p class="staff-kpi-label">New</p><p class="staff-kpi-value">${counts.new}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Active</p><p class="staff-kpi-value">${counts.active}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Recurring</p><p class="staff-kpi-value">${counts.recurring}</p></article>
        <article class="staff-kpi-card"><p class="staff-kpi-label">Follow-Up Needed</p><p class="staff-kpi-value">${counts.follow_up_needed}</p></article>
      </div>

      <article class="staff-card staff-panel">
        <div class="staff-panel-head"><h2 class="staff-section-title">Health Rules</h2></div>
        <ul class="staff-detail-list">
          <li><strong>New:</strong> The client has not completed their first service.</li>
          <li><strong>Active:</strong> Recent completed service exists with no unresolved issues.</li>
          <li><strong>Recurring:</strong> A recurring schedule is confirmed from saved appointment records.</li>
          <li><strong>Follow-Up Needed:</strong> A note, quote, or report has unresolved action.</li>
          <li><strong>At Risk:</strong> Multiple missed or canceled appointments were recorded.</li>
          <li><strong>Inactive:</strong> No completed or scheduled service exists in the configured period.</li>
        </ul>
      </article>

      <div class="staff-empty-state" ${suggested.length ? "hidden" : ""}>
        <h3>No clients have been added yet.</h3>
        <p>Customer health records will appear after a quote or appointment is saved.</p>
      </div>

      <div class="staff-table-shell" ${suggested.length ? "" : "hidden"}>
        <div class="staff-table-wrap staff-table-wrap-desktop">
          <table class="staff-table" aria-label="Customer health table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Suggested Status</th>
                <th>Reason</th>
                <th>Current Status</th>
                <th>Manager Override</th>
              </tr>
            </thead>
            <tbody>
              ${suggested
                .map(
                  (item) => `
                <tr>
                  <td>${item.client.name || "Unnamed Client"}</td>
                  <td><span class="badge">${healthLabel(item.suggestion.status)}</span></td>
                  <td>${item.suggestion.reason}</td>
                  <td><span class="badge">${healthLabel(item.currentStatus)}</span></td>
                  <td>
                    <select data-health-override="${item.client.id}" ${session.role === "manager" ? "" : "disabled"}>
                      <option value="new" ${item.currentStatus === "new" ? "selected" : ""}>New</option>
                      <option value="active" ${item.currentStatus === "active" ? "selected" : ""}>Active</option>
                      <option value="recurring" ${item.currentStatus === "recurring" ? "selected" : ""}>Recurring</option>
                      <option value="follow_up_needed" ${item.currentStatus === "follow_up_needed" ? "selected" : ""}>Follow-Up Needed</option>
                      <option value="at_risk" ${item.currentStatus === "at_risk" ? "selected" : ""}>At Risk</option>
                      <option value="inactive" ${item.currentStatus === "inactive" ? "selected" : ""}>Inactive</option>
                    </select>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="staff-mobile-cards">
          ${suggested
            .map(
              (item) => `
            <article class="staff-mobile-card">
              <div class="staff-mobile-card-head">
                <h3>${item.client.name || "Unnamed Client"}</h3>
                <span class="badge">${healthLabel(item.currentStatus)}</span>
              </div>
              <p><strong>Suggested:</strong> ${healthLabel(item.suggestion.status)}</p>
              <p>${item.suggestion.reason}</p>
              <label class="staff-input-wrap"><span>Manager Override</span>
                <select data-health-override="${item.client.id}" ${session.role === "manager" ? "" : "disabled"}>
                  <option value="new" ${item.currentStatus === "new" ? "selected" : ""}>New</option>
                  <option value="active" ${item.currentStatus === "active" ? "selected" : ""}>Active</option>
                  <option value="recurring" ${item.currentStatus === "recurring" ? "selected" : ""}>Recurring</option>
                  <option value="follow_up_needed" ${item.currentStatus === "follow_up_needed" ? "selected" : ""}>Follow-Up Needed</option>
                  <option value="at_risk" ${item.currentStatus === "at_risk" ? "selected" : ""}>At Risk</option>
                  <option value="inactive" ${item.currentStatus === "inactive" ? "selected" : ""}>Inactive</option>
                </select>
              </label>
            </article>
          `
            )
            .join("")}
        </div>
      </div>

      <article class="staff-card staff-panel">
        <div class="staff-panel-head"><h2 class="staff-section-title">Automatic Reminders</h2></div>
        <div data-reminders-root></div>
      </article>
    `;

    const remindersRoot = root.querySelector("[data-reminders-root]");
    if (!reminders.length) {
      remindersRoot.innerHTML = '<div class="staff-empty-state small"><p>No reminders are currently active.</p></div>';
    } else {
      remindersRoot.innerHTML = reminders
        .map(
          (reminder) => `
        <article class="staff-reminder-card" data-reminder-card="${reminder.id}">
          <div class="staff-reminder-head">
            <h3>${reminder.clientName || "Client"}</h3>
            <span class="badge ${reminder.priority === "high" ? "warning" : ""}">${reminder.priority || "normal"}</span>
          </div>
          <p><strong>Reason:</strong> ${reminder.reason}</p>
          <p><strong>Due Date:</strong> ${formatDate(reminder.dueDate)}</p>
          <p><strong>Assigned Employee:</strong> ${reminder.assignedEmployeeName || "Unassigned"}</p>
          <div class="staff-inline-actions">
            <button class="staff-admin-cancel" type="button" data-reminder-complete="${reminder.id}">Mark Complete</button>
            <button class="staff-admin-cancel" type="button" data-reminder-snooze="${reminder.id}">Snooze</button>
            <a class="staff-admin-cancel" href="/staff/customers/?client=${encodeURIComponent(reminder.clientId || "")}">Open Client</a>
          </div>
        </article>
      `
        )
        .join("");

      root.querySelectorAll("[data-reminder-complete]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-reminder-complete") || "";
          window.StaffRecords.updateReminderStatus(id, "completed");
          renderCustomerHealthPage(session);
        });
      });

      root.querySelectorAll("[data-reminder-snooze]").forEach((button) => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-reminder-snooze") || "";
          window.StaffRecords.snoozeReminder(id, 1);
          renderCustomerHealthPage(session);
        });
      });
    }

    root.querySelectorAll("[data-health-override]").forEach((select) => {
      select.addEventListener("change", () => {
        if (session.role !== "manager") {
          return;
        }
        const clientId = select.getAttribute("data-health-override") || "";
        window.StaffRecords.updateClientHealthOverride(clientId, select.value);
      });
    });
  }

  function initPage() {
    const session = getSessionFromBody();
    const area = document.body.dataset.portalArea || "";

    if (area === "clients") {
      renderClientsPage(session);
      return;
    }

    if (area === "appointments") {
      renderAppointmentsPage(session);
      return;
    }

    if (area === "payments") {
      renderPaymentsPage(session);
      return;
    }

    if (area === "customer-health") {
      renderCustomerHealthPage(session);
    }
  }

  window.StaffOperations = {
    initPage,
  };
})();
