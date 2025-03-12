"use client";

import { ReactNode, useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Loading from "../components/Loading";
import styles from "../styles/AdminLayout.module.css";

type Props = {
  children: ReactNode;
};

const AdminLayout = ({ children }: Props) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <Loading />;
  if (!user) return null;

  return (
    <div className={styles["admin-layout"]}>
      <aside className={styles["admin-sidebar"]}>
        <SideBar />
      </aside>
      <main className={styles["admin-content"]}>{children}</main>
    </div>
  );
};

export default AdminLayout;
