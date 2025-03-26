import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(req: NextRequest) {
  const { subscriptionId } = await req.json();

  try {
    // Cancelación inmediata de la suscripción
    const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);
    return NextResponse.json({
      success: true,
      subscription: deletedSubscription,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
  }
}
