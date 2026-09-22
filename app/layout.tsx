import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commerce College Online",
  description: "Student assessment and AI marking portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
