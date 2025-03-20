import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

export async function POST(req: NextRequest) {
    const { subscriptionId } = await req.json();
  
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
  
      return NextResponse.json({
        success: true,
        subscription,
      });
    } catch (error: unknown) {  // 👈 Cambiamos `any` por `unknown`
      if (error instanceof Error) {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Ocurrió un error al cancelar la suscripción." },
        { status: 400 }
      );
    }
  }
  
