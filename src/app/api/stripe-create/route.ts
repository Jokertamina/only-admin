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
  } catch (error) {
    console.error("[stripe-create] Error al leer el JSON de la petición:", error);
    return NextResponse.json("Invalid JSON", { status: 400 });
  }

  const { plan, empresaId } = body as { plan?: string; empresaId?: string };
  if (!plan || !empresaId) {
    console.error("[stripe-create] Falta información en la petición:", { plan, empresaId });
    return NextResponse.json("Missing required fields", { status: 400 });
  }

  console.log("[stripe-create] Variables de entorno:");
  console.log("STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "Set" : "Not Set");
  console.log("PREMIUM_PRICE_ID:", process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID);
  console.log("BASICO_PRICE_ID:", process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID);

  try {
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();

    if (!empresaSnap.exists) {
      console.error("[stripe-create] Empresa no encontrada en Firestore:", empresaId);
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    let stripeCustomerId = empresaSnap.data()?.stripeCustomerId;
    let currentSubscriptionId = empresaSnap.data()?.subscriptionId;

    console.log(`[stripe-create] Empresa encontrada: ${empresaId}`);
    console.log(`[stripe-create] stripeCustomerId: ${stripeCustomerId}`);
    console.log(`[stripe-create] currentSubscriptionId: ${currentSubscriptionId}`);

    // 🚀 1. Verificar si la suscripción en Firestore sigue existiendo en Stripe
    if (currentSubscriptionId) {
      try {
        console.log(`[stripe-create] Verificando suscripción en Stripe: ${currentSubscriptionId}`);
        const subscription = await stripe.subscriptions.retrieve(currentSubscriptionId);

        if (!subscription || subscription.status === "canceled" || subscription.status === "incomplete_expired") {
          console.warn("[stripe-create] La suscripción ya no es válida en Stripe. Se eliminará en Firestore.");
          await empresaRef.update({ subscriptionId: null });
          currentSubscriptionId = null;
        } else {
          console.log("[stripe-create] Suscripción activa en Stripe:", subscription);

          const currentItem = subscription.items.data[0];

          console.log("[stripe-create] Actualizando suscripción con nuevo plan:", plan);

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
        }
      } catch (error) {
        console.error("[stripe-create] Error al actualizar la suscripción en Stripe:", error);
        return NextResponse.json({ error: "Error al actualizar suscripción", details: error }, { status: 500 });
      }
    }

    // 🚀 2. Si no hay suscripción activa, crear una nueva
    if (!stripeCustomerId) {
      console.log("[stripe-create] Creando nuevo cliente en Stripe...");
      try {
        const customer = await stripe.customers.create({
          email: empresaSnap.data()?.email || undefined,
          metadata: { empresaId },
        });

        stripeCustomerId = customer.id;
        await empresaRef.update({ stripeCustomerId });
        console.log(`[stripe-create] Nuevo cliente creado en Stripe: ${stripeCustomerId}`);
      } catch (error) {
        console.error("[stripe-create] Error al crear cliente en Stripe:", error);
        return NextResponse.json({ error: "Error al crear cliente en Stripe", details: error }, { status: 500 });
      }
    }

    console.log("[stripe-create] Creando nueva suscripción en Stripe...");
    try {
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
    } catch (error) {
      console.error("[stripe-create] Error al crear la suscripción en Stripe:", error);
      return NextResponse.json({ error: "Error al crear la suscripción", details: error }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error("[stripe-create] Error inesperado en el servidor:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error }, { status: 500 });
  }
}
