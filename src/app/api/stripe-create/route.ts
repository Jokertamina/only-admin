// src/app/api/stripe-webhook/route.ts

import Stripe from "stripe";
import * as admin from "firebase-admin";
import { NextResponse } from "next/server";

export const config = {
  api: { bodyParser: false }, // Para leer el body crudo
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
});

// Inicialización de Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) throw new Error("FIREBASE_SERVICE_ACCOUNT no está definido");
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    console.log("[Firebase] Inicializado correctamente");
  } catch (error) {
    console.error("[Firebase] Error al inicializar:", error);
  }
}

const EMPRESAS_COLLECTION = "Empresas";

// Función para obtener el raw body en Next.js (Request nativo)
async function readRawBody(req: Request): Promise<Buffer> {
  const body = await req.arrayBuffer();
  return Buffer.from(body);
}

// Función auxiliar para actualizar la información de la empresa en Firestore
async function actualizarEmpresa(empresaId: string, updateData: Record<string, unknown>) {
  const empresaRef = admin.firestore().collection(EMPRESAS_COLLECTION).doc(empresaId);
  await empresaRef.update(updateData);
  console.log(`[stripe-webhook] Empresa ${empresaId} actualizada con:`, updateData);
}

export async function POST(req: Request) {
  console.log("[stripe-webhook] Método recibido:", req.method);

  // Manejo de OPTIONS
  if (req.method === "OPTIONS") {
    const response = NextResponse.json("OK", { status: 200 });
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
    return response;
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers.get("stripe-signature") || "";
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe-webhook] Error verificando firma:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("[stripe-webhook] checkout.session.completed");
        // Si es una sesión de downgrade, se marca la suscripción premium para cancelación al final del ciclo.
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        if (metadata.downgrade === "true" && metadata.currentSubscriptionId) {
          const currentSubscriptionId = metadata.currentSubscriptionId;
          await stripe.subscriptions.update(currentSubscriptionId, {
            cancel_at_period_end: true,
          });
          console.log(
            `[stripe-webhook] Downgrade confirmado: la suscripción premium ${currentSubscriptionId} se cancelará al final del ciclo.`
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Subscription ${subscription.id} => ${event.type}`);

        const empresaId = subscription.metadata?.empresaId;
        if (!empresaId) {
          console.log("[stripe-webhook] ❌ No hay metadata.empresaId en la suscripción.");
          break;
        }

        const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
        const subPriceId = subscription.items.data[0]?.price?.id;

        // Si se trata de una solicitud de downgrade, mantenemos PREMIUM hasta que finalice la trial.
        let newPlan: string;
        if (subscription.metadata?.downgrade === "true") {
          if (subscription.trial_end && subscription.trial_end * 1000 < Date.now()) {
            newPlan = "BASICO";
          } else {
            newPlan = "PREMIUM";
          }
        } else {
          newPlan = subPriceId === basicPriceId ? "BASICO" : "PREMIUM";
        }

        const updateData: Record<string, unknown> = {
          subscriptionId: subscription.id,
          status: subscription.status || "unknown",
          plan: newPlan,
          subscriptionCreated: subscription.created || null,
          currentPeriodStart: subscription.current_period_start || null,
          currentPeriodEnd: subscription.current_period_end || null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          canceledAt: subscription.canceled_at || null,
          trialStart: subscription.trial_start || null,
          trialEnd: subscription.trial_end || null,
          endedAt: subscription.ended_at || null,
          estado_plan: newPlan,
        };

        await actualizarEmpresa(empresaId, updateData);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Subscription ${subscription.id} => deleted`);
        const empresaId = subscription.metadata?.empresaId;
        if (empresaId) {
          await actualizarEmpresa(empresaId, {
            plan: "SIN_PLAN",
            status: "canceled",
            subscriptionId: "",
            estado_plan: "SIN_PLAN",
          });
          console.log(`[stripe-webhook] Empresa ${empresaId} => sin suscripción`);
        }
        break;
      }
      default:
        console.log(`[stripe-webhook] Evento no manejado: ${event.type}`);
        break;
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[stripe-webhook] ❌ Error procesando el evento:", error);
    return new Response(`Event processing error: ${error}`, { status: 400 });
  }
}
