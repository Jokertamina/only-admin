// src/pages/api/stripe-webhook.ts (Pages Router)
// o src/app/api/stripe-webhook/route.ts (App Router)

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

// Para obtener el raw body
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
      process.env.STRIPE_WEBHOOK_SECRET!
    );
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
          plan,
          estado_plan: plan,
          subscriptionId,
          downgradePending: false,
        });
        console.log(`[stripe-webhook] Nueva suscripción completada: plan=${plan}, subId=${subscriptionId}, empresa=${empresaId}`);
        break;
      }

      // 2) customer.subscription.deleted
      //    -> Al finalizar el ciclo, Premium pasa a status=canceled si cancel_at_period_end: true
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[stripe-webhook] subscription.deleted:", subscription.id);

        // Buscamos la empresa con subscriptionId
        const snap = await admin.firestore()
          .collection("Empresas")
          .where("subscriptionId", "==", subscription.id)
          .get();

        if (snap.empty) {
          console.log("[stripe-webhook] No se encontró empresa con subscriptionId =", subscription.id);
          break;
        }

        for (const doc of snap.docs) {
          const empresaData = doc.data();
          const empresaRef = doc.ref;
          const empresaId = doc.id;

          console.log(`[stripe-webhook] Suscripción Premium cancelada. Empresa: ${empresaId}`);

          // Si tenía downgradePending, creamos la nueva suscripción de Básico
          if (empresaData.downgradePending) {
            console.log(`[stripe-webhook] Creando nueva suscripción Básico para la empresa ${empresaId}...`);

            // 1. Obtenemos (o creamos) el stripeCustomerId
            let stripeCustomerId = empresaData.stripeCustomerId;
            if (!stripeCustomerId) {
              // Caso raro, pero por si no existiera
              const customer = await stripe.customers.create({
                email: empresaData.email || undefined,
                metadata: { empresaId },
              });
              stripeCustomerId = customer.id;
              await empresaRef.update({ stripeCustomerId });
            }

            // 2. Creamos la suscripción al plan Básico
            const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
            const newSubscription = await stripe.subscriptions.create({
              customer: stripeCustomerId,
              items: [{ price: basicPriceId }],
              metadata: { empresaId, plan: "BASICO" },
            });

            console.log(`[stripe-webhook] Nueva suscripción Básico creada: ${newSubscription.id}`);

            // 3. Actualizamos la DB: plan=BASICO y downgradePending=false
            await empresaRef.update({
              plan: "BASICO",
              estado_plan: "BASICO",
              subscriptionId: newSubscription.id,
              downgradePending: false,
            });
          } else {
            // Si no era un downgrade
            console.log(`[stripe-webhook] Empresa ${empresaId} sin downgradePending => plan=SIN_PLAN`);
            await empresaRef.update({
              plan: "SIN_PLAN",
              estado_plan: "SIN_PLAN",
              subscriptionId: "",
            });
          }
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
