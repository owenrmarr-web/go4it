"use client";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Header from "@/components/Header";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });

      if (res.ok) {
        toast.success("Message sent! We'll get back to you soon.");
        setSubmitted(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-purple-50">
      <Header />
      <main className="max-w-xl mx-auto px-4 pt-28 pb-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          &larr; Back to App Store
        </Link>

        <h1 className="text-3xl font-extrabold gradient-brand-text mb-1">
          Contact Us
        </h1>
        <p className="text-gray-500 mb-8">
          Have a question, idea, or partnership inquiry? Drop us a message.
        </p>

        {submitted ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Thanks for reaching out!
            </h2>
            <p className="text-gray-500 mb-6">
              We&apos;ll review your message and get back to you shortly.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setName("");
                setEmail("");
                setPhone("");
                setMessage("");
              }}
              className="text-purple-600 font-semibold hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can help..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold text-white gradient-brand hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
