import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an App",
  description:
    "Describe your dream business tool and our AI will build it for you in minutes. No coding required.",
  openGraph: {
    title: "Create an App — GO4IT",
    description:
      "Describe your dream business tool and our AI will build it for you in minutes. No coding required.",
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
