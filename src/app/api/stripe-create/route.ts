import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig"; // Usamos Admin SDK

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  console.log("[stripe-create] Método recibido:", request.method);

  if (request.method !== "POST") {
    return NextResponse.json("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json("Invalid JSON", { status: 400 });
  }

  const { plan, empresaId } = body as { plan?: string; empresaId?: string };
  if (!plan || !empresaId) {
    return NextResponse.json("Missing required fields", { status: 400 });
  }

  try {
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();

    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    let stripeCustomerId = empresaSnap.data()?.stripeCustomerId;
    const currentSubscriptionId = empresaSnap.data()?.subscriptionId;

    // Determinar el priceId según el plan solicitado
    const newPriceId =
      plan === "PREMIUM"
        ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID;

    // Si no existe cliente en Stripe, lo creamos
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: empresaSnap.data()?.email || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // Si hay una suscripción activa, verificamos si es upgrade o downgrade
    if (currentSubscriptionId) {
      const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
      const oldPriceId = currentSubscription.items.data[0]?.price?.id;

      // Si el plan es el mismo, no hacemos nada
      if (oldPriceId === newPriceId) {
        return NextResponse.json({ message: "Ya estás en el plan solicitado" });
      }

      // Upgrade: de Básico a Premium (inmediato, con prorrateo)
      if (plan === "PREMIUM") {
        const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
          cancel_at_period_end: false, // Revierte cancelación previa si existe
          proration_behavior: "always_invoice",
          items: [
            {
              id: currentSubscription.items.data[0].id,
              price: newPriceId,
            },
          ],
        });
        console.log("Suscripción actualizada (upgrade):", updatedSubscription.id);
        await empresaRef.update({ subscriptionId: updatedSubscription.id, plan: "PREMIUM" });
        return NextResponse.json({
          message: "Suscripción actualizada a Premium de forma inmediata",
        });
      }

      // Downgrade: de Premium a Básico (programado al final del ciclo actual)
      if (plan === "BASICO") {
        // Creamos una Subscription Schedule a partir de la suscripción existente
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: currentSubscriptionId,
          start_date: currentSubscription.current_period_end, // inicia cuando termine el ciclo actual
          end_behavior: "release",
          phases: [
            {
              items: [
                { price: newPriceId, quantity: 1 },
              ],
            },
          ],
        });

        console.log("Downgrade programado con subscription schedule:", schedule.id);
        await empresaRef.update({ plan: "BASICO" });
        return NextResponse.json({
          message: "Downgrade programado. El plan Básico se activará al finalizar el periodo Premium",
        });
      }
    } else {
      // Sin suscripción previa, creamos la sesión de checkout para una nueva suscripción
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: `https://adminpanel-rust-seven.vercel.app/payment-success`,
        cancel_url: `https://adminpanel-rust-seven.vercel.app/payment-cancel`,
        customer: stripeCustomerId,
        line_items: [
          {
            price: newPriceId,
            quantity: 1,
          },
        ],
        metadata: { empresaId, plan },
      });
      console.log("[stripe-create] Sesión creada:", session.id);
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ message: "Operación completada" });
  } catch (error: unknown) {
    console.error("[stripe-create] Stripe error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
