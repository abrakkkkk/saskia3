export const getSessionUser = () => {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )saskiaSessao=([^;]+)'));
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2]));
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const setSessionUser = (user: any) => {
  if (typeof window === 'undefined') return;
  const data = encodeURIComponent(JSON.stringify(user));
  document.cookie = `saskiaSessao=${data}; path=/; max-age=86400; SameSite=Strict`;
};

export const clearSessionUser = () => {
  if (typeof window === 'undefined') return;
  document.cookie = `saskiaSessao=; path=/; max-age=0; SameSite=Strict`;
};
