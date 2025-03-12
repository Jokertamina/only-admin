// src/app/api/stripe-webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import * as admin from "firebase-admin";

// Inicializa Stripe
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


// Función para leer el raw body
async function readRawBody(request: NextRequest): Promise<Buffer> {
  return Buffer.from(await request.arrayBuffer());
}

export async function POST(request: NextRequest) {
  console.log("[stripe-webhook] Método recibido:", request.method);

  // Manejo de preflight OPTIONS
  if (request.method === "OPTIONS") {
    const res = NextResponse.json("OK", { status: 200 });
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
    return res;
  }

  if (request.method !== "POST") {
    const res = NextResponse.json("Method Not Allowed", { status: 405 });
    res.headers.set("Allow", "POST");
    return res;
  }

  const rawBody = await readRawBody(request);
  const signature = request.headers.get("stripe-signature") || "";

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
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        if (plan && empresaId) {
          await admin.firestore().collection("Empresas").doc(empresaId).update({ plan });
          console.log(
            `[stripe-webhook] Plan actualizado a ${plan} para empresa: ${empresaId}`
          );
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
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  return NextResponse.json("OK", { status: 200 });
}
