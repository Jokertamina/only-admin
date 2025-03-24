// src/app/api/stripe-create/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";
export const runtime = "nodejs";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const priceIds: Record<'BASICO' | 'PREMIUM', string> = {
  BASICO: process.env.STRIPE_BASIC_PRICE_ID!,
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID!,
};

export async function POST(req: NextRequest) {
  const { empresaId, plan } = (await req.json()) as { empresaId: string; plan: 'BASICO' | 'PREMIUM' };

  if (!empresaId || !plan || !['BASICO', 'PREMIUM'].includes(plan)) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const empresaRef = adminDb.collection("empresas").doc(empresaId);
  const empresaDoc = await empresaRef.get();

  if (!empresaDoc.exists) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  const empresaData = empresaDoc.data()!;
  let customerId = empresaData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { empresaId },
    });
    customerId = customer.id;
    await empresaRef.update({ stripeCustomerId: customerId });
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });

  const activeSubscription = subscriptions.data.find((sub) =>
    ["active", "trialing"].includes(sub.status)
  );

  if (!activeSubscription) {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      metadata: { empresaId, plan },
      success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
      cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",

    });

    return NextResponse.json({ url: session.url });
  }

  const currentPlanPriceId = activeSubscription.items.data[0].price.id;

  if (currentPlanPriceId === priceIds[plan]) {
    return NextResponse.json({ message: `Ya tienes el plan ${plan}.` });
  }

  if (plan === "PREMIUM") {
    await stripe.subscriptions.update(activeSubscription.id, {
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
      items: [{ id: activeSubscription.items.data[0].id, price: priceIds.PREMIUM }],
      metadata: { empresaId, plan: "PREMIUM" },
    });

    await empresaRef.update({ plan: "PREMIUM", pendingDowngrade: false });

    return NextResponse.json({ message: "Suscripción actualizada a PREMIUM exitosamente." });
  }

  if (plan === "BASICO") {
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: activeSubscription.id,
    });

    const currentPeriodEnd = activeSubscription.current_period_end;

    await stripe.subscriptionSchedules.update(schedule.id, {
      phases: [
        {
          items: [{ price: currentPlanPriceId, quantity: 1 }],
          start_date: activeSubscription.current_period_start,
          end_date: currentPeriodEnd,
        },
        {
          items: [{ price: priceIds.BASICO, quantity: 1 }],
          start_date: currentPeriodEnd,
        },
      ],
      metadata: { empresaId, downgrade: "true", plan: "BASICO" },
    });

    await empresaRef.update({ pendingDowngrade: true });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceIds.BASICO, quantity: 1 }],
      subscription_data: { trial_end: currentPeriodEnd },
      metadata: { empresaId, downgrade: "true", currentSubscriptionId: activeSubscription.id, plan: "BASICO" },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
}
