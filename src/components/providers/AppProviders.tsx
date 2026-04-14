"use client";

import { ThemeProvider } from "./ThemeProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";
import { PushNotificationsSetup } from "./PushNotificationsSetup";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <PushNotificationsSetup />
          {children}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
