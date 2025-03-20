import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig"; // Usamos Admin SDK

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15", // Versión estable
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
    // 1) Verificamos si la empresa existe
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    // 2) Obtenemos datos actuales de la empresa
    let stripeCustomerId = empresaSnap.data()?.stripeCustomerId;
    const currentSubscriptionId = empresaSnap.data()?.subscriptionId;

    // 3) Determinamos el priceId según el plan
    const newPriceId =
      plan === "PREMIUM"
        ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!
        : process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;

    // 4) Creamos el cliente en Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: empresaSnap.data()?.email || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 5) Si ya existe una suscripción activa
    if (currentSubscriptionId) {
      const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
      const currentPriceId = currentSubscription.items.data[0]?.price?.id;

      // Si ya está en el plan solicitado, no hacemos nada
      if (currentPriceId === newPriceId) {
        return NextResponse.json({ message: "Ya estás en el plan solicitado" });
      }

      // --- UPGRADE (Básico → Premium) ---
      if (plan === "PREMIUM") {
        // Con la API estable, la forma recomendada es actualizar la suscripción directamente
        // aplicando prorrateo (always_invoice) para cobrar la diferencia.
        const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
          proration_behavior: "always_invoice",
          items: [
            {
              id: currentSubscription.items.data[0].id,
              price: newPriceId,
            },
          ],
        });
        console.log("[stripe-create] Suscripción actualizada (upgrade):", updatedSubscription.id);

        // Actualizamos Firestore con el nuevo plan
        await empresaRef.update({
          plan: "PREMIUM",
          subscriptionId: updatedSubscription.id,
          downgradePending: false, // Por si antes había un downgrade pendiente
        });

        return NextResponse.json({
          message: "Suscripción actualizada a Premium de forma inmediata (API estable)",
        });
      }

      // --- DOWNGRADE (Premium → Básico) ---
      if (plan === "BASICO") {
        // 1) Marcamos la suscripción para cancelarse al final del ciclo actual
        await stripe.subscriptions.update(currentSubscriptionId, {
          cancel_at_period_end: true,
        });
        console.log("Suscripción marcada para cancelación al final del ciclo Premium");

        // 2) Actualizamos Firestore indicando que se ha programado un downgrade
        await empresaRef.update({
          plan: "BASICO",
          downgradePending: true,
        });

        // 3) Creamos una Checkout Session para la nueva suscripción (Básico)
        //    que se activará tras finalizar la Premium actual.
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
    }

    // 6) Si NO hay suscripción previa, creamos una nueva suscripción con Checkout
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
    console.log("[stripe-create] Sesión creada (nueva suscripción):", session.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe-create] Stripe error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
