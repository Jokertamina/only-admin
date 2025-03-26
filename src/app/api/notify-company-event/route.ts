import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Asegúrate de enviar "nombre" en el body
    const { eventType, empresaId, nombre, email, plan, subscriptionId } = body;

    let message = "";
    let planDetails = "";

    // Si necesitas detalles de la suscripción, los obtienes aquí
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        planDetails = `\nPeriodo actual: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`;
      } catch (err) {
        console.error("Error obteniendo detalles de la suscripción:", err);
      }
    }

    switch (eventType) {
      case "register":
        message = `Nueva empresa registrada.
Empresa ID: ${empresaId}
Nombre: ${nombre}
Email: ${email}
Revisa el panel de administración.`;
        break;

      case "contract":
        message = `La empresa "${nombre}" (ID: ${empresaId}) ha contratado un plan.
Email: ${email}
Plan: ${plan}${planDetails}
Verifica los detalles de la contratación.`;
        break;

      case "change":
        message = `La empresa "${nombre}" (ID: ${empresaId}) ha cambiado su plan.
Email: ${email}
Nuevo plan: ${plan}${planDetails}
Verifica el cambio en el sistema.`;
        break;

      case "delete":
        message = `La empresa "${nombre}" (ID: ${empresaId}) ha eliminado su cuenta.
Email: ${email}
Todos los datos serán eliminados.`;
        break;

      default:
        message = `Evento desconocido para la empresa "${nombre}" (ID: ${empresaId}).`;
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token || !chatId) {
      throw new Error("Falta definir TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID en las variables de entorno.");
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });

    const telegramResponse = await res.json();
    console.log("Respuesta completa de Telegram:", telegramResponse);
    if (!telegramResponse.ok) {
      throw new Error("Error al enviar notificación a Telegram");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en notify-company-event:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
