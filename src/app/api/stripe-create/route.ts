import { NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";

// Instancia de Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
});

// Constantes de entorno
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL || "https://adminpanel-rust-seven.vercel.app/payment-success";
const CANCEL_URL = process.env.STRIPE_CANCEL_URL || "https://adminpanel-rust-seven.vercel.app/payment-cancel";
const PREMIUM_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
const BASICO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;

/**
 * Handler principal para la ruta POST /api/stripe-create
 */
export async function POST(req: Request) {
  // Soporte para OPTIONS si fuera necesario
  if (req.method === "OPTIONS") {
    const response = NextResponse.json("OK", { status: 200 });
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json() as { plan?: string; empresaId?: string };
    const { plan, empresaId } = body;

    if (!plan || !empresaId) {
      return NextResponse.json("Missing required fields", { status: 400 });
    }

    // 1) Verificamos si la empresa existe en Firestore
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
          ...(trialEnd && { trial_end: trialEnd }), // Para que el nuevo plan empiece tras el ciclo Premium
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
    //  - Eliminar cancel_at_period_end (por si existía)
    //  - Cambiar a Premium y prorratear
    // -----------------------------------
    if (plan === "PREMIUM") {
      const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
        cancel_at_period_end: false,
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
    // DOWNGRADE => Programar cambio a Básico
    //  - No se cancela la suscripción de inmediato
    //  - Se crea un checkout con trial_end = current_period_end
    //  - Se mantiene el plan en la DB como PREMIUM y se marca 'downgradePending'
    // -----------------------------------
    if (plan === "BASICO") {
      // Actualizamos la DB para indicar que se solicitó un downgrade,
      // manteniendo el plan actual como "PREMIUM".
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        downgradePending: true,
      });

      const periodEnd = currentSub.current_period_end;
      // Incluimos metadata para identificar el downgrade y el id de la suscripción actual.
      const session = await createCheckoutSession(
        BASICO_PRICE_ID,
        { empresaId, plan: "BASICO", downgrade: "true", currentSubscriptionId },
        periodEnd
      );

      console.log("[stripe-create] Downgrade: nueva sesión con trial:", session.id);

      return NextResponse.json({
        url: session.url,
        message:
          "Se ha programado la transición a Básico. Mantendrás Premium hasta fin de ciclo, luego Básico entrará en vigor si el pago se completa.",
      });
    }

    // Si no encaja en ninguno de los casos
    return NextResponse.json({ message: "Operación completada (sin cambios)" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
