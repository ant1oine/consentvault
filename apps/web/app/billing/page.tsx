"use client";

import { useState } from "react";
import { getCheckoutUrl } from "@/lib/api";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    setLoading(true);
    setError("");
    
    try {
      const url = await getCheckoutUrl();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Failed to create checkout session");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Billing</h1>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Subscription</h2>
        <p className="text-3xl font-bold mb-2">$199<span className="text-lg text-gray-600">/month</span></p>
        <p className="text-gray-600 mb-6">
          Unlimited consents, organizations, and exports
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Subscribe with Stripe"}
        </button>

        <p className="mt-4 text-sm text-gray-500 text-center">
          You will be redirected to Stripe to complete your subscription
        </p>
      </div>
    </div>
  );
}


