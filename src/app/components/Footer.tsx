import Image from "next/image";
import Link from "next/link";
import styles from "../styles/Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        {/* Logo y marca */}
        <div className={styles.footerBrand}>
          <Link href="/" className={styles["footer-brand"]}>
            <div className={styles["logo-container"]}>
              <Image
                src="/images/logo-nombre.svg"
                alt="Symcrox Logo"
                width={180} // Ajustado
                height={60} // Ajustado
                priority
                className={styles["logo-img"]}
              />
            </div>
          </Link>
        </div>

        {/* Información de contacto */}
        <div className={styles.footerContact}>
          <p>
            📞 <a href="tel:+1234567890">+1 234 567 890</a>
          </p>
          <p>
            📧 <a href="mailto:contacto@symcrox.com">contacto@symcrox.com</a>
          </p>
        </div>

        {/* Links legales */}
        <div className={styles.footerLinks}>
  <ul>
    <li>
      <Link href="/aviso-legal" target="_blank" rel="noopener noreferrer">
        Aviso Legal
      </Link>
    </li>
    <li>
      <Link href="/cancelacion-reembolso" target="_blank" rel="noopener noreferrer">
        Política de Cancelación y Reembolso
      </Link>
    </li>
    <li>
      <Link href="/politica-cookies" target="_blank" rel="noopener noreferrer">
        Política de Cookies
      </Link>
    </li>
    <li>
      <Link href="/politica-privacidad" target="_blank" rel="noopener noreferrer">
        Política de Privacidad
      </Link>
    </li>
  </ul>
</div>


      </div>

      {/* Copyright */}
      <div className={styles.footerCopyright}>
        &copy; {new Date().getFullYear()} Symcrox. Todos los derechos reservados.
      </div>
    </footer>
  );
}
