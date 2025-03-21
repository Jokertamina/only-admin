// src/app/api/stripe-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any, // Forzamos la versión Beta
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
    // 1) Verificamos si la empresa existe en DB
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return NextResponse.json("Empresa no encontrada", { status: 404 });
    }

    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId;
    const currentSubscriptionId = data.subscriptionId;

    // 2) Determinamos Price IDs
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
    const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;

    // 3) Creamos cliente en Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: data.email || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 4) Si no hay suscripción previa, creamos una nueva con Checkout Session (sin schedule)
    if (!currentSubscriptionId) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://adminpanel-rust-seven.vercel.app/payment-success",
        cancel_url: "https://adminpanel-rust-seven.vercel.app/payment-cancel",
        customer: stripeCustomerId,
        line_items: [{ price: newPriceId, quantity: 1 }],
        metadata: { empresaId, plan },
      });
      console.log("[stripe-create] Sesión creada (nueva suscripción):", session.id);

      // El webhook se encargará de actualizar en la DB (customer.subscription.created)
      return NextResponse.json({
        url: session.url,
        message: "Sesión de pago creada. Completa el proceso para activar tu plan.",
      });
    }

    // 5) Hay suscripción activa
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSubscription.items.data[0]?.price?.id;

    // Si ya está en el mismo plan, no hacemos nada
    if (currentPriceId === newPriceId) {
      return NextResponse.json({ message: "Ya estás en el plan solicitado" });
    }

    // --- UPGRADE (Básico → Premium)
    if (plan === "PREMIUM") {
      // Inmediato con prorrateo
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

      // Puedes actualizar la DB de inmediato
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        subscriptionId: updatedSubscription.id,
      });

      return NextResponse.json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    // --- DOWNGRADE (Premium → Básico)
    if (plan === "BASICO") {
      // Opción A) SubscriptionSchedules con "from_subscription" + "phases"
      // Haremos un schedule que cambie el precio a Básico al final del ciclo
      // sin necesidad de crear una sub distinta ni pedir un nuevo checkout.
      // Requiere la API Beta (acacia) y no te pide un trial.

      // 1) Creamos un schedule a partir de la suscripción actual
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: currentSubscriptionId, // Tomamos items de la sub
        // Para que no se finalice la sub en lo que resta, sino se actualice a Basic
        end_behavior: "release", // al final, la suscripción sigue viva con el plan nuevo

        phases: [
          // Fase actual: se mantiene el plan Premium hasta current_period_end
          {
            // start_date: subscriptionSchedules en la Beta a veces te deja omitir
            // por defecto, es 'immediate' o actual
            items: [
              {
                price: currentPriceId,
                quantity: 1,
              },
            ],
            // No acota la fecha, se mantiene Premium por lo que quede
            end_date: currentSubscription.current_period_end,
          },
          // Fase 2: cambia a Básico a partir de current_period_end
          {
            items: [
              {
                price: newPriceId,
                quantity: 1,
              },
            ],
          },
        ],
      });

      console.log("[stripe-create] Downgrade programado con schedule:", schedule.id);

      // 2) En la DB, mantenemos plan= "PREMIUM" hasta que acabe
      // Cuando Stripe pase a la fase 2, se disparará "customer.subscription.updated"
      // y en tu webhook ya pondrás plan= "BASICO", etc.
      await empresaRef.update({
        plan: "PREMIUM",
        estado_plan: "PREMIUM",
        // Podrías guardar subscriptionScheduleId si lo deseas
        subscriptionScheduleId: schedule.id,
      });

      return NextResponse.json({
        message:
          "Downgrade programado con SubscriptionSchedule. Mantendrás Premium hasta el final del ciclo, luego pasarás automáticamente a Básico.",
      });

      // Opción B) Trial:
      // - Se cancelar_at_period_end = true y crear un checkout con trial_end = currentSubscription.current_period_end
      //   (lo que tienes en tu snippet).
      //   Si prefieres esa vía, coméntalo y usa la 'trial' en vez de schedule.

      // ... (no se ejecuta si devuelves en Opción A)

    }

    return NextResponse.json({ message: "Operación completada (sin cambios)" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
