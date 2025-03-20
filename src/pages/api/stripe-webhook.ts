// src/pages/api/stripe-webhook.ts (con Pages Router)
// o /app/api/stripe-webhook/route.ts (App Router)

import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import * as admin from "firebase-admin";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
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

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[stripe-webhook] Método recibido:", req.method);
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
    return res.status(200).send("OK");
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

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
      // 1) checkout.session.completed
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string | undefined;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;
        if (!subscriptionId || !plan || !empresaId) {
          console.error("[stripe-webhook] Faltan datos en checkout.session.completed");
          return res.status(400).send("Faltan datos en la sesión.");
        }

        // Actualizamos la DB para reflejar el nuevo plan
        const empresaRef = admin.firestore().collection("Empresas").doc(empresaId);
        await empresaRef.update({
          estado_plan: plan,
          subscriptionId,
          proximo_plan: "", // Por si tenía algo
        });
        console.log(`[stripe-webhook] Nueva suscripción: plan=${plan}, subId=${subscriptionId}, empresa=${empresaId}`);
        break;
      }

      // 2) customer.subscription.updated 
      //    -> Ocurre cuando la suscripción cambia de precio (por schedule) o se renueva
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[stripe-webhook] subscription.updated:", subscription.id, subscription.items.data[0]?.price?.id);

        // Buscamos la empresa con ese subscriptionId
        const snap = await admin.firestore()
          .collection("Empresas")
          .where("subscriptionId", "==", subscription.id)
          .get();

        if (snap.empty) {
          console.log("[stripe-webhook] No se encontró empresa con subscriptionId =", subscription.id);
          break;
        }

        // Revisamos el price actual en la sub
        const newPriceId = subscription.items.data[0]?.price?.id;
        // Recolectamos IDs
        const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
        const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!;

        snap.forEach(async (doc) => {
          const empresaData = doc.data();
          const ref = doc.ref;

          // 2.1. Caso: Si era un downgrade programado (proximo_plan= "BÁSICO")
          // y Stripe cambió el precio al plan Básico, finalizamos el downgrade
          if (empresaData.proximo_plan === "BASICO" && newPriceId === basicPriceId) {
            console.log("[stripe-webhook] Downgrade completado para empresa:", doc.id);
            await ref.update({
              estado_plan: "BASICO",
              proximo_plan: "",
            });
          }
          // 2.2. (Opcional) Si detectas que era un upgrade programado o algo similar
          // Podrías manejar otros casos si quisieras
        });
        break;
      }

      // 3) customer.subscription.deleted
      //    -> si se cancela completamente la suscripción (manual o al final)
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[stripe-webhook] subscription.deleted:", subscription.id);
        const snap = await admin.firestore()
          .collection("Empresas")
          .where("subscriptionId", "==", subscription.id)
          .get();

        if (!snap.empty) {
          snap.forEach(async (doc) => {
            // Podrías poner plan="SIN_PLAN", subscriptionId="", proximo_plan="" 
            // para reflejar que ya no tiene suscripción
            console.log("[stripe-webhook] Suscripción eliminada. Empresa:", doc.id);
            await doc.ref.update({
              estado_plan: "SIN_PLAN",
              proximo_plan: "",
              subscriptionId: "",
            });
          });
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Evento no manejado: ${event.type}`);
        break;
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("[stripe-webhook] Error procesando evento:", error);
    return res.status(400).send(`Event processing error: ${error}`);
  }
}
