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
    const currentPlan = empresaSnap.data()?.plan; // Extraemos el plan actual

    console.log(`[stripe-create] Empresa encontrada: ${empresaId}`);
    console.log(`[stripe-create] Plan actual: ${currentPlan}`);
    console.log(`[stripe-create] Plan solicitado: ${plan}`);
    console.log(`[stripe-create] Suscripción activa en Stripe: ${currentSubscriptionId}`);

    // 🚀 1. Si el usuario tiene una suscripción activa, la marcamos para cancelación
    if (currentSubscriptionId) {
      try {
        await stripe.subscriptions.update(currentSubscriptionId, {
          cancel_at_period_end: true, // Se cancela cuando termine el ciclo actual
        });
        console.log(`[stripe-create] Suscripción anterior ${currentSubscriptionId} marcada para cancelación.`);
      } catch (error) {
        console.error("[stripe-create] Error al cancelar suscripción anterior:", error);
      }
    }

    // 🚀 2. Si el usuario está bajando de Premium a Básico, permitir la selección pero no activar inmediatamente
    if (currentPlan === "PREMIUM" && plan === "BASICO") {
      console.log("[stripe-create] Cambio de PREMIUM a BÁSICO detectado. Se aplicará después del ciclo actual.");
      return NextResponse.json({
        success: true,
        message: "El plan Básico se activará automáticamente cuando termine el ciclo del plan Premium.",
      });
    }

    // 🚀 3. Si el usuario no tiene un cliente en Stripe, lo creamos
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: empresaSnap.data()?.email || undefined,
        metadata: { empresaId },
      });

      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 🚀 4. Crear la sesión de pago en Stripe si el usuario está subiendo de plan o activando por primera vez
    console.log("[stripe-create] Creando nueva suscripción...");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `https://adminpanel-rust-seven.vercel.app/payment-success`,
      cancel_url: `https://adminpanel-rust-seven.vercel.app/payment-cancel`,
      customer: stripeCustomerId,
      line_items: [
        {
          price:
            plan === "PREMIUM"
              ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
              : process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: { empresaId, plan },
    });

    console.log("[stripe-create] Sesión creada:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("[stripe-create] Stripe error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error }, { status: 500 });
  }
}
