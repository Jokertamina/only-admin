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

    // 🚨 1. Si el usuario tiene una suscripción activa, la cancelamos INMEDIATAMENTE
    if (currentSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(currentSubscriptionId); // ✅ Usamos .cancel en lugar de .del
        console.log(`[stripe-create] Suscripción anterior ${currentSubscriptionId} cancelada.`);
      } catch (error) {
        console.error("[stripe-create] Error al cancelar la suscripción anterior:", error);
        return NextResponse.json("Error al cancelar suscripción anterior", { status: 500 });
      }
    }

    // 🚨 2. Si el usuario no tiene un cliente en Stripe, lo creamos
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: empresaSnap.data()?.email || undefined,
        name: empresaSnap.data()?.nombre || undefined,
        metadata: { empresaId },
      });

      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 🚨 3. Crear la nueva suscripción con prorrateo
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
      proration_behavior: "create_prorations", // ✅ Para evitar cobros duplicados
      metadata: { empresaId, plan },
    });

    // 🚨 4. Guardar la nueva suscripción en Firestore
    await empresaRef.update({ subscriptionId: subscription.id });

    console.log("[stripe-create] Nueva suscripción creada:", subscription.id);
    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (error: unknown) {
    console.error("[stripe-create] Stripe error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
