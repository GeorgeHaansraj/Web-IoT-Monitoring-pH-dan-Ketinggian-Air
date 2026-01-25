export const isAdminAuthenticated = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const adminToken = localStorage.getItem("adminToken");
  const adminLoginTime = localStorage.getItem("adminLoginTime");

  if (!adminToken || !adminLoginTime) {
    return false;
  }

  // Check if token is still valid (24 hours)
  const loginTime = new Date(adminLoginTime).getTime();
  const currentTime = new Date().getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (currentTime - loginTime > twentyFourHours) {
    // Token expired
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminLoginTime");
    return false;
  }

  return true;
};

export const logoutAdmin = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminLoginTime");

    // Also clear cookie
    document.cookie =
      "adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  }
};

export const getAdminToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("adminToken");
};
