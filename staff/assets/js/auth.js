(function () {
  const STAFF_BASE_PATH = "/staff/";
  const STAFF_DASHBOARD_PATH = "/staff/dashboard/";
  const ROLE_ORDER = {
    guest: 0,
    employee: 1,
    manager: 2,
  };

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
    if (rawRole === "guest") {
      return "guest";
    }
    if (rawRole === "manager") {
      return "manager";
    }
    if (rawRole === "employee") {
      return "employee";
    }
    return "guest";
  }

  function inferRoleFromUser(user, fallback) {
    const metadataRole = user?.user_metadata?.role || user?.app_metadata?.role || fallback || "guest";
    return normalizeRole(metadataRole);
  }

  function missingProviderError() {
    return new Error("Secure sign-in service is temporarily unavailable. Contact the portal administrator.");
  }

  function supabaseAdapter(config) {
    if (!window.supabase || !config?.url || !config?.anonKey) {
      return null;
    }

    const client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: config.persistSession !== false,
      },
    });

    return {
      async signIn(email, password, remember) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        if (!remember) {
          await client.auth.setSession(data.session);
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

    if (!adapter) {
      return {
        async signIn() {
          throw missingProviderError();
        },
        async signOut() {
          throw missingProviderError();
        },
        async getSession() {
          return null;
        },
        onAuthChange(callback) {
          callback(null);
          return { data: { subscription: { unsubscribe() {} } } };
        },
        async sendPasswordReset() {
          throw missingProviderError();
        },
      };
    }

    return adapter;
  }

  window.StaffAuth = {
    createAuthClient,
    canAccessRole,
    getBasePath,
    loginPath,
    dashboardPath,
  };
})();
