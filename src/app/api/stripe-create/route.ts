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
    // 1) Verificamos si la empresa existe
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    // Data de la empresa
    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId as string | undefined;
    const currentSubscriptionId = data.subscriptionId as string | undefined;

    // Price IDs
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;

    // Crear customer en Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (data.email as string) || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // -----------------------------------
    // NO SUBSCRIPCIÓN PREVIA => CHECKOUT
    // -----------------------------------
    if (!currentSubscriptionId) {
      // Escogemos el price ID según plan
      const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [{ price: newPriceId, quantity: 1 }],
        subscription_data: {
          // Guardamos metadata en la sub
          metadata: { empresaId, plan },
        },
      });

      console.log("[stripe-create] Sesión creada (nueva suscripción):", session.id);
      return NextResponse.json({
        url: session.url,
        message: "Sesión de pago creada. Completa el proceso para activar tu plan.",
      });
    }

    // -----------------------------------
    // YA EXISTE UNA SUBSCRIPCIÓN
    // -----------------------------------
    const currentSub = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSub.items.data[0]?.price?.id;
    const quantity = currentSub.items.data[0]?.quantity || 1;

    // Chequeamos si ya está en el plan deseado
    if (
      (plan === "PREMIUM" && currentPriceId === premiumPriceId) ||
      (plan === "BASICO" && currentPriceId === basicPriceId)
    ) {
      return NextResponse.json({ message: "Ya estás en el plan solicitado" });
    }

    // -----------------------------------
    // UPGRADE => Premium inmediato
    // -----------------------------------
    if (plan === "PREMIUM") {
      const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
        proration_behavior: "always_invoice",
        items: [
          {
            id: currentSub.items.data[0].id,
            price: premiumPriceId,
            quantity,
          },
        ],
        // Reinyectamos metadata
        metadata: { empresaId, plan: "PREMIUM" },
      });

      console.log("[stripe-create] Upgrade inmediato:", updatedSubscription.id);

      // DB: plan= "PREMIUM"
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        subscriptionId: updatedSubscription.id,
      });

      return NextResponse.json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    // -----------------------------------
    // DOWNGRADE => Cancela Premium al final, crea nuevo Checkout con trial
    // -----------------------------------
    if (plan === "BASICO") {
      // 1) Marcamos la sub actual para que se cancele al final del ciclo
      await stripe.subscriptions.update(currentSubscriptionId, {
        cancel_at_period_end: true,
      });
      console.log(
        `[stripe-create] Suscripción Premium marcada para cancelación al final del ciclo: ${currentSubscriptionId}`
      );

      // 2) Actualizamos la DB => seguimos en Premium hasta que finalice
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        downgradePending: true,
      });

      // 3) Creamos un Checkout Session con trial_end = final del Premium actual
      const periodEnd = currentSub.current_period_end;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [{ price: basicPriceId, quantity: 1 }],
        subscription_data: {
          trial_end: periodEnd,
          metadata: { empresaId, plan: "BASICO" },
        },
      });

      console.log("[stripe-create] Downgrade: nueva sesión con trial:", session.id);
      return NextResponse.json({
        url: session.url,
        message:
          "Se ha programado la cancelación de Premium y creado una sesión con trial para Básico. Mantendrás Premium hasta fin de ciclo, luego Básico entrará en vigor.",
      });
    }

    return NextResponse.json({ message: "Operación completada (sin cambios)" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
