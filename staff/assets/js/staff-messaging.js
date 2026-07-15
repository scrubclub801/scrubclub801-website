(function () {
  const CHANNELS = [
    { key: "all-staff", label: "All Staff", minRole: "trainee" },
    { key: "managers-only", label: "Managers and Admin", minRole: "manager" },
    { key: "team-leads", label: "Team Leads", minRole: "team_lead" },
    { key: "urgent-operations", label: "Urgent Operations", minRole: "employee" },
  ];

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function allowedChannels() {
    const role = document.body.dataset.currentRole || "guest";
    return CHANNELS.filter((channel) => window.StaffAuth.canAccessRole(role, channel.minRole));
  }

  function renderEmpty(root, text) {
    root.innerHTML = `<div class="staff-empty-state"><h3>No messages available.</h3><p>${text}</p></div>`;
  }

  async function renderChannel(root, channelKey) {
    if (!window.StaffDb?.isSupabaseConfigured()) {
      renderEmpty(root, "Connect the secure backend to load internal messages.");
      return;
    }

    const messages = await window.StaffDb.fetchChannelMessages(channelKey);
    const rows = messages
      .map(
        (message) => `
          <li>
            <strong>${message.sender_name || message.sender_email || "Staff"}</strong>
            <span>${formatDate(message.created_at)}</span>
            <p>${message.body || ""}</p>
          </li>
        `
      )
      .join("");

    root.innerHTML = `
      <ul class="staff-timeline-list">${rows || '<li><strong>No channel activity yet.</strong><span>Messages will appear after team posts.</span></li>'}</ul>
    `;
  }

  function setupSend(form, listRoot) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const currentChannel = form.querySelector("[name='channel']")?.value;
      const messageBody = form.querySelector("[name='message']")?.value?.trim();
      if (!currentChannel || !messageBody) {
        return;
      }

      try {
        await window.StaffDb.sendChannelMessage({
          channel_key: currentChannel,
          body: messageBody,
          sender_name: document.body.dataset.currentName || "Staff",
          sender_email: document.body.dataset.currentEmail || "",
          sender_role: document.body.dataset.currentRole || "employee",
        });
        form.reset();
        await renderChannel(listRoot, currentChannel);
      } catch (_err) {
        const status = form.querySelector("[data-message-status]");
        if (status) {
          status.textContent = "Message failed to send.";
        }
      }
    });
  }

  async function initMessagesPage() {
    const root = document.querySelector("[data-employee-messages-root]");
    if (!root) {
      return;
    }

    const channels = allowedChannels();
    const channelOptions = channels.map((channel) => `<option value="${channel.key}">${channel.label}</option>`).join("");

    root.innerHTML = `
      <div class="staff-layout-split">
        <article class="staff-card staff-panel">
          <h2 class="staff-section-title">Post Internal Message</h2>
          <form class="staff-form" data-message-form>
            <div class="staff-input-wrap">
              <span>Channel</span>
              <select name="channel">${channelOptions}</select>
            </div>
            <div class="staff-input-wrap">
              <span>Message</span>
              <textarea name="message" rows="4" placeholder="Share schedule changes, updates, or support requests."></textarea>
            </div>
            <button type="submit" class="staff-button">Send Message</button>
            <p class="staff-message" data-message-status></p>
          </form>
        </article>

        <article class="staff-card staff-panel">
          <h2 class="staff-section-title">Private Messaging Rules</h2>
          <ul class="staff-detail-list">
            <li>No customer personal data in broad channels.</li>
            <li>Escalate incident details in restricted channels only.</li>
            <li>Moderation and deletion actions are audit logged.</li>
          </ul>
        </article>
      </div>
      <article class="staff-card staff-panel">
        <h2 class="staff-section-title">Channel Feed</h2>
        <div data-message-list></div>
      </article>
    `;

    const form = root.querySelector("[data-message-form]");
    const listRoot = root.querySelector("[data-message-list]");

    if (!form || !listRoot) {
      return;
    }

    const initialChannel = form.querySelector("[name='channel']")?.value;
    if (initialChannel) {
      await renderChannel(listRoot, initialChannel);
    }

    form.querySelector("[name='channel']")?.addEventListener("change", async (event) => {
      await renderChannel(listRoot, event.target.value);
    });

    setupSend(form, listRoot);

    const channelSubscription = window.StaffDb?.subscribeToTable("staff_messages", async () => {
      const selected = form.querySelector("[name='channel']")?.value;
      if (selected) {
        await renderChannel(listRoot, selected);
      }
    });

    window.addEventListener("beforeunload", () => {
      channelSubscription?.unsubscribe?.();
    });
  }

  window.StaffMessaging = {
    initMessagesPage,
  };
})();
