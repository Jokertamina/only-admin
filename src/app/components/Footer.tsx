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
                width={180}
                height={60}
                priority
                className={styles["logo-img"]}
              />
            </div>
          </Link>
        </div>

        {/* Información de contacto */}
        <div className={styles.footerContact}>
          <p>
            📞 <a href="tel:+34642460148">642 460 148</a>
          </p>
          <p>
            📧 <a href="mailto:symcrox.global@gmail.com">symcrox.global@gmail.com</a>
          </p>
        </div>

        {/* Links legales */}
        <div className={styles.footerLinks}>
          <ul>
            <li>
              <Link
                href="/aviso-legal"
                target="_blank"
                rel="noopener noreferrer"
              >
                Aviso Legal
              </Link>
            </li>
            <li>
              <Link
                href="/cancelacion-reembolso"
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de Cancelación y Reembolso
              </Link>
            </li>
            <li>
              <Link
                href="/politica-cookies"
                target="_blank"
                rel="noopener noreferrer"
              >
                Política de Cookies
              </Link>
            </li>
            <li>
              <Link
                href="/politica-privacidad"
                target="_blank"
                rel="noopener noreferrer"
              >
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
