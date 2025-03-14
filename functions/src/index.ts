import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted
} from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp();

async function adjustObras(empresaId: string, plan: string) {
  const db = getFirestore();
  const obrasRef = db.collection("Obras");
  // PREMIUM sin límite, BASICO hasta 3, SIN PLAN 1.
  const maxObras = plan === "PREMIUM" ? Infinity : plan === "BASICO" ? 3 : 1;

  // Consulta obras ordenadas por createdAt, asignando fecha mínima si falta.
  const snapshot = await obrasRef
    .where("empresaId", "==", empresaId)
    .orderBy("createdAt", "asc")
    .get();

  const batch = db.batch();
  let inactivated = 0;
  snapshot.docs.forEach((docSnap, idx) => {
    const data = docSnap.data();
    // Si no existe createdAt, se asigna epoch.
    const currentCreatedAt = data.createdAt || Timestamp.fromDate(new Date(0));
    const shouldBeActive = idx < maxObras;

    // Solo actualiza si es necesario
    if (data.active !== shouldBeActive) {
      batch.update(docSnap.ref, {
        active: shouldBeActive,
        createdAt: currentCreatedAt
      });
    }
    if (!shouldBeActive) inactivated++;
  });

  await batch.commit();
  return { total: snapshot.size, inactivated };
}

/* ---------- TRIGGERS ---------- */

// 1. Al crear una empresa, se ajusta la lista de obras.
export const adjustObrasOnCompanyCreate = onDocumentCreated(
  { document: "Empresas/{empresaId}" },
  async (event) => {
    const empresaData = event.data?.data();
    if (!empresaData) return;

    const empresaId = event.params.empresaId;
    const plan = empresaData.plan || "SIN PLAN";

    const summary = await adjustObras(empresaId, plan);
    const db = getFirestore();
    await db.collection("Empresas").doc(empresaId).update({
      lastAdjustmentInfoObras: {
        total: summary.total,
        inactivated: summary.inactivated,
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// 2. Al cambiar el plan, se reajustan los estados de las obras.
export const adjustObrasOnPlanChange = onDocumentUpdated(
  { document: "Empresas/{empresaId}" },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData || beforeData.plan === afterData.plan) return;

    const empresaId = event.params.empresaId;
    const plan = afterData.plan;

    const summary = await adjustObras(empresaId, plan);
    const db = getFirestore();
    await db.collection("Empresas").doc(empresaId).update({
      lastAdjustmentInfoObras: {
        total: summary.total,
        inactivated: summary.inactivated,
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// 3. Al crear una obra, se sobrescribe createdAt y se pone active en true, luego se recalcula la lista.
export const enforceObrasLimitOnCreate = onDocumentCreated(
  { document: "Obras/{obraId}" },
  async (event) => {
    const newObraData = event.data?.data();
    if (!newObraData) return;

    const empresaId = newObraData.empresaId;
    if (!empresaId) return;

    // Sobrescribimos createdAt y establecemos active en true,
    // garantizando que la nueva obra arranque activa.
    await event.data?.ref.update({
      createdAt: Timestamp.now(),
      active: true
    });

    const db = getFirestore();
    const empresaRef = db.collection("Empresas").doc(empresaId);
    const empresaDoc = await empresaRef.get();
    if (!empresaDoc.exists) return;
    const plan = empresaDoc.data()?.plan || "SIN PLAN";

    // Actualizamos el documento de la empresa con el resumen de las obras.
    const summary = await adjustObras(empresaId, plan);
    await empresaRef.update({
      lastAdjustmentInfoObras: {
        total: summary.total,
        inactivated: summary.inactivated,
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

// 4. Al eliminar una obra, se recalcula y se actualiza la info en la empresa.
export const adjustObrasOnDelete = onDocumentDeleted(
  { document: "Obras/{obraId}" },
  async (event) => {
    const deletedData = event.data?.data();
    if (!deletedData) return;
    const empresaId = deletedData.empresaId;
    if (!empresaId) return;

    const db = getFirestore();
    const empresaRef = db.collection("Empresas").doc(empresaId);
    const empresaDoc = await empresaRef.get();
    if (!empresaDoc.exists) return;
    const plan = empresaDoc.data()?.plan || "SIN PLAN";

    const summary = await adjustObras(empresaId, plan);
    await empresaRef.update({
      lastAdjustmentInfoObras: {
        total: summary.total,
        inactivated: summary.inactivated,
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  }
);
