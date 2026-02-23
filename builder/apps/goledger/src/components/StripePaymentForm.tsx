"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

interface StripePaymentFormInnerProps {
  onSuccess: (paymentIntentId: string) => void;
}

function StripePaymentFormInner({ onSuccess }: StripePaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setLoading(false);
    } else if (result.paymentIntent) {
      onSuccess(result.paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full gradient-brand text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

interface StripePaymentFormProps {
  onSuccess: (paymentIntentId: string) => void;
  clientSecret: string;
  publishableKey: string;
}

export default function StripePaymentForm({ onSuccess, clientSecret, publishableKey }: StripePaymentFormProps) {
  const stripePromise = loadStripe(publishableKey);

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripePaymentFormInner onSuccess={onSuccess} />
    </Elements>
  );
}
