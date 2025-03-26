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
  const metadata = session.metadata || {};
  const empresaId = metadata.empresaId;

  if (!empresaId) {
    console.warn("Evento sin empresaId, ignorado");
    return NextResponse.json({ message: "Evento sin empresaId" });
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

        console.log(`✅ Nueva suscripción ${metadata.plan} con detalles completos empresa ${empresaId}`);
      }
      break;

      case "customer.subscription.updated":
  const subscriptionUpdated = session as Stripe.Subscription;
  const priceId = subscriptionUpdated.items.data[0].price.id;
  let updatedPlan = "SIN PLAN";

  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID) updatedPlan = "PREMIUM";
  else if (priceId === process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID) updatedPlan = "BASICO";

  const now = Math.floor(Date.now() / 1000);
  // Usamos spread para condicionar la actualización de subscriptionId
  const updateObj = {
    plan: updatedPlan,
    subscriptionStatus: subscriptionUpdated.status,
    currentPeriodStart: subscriptionUpdated.current_period_start,
    currentPeriodEnd: subscriptionUpdated.current_period_end,
    cancelAtPeriodEnd: subscriptionUpdated.cancel_at_period_end,
    canceledAt: subscriptionUpdated.canceled_at || null,
    endedAt: subscriptionUpdated.ended_at || null,
    downgradePending: false,
    ...( updatedPlan === "BASICO" &&
        subscriptionUpdated.status === "active" &&
        (subscriptionUpdated.trial_end || 0) <= now
      ? { subscriptionId: subscriptionUpdated.id }
      : {} )
  };

  await empresaRef.update(updateObj);

  console.log(`🔄 Suscripción sincronizada automáticamente a ${updatedPlan} con detalles completos empresa ${empresaId}`);
  break;

      
      case "invoice.payment_succeeded":
        const invoice = session as Stripe.Invoice;
        if (invoice.billing_reason && ["subscription_create", "subscription_cycle"].includes(invoice.billing_reason)) {
          await empresaRef.update({
            subscriptionStatus: "active",
            failedPaymentsCount: 0,
          });
          console.log(`💳 Pago exitoso (${invoice.billing_reason}) empresa ${empresaId}`);
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
        await stripe.subscriptions.update(empresaData.subscriptionId, { cancel_at_period_end: true });
        console.error(`⚠️ Suscripción suspendida automáticamente por múltiples fallos empresa ${empresaId}`);
      } else {
        console.warn(`❌ Fallo en pago empresa ${empresaId}, intento ${empresaData?.failedPaymentsCount || 1}`);
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

        const activeOrTrialSubscription = subscriptions.data.find((sub) =>
          ["active", "trialing"].includes(sub.status)
        );

        if (activeOrTrialSubscription) {
          const newPlanPriceId = activeOrTrialSubscription.items.data[0].price.id;
          let newPlan = "SIN PLAN";

          if (newPlanPriceId === process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID) newPlan = "BASICO";
          else if (newPlanPriceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID) newPlan = "PREMIUM";

          await empresaRef.update({
            subscriptionId: activeOrTrialSubscription.id,
            plan: newPlan,
            subscriptionStatus: activeOrTrialSubscription.status,
            subscriptionCreated: activeOrTrialSubscription.created,
            currentPeriodStart: activeOrTrialSubscription.current_period_start,
            currentPeriodEnd: activeOrTrialSubscription.current_period_end,
            trialStart: activeOrTrialSubscription.trial_start || null,
            trialEnd: activeOrTrialSubscription.trial_end || null,
            cancelAtPeriodEnd: activeOrTrialSubscription.cancel_at_period_end,
            canceledAt: activeOrTrialSubscription.canceled_at || null,
            endedAt: activeOrTrialSubscription.ended_at || null,
            downgradePending: false,
          });

          console.warn(`🔄 Suscripción actualizada automáticamente a ${newPlan} tras cancelar anterior empresa ${empresaId}`);
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

      console.warn(`💸 Pago reembolsado manualmente, empresa ${empresaId}. Revisa manualmente.`);
      break;

    default:
      console.warn(`⚠️ Evento no manejado: ${event.type}`);
      break;
  }

  return NextResponse.json({ received: true });
}
