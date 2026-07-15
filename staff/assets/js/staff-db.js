(function () {
  function isSupabaseConfigured() {
    const cfg = window.STAFF_PORTAL_CONFIG || {};
    return cfg.authProvider === "supabase" && Boolean(cfg.supabase?.url) && Boolean(cfg.supabase?.anonKey);
  }

  async function getClient() {
    if (!isSupabaseConfigured() || !window.StaffAuth?.getSupabaseClient) {
      return null;
    }
    try {
      return await window.StaffAuth.getSupabaseClient();
    } catch (_err) {
      return null;
    }
  }

  async function readMany(table, options) {
    const client = await getClient();
    if (!client) {
      return [];
    }

    let query = client.from(table).select(options?.select || "*");

    (options?.filters || []).forEach((filter) => {
      if (filter.op === "eq") {
        query = query.eq(filter.field, filter.value);
      }
      if (filter.op === "in") {
        query = query.in(filter.field, filter.value);
      }
      if (filter.op === "ilike") {
        query = query.ilike(filter.field, filter.value);
      }
      if (filter.op === "gte") {
        query = query.gte(filter.field, filter.value);
      }
      if (filter.op === "lte") {
        query = query.lte(filter.field, filter.value);
      }
      if (filter.op === "is") {
        query = query.is(filter.field, filter.value);
      }
    });

    if (options?.orderBy?.field) {
      query = query.order(options.orderBy.field, { ascending: Boolean(options.orderBy.ascending) });
    }

    if (typeof options?.limit === "number") {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  async function createOne(table, values) {
    const client = await getClient();
    if (!client) {
      throw new Error("Secure data service is not connected.");
    }
    const { data, error } = await client.from(table).insert(values).select("*").single();
    if (error) {
      throw error;
    }
    return data;
  }

  async function updateMany(table, values, filters) {
    const client = await getClient();
    if (!client) {
      throw new Error("Secure data service is not connected.");
    }

    let query = client.from(table).update(values);
    (filters || []).forEach((filter) => {
      if (filter.op === "eq") {
        query = query.eq(filter.field, filter.value);
      }
    });

    const { error } = await query;
    if (error) {
      throw error;
    }
  }

  async function callSecureAction(action, payload) {
    const client = await getClient();
    if (!client) {
      throw new Error("Secure data service is not connected.");
    }

    const { data, error } = await client.functions.invoke(action, {
      body: payload || {},
    });

    if (error) {
      throw error;
    }
    return data;
  }

  async function fetchEmployees(filters) {
    const queryFilters = [];
    if (filters?.status === "active") {
      queryFilters.push({ op: "eq", field: "account_status", value: "active" });
    }
    if (filters?.status === "disabled") {
      queryFilters.push({ op: "eq", field: "account_status", value: "disabled" });
    }
    if (filters?.search) {
      queryFilters.push({ op: "ilike", field: "full_name", value: `%${filters.search}%` });
    }

    return readMany("employee_profiles", {
      select: "id, full_name, email, role, account_status, last_login_at, training_progress, assigned_jobs_count, hours_worked, performance_summary",
      filters: queryFilters,
      orderBy: { field: "full_name", ascending: true },
    });
  }

  async function fetchAuditLogs() {
    return readMany("audit_logs", {
      select: "id, actor_name, actor_email, action, target_table, target_id, previous_value, new_value, created_at",
      orderBy: { field: "created_at", ascending: false },
      limit: 500,
    });
  }

  async function fetchChannelMessages(channelKey) {
    return readMany("staff_messages", {
      select: "id, channel_key, sender_name, sender_role, sender_email, body, parent_message_id, reactions, created_at",
      filters: [{ op: "eq", field: "channel_key", value: channelKey }],
      orderBy: { field: "created_at", ascending: true },
      limit: 300,
    });
  }

  async function sendChannelMessage(payload) {
    return createOne("staff_messages", payload);
  }

  async function fetchMonthlyTrainingUpdates() {
    return readMany("monthly_training_updates", {
      select: "id, title, summary, content, quiz_required, required_score, published_at, due_at, status",
      orderBy: { field: "published_at", ascending: false },
      limit: 24,
    });
  }

  async function fetchTrainingCompletions() {
    return readMany("training_update_completions", {
      select: "id, update_id, employee_id, acknowledged_at, quiz_score, completed_at, overdue",
      orderBy: { field: "completed_at", ascending: false },
      limit: 500,
    });
  }

  async function recordTrainingCompletion(payload) {
    return createOne("training_update_completions", payload);
  }

  async function fetchAnnouncements() {
    return readMany("staff_announcements", {
      select: "id, title, message, category, privacy_level, created_at, created_by_name",
      orderBy: { field: "created_at", ascending: false },
      limit: 100,
    });
  }

  function subscribeToTable(table, callback) {
    if (!window.supabase || !window.StaffAuth?.getSupabaseClient) {
      return null;
    }

    let subscription = null;
    window.StaffAuth.getSupabaseClient().then((client) => {
      if (!client) {
        return;
      }

      subscription = client
        .channel(`staff-${table}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          callback(payload);
        })
        .subscribe();
    });

    return {
      unsubscribe() {
        if (subscription) {
          window.supabase.removeChannel(subscription);
        }
      },
    };
  }

  window.StaffDb = {
    isSupabaseConfigured,
    getClient,
    readMany,
    createOne,
    updateMany,
    callSecureAction,
    fetchEmployees,
    fetchAuditLogs,
    fetchChannelMessages,
    sendChannelMessage,
    fetchMonthlyTrainingUpdates,
    fetchTrainingCompletions,
    recordTrainingCompletion,
    fetchAnnouncements,
    subscribeToTable,
  };
})();
