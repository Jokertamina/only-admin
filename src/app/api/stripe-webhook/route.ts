// src/app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb } from "../../../lib/firebaseAdminConfig";
import admin from "firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    console.error(`⚠️  Webhook Error: ${err}`);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  const session = event.data.object as
    | Stripe.Subscription
    | Stripe.Checkout.Session
    | Stripe.Invoice
    | Stripe.Charge;
  // Intentamos leer los metadatos
  const metadata = session.metadata || {};
  let empresaId = metadata.empresaId;

  // Si no viene empresaId en metadata, usamos el customer id para buscar la empresa
  if (!empresaId) {
    let customerId: string | undefined;
    if ("customer" in session && typeof session.customer === "string") {
      customerId = session.customer;
    }
    if (!customerId) {
      console.warn("Evento sin empresaId ni customer id, ignorado");
      return NextResponse.json({ message: "Evento sin empresaId ni customer id" });
    }
    const querySnapshot = await adminDb
      .collection("Empresas")
      .where("stripeCustomerId", "==", customerId)
      .get();
    if (querySnapshot.empty) {
      console.warn(`No se encontró empresa para customer id: ${customerId}`);
      return NextResponse.json({ message: "No se encontró empresa para customer id" });
    }
    empresaId = querySnapshot.docs[0].id;
  }

  const empresaRef = adminDb.collection("Empresas").doc(empresaId);

  switch (event.type) {
    case "checkout.session.completed":
      if (metadata.downgrade === "true") {
        // Confirmación de downgrade
        await empresaRef.update({ downgradePending: true });
        console.log(`✅ Downgrade confirmado para empresa ${empresaId}`);
      } else {
        // Nueva suscripción o cambio de plan
        const checkoutSession = session as Stripe.Checkout.Session;
        const subscriptionId = checkoutSession.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await empresaRef.update({
          subscriptionId,
          plan: metadata.plan,
          subscriptionStatus: subscription.status,
          subscriptionCreated: subscription.created,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          trialStart: subscription.trial_start || null,
          trialEnd: subscription.trial_end || null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at || null,
          endedAt: subscription.ended_at || null,
          downgradePending: false,
          failedPaymentsCount: 0,
        });

        console.log(
          `✅ Nueva suscripción ${metadata.plan} con detalles completos para empresa ${empresaId}`
        );

        // Notificamos el contrato (evento "contract")
        const empresaSnap = await empresaRef.get();
        const empresaData = empresaSnap.data();
        const email = empresaData?.email || "";
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/notify-company-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "contract",
            empresaId,
            email,
            plan: metadata.plan,
            subscriptionId,
          }),
        });
      }
      break;

    case "customer.subscription.updated":
      const subscriptionUpdated = session as Stripe.Subscription;
      const priceId = subscriptionUpdated.items.data[0].price.id;
      let updatedPlan = "SIN PLAN";

      if (priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID)
        updatedPlan = "PREMIUM";
      else if (priceId === process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID)
        updatedPlan = "BASICO";

      const now = Math.floor(Date.now() / 1000);
      const updateObj = {
        plan: updatedPlan,
        subscriptionStatus: subscriptionUpdated.status,
        currentPeriodStart: subscriptionUpdated.current_period_start,
        currentPeriodEnd: subscriptionUpdated.current_period_end,
        cancelAtPeriodEnd: subscriptionUpdated.cancel_at_period_end,
        canceledAt: subscriptionUpdated.canceled_at || null,
        endedAt: subscriptionUpdated.ended_at || null,
        downgradePending: false,
        ...(updatedPlan === "BASICO" &&
          subscriptionUpdated.status === "active" &&
          (subscriptionUpdated.trial_end || 0) <= now
          ? { subscriptionId: subscriptionUpdated.id }
          : {}),
      };

      await empresaRef.update(updateObj);

      console.log(
        `🔄 Suscripción sincronizada automáticamente a ${updatedPlan} con detalles completos para empresa ${empresaId}`
      );

      // Notificamos cambio de plan (evento "change")
      {
        const empresaSnap = await empresaRef.get();
        const empresaData = empresaSnap.data();
        const email = empresaData?.email || "";
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/notify-company-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "change",
            empresaId,
            email,
            plan: updatedPlan,
            subscriptionId: subscriptionUpdated.id,
          }),
        });
      }
      break;

    case "invoice.payment_succeeded":
      const invoice = session as Stripe.Invoice;
      if (
        invoice.billing_reason &&
        ["subscription_create", "subscription_cycle"].includes(invoice.billing_reason)
      ) {
        await empresaRef.update({
          subscriptionStatus: "active",
          failedPaymentsCount: 0,
        });
        console.log(`💳 Pago exitoso (${invoice.billing_reason}) para empresa ${empresaId}`);
      }
      break;

    case "invoice.payment_failed":
      await empresaRef.update({
        subscriptionStatus: "past_due",
        failedPaymentsCount: admin.firestore.FieldValue.increment(1),
      });

      const empresaSnap = await empresaRef.get();
      const empresaData = empresaSnap.data();

      if (empresaData && empresaData.failedPaymentsCount >= 3 && empresaData.subscriptionId) {
        await stripe.subscriptions.update(empresaData.subscriptionId, {
          cancel_at_period_end: true,
        });
        console.error(
          `⚠️ Suscripción suspendida automáticamente por múltiples fallos para empresa ${empresaId}`
        );
      } else {
        console.warn(
          `❌ Fallo en pago para empresa ${empresaId}, intento ${empresaData?.failedPaymentsCount || 1}`
        );
      }
      break;

    case "customer.subscription.deleted":
      const subscriptionDeleted = session as Stripe.Subscription;
      const customerId = subscriptionDeleted.customer;

      if (typeof customerId !== "string") {
        console.warn(`⚠️ customerId es inválido, evento ignorado para empresa ${empresaId}`);
        break;
      }

      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
        });

        // Buscamos específicamente la suscripción con el plan BASICO
        const basicSubscription = subscriptions.data.find((sub) =>
          ["active", "trialing"].includes(sub.status) &&
          sub.items.data[0].price.id === process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID
        );

        if (basicSubscription) {
          await empresaRef.update({
            subscriptionId: basicSubscription.id,
            plan: "BASICO",
            subscriptionStatus: basicSubscription.status,
            subscriptionCreated: basicSubscription.created,
            currentPeriodStart: basicSubscription.current_period_start,
            currentPeriodEnd: basicSubscription.current_period_end,
            trialStart: basicSubscription.trial_start || null,
            trialEnd: basicSubscription.trial_end || null,
            cancelAtPeriodEnd: basicSubscription.cancel_at_period_end,
            canceledAt: basicSubscription.canceled_at || null,
            endedAt: basicSubscription.ended_at || null,
            downgradePending: false,
          });

          console.warn(
            `🔄 Suscripción actualizada automáticamente a BASICO tras cancelar premium para empresa ${empresaId}`
          );
        } else {
          console.warn(
            `🚫 No se encontraron suscripciones activas para cliente: ${customerId}. Marcando como SIN PLAN.`
          );

          await empresaRef.update({
            subscriptionStatus: "canceled",
            plan: "SIN PLAN",
            subscriptionId: admin.firestore.FieldValue.delete(),
            cancelAtPeriodEnd: false,
            canceledAt: Math.floor(Date.now() / 1000),
            endedAt: Math.floor(Date.now() / 1000),
            downgradePending: false,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            trialStart: null,
            trialEnd: null,
          });
        }

        // Notificamos eliminación (evento "delete")
        const empresaSnap = await empresaRef.get();
        const empresaData = empresaSnap.data();
        const email = empresaData?.email || "";
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/notify-company-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "delete",
            empresaId,
            email,
            plan: "SIN_PLAN",
            subscriptionId: subscriptionDeleted.id,
          }),
        });
      } catch (error) {
        console.error(
          `⚠️ Error al procesar 'customer.subscription.deleted' para empresa ${empresaId}:`,
          error
        );
      }
      break;

    case "charge.refunded":
      await empresaRef.update({
        subscriptionStatus: "refunded",
      });

      console.warn(`💸 Pago reembolsado manualmente para empresa ${empresaId}. Revisa manualmente.`);
      break;

    default:
      console.warn(`⚠️ Evento no manejado: ${event.type}`);
      break;
  }

  return NextResponse.json({ received: true });
}
