// api/stripe-webhook.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { Readable } from 'stream';
import * as admin from 'firebase-admin';

// Desactivamos el body parser para Stripe
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia', // O la versión que uses
});

// Inicializa Firebase si no está inicializado
if (!admin.apps.length) {
  // Aquí usarás la variable de entorno con la JSON que pegaste en Vercel
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Función para leer el cuerpo como raw
async function readRawBody(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Webhook principal
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Error verificando firma de Stripe:', err);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        if (plan && empresaId) {
          await admin
            .firestore()
            .collection('Empresas')
            .doc(empresaId)
            .update({ plan });
          console.log(`Plan actualizado a ${plan} para la empresa ${empresaId}`);
        }
        break;
      }

      default:
        console.log(`Evento no manejado: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error('Error procesando el evento:', error);
    return res.status(400).send(`Event processing error: ${error}`);
  }

  // Si todo va bien:
  res.status(200).send('OK');
}
