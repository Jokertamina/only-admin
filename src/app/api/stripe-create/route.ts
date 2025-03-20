// src/app/api/stripe-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig"; // Ajusta la ruta según tu proyecto

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

// Función principal que maneja la petición POST
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
    // 1) Verificamos si la empresa existe
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId;
    const currentSubscriptionId = data.subscriptionId;

    // 2) Determinamos los Price IDs
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
    const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;

    // 3) Creamos el cliente en Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: data.email || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 4) Si no hay suscripción previa (plan nuevo)
    if (!currentSubscriptionId) {
      // Creamos Checkout normal (sin trial, a menos que quieras dárselo también a un nuevo plan)
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [{ price: newPriceId, quantity: 1 }],
        metadata: { empresaId, plan },
      });
      console.log("[stripe-create] Sesión creada (nueva suscripción):", session.id);
      // El webhook se encargará de setear el plan en la DB tras el pago
      return NextResponse.json({
        url: session.url,
        message: "Sesión de pago creada. Completa el pago para activar tu plan.",
      });
    }

    // 5) Hay suscripción activa (Premium)
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSubscription.items.data[0]?.price?.id;

    // Si ya está en el mismo plan
    if (currentPriceId === newPriceId) {
      return NextResponse.json({ message: "Ya estás en el plan solicitado" });
    }

    // --- UPGRADE (Básico → Premium)
    if (plan === "PREMIUM") {
      // Actualizamos la suscripción al momento
      const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
        proration_behavior: "always_invoice",
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
      });
      console.log("[stripe-create] Upgrade inmediato:", updatedSubscription.id);

      // Actualizamos plan= "PREMIUM" en DB (inmediato)
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        subscriptionId: updatedSubscription.id,
        downgradePending: false,
      });

      return NextResponse.json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    // --- DOWNGRADE (Premium → Básico), con trial que finaliza el día que acaba Premium
    if (plan === "BASICO") {
      // 1) Cancelamos Premium al final del ciclo
      await stripe.subscriptions.update(currentSubscriptionId, {
        cancel_at_period_end: true,
      });
      console.log(
        `[stripe-create] Suscripción Premium marcada para cancelar al final del ciclo: ${currentSubscriptionId}`
      );

      // 2) Creamos un Checkout Session para Básico con un trial que termina el mismo día
      const periodEnd = currentSubscription.current_period_end; // un UNIX timestamp
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [{ price: basicPriceId, quantity: 1 }],
        subscription_data: {
          trial_end: periodEnd, // El trial durará hasta que acabe Premium
          metadata: {
            empresaId,
            plan: "BASICO",
          },
        },
      });
      console.log("[stripe-create] Checkout con trial hasta:", periodEnd);

      // 3) DB: plan sigue en PREMIUM, marcamos "downgradePending" si lo deseas
      //   (Aunque en realidad, ya se está creando una sub en trial)
      await empresaRef.update({
        plan: "PREMIUM",           // sigue con Premium hasta que finalice
        estado_plan: "PREMIUM",
        downgradePending: true,    // para saber que hay un trial en marcha
      });

      return NextResponse.json({
        url: session.url,
        message:
          "Se ha programado la cancelación de Premium y la creación de Básico en trial. Mantendrás Premium hasta el fin del ciclo, luego se activará Básico automáticamente.",
      });
    }

    return NextResponse.json({ message: "Operación completada" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
