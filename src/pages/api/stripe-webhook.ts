// src/pages/api/stripe-webhook.ts

import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import * as admin from "firebase-admin";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2022-11-15",
});

// Inicializa Firebase Admin si aún no está inicializado
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

// Función para leer el raw body usando un bucle asíncrono
async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[stripe-webhook] Método recibido:", req.method);

  // Manejo de preflight OPTIONS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, stripe-signature"
    );
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
  } catch (err: unknown) {
    console.error("[stripe-webhook] Error verificando firma de Stripe:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extraer subscriptionId, plan y empresaId
        const subscriptionId = session.subscription as string | undefined;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        console.log("[stripe-webhook] Datos recibidos en webhook:");
        console.log(`🔹 Subscription ID: ${subscriptionId}`);
        console.log(`🔹 Plan: ${plan}`);
        console.log(`🔹 Empresa ID: ${empresaId}`);

        if (!subscriptionId || !plan || !empresaId) {
          console.error("[stripe-webhook] ❌ Error: Faltan datos en la sesión.");
          return res.status(400).send("Faltan datos en la sesión.");
        }

        // Referencia al documento de la empresa
        const empresaRef = admin.firestore().collection("Empresas").doc(empresaId);

        // Revisamos si el documento existe antes de actualizar
        const empresaDoc = await empresaRef.get();
        if (!empresaDoc.exists) {
          console.error(`[stripe-webhook] ❌ Error: Empresa ${empresaId} no encontrada.`);
          return res.status(404).send(`Empresa ${empresaId} no encontrada.`);
        }

        console.log(`[stripe-webhook] 🔹 Actualizando Firestore para empresa: ${empresaId}`);

        // Guardamos en Firestore usando una **transacción** para evitar problemas de concurrencia
        await admin.firestore().runTransaction(async (transaction) => {
          transaction.update(empresaRef, {
            plan,
            subscriptionId,
          });
        });

        console.log(
          `[stripe-webhook] ✅ Firestore actualizado: Plan (${plan}) y Subscription ID (${subscriptionId}) para empresa: ${empresaId}`
        );

        break;
      }

      default:
        console.log(`[stripe-webhook] ⚠️ Evento no manejado: ${event.type}`);
        break;
    }
  } catch (error: unknown) {
    console.error("[stripe-webhook] ❌ Error procesando el evento:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).send(`Event processing error: ${errorMessage}`);
  }

  return res.status(200).send("OK");
}
