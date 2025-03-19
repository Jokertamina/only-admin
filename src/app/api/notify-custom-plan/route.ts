import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, email, plan } = body; // Puedes ampliar los datos si lo necesitas

    // Construir el mensaje de notificación
    const message = `Nuevo plan personalizado solicitado.\nEmpresa ID: ${empresaId}\nEmail: ${email}\nPlan: ${plan}\nPor favor, contacta a la empresa para definir los detalles.`;

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
    if (!telegramResponse.ok) {
      throw new Error("Error al enviar notificación a Telegram");
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error en notify-custom-plan:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
