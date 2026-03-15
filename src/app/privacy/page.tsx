import Header from "@/components/Header";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | GO4IT",
  description: "GO4IT Privacy Policy — how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  const lastUpdated = "March 14, 2026";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              GO4IT (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website go4it.live (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Information you provide directly</h3>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Name, email address, and password when creating an account</li>
              <li>Company name, logo, and business description</li>
              <li>Location (state and country)</li>
              <li>Use case preferences and business descriptions</li>
            </ul>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Information from third-party sign-in</h3>
            <p>
              If you choose to sign in using Google, we receive your name, email address, and profile picture from Google as permitted by your Google account settings. We do not receive your Google password or access to any Google services beyond your basic profile.
            </p>
            <h3 className="text-base font-semibold text-gray-800 mb-2 mt-4">Information collected automatically</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Log data (IP address, browser type, pages visited, timestamps)</li>
              <li>Cookies and session tokens used to maintain your login state</li>
              <li>Usage data related to apps you add, deploy, or interact with</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create and manage your account</li>
              <li>Provide, operate, and improve the Service</li>
              <li>Personalize your experience and apply your branding preferences</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional emails (account verification, password reset, billing)</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Monitor and analyze usage to improve our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties. We do not use your data to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Google User Data</h2>
            <p className="mb-3">
              When you sign in with Google, GO4IT accesses only the following data from your Google account:
            </p>
            <ul className="list-disc pl-5 space-y-1 mb-3">
              <li><strong>Email address</strong> — used to identify your account and send transactional emails</li>
              <li><strong>Name</strong> — displayed in your profile</li>
              <li><strong>Profile picture</strong> — displayed as your avatar (optional)</li>
            </ul>
            <p>
              We do not access your Google Drive, Gmail, Calendar, or any other Google services. Google data is used solely to authenticate you and populate your GO4IT profile. You may disconnect Google sign-in at any time from your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Sharing Your Information</h2>
            <p className="mb-3">We may share your information with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Service providers</strong> — third-party vendors who assist in operating our platform (hosting, payments, email delivery). These providers are contractually obligated to protect your data.</li>
              <li><strong>Your organization members</strong> — your name and email are visible to other members of organizations you belong to within GO4IT.</li>
              <li><strong>Legal requirements</strong> — if required by law, subpoena, or to protect the rights and safety of GO4IT or others.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us at <a href="mailto:owenrmarr@gmail.com" className="text-purple-600 hover:underline">owenrmarr@gmail.com</a>. We will delete your data within 30 days of a verified request, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Security</h2>
            <p>
              We implement industry-standard security measures including encrypted data transmission (HTTPS), hashed password storage, and JWT-based session management. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to maintain your login session and remember your preferences. These are strictly necessary for the Service to function. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              The Service is provided for businesses and is not intended for use by any individuals under the minimum legal age of employment. We do not knowingly collect personal information from children under 13. If any such information is inadvertently collected, please contact our privacy email and we will work to ensure all associated data is deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at <a href="mailto:owenrmarr@gmail.com" className="text-purple-600 hover:underline">owenrmarr@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us:
            </p>
            <div className="mt-3 p-4 bg-gray-100 rounded-lg text-sm">
              <p><strong>GO4IT</strong></p>
              <p>Email: <a href="mailto:owenrmarr@gmail.com" className="text-purple-600 hover:underline">owenrmarr@gmail.com</a></p>
              <p>Website: <a href="https://go4it.live" className="text-purple-600 hover:underline">go4it.live</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to GO4IT</Link>
        </div>
      </main>
    </div>
  );
}
