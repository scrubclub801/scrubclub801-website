(function () {
  const STAFF_BASE_PATH = "/staff/";
  const STAFF_DASHBOARD_PATH = "/staff/dashboard/";
  const LOCAL_SESSION_KEY = "staff_local_access_session_v1";
  const STAFF_ACCESS_ACCOUNTS = {
    nella_maglic: {
      id: "nella_maglic",
      name: "Nella Maglic",
      email: "nellamaglic@gmail.com",
      role: "admin",
      pin: "2008",
    },
    baylee_ellis: {
      id: "baylee_ellis",
      name: "Baylee Ellis",
      email: "baylee.ellis@local.staff",
      role: "manager",
      pin: "2007",
    },
  };

  const ROLE_ORDER = {
    guest: 0,
    trainee: 1,
    employee: 2,
    team_lead: 3,
    manager: 4,
    admin: 5,
    owner: 6,
  };

  let cachedSupabaseClient = null;

  function roleValue(role) {
    return ROLE_ORDER[role] || 0;
  }

  function canAccessRole(userRole, requiredRole) {
    return roleValue(userRole) >= roleValue(requiredRole || "employee");
  }

  function getBasePath() {
    return STAFF_BASE_PATH;
  }

  function loginPath() {
    return getBasePath();
  }

  function dashboardPath() {
    return STAFF_DASHBOARD_PATH;
  }

  function normalizeRole(rawRole) {
    const role = String(rawRole || "").toLowerCase();
    if (role in ROLE_ORDER) {
      return role;
    }
    if (role === "owner/admin" || role === "owner_admin") {
      return "admin";
    }
    return "guest";
  }

  function inferRoleFromUser(user, fallback) {
    const metadataRole = user?.user_metadata?.role || user?.app_metadata?.role || fallback || "guest";
    return normalizeRole(metadataRole);
  }

  function missingProviderError() {
    return new Error("Secure email login has not been connected yet. Use Staff Access for local testing or complete the Supabase setup.");
  }

  function secureEmailConnected() {
    const cfg = window.STAFF_PORTAL_CONFIG || {};
    return Boolean(cfg.authProvider === "supabase" && cfg.supabase?.url && cfg.supabase?.anonKey && window.supabase);
  }

  function setLocalSession(account) {
    const session = {
      provider: "local_staff_access",
      id: account.id,
      email: account.email,
      displayName: account.name,
      role: normalizeRole(account.role),
      issuedAt: Date.now(),
    };
    window.sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function getLocalSession() {
    try {
      const raw = window.sessionStorage.getItem(LOCAL_SESSION_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.email || !parsed?.role) {
        return null;
      }
      return {
        provider: "local_staff_access",
        email: parsed.email,
        displayName: parsed.displayName || "Staff",
        role: normalizeRole(parsed.role),
        issuedAt: parsed.issuedAt || Date.now(),
      };
    } catch (_err) {
      return null;
    }
  }

  function clearLocalSession() {
    try {
      window.sessionStorage.removeItem(LOCAL_SESSION_KEY);
    } catch (_err) {
      // Ignore.
    }
  }

  function supabaseAdapter(config) {
    if (!window.supabase || !config?.url || !config?.anonKey) {
      return null;
    }

    const client = cachedSupabaseClient || window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: config.persistSession !== false,
      },
    });
    cachedSupabaseClient = client;

    return {
      async signIn(email, password, remember) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        if (!remember) {
          window.sessionStorage.setItem("staff-temporary-session", "1");
        }

        return data.user;
      },

      async signOut() {
        await client.auth.signOut();
      },

      async getSession() {
        const { data, error } = await client.auth.getSession();
        if (error) {
          throw error;
        }

        const user = data.session?.user;
        if (!user) {
          return null;
        }

        return {
          user,
          email: user.email || "",
          role: inferRoleFromUser(user, window.STAFF_PORTAL_CONFIG?.defaultRole || "guest"),
          displayName: user.user_metadata?.full_name || user.user_metadata?.name || "",
          expiresAt: data.session.expires_at || null,
          provider: "supabase",
        };
      },

      onAuthChange(callback) {
        return client.auth.onAuthStateChange((_event, session) => {
          const user = session?.user;
          callback(
            user
              ? {
                  user,
                  email: user.email || "",
                  role: inferRoleFromUser(user, window.STAFF_PORTAL_CONFIG?.defaultRole || "guest"),
                  displayName: user.user_metadata?.full_name || user.user_metadata?.name || "",
                  expiresAt: session.expires_at || null,
                  provider: "supabase",
                }
              : null
          );
        });
      },

      async sendPasswordReset(email) {
        const { error } = await client.auth.resetPasswordForEmail(email);
        if (error) {
          throw error;
        }
      },
    };
  }

  function firebaseAdapter(config) {
    if (!window.firebase || !config?.apiKey) {
      return null;
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(config);
    }

    const auth = window.firebase.auth();

    return {
      async signIn(email, password, _remember) {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        return cred.user;
      },

      async signOut() {
        await auth.signOut();
      },

      async getSession() {
        const user = auth.currentUser;
        if (!user) {
          return null;
        }

        const token = await user.getIdTokenResult();
        const role = normalizeRole(token?.claims?.role || token?.claims?.staffRole || "employee");
        const fallbackRole = normalizeRole(window.STAFF_PORTAL_CONFIG?.defaultRole || "guest");

        return {
          user,
          email: user.email || "",
          role: role === "guest" ? fallbackRole : role,
          expiresAt: token?.expirationTime || null,
          provider: "firebase",
        };
      },

      onAuthChange(callback) {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (!user) {
            callback(null);
            return;
          }

          const token = await user.getIdTokenResult();
          callback({
            user,
            email: user.email || "",
            role: normalizeRole(token?.claims?.role || token?.claims?.staffRole || window.STAFF_PORTAL_CONFIG?.defaultRole || "guest"),
            expiresAt: token?.expirationTime || null,
            provider: "firebase",
          });
        });

        return { data: { subscription: { unsubscribe } } };
      },

      async sendPasswordReset(email) {
        await auth.sendPasswordResetEmail(email);
      },
    };
  }

  function createAuthClient() {
    const cfg = window.STAFF_PORTAL_CONFIG || {};
    const provider = cfg.authProvider || "supabase";

    let adapter = null;
    if (provider === "firebase") {
      adapter = firebaseAdapter(cfg.firebase || {});
    } else {
      adapter = supabaseAdapter(cfg.supabase || {});
    }

    return {
      async signIn(email, password, remember) {
        clearLocalSession();
        if (!adapter) {
          throw missingProviderError();
        }
        return adapter.signIn(email, password, remember);
      },
      async signInWithStaffAccess(employeeId, pin) {
        const account = STAFF_ACCESS_ACCOUNTS[String(employeeId || "")];
        if (!account || String(pin || "") !== account.pin) {
          throw new Error("Invalid employee credentials.");
        }
        return setLocalSession(account);
      },
      async signOut() {
        clearLocalSession();
        if (adapter) {
          await adapter.signOut();
        }
      },
      async getSession() {
        const local = getLocalSession();
        if (local) {
          return local;
        }
        if (!adapter) {
          return null;
        }
        return adapter.getSession();
      },
      onAuthChange(callback) {
        if (adapter) {
          return adapter.onAuthChange((session) => {
            const local = getLocalSession();
            if (local) {
              callback(local);
              return;
            }
            callback(session);
          });
        }
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async sendPasswordReset(email) {
        if (!adapter) {
          throw missingProviderError();
        }
        return adapter.sendPasswordReset(email);
      },
    };
  }

  async function fetchStaffProfileByEmail(email) {
    const client = await getSupabaseClient();
    if (!client || !email) {
      return null;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const { data, error } = await client
      .from("employee_profiles")
      .select("id, email, full_name, role, account_status")
      .ilike("email", normalizedEmail)
      .limit(1)
      .maybeSingle();
    if (error) {
      return null;
    }
    return data || null;
  }

  async function getSupabaseClient() {
    const cfg = window.STAFF_PORTAL_CONFIG || {};
    if (cfg.authProvider !== "supabase") {
      return null;
    }
    if (!window.supabase || !cfg.supabase?.url || !cfg.supabase?.anonKey) {
      return null;
    }
    if (!cachedSupabaseClient) {
      cachedSupabaseClient = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey, {
        auth: {
          persistSession: cfg.supabase.persistSession !== false,
        },
      });
    }
    return cachedSupabaseClient;
  }

  window.StaffAuth = {
    createAuthClient,
    canAccessRole,
    normalizeRole,
    roleValue,
    getSupabaseClient,
    fetchStaffProfileByEmail,
    isSecureEmailLoginConnected: secureEmailConnected,
    getBasePath,
    loginPath,
    dashboardPath,
  };
})();
