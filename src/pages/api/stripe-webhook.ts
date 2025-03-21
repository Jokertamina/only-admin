// src/pages/api/stripe-webhook.ts

import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import * as admin from "firebase-admin";

export const config = {
  api: { bodyParser: false }, // Para leer el body crudo
};

// Forzamos la versión con "as any"
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as unknown as Stripe.LatestApiVersion,
});


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

// Para obtener el raw body en Vercel
async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[stripe-webhook] Método recibido:", req.method);

  // Manejo de OPTIONS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
    return res.status(200).send("OK");
  }

  // Solo POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  // Leemos el raw body y construimos el evento
  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe-webhook] Error verificando firma:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      // 1) checkout.session.completed => P.ej. si deseas algo puntual cuando finaliza Checkout
      case "checkout.session.completed": {
        console.log("[stripe-webhook] checkout.session.completed");
        // Si quisieras, puedes actualizar algo en la DB,
        // pero habitualmente "customer.subscription.created"/"updated" da más info.
        break;
      }

      // 2) customer.subscription.created
      case "customer.subscription.created":
      // 3) customer.subscription.updated
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Subscription ${subscription.id} => ${event.type}`);

        // Intentamos leer empresaId de metadata
        const empresaId = subscription.metadata?.empresaId;

        // Si no lo tenemos, buscar con where("subscriptionId","==",subscription.id) 
        if (!empresaId) {
          console.log("[stripe-webhook] ❌ No hay metadata.empresaId en la sub. Hacer where(...) si es tu caso.");
          break;
        }

        const empresaRef = admin.firestore().collection("Empresas").doc(empresaId);

        // Recolectamos datos relevantes
        const updateData: Record<string, unknown> = {
          subscriptionId: subscription.id,
          status: subscription.status ?? "unknown",
          plan: subscription.items.data[0]?.price?.id ?? "SIN_PLAN",
          subscriptionCreated: subscription.created ?? null,
          currentPeriodStart: subscription.current_period_start ?? null,
          currentPeriodEnd: subscription.current_period_end ?? null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          canceledAt: subscription.canceled_at ?? null,
          trialStart: subscription.trial_start ?? null,
          trialEnd: subscription.trial_end ?? null,
          endedAt: subscription.ended_at ?? null,
        };

        // Ajustamos "estado_plan" a tu gusto
        if (subscription.status === "active") {
          updateData.estado_plan = "BASICO"; // O "PREMIUM", depende de la logic
        } else if (subscription.status === "trialing") {
          updateData.estado_plan = "TRIAL";
        } else {
          updateData.estado_plan = subscription.status;
        }

        await empresaRef.update(updateData);
        console.log(`[stripe-webhook] DB actualizada con sub info =>`, updateData);

        break;
      }

      // 4) customer.subscription.deleted
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Subscription ${subscription.id} => deleted`);

        const empresaId = subscription.metadata?.empresaId; 
        if (!empresaId) {
          // si no tienes metadata, hacer un where
          break;
        }

        const empresaRef = admin.firestore().collection("Empresas").doc(empresaId);

        await empresaRef.update({
          plan: "SIN_PLAN",
          status: "canceled",
          subscriptionId: "",
          estado_plan: "SIN_PLAN",
        });
        console.log(`[stripe-webhook] Empresa ${empresaId} => sin suscripción`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Evento no manejado: ${event.type}`);
        break;
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("[stripe-webhook] ❌ Error procesando evento:", error);
    return res.status(400).send(`Event processing error: ${error}`);
  }
}
