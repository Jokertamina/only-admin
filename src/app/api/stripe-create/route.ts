// /pages/api/stripe-create.ts (si usas Pages Router)
// o /app/api/stripe-create/route.ts (si usas App Router)

import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig"; // Ajusta la ruta según tu proyecto

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("[stripe-create] Método recibido:", req.method);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json("Method Not Allowed");
  }

  let body: { plan?: string; empresaId?: string };
  try {
    body = req.body;
  } catch {
    return res.status(400).json("Invalid JSON");
  }

  const { plan, empresaId } = body;
  if (!plan || !empresaId) {
    return res.status(400).json("Missing required fields");
  }

  try {
    // 1) Verificamos si la empresa existe en DB
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) {
      return res.status(404).json("Empresa no encontrada");
    }

    const data = empresaSnap.data() || {};
    let stripeCustomerId = data.stripeCustomerId;
    const currentSubscriptionId = data.subscriptionId;

    // 2) Determinamos los Price IDs
    const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;
    const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
    const newPriceId = plan === "PREMIUM" ? premiumPriceId : basicPriceId;

    // 3) Creamos cliente Stripe si no existe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: data.email || undefined,
        metadata: { empresaId },
      });
      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 4) Si no hay suscripción previa, creamos nueva sesión de Checkout
    if (!currentSubscriptionId) {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://tudominio.com/payment-success",
        cancel_url: "https://tudominio.com/payment-cancel",
        customer: stripeCustomerId,
        line_items: [
          { price: newPriceId, quantity: 1 },
        ],
        metadata: { empresaId, plan },
      });
      console.log("[stripe-create] Sesión creada (nueva suscripción):", session.id);

      // No seteamos el plan aquí; lo hará el webhook checkout.session.completed
      return res.status(200).json({
        url: session.url,
        message: "Sesión de pago creada. Completa el pago para activar tu plan.",
      });
    }

    // 5) Hay suscripción activa: la obtenemos
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);
    const currentPriceId = currentSubscription.items.data[0]?.price?.id;

    // Si ya está en el mismo plan, no hacemos nada
    if (currentPriceId === newPriceId) {
      return res.status(200).json({ message: "Ya estás en el plan solicitado" });
    }

    // --- UPGRADE (Básico → Premium) ---
    if (plan === "PREMIUM") {
      // Actualizamos la suscripción de inmediato con prorrateo
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

      // Actualizamos en DB: plan = "PREMIUM", downgradePending = false
      await empresaRef.update({
        plan: "PREMIUM",
        subscriptionId: updatedSubscription.id,
        downgradePending: false,
      });

      return res.status(200).json({
        message: "Plan actualizado a Premium de forma inmediata",
      });
    }

    // --- DOWNGRADE (Premium → Básico) ---
    if (plan === "BASICO") {
      // Creamos un schedule para cambiar el precio al final del ciclo
      // Sin start_date, Stripe lo calcula automáticamente al final del ciclo
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: currentSubscriptionId,
        end_behavior: "release",
        phases: [
          {
            items: [{ price: newPriceId, quantity: 1 }],
            proration_behavior: "none",
          },
        ],
      });
      console.log("[stripe-create] Downgrade programado (schedule):", schedule.id);

      // Mantenemos plan = "PREMIUM" y marcamos downgradePending = true
      await empresaRef.update({
        downgradePending: true,
      });

      return res.status(200).json({
        message: "Downgrade programado. Mantendrás Premium hasta el final del ciclo.",
      });
    }

    return res.status(200).json({ message: "Operación completada" });
  } catch (error) {
    console.error("[stripe-create] Error:", error);
    return res.status(500).json("Internal Server Error");
  }
}
