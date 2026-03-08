import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/30 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/landing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">W</div>
            <span className="font-bold text-foreground">WORKA</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-12">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              WORKA collects information that you provide directly when you create an account, set up a workspace, or use our services. This includes your name, email address, company name, phone number, and any data you enter into the platform such as projects, tasks, financial records, and HR information.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We also automatically collect certain technical information including IP addresses, browser type, device information, and usage patterns to improve our services and ensure platform security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed">Your data is used to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and maintain the WORKA platform services</li>
              <li>Process your account registration and workspace management</li>
              <li>Send important service notifications and updates</li>
              <li>Improve platform performance and user experience</li>
              <li>Ensure security and prevent unauthorized access</li>
              <li>Process billing and subscription management</li>
              <li>Provide customer support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">3. Data Isolation & Multi-Tenancy</h2>
            <p className="text-muted-foreground leading-relaxed">
              WORKA operates on a multi-tenant architecture where each company workspace is completely isolated. Data belonging to one workspace is never accessible by users of another workspace. We implement Row-Level Security (RLS) policies at the database level to ensure strict data separation between tenants.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>End-to-end encryption for data in transit (TLS/SSL)</li>
              <li>Encryption at rest for stored data</li>
              <li>Role-based access control (RBAC) within workspaces</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Automated backups and disaster recovery procedures</li>
              <li>Secure authentication with password hashing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">5. Your Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal data stored on the platform</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in standard formats</li>
              <li>Withdraw consent for optional data processing</li>
              <li>Lodge a complaint with relevant data protection authorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide services. When you delete your account, we will remove your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">7. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              WORKA may integrate with third-party services (payment gateways, email providers, analytics tools) to provide full functionality. These integrations are governed by the respective third-party privacy policies. We only share the minimum data necessary for these integrations to function.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">8. Cookies & Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and authentication state. We may also use analytics cookies to understand platform usage patterns. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at <span className="text-primary font-medium">privacy@worka.id</span>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-muted/20 px-6 py-8">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} WORKA. All rights reserved.
        </div>
      </footer>
    </div>
  );
}