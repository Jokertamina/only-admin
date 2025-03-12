// api/stripe-webhook.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { Readable } from 'stream';
import * as admin from 'firebase-admin';

// 1. Desactiva el body parser para recibir el raw body (Stripe lo necesita así).
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2. Inicializa Stripe con tu secret key (usa la versión que necesites).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// 3. Inicializa Firebase Admin (recomendado cargar las credenciales desde variables de entorno).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
    ),
  });
}

// 4. Función para leer el body en crudo (sin parsear).
async function readRawBody(readable: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// 5. Función principal del webhook
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  // Leer el body sin procesar
  const rawBody = await readRawBody(req);
  const signature = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  // 6. Verificar la firma del webhook
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

  // 7. Manejar diferentes tipos de evento
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Extrae la info de la sesión
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        // Si hay plan y empresa, actualiza Firestore
        if (plan && empresaId) {
          await admin.firestore().collection('Empresas').doc(empresaId).update({ plan });
          console.log(`Plan actualizado a ${plan} para la empresa ${empresaId}`);
        }
        break;
      }
      // Agrega más casos según tus necesidades (payment_intent.succeeded, etc.)
      default:
        console.log(`Evento no manejado: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error('Error procesando el evento:', error);
    return res.status(400).send(`Event processing error: ${error}`);
  }

  // 8. Respuesta exitosa a Stripe
  res.status(200).send('OK');
}
