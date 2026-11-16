import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "ASSEMBLY OS", template: "%s · ASSEMBLY OS" },
  description: "ASSEMBLY OS – The Industrial Operations Platform",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#111315", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-dvh">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!bg-elevated !border !border-border !text-fg !rounded-md !shadow-xl",
              description: "!text-muted",
              success: "[&_[data-icon]]:!text-success",
              error: "[&_[data-icon]]:!text-danger",
            },
          }}
        />
      </body>
    </html>
  );
}
