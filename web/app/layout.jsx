import "./globals.css";
import AppShell from "@/components/AppShell.jsx";

export const metadata = {
  title: "VERDICT — AI-Powered QA Failure Investigator",
  description: "AI attribution for Playwright test failures, grounded in deterministic evidence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
