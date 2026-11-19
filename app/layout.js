import "./globals.css";

export const metadata = {
  title: "Coy Discover",
  description: "Swipe, match, and never reveal who liked you unless it is mutual.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff7f5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
