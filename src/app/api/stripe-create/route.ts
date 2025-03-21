// src/app/api/stripe-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
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
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }
    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId as string | undefined;
    const currentSubscriptionId = data.subscriptionId as string | undefined;

    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
    // newPriceId used only when creating a new subscription checkout session
    const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (data.email as string) || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    if (!currentSubscriptionId) {
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
      return NextResponse.json({
        url: session.url,
        message: "Sesión de pago creada. Completa el proceso para activar tu plan.",
      });
    }

    const currentSub = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentSubPriceId = currentSub.items.data[0]?.price?.id;
    const quantity = currentSub.items.data[0]?.quantity || 1;

    // If already in desired plan, do nothing
    if (currentSubPriceId === (plan === "PREMIUM" ? premiumPriceId : basicPriceId)) {
      return NextResponse.json({ message: "Ya estás en el plan solicitado" });
    }

    if (plan === "PREMIUM") {
      // Upgrade: change to Premium immediately with proration
      const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
        proration_behavior: "always_invoice",
        items: [{
          id: currentSub.items.data[0].id,
          price: premiumPriceId,
          quantity,
        }],
        metadata: { empresaId, plan: "PREMIUM" },
      });
      console.log("[stripe-create] Upgrade inmediato:", updatedSubscription.id);
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        subscriptionId: updatedSubscription.id,
      });
      return NextResponse.json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    if (plan === "BASICO") {
      // Downgrade: program a schedule with two phases via Subscription Schedules
      const endDate = currentSub.current_period_end;
      const schedule = await stripe.subscriptionSchedules.create({
        customer: currentSub.customer as string,
        end_behavior: "release",
        metadata: { empresaId },
        phases: [
          {
            // Fase 1: Mantener Premium hasta el fin del ciclo
            end_date: endDate,
            items: [{ price: currentSubPriceId!, quantity }],
          },
          {
            // Fase 2: Cambiar a Básico
            items: [{ price: basicPriceId, quantity }],
          },
        ],
      });
      console.log("[stripe-create] Downgrade programado (schedule):", schedule.id);
      await empresaRef.update({
        plan: "PREMIUM", // Remains Premium until schedule activates Basic
        estado_plan: "PREMIUM",
        subscriptionScheduleId: schedule.id,
      });
      return NextResponse.json({
        message: "Downgrade programado con SubscriptionSchedule. Mantendrás Premium hasta el final del ciclo, luego pasarás automáticamente a Básico.",
      });
    }

    return NextResponse.json({ message: "Operación completada (sin cambios)" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
