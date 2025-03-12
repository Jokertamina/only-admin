// src/app/api/stripe-create/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: `https://adminpanel-rust-seven.vercel.app/payment-success`,
      cancel_url: `https://adminpanel-rust-seven.vercel.app/payment-cancel`,
      line_items: [
        {
          price:
            plan === "PREMIUM"
              ? "price_1Qz0I14PJGQ0KjHcFhMKlbiH"
              : "price_1Qz0HF4PJGQ0KjHcNAIjxbC8",
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
