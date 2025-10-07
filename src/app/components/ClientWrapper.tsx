"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EmpresaProvider } from "../context/EmpresaContext";
import SideBar from "./SideBar";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Loading from "./Loading";
import styles from "../styles/AdminLayout.module.css";

export default function ClientWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Solo la página de login no usa el layout admin
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && !isLoginPage) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, isLoginPage]);

  if (loading) return <Loading />;
  
  // Si no hay usuario y no estamos en login, no renderizar nada
  if (!user && !isLoginPage) return null;

  // Layout para login
  if (isLoginPage) {
    return (
      <EmpresaProvider>
        {children}
      </EmpresaProvider>
    );
  }

  // Layout admin para todas las otras páginas
  return (
    <EmpresaProvider>
      <div className={styles["admin-layout"]}>
        <aside className={styles["admin-sidebar"]}>
          <SideBar />
        </aside>
        <main className={styles["admin-content"]}>{children}</main>
      </div>
    </EmpresaProvider>
  );
}
