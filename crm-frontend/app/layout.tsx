import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}