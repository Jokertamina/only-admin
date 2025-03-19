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

    // 🚀 1. Verificar si el usuario tiene una suscripción activa
    if (currentSubscriptionId) {
      try {
        console.log(`[stripe-create] Verificando suscripción en Stripe: ${currentSubscriptionId}`);
    
        const subscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    
        // 🚨 Verificar si la suscripción ya está cancelada
        if (!subscription || subscription.status === "canceled" || subscription.status === "incomplete_expired") {
          console.error("[stripe-create] La suscripción ya está cancelada o no válida en Stripe.");
          throw new Error("La suscripción no está activa en Stripe.");
        }
    
        const currentItem = subscription.items.data[0];
    
        const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
          items: [
            {
              id: currentItem.id,
              price: plan === "PREMIUM"
                ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
                : process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID,
            },
          ],
          proration_behavior: "create_prorations",
        });
    
        console.log(`[stripe-create] Suscripción actualizada con éxito: ${updatedSubscription.id}`);
        return NextResponse.json({ subscriptionId: updatedSubscription.id });
    
      } catch (error) {
        console.error("[stripe-create] Error al actualizar la suscripción en Stripe:", error);
        return NextResponse.json({ error: "Error al actualizar suscripción", details: error }, { status: 500 });
      }
    }
    

    // 🚀 3. Si no hay suscripción activa, crear una nueva
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: empresaSnap.data()?.email || undefined,
        metadata: { empresaId },
      });

      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price:
            plan === "PREMIUM"
              ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
              : process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID,
        },
      ],
      metadata: { empresaId, plan },
    });

    await empresaRef.update({ subscriptionId: subscription.id });

    console.log("[stripe-create] Nueva suscripción creada:", subscription.id);
    return NextResponse.json({ subscriptionId: subscription.id });

  } catch (error: unknown) {
    console.error("[stripe-create] Stripe error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
