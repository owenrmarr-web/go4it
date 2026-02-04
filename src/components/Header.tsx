"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/create">
          <button className="px-5 py-2 rounded-lg border-2 border-orange-500 text-orange-600 font-semibold hover:bg-orange-50 transition-colors">
            Create
          </button>
        </Link>
        <Link href="/">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            GO4IT
          </h1>
        </Link>
        <Link href={session ? "/account" : "/auth"}>
          <button className="gradient-brand px-5 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity shadow-sm">
            My Account
          </button>
        </Link>
      </nav>
    </header>
  );
}
