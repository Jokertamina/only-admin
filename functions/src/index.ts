import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

async function adjustObras(empresaId: string, plan: string) {
  const db = getFirestore();
  const obrasRef = db.collection("Obras");
  const maxObras = plan === "PREMIUM" ? Infinity : plan === "BASICO" ? 3 : 1;

  const snapshot = await obrasRef
    .where("empresaId", "==", empresaId)
    .orderBy("createdAt", "asc")
    .get();

  const batch = db.batch();
  let inactivated = 0;

  snapshot.docs.forEach((docSnap, idx) => {
    batch.update(docSnap.ref, { active: idx < maxObras });
    if (idx >= maxObras) inactivated++;
  });

  await batch.commit();

  return { total: snapshot.size, inactivated };
}

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
      lastAdjustmentObrasInfo: {
        total: summary.total,
        inactivated: summary.inactivated,
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

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
      lastAdjustmentObrasInfo: {
        total: summary.total,
        inactivated: summary.inactivated,
        plan,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export const enforceObrasLimitOnCreate = onDocumentCreated(
    { document: "Obras/{obraId}" },
    async (event) => {
      const newObraData = event.data?.data();
      if (!newObraData) return;
  
      const empresaId = newObraData.empresaId;
      if (!empresaId) return;
  
      const db = getFirestore();
      const empresaDoc = await db.collection("Empresas").doc(empresaId).get();
      if (!empresaDoc.exists) return;
  
      const plan = empresaDoc.data()?.plan || "SIN PLAN";
      const maxObras = plan === "PREMIUM" ? Infinity : plan === "BASICO" ? 3 : 1;
  
      const activeObrasSnap = await db.collection("Obras")
        .where("empresaId", "==", empresaId)
        .where("active", "==", true)
        .get();
  
      let message = "Obra creada correctamente y activa.";
      let inactivated = 0;
  
      if (activeObrasSnap.size >= maxObras) {
        const obraId = event.params.obraId;
        await db.collection("Obras").doc(obraId).update({ active: false });
        message = "Obra creada supera límite del plan. Se marcó inactiva automáticamente.";
        inactivated = 1;
      }
  
      await empresaDoc.ref.update({
        lastAdjustmentObrasInfo: {
          message,
          total: activeObrasSnap.size + 1,
          inactivated,
          plan,
          timestamp: new Date().toISOString(),
        },
      });
    }
  );
