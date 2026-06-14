import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-dvh min-h-0 flex-col">{children}</div>;
}
