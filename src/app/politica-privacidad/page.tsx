import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Symcrox',
  description: 'Consulta nuestra política de privacidad en Symcrox.',
};

const privacidadTexto = `Política de privacidad

1. INFORMACIÓN AL USUARIO

¿Quién es el responsable del tratamiento de tus datos personales?

Alejandro Freire Arias y Daniel Caruncho Mourente, en adelante RESPONSABLE del tratamiento, informa al usuario que sus datos personales serán tratados de conformidad con lo dispuesto en el Reglamento (UE) 2016/679 (GDPR) y la Ley Orgánica 3/2018 (LOPDGDD).

¿Para qué tratamos tus datos personales?

Tratamos los datos personales con la finalidad de:

Gestionar el registro de empresas y autónomos en nuestra plataforma para controlar los fichajes y ubicación de empleados.

Gestionar el uso y mantenimiento del servicio contratado, tanto gratuito como de pago (planes básico y premium).

Gestionar pagos y cobros a través de nuestra pasarela de pago externa (Stripe).

Enviar comunicaciones relacionadas con el servicio contratado, modificaciones en condiciones del mismo o cualquier incidencia relevante.

Atender solicitudes, consultas o incidencias planteadas por el usuario.

Realizar análisis internos para mejorar nuestros servicios y productos.

¿Por qué motivo podemos tratar tus datos personales?

La base legal del tratamiento de los datos personales está legitimada según el artículo 6 del GDPR en:

Consentimiento expreso del usuario al registrarse y utilizar nuestros servicios.

Ejecución de un contrato o medidas precontractuales solicitadas por el usuario (suscripción al servicio).

Cumplimiento de obligaciones legales aplicables al responsable.

Interés legítimo del responsable para realizar análisis internos y mejoras del servicio.

¿Durante cuánto tiempo guardaremos tus datos personales?

Los datos personales proporcionados se conservarán mientras exista relación contractual o comercial y durante el tiempo necesario para cumplir con las obligaciones legales o posibles responsabilidades que pudieran derivarse del tratamiento.

Una vez finalizado dicho período, los datos serán suprimidos aplicando medidas adecuadas para garantizar la destrucción segura o anonimización.

¿A quién facilitamos tus datos personales?

No comunicamos tus datos personales a terceros, salvo en los siguientes casos:

Proveedores externos estrictamente necesarios para la gestión del servicio, como nuestra plataforma de pago Stripe, con la que se han suscrito los contratos de confidencialidad y de encargado del tratamiento exigidos por la normativa vigente.

Autoridades competentes cuando así lo requiera la normativa legal aplicable.

¿Cuáles son tus derechos?

Tienes derecho a:

Retirar el consentimiento otorgado en cualquier momento.

Acceder, rectificar, portar, suprimir, limitar y oponerte al tratamiento de tus datos personales.

Presentar una reclamación ante la autoridad competente (www.aepd.es) si consideras que el tratamiento no se ajusta a la normativa vigente.

Para ejercer estos derechos:

Dirígete por escrito a A completar por el usuario (dirección física o correo electrónico).

2. CARÁCTER OBLIGATORIO O FACULTATIVO DE LA INFORMACIÓN FACILITADA POR EL USUARIO

Los usuarios, mediante la marcación de las casillas correspondientes y entrada de datos en los formularios del sitio web, aceptan de forma expresa, libre e inequívoca que sus datos son necesarios para atender su solicitud. El usuario garantiza la autenticidad de los datos proporcionados y se compromete a comunicar cualquier modificación.

El RESPONSABLE informa de que todos los datos solicitados son obligatorios para prestar un servicio adecuado. Si no se proporcionan, no se garantiza que el servicio pueda ajustarse plenamente a las necesidades del usuario.

3. MEDIDAS DE SEGURIDAD

De conformidad con lo dispuesto en la normativa vigente sobre protección de datos personales, el RESPONSABLE está cumpliendo con todas las disposiciones del GDPR y la LOPDGDD. Ha implementado las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado, en conformidad con lo establecido en la normativa aplicable.

Para más información sobre nuestras garantías de privacidad, puedes dirigirte al RESPONSABLE mediante los datos de contacto indicados anteriormente.
`;

export default function PoliticaPrivacidadPage() {
  return (
    <main
      style={{
        fontFamily: "Times New Roman, serif",
        backgroundColor: "#f8f8f8",
        color: "#222",
        padding: "3rem",
        lineHeight: 2.5,
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        Política de Privacidad
      </h1>
      <div style={{ whiteSpace: "pre-wrap" }}>
        {privacidadTexto}
      </div>
    </main>
  );
}
