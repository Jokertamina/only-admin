// src/pages/api/stripe-webhook.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// Inicializa Firebase Admin si no se ha inicializado ya
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT no está definido.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });

    console.log("[Firebase] Inicialización exitosa.");
  } catch (error) {
    console.error("[Firebase] Error al inicializar:", error);
  }
}

// Función para leer el raw body (sin parsear)
async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("[stripe-webhook] Método recibido:", req.method);

  // Manejo de preflight OPTIONS
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
  } catch (err: unknown) {
    console.error("[stripe-webhook] Error verificando firma de Stripe:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        if (plan && empresaId) {
          // Retry con Exponential Backoff
          let attempts = 0;
          const maxAttempts = 5;
          let success = false;
          let backoffMs = 500; // tiempo base en ms

          while (!success && attempts < maxAttempts) {
            try {
              await admin
                .firestore()
                .collection("Empresas")
                .doc(empresaId)
                .update({ plan });

              console.log(
                `[stripe-webhook] Plan actualizado a ${plan} para empresa: ${empresaId}`
              );
              success = true;
            } catch (updateError) {
              if (
                updateError instanceof Error &&
                updateError.message.includes("RESOURCE_EXHAUSTED")
              ) {
                attempts++;
                console.warn(
                  `[stripe-webhook] Reintento ${attempts}/${maxAttempts} tras error de rate limit...`
                );
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                backoffMs *= 2; // duplicamos el tiempo de espera
              } else {
                throw updateError;
              }
            }
          }

          if (!success) {
            throw new Error(
              `No se pudo actualizar el plan tras ${maxAttempts} reintentos.`
            );
          }
        }
        break;
      }
      default:
        console.log(`[stripe-webhook] Evento no manejado: ${event.type}`);
        break;
    }
  } catch (error: unknown) {
    console.error("[stripe-webhook] Error procesando el evento:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(400).send(`Event processing error: ${errorMessage}`);
  }

  return res.status(200).send("OK");
}
