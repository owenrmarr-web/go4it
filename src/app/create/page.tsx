"use client";
import { useState } from "react";
import Header from "@/components/Header";
import DemoModal from "@/components/DemoModal";

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16">
        <div className="max-w-2xl w-full">
          <h1 className="text-4xl md:text-5xl font-extrabold text-center bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">
            Create Your App
          </h1>
          <p className="mt-4 text-center text-gray-600 text-lg max-w-xl mx-auto">
            Describe your dream business tool in plain English. Our AI will
            build it for you.
          </p>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Build a CRM for a law firm to track case progress and client communications..."
            rows={5}
            className="mt-8 w-full px-5 py-4 rounded-xl border border-gray-200 shadow-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-base"
          />

          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setModalOpen(true)}
              className="gradient-brand text-white px-10 py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 hover:shadow-xl transition-all"
            >
              Generate
            </button>
          </div>
        </div>

        <DemoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </main>
    </div>
  );
}
