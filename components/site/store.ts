// The reference `store` helpers (truespec.html) — ts-prefixed local/session keys.

export const store = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem('ts-' + k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem('ts-' + k, JSON.stringify(v));
    } catch {
      /* ignored */
    }
  },
  sget<T>(k: string, d: T): T {
    try {
      const v = sessionStorage.getItem('ts-' + k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  sset(k: string, v: unknown) {
    try {
      sessionStorage.setItem('ts-' + k, JSON.stringify(v));
    } catch {
      /* ignored */
    }
  },
};
