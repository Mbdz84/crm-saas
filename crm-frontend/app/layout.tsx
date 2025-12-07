import "./globals.css";
import Script from "next/script";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata = {
  title: "CRM Platform",
  description: "CRM System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900">

        {/* Wrap everything inside ThemeProvider */}
        <ThemeProvider>

          {/* Toast notifications */}
          <Toaster richColors position="top-center" />

          {/* Google Maps script */}
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`}
            strategy="afterInteractive"
          />

          {children}

        </ThemeProvider>

      </body>
    </html>
  );
}