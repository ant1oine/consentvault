"use client";

import { Code, Package, Key, Book } from "lucide-react";

export default function IntegrationPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">
        Integration Guide
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Get started with the ConsentVault SDK to capture and manage user consents.
      </p>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Installation</h2>
          </div>
          <div className="bg-slate-50 rounded-md p-4 font-mono text-sm">
            <code>npm install @consentvault/sdk</code>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">API Key Setup</h2>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Get your API key from the Settings page and configure it in your environment:
          </p>
          <div className="bg-slate-50 rounded-md p-4 font-mono text-sm">
            <code>CONSENTVAULT_API_KEY=your_api_key_here</code>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Basic Usage</h2>
          </div>
          <div className="bg-slate-50 rounded-md p-4 font-mono text-sm overflow-x-auto">
            <pre>{`import { ConsentVault } from '@consentvault/sdk';

const client = new ConsentVault({
  apiKey: process.env.CONSENTVAULT_API_KEY,
  orgId: 'your-org-id'
});

// Record a consent
await client.recordConsent({
  subjectId: 'user-123',
  purpose: 'marketing',
  acceptedAt: new Date()
});`}</pre>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <Book className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Next Steps</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Review the API documentation for detailed endpoint information</li>
            <li>• Set up webhooks to receive real-time consent updates</li>
            <li>• Configure data retention policies in Settings</li>
            <li>• Test your integration in the sandbox environment</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

