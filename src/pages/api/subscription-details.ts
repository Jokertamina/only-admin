import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { subscriptionId } = req.query;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Falta subscriptionId o es inválido",
    });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Usamos current_period_end como fecha de renovación y, si hay trial, trial_end como fecha de expiración; 
    // esto lo puedes ajustar según tu lógica.
    const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
    const expiryDate = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : renewalDate;

    const subscriptionData = {
      renewalDate,
      expiryDate,
      status: subscription.status,
    };

    res.status(200).json({ success: true, subscriptionData });
  } catch (error) {
    console.error("Error al obtener datos de la suscripción:", error);
    let errorMessage = "Error desconocido";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({
      success: false,
      message: "Error al obtener los datos de la suscripción",
      error: errorMessage,
    });
  }  
}
