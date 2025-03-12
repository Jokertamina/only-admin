// src/context/EmpresaContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../../lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

interface EmpresaContextProps {
  empresaId: string | null;
  loading: boolean;
}

interface EmpresaProviderProps {
  children: React.ReactNode;
}

const EmpresaContext = createContext<EmpresaContextProps>({
  empresaId: null,
  loading: true,
});

export const EmpresaProvider: React.FC<EmpresaProviderProps> = ({ children }) => {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para cargar el empresaId a partir del uid del usuario
  const loadEmpresaId = async (uid: string) => {
    console.log("[EmpresaProvider] loadEmpresaId para uid:", uid);
    const q = query(collection(db, "Users"), where("uid", "==", uid));
    try {
      const querySnapshot = await getDocs(q);
      console.log("[EmpresaProvider] querySnapshot empty?", querySnapshot.empty);
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        console.log("[EmpresaProvider] Documento Users encontrado:", data);
        setEmpresaId(data.empresaId || null);
      } else {
        console.log("[EmpresaProvider] No se encontró doc en Users para uid:", uid);
        setEmpresaId(null);
      }
    } catch (error) {
      console.error("[EmpresaProvider] Error en getDocs:", error);
      setEmpresaId(null);
    }
  };

  useEffect(() => {
    console.log("[EmpresaProvider] Montando...");
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("[EmpresaProvider] onAuthStateChanged -> user:", user);
      if (user) {
        console.log("[EmpresaProvider] User UID:", user.uid);
        await loadEmpresaId(user.uid);
      } else {
        setEmpresaId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("[EmpresaProvider] empresaId:", empresaId, "loading:", loading);
  }, [empresaId, loading]);

  return (
    <EmpresaContext.Provider value={{ empresaId, loading }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => useContext(EmpresaContext);
