// src/pages/api/stripe-webhook.ts

import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import * as admin from "firebase-admin";

export const config = {
  api: {
    bodyParser: false, // Para poder leer el raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

// Inicializa Firebase Admin si no está inicializado
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT no está definido");
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    console.log("[Firebase] Inicializado correctamente");
  } catch (error) {
    console.error("[Firebase] Error al inicializar:", error);
  }
}

// Para leer el body crudo
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
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("[stripe-webhook] Error verificando firma:", err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      // 1) checkout.session.completed -> suscripción nueva (o upgrade con Checkout)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string | undefined;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        if (!subscriptionId || !plan || !empresaId) {
          console.error("[stripe-webhook] Faltan datos en checkout.session.completed");
          return res.status(400).send("Faltan datos en la sesión.");
        }

        // Actualizamos la DB con plan y subscriptionId
        const empresaRef = admin.firestore().collection("Empresas").doc(empresaId);
        await empresaRef.update({ plan, subscriptionId, downgradePending: false });
        console.log(`[stripe-webhook] Nueva suscripción: plan=${plan}, subId=${subscriptionId}, empresa=${empresaId}`);
        break;
      }

      // 2) customer.subscription.updated o customer.subscription.deleted
      //    -> se usa para detectar cambio de precio (schedule) o cancelaciones.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Evento: ${event.type}, subId=${subscription.id}, status=${subscription.status}`);

        // Buscamos la empresa con subscriptionId = subscription.id
        const snap = await admin
          .firestore()
          .collection("Empresas")
          .where("subscriptionId", "==", subscription.id)
          .get();

        if (snap.empty) {
          console.log(`[stripe-webhook] No se encontró empresa con subscriptionId=${subscription.id}`);
          break;
        }

        snap.forEach(async (doc) => {
          const empresaData = doc.data();
          const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
          const newPriceId = subscription.items.data[0]?.price?.id;

          // Si la suscripción se canceló completamente (status=canceled)
          if (subscription.status === "canceled") {
            // Si era un downgrade programado, marcamos plan=BASICO
            // o, si prefieres, plan="SIN_PLAN" si no era un downgrade.
            if (empresaData.downgradePending) {
              console.log(`[stripe-webhook] Suscripción cancelada con downgradePending. Asignamos BASICO. Empresa: ${doc.id}`);
              await doc.ref.update({
                plan: "BASICO",
                downgradePending: false,
                subscriptionId: "",
              });
            } else {
              console.log(`[stripe-webhook] Suscripción cancelada sin downgradePending. Empresa: ${doc.id}`);
              // Ejemplo: pon plan="SIN_PLAN" si quieres reflejar que ya no tiene suscripción
              await doc.ref.update({
                plan: "SIN_PLAN",
                subscriptionId: "",
              });
            }
          }
          // Si la suscripción sigue activa, comprobamos si cambió el precio a Básico
          else {
            if (empresaData.downgradePending === true && newPriceId === basicPriceId) {
              console.log("[stripe-webhook] Downgrade completado (schedule) para la empresa:", doc.id);
              await doc.ref.update({
                plan: "BASICO",
                downgradePending: false,
              });
            }
          }
        });
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
