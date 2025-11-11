import "./globals.css";
import { Providers } from "@/components/providers";
import { I18nProvider } from "@/lib/i18n";

export const metadata = {
  title: "ConsentVault",
  description: "Enterprise-grade consent management API",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-800">
        <I18nProvider>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
