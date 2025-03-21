// src/app/api/stripe-create/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Forzamos la versión Beta en TS
  apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
});

export async function POST(req: NextRequest) {
  console.log("[stripe-create] Método recibido:", req.method);

  if (req.method !== "POST") {
    return NextResponse.json("Method Not Allowed", { status: 405 });
  }

  let body: { plan?: string; empresaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json("Invalid JSON", { status: 400 });
  }

  const { plan, empresaId } = body;
  if (!plan || !empresaId) {
    return NextResponse.json("Missing required fields", { status: 400 });
  }

  try {
    // 1) Verificamos si la empresa existe en DB
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId as string | undefined;
    const currentSubscriptionId = data.subscriptionId as string | undefined;

    // 2) Determinamos Price IDs
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
    const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;

    // 3) Si no existe stripeCustomerId, lo creamos
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (data.email as string) || undefined,
        metadata: { empresaId }, // opcional
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 4) Si no hay suscripción previa => creamos Checkout Session con subscription_data
    if (!currentSubscriptionId) {
      // Añadimos subscription_data con metadata para que la suscripción final herede empresaId
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [{ price: newPriceId, quantity: 1 }],
        subscription_data: {
          metadata: { empresaId, plan },
        },
      });
      console.log("[stripe-create] Sesión creada (nueva suscripción):", session.id);

      // El webhook se encargará de actualizar la DB (customer.subscription.created)
      return NextResponse.json({
        url: session.url,
        message: "Sesión de pago creada. Completa el pago para activar tu plan.",
      });
    }

    // 5) Hay suscripción activa => la obtenemos
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSubscription.items.data[0]?.price?.id;

    // Si ya está en el mismo plan
    if (currentPriceId === newPriceId) {
      return NextResponse.json({ message: "Ya estás en el plan solicitado" });
    }

    // --- UPGRADE (Básico → Premium)
    if (plan === "PREMIUM") {
      const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
        proration_behavior: "always_invoice",
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        // Reinyectamos metadata para que la sub final tenga empresaId
        metadata: { empresaId, plan: "PREMIUM" },
      });
      console.log("[stripe-create] Upgrade inmediato:", updatedSubscription.id);

      // Actualizamos la DB inmediatamente
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        subscriptionId: updatedSubscription.id,
      });

      return NextResponse.json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    // --- DOWNGRADE (Premium → Básico) ---
    if (plan === "BASICO") {
      // Creamos un schedule para cambiar a Básico al final del ciclo actual
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: currentSubscriptionId,
        end_behavior: "release",
        phases: [
          {
            items: [{ price: currentPriceId, quantity: 1 }],
            end_date: currentSubscription.current_period_end,
          },
          {
            items: [{ price: newPriceId, quantity: 1 }],
          },
        ],
      });

      console.log("[stripe-create] Downgrade programado (schedule):", schedule.id);

      // Mantenemos plan= "PREMIUM" hasta que finalice
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        subscriptionScheduleId: schedule.id,
      });

      return NextResponse.json({
        message:
          "Downgrade programado. Mantendrás Premium hasta el final del ciclo, luego pasarás automáticamente a Básico.",
      });
    }

    return NextResponse.json({ message: "Operación completada (sin cambios)" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
