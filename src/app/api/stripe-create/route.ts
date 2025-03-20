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

    // Determinamos el priceId según el plan solicitado
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

    // Si hay suscripción activa
    if (currentSubscriptionId) {
      const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
      const currentPriceId = currentSubscription.items.data[0]?.price?.id;

      // Si ya está en el mismo plan, no hacemos nada
      if (currentPriceId === newPriceId) {
        return NextResponse.json({ message: "Ya estás en el plan solicitado" });
      }

      // Upgrade: de Básico a Premium
      if (plan === "PREMIUM") {
        // Creamos una sesión de Checkout en modo "subscription" con actualización
        // Se usa "as any" para forzar los parámetros que no están reconocidos por los tipos
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: stripeCustomerId,
          subscription: currentSubscriptionId,
          subscription_update: {
            items: [
              {
                id: currentSubscription.items.data[0].id,
                price: newPriceId,
              },
            ],
            proration_behavior: "always_invoice",
          },
          success_url: `https://adminpanel-rust-seven.vercel.app/payment-success`,
          cancel_url: `https://adminpanel-rust-seven.vercel.app/payment-cancel`,
          metadata: { empresaId, plan },
        } as any);
        console.log("[stripe-create] Checkout session for upgrade created:", session.id);
        return NextResponse.json({ url: session.url });
      }

      // Downgrade: de Premium a Básico
      if (plan === "BASICO") {
        // Marcamos la suscripción actual para que se cancele al final del ciclo
        await stripe.subscriptions.update(currentSubscriptionId, {
          cancel_at_period_end: true,
        });
        console.log("Suscripción marcada para cancelación al final del ciclo Premium");

        // Actualizamos Firestore indicando downgrade programado
        await empresaRef.update({
          plan: "BASICO",
          downgradePending: true,
        });

        // Creamos una sesión de Checkout para la nueva suscripción que se activará luego
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
        console.log("[stripe-create] Sesión creada (downgrade):", session.id);
        return NextResponse.json({
          url: session.url,
          message:
            "Downgrade programado. Mantendrás Premium hasta el final del ciclo y luego se activará el plan Básico.",
        });
      }
    } else {
      // Sin suscripción previa, creamos la sesión de Checkout para una nueva suscripción
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
