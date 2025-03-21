// src/app/api/stripe-webhook/route.ts

import Stripe from "stripe";
import * as admin from "firebase-admin";
import { NextResponse } from "next/server";

export const config = {
  api: { bodyParser: false }, // Para leer el body crudo (Stripe exige el payload sin parsear)
};

// Instancia de Stripe
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

/**
 * Handler para la ruta POST /api/stripe-webhook
 * Recibe los eventos de Stripe y actualiza la DB según el tipo de evento
 */
export async function POST(req: Request) {
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

  let event: Stripe.Event;
  let rawBody: Buffer;
  try {
    // 1) Leer el body crudo para poder verificar la firma
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error("[stripe-webhook] Error leyendo el body:", err);
    return new Response(`Error reading request body: ${err}`, { status: 400 });
  }

  // 2) Verificar la firma
  const signature = req.headers.get("stripe-signature") || "";
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe-webhook] Error verificando firma:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  // 3) Procesar el evento
  try {
    switch (event.type) {
      //-----------------------------------------------------------
      // Se completa el Checkout (pago). Si es un downgrade, marcamos
      // la suscripción actual para que se cancele al final del ciclo.
      //-----------------------------------------------------------
      case "checkout.session.completed": {
        console.log("[stripe-webhook] checkout.session.completed");
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

      //-----------------------------------------------------------
      // Suscripción creada/actualizada. Actualizamos la DB
      // con el plan actual.
      // Si es downgrade, mantenemos PREMIUM hasta que termine la trial,
      // y una vez finalizada, se actualiza a BASICO.
      //-----------------------------------------------------------
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Subscription ${subscription.id} => ${event.type}`);

        const empresaId = subscription.metadata?.empresaId;
        if (!empresaId) {
          console.log("[stripe-webhook] ❌ No hay metadata.empresaId en la suscripción.");
          break;
        }

        // [MODIFICACIÓN] Obtenemos el doc de la empresa para verificar si hay otra sub diferente
        const empresaRef = admin.firestore().collection(EMPRESAS_COLLECTION).doc(empresaId);
        const empresaSnap = await empresaRef.get();
        if (!empresaSnap.exists) {
          console.log("[stripe-webhook] Empresa no encontrada en DB.");
          break;
        }
        const empresaData = empresaSnap.data() || {};
        const oldSubId = empresaData.subscriptionId || "";

        // Si la DB ya apunta a otra suscripción distinta, no pisar la subscriptionId
        // a menos que sea "" o coincida con la suscripción actual.
        if (oldSubId && oldSubId !== subscription.id) {
          console.log(
            `[stripe-webhook] La DB apunta a otra sub (${oldSubId}), no sobrescribimos con ${subscription.id}`
          );
        }

        const basicPriceId = process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID!;
        const subPriceId = subscription.items.data[0]?.price?.id;
        let newPlan: string;

        if (subscription.metadata?.downgrade === "true") {
          // Si la trial ha terminado, cambiamos a BASICO, de lo contrario, se mantiene PREMIUM.
          if (subscription.trial_end && subscription.trial_end * 1000 < Date.now()) {
            newPlan = "BASICO";
          } else {
            newPlan = "PREMIUM";
          }
        } else {
          newPlan = subPriceId === basicPriceId ? "BASICO" : "PREMIUM";
        }

        const updateData: Record<string, unknown> = {
          // [MODIFICACIÓN] Solo actualizamos subscriptionId si no teníamos uno o si coincide con la actual
          ...( !oldSubId || oldSubId === subscription.id ? { subscriptionId: subscription.id } : {} ),
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

      //-----------------------------------------------------------
      // Suscripción eliminada. Validación cruzada:
      // Se consulta Firestore para ver si existe una bandera downgradePending.
      // Si existe, se actualiza el plan a BASICO en lugar de SIN_PLAN.
      //-----------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[stripe-webhook] Subscription ${subscription.id} => deleted`);

        const empresaId = subscription.metadata?.empresaId;
        if (empresaId) {
          const empresaRef = admin.firestore().collection(EMPRESAS_COLLECTION).doc(empresaId);
          const empresaSnap = await empresaRef.get();
          const empresaData = empresaSnap.data() || {};
          const oldSubId = empresaData.subscriptionId || "";
          let newPlan = "SIN_PLAN";

          // [MODIFICACIÓN] Solo borramos subscriptionId si coincide con la sub eliminada
          if (empresaData.downgradePending) {
            newPlan = "BASICO";
          }

          if (oldSubId === subscription.id) {
            // OK, estamos borrando la suscripción que la DB cree que es la activa
            await actualizarEmpresa(empresaId, {
              plan: newPlan,
              status: "canceled",
              subscriptionId: "",
              estado_plan: newPlan,
              downgradePending: false,
            });
            console.log(
              `[stripe-webhook] Empresa ${empresaId} actualizada a plan ${newPlan} (se eliminó la subId ${subscription.id})`
            );
          } else {
            // Si no coincide, dejamos la DB como está
            console.log(
              `[stripe-webhook] La subId ${subscription.id} no coincide con la DB (${oldSubId}), no modificamos la DB.`
            );
          }
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
