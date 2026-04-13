/**
 * Central list of HTTP routes the web app calls. A future Expo app can import this
 * (or duplicate the strings) and point `fetch` at the same deployed API base URL.
 */
export const API_ROUTES = {
  auth: {
    me: "/api/auth/me",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    signup: "/api/auth/signup",
  },
  users: "/api/users",
  user: (id: string) => `/api/users/${id}`,
  albums: "/api/albums",
  photos: "/api/photos",
  photosMemories: "/api/photos/memories",
  photosSpotlight: "/api/photos/spotlight",
  photo: (id: string) => `/api/photos/${id}`,
  activity: "/api/activity",
  health: "/api/health",
  chat: {
    settings: "/api/chat/settings",
    messages: "/api/chat/messages",
    presence: "/api/chat/presence",
  },
  admin: {
    users: "/api/admin/users",
    user: (id: string) => `/api/admin/users/${id}`,
    userAvatar: (id: string) => `/api/admin/users/${id}/avatar`,
    albums: "/api/admin/albums",
    album: (id: string) => `/api/admin/albums/${id}`,
    media: "/api/admin/media",
    stats: "/api/admin/stats",
    chatSettings: "/api/admin/chat-settings",
  },
} as const;
