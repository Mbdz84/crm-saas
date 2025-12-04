import "./globals.css";
import Script from "next/script";
import { Toaster } from "sonner";

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
    <html lang="en">
      <body>
        {/* Global toast notifications */}
        <Toaster richColors position="top-center" />

        {/* Google Maps script */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`}
          strategy="afterInteractive"
        />

        {children}
      </body>
    </html>
  );
}