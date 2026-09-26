import type { Metadata } from "next";
import "./globals.css";
import "./dashboard.css";
import "./palette.css";
export const metadata: Metadata = {
  title: "PULSEPOINT — Clinical workspace",
  description:
    "A question-driven clinical collaboration demo. Evidence, expert perspective, and a clearer next step.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
