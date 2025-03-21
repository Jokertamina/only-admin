// src/app/api/stripe-create/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
});

// Constantes para URLs y Price IDs
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "https://adminpanel-rust-seven.vercel.app/payment-success";
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || "https://adminpanel-rust-seven.vercel.app/payment-cancel";
const PREMIUM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
const BASICO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;

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
    let stripeCustomerId = data.stripeCustomerId as string | undefined;
    const currentSubscriptionId = data.subscriptionId as string | undefined;

    // Crear customer en Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: (data.email as string) || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // Función auxiliar para crear sesión de checkout
    const createCheckoutSession = async (
      priceId: string,
      metadata: Record<string, string>,
      trialEnd?: number
    ) => {
      return await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          ...(trialEnd && { trial_end: trialEnd }),
          metadata,
        },
      });
    };

    // -----------------------------------
    // NO SUBSCRIPCIÓN PREVIA => CHECKOUT
    // -----------------------------------
    if (!currentSubscriptionId) {
      const newPriceId = plan === "PREMIUM" ? PREMIUM_PRICE_ID : BASICO_PRICE_ID;
      const session = await createCheckoutSession(newPriceId, { empresaId, plan });
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
      (plan === "PREMIUM" && currentPriceId === PREMIUM_PRICE_ID) ||
      (plan === "BASICO" && currentPriceId === BASICO_PRICE_ID)
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
            price: PREMIUM_PRICE_ID,
            quantity,
          },
        ],
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

    // -----------------------------------
    // DOWNGRADE => Cancela Premium al final, crea nuevo Checkout con trial
    // -----------------------------------
    if (plan === "BASICO") {
      // 1) Marcar la sub actual para cancelar al final del ciclo
      await stripe.subscriptions.update(currentSubscriptionId, {
        cancel_at_period_end: true,
      });
      console.log(
        `[stripe-create] Suscripción Premium marcada para cancelación al final del ciclo: ${currentSubscriptionId}`
      );

      // 2) Actualizar la DB => seguimos en Premium hasta que finalice
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        downgradePending: true,
      });

      // 3) Crear una nueva sesión con trial_end
      const periodEnd = currentSub.current_period_end;
      const session = await createCheckoutSession(BASICO_PRICE_ID, { empresaId, plan: "BASICO" }, periodEnd);

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
