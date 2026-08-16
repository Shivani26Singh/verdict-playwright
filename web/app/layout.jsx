import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell.jsx";

/**
 * A display face reserved for the wordmark and page titles only. Data — stat
 * values, axis ticks, table figures — stays in the system sans, where
 * familiarity beats personality.
 */
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: {
    default: "VERDICT — Test failure intelligence for Playwright",
    template: "%s",
  },
  description:
    "20 deterministic rules establish what happened. AI interprets what it means. A guard verifies the conclusion.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
