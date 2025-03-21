//src/app/api/stripe-create-custom/route.tsx

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "../../../lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any, // Ajusta según tu versión
});

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();
    if (!empresaId) {
      return NextResponse.json({ error: "Falta empresaId" }, { status: 400 });
    }

    // Obtener el documento de la empresa para leer el setupFee
    const empresaRef = doc(db, "Empresas", empresaId);
    const empresaSnap = await getDoc(empresaRef);
    if (!empresaSnap.exists()) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }
    const empresaData = empresaSnap.data();
    const setupFee = empresaData.setupFee;
    if (setupFee === undefined || setupFee === null) {
      return NextResponse.json(
        { error: "No se ha definido setupFee para esta empresa" },
        { status: 400 }
      );
    }

    // Precio mensual (55€) configurado en Stripe (asegúrate de definirlo en tu .env)
    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_CUSTOM_MONTHLY_PRICE_ID;
    if (!monthlyPriceId) {
      return NextResponse.json(
        { error: "Falta NEXT_PUBLIC_STRIPE_CUSTOM_MONTHLY_PRICE_ID" },
        { status: 400 }
      );
    }

    // Crear la sesión de Stripe Checkout:
    // - Se cobra inmediatamente el setupFee (pago único)
    // - Se crea la suscripción de 55€/mes, con trial de 30 días (la cuota inicia al segundo mes)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: "https://tu-dominio.com/payment-success",
      cancel_url: "https://tu-dominio.com/payment-cancel",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Coste inicial plan personalizado",
            },
            unit_amount: setupFee * 100, // conversión a céntimos
          },
          quantity: 1,
        },
        {
          price: monthlyPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: { empresaId },
      },
      metadata: {
        empresaId,
        plan: "CUSTOM",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Error en stripe-create-custom:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
