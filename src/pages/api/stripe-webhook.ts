// pages/api/stripe-webhook.ts

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { Readable } from "stream";
import * as admin from "firebase-admin";

// 1. Disable default body parser so we can read raw body:
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2. Initialize Stripe using your secret key:
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

// 3. Initialize Firebase Admin (using your FIREBASE_SERVICE_ACCOUNT).
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in Vercel env.");
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    console.log("[Firebase] Admin initialized successfully.");
  } catch (initError) {
    console.error("[Firebase] Error during admin init:", initError);
  }
}

// 4. Helper: Read the raw request body as a Buffer.
//    NextApiRequest is (req: NextApiRequest) => Node.js req extends Readable
async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    // If chunk is a string, convert it, else use it as Buffer
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// 5. The actual webhook route handler:
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only POST is allowed for Stripe webhooks
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  // read the raw body
  let rawBody: Buffer;
  try {
    rawBody = await readRawBody(req);
  } catch (readError) {
    console.error("[stripe-webhook] Error reading raw body:", readError);
    return res.status(400).send("Could not read raw body");
  }

  // retrieve the signature from header
  const signature = req.headers["stripe-signature"] as string | undefined;
  if (!signature) {
    return res.status(400).send("Missing Stripe signature header");
  }

  // 6. Validate the signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("[stripe-webhook] Error verifying Stripe signature:", err);
    return res.status(400).send(`Webhook Error: ${String(err)}`);
  }

  // 7. Process events:
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan;
        const empresaId = session.metadata?.empresaId;

        if (plan && empresaId) {
          // Exponential Backoff logic
          let attempts = 0;
          const maxAttempts = 5;
          let success = false;
          let backoffMs = 500; // initial base delay

          while (!success && attempts < maxAttempts) {
            try {
              await admin
                .firestore()
                .collection("Empresas")
                .doc(empresaId)
                .update({ plan });

              console.log(
                `[stripe-webhook] Plan updated to '${plan}' for Empresa: ${empresaId}`
              );
              success = true;
            } catch (updateError: any) {
              // if you see "RESOURCE_EXHAUSTED" from Firestore
              if (
                updateError &&
                typeof updateError.message === "string" &&
                updateError.message.includes("RESOURCE_EXHAUSTED")
              ) {
                attempts++;
                console.warn(
                  `[stripe-webhook] Attempt ${attempts}/${maxAttempts}, waiting ${backoffMs}ms after Firestore rate-limit`
                );
                await new Promise((resolve) => setTimeout(resolve, backoffMs));
                backoffMs *= 2;
              } else {
                throw updateError; // other errors => rethrow
              }
            }
          }
          if (!success) {
            throw new Error(
              `Failed to update plan after ${maxAttempts} attempts.`
            );
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error("[stripe-webhook] Error processing the event:", error);
    return res.status(400).send(`Event processing error: ${String(error)}`);
  }

  // 8. Respond with 200 to acknowledge receipt
  return res.status(200).send("OK");
}
