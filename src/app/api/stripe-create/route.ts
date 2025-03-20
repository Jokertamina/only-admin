// EJEMPLO: /app/api/change-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig"; // Ajusta la ruta según tu proyecto

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export async function POST(request: NextRequest) {
  console.log("[change-plan] Método recibido:", request.method);

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

    // Datos actuales de la empresa
    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId;
    const currentSubscriptionId = data.subscriptionId;

    // Determinamos los priceId (ajusta a tus variables de entorno)
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
    const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;

    // 2) Creamos cliente en Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: data.email || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 3) Si no hay suscripción previa, creamos una nueva
    if (!currentSubscriptionId) {
      // Creas una Checkout Session o directamente subscriptions.create (depende de tu flujo).
      // Aquí hacemos Checkout Session para que el usuario pague el plan.
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [
          { price: newPriceId, quantity: 1 },
        ],
        metadata: { empresaId, plan },
      });
      console.log("[change-plan] Sesión creada (nueva suscripción):", session.id);

      return NextResponse.json({
        url: session.url,
        message: "Sesión de pago creada. Completa el proceso para activar el plan.",
      });
    }

    // 4) Hay suscripción activa, así que la obtenemos
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSubscription.items.data[0]?.price?.id;

    // Si ya está en el plan solicitado, no hacemos nada
    if (currentPriceId === newPriceId) {
      return NextResponse.json({ message: "Ya estás en el plan solicitado" });
    }

    // --- UPGRADE (Básico → Premium) ---
    if (plan === "PREMIUM") {
      // Actualizamos la suscripción de inmediato
      const updated = await stripe.subscriptions.update(currentSubscriptionId, {
        proration_behavior: "none", // o "always_invoice" si quieres cobrar la diferencia
        items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
      });
      console.log("[change-plan] Upgrade inmediato:", updated.id);

      // Actualizamos DB: plan = "PREMIUM", se asume que la transición es instantánea
      await empresaRef.update({
        plan: "PREMIUM",
        subscriptionId: updated.id,
        downgradePending: false, // por si existía antes
      });

      return NextResponse.json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    // --- DOWNGRADE (Premium → Básico) ---
    if (plan === "BASICO") {
      // Creamos una Subscription Schedule para programar el cambio a Básico al final del ciclo
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: currentSubscriptionId,
        end_behavior: "release",
        // Inicia el cambio al final del ciclo actual
        start_date: currentSubscription.current_period_end,
        phases: [
          {
            items: [
              { price: newPriceId, quantity: 1 },
            ],
            // proration_behavior no aplica en la misma forma, pero se puede setear
            proration_behavior: "none",
          },
        ],
      });
      console.log("[change-plan] Downgrade programado con schedule:", schedule.id);

      // No cambiamos plan a "BASICO" todavía; mantenemos "PREMIUM"
      // Marcamos downgradePending: true para que el webhook sepa que es un downgrade programado
      await empresaRef.update({
        downgradePending: true,
      });

      return NextResponse.json({
        message: "Downgrade programado. Mantendrás Premium hasta el final del ciclo.",
      });
    }

    return NextResponse.json({ message: "Operación completada" });
  } catch (error) {
    console.error("[change-plan] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
