import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// IMPORTA FIREBASE ADMIN SDK EN LUGAR DEL SDK DE CLIENTE
import { adminDb } from "../../../lib/firebaseAdminConfig"; // Se usa Admin SDK en lugar de db

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  console.log("[stripe-create] Método recibido:", request.method);

  // Verificamos que se trate de una petición POST
  if (request.method !== "POST") {
    return NextResponse.json("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json("Invalid JSON", { status: 400 });
  }

  const { plan, empresaId } = body as { plan?: string; empresaId?: string };
  if (!plan || !empresaId) {
    return NextResponse.json("Missing required fields", { status: 400 });
  }

  try {
    // 1) Obtenemos el doc de la empresa en Firestore usando Admin SDK
    const empresaRef = adminDb.collection("Empresas").doc(empresaId);
    const empresaSnap = await empresaRef.get();

    let stripeCustomerId: string | undefined;

    if (empresaSnap.exists) {
      // Leemos si ya existe el campo stripeCustomerId
      stripeCustomerId = empresaSnap.data()?.stripeCustomerId;
    }

    // 2) Si no existe, creamos un nuevo customer en Stripe y lo guardamos en Firestore
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: empresaSnap.data()?.email || undefined, // Si hay email en Firestore, se usa
        metadata: { empresaId },
      });

      stripeCustomerId = customer.id;
      await empresaRef.update({ stripeCustomerId });
    }

    // 3) Creamos la sesión de Checkout asociada al customer existente o recién creado
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `https://adminpanel-rust-seven.vercel.app/payment-success`,
      cancel_url: `https://adminpanel-rust-seven.vercel.app/payment-cancel`,
      customer: stripeCustomerId, // Usamos el mismo cliente
      line_items: [
        {
          price:
            plan === "PREMIUM"
              ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
              : process.env.NEXT_PUBLIC_STRIPE_BASICO_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: { empresaId, plan },
    });

    console.log("[stripe-create] Sesión creada:", session.id);
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("[stripe-create] Stripe error:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
