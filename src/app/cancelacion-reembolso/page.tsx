import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cancelación y Reembolso | Fichagram',
  description: 'Consulta nuestra política de cancelación y reembolso, plazos y condiciones en Fichagram.',
};

const cancelacionReembolsoTexto = `Política de Cancelación y Reembolso

Introducción
La presente política describe las condiciones y procedimientos aplicables a las cancelaciones y reembolsos de los planes ofrecidos
a través del sitio web Symcrox, gestionado por Alejandro Freire Arias y Daniel Caruncho Mourente (en adelante, "La Empresa").

La aceptación de esta política es necesaria para utilizar los servicios ofrecidos.

Procedimiento para la Cancelación
Cancelación de Suscripción
El usuario podrá cancelar su suscripción en cualquier momento desde su panel de usuario o poniéndose en contacto a través del correo electrónico: soporte.symcrox@gmail.com. Una vez realizada la cancelación, el servicio continuará activo hasta el final del periodo ya abonado, no procediendo reembolso alguno por los días restantes del ciclo actual.

Cambios en el Tipo de Suscripción
La plataforma ofrece la posibilidad de realizar cambios en el tipo de suscripción contratada (upgrade o downgrade). Los cambios se realizarán bajo las siguientes condiciones específicas:

Upgrade (Plan Básico a Premium)
El usuario puede solicitar el cambio desde el Plan Básico al Plan Premium en cualquier momento desde su panel de usuario.

Al realizar el upgrade, el cambio es inmediato, cancelándose automáticamente cualquier solicitud anterior pendiente de cancelación.

Se aplicará un prorrateo automático, calculado desde el momento exacto del cambio hasta el final del ciclo de facturación actual, cobrando únicamente la diferencia proporcional.

El pago será gestionado íntegramente mediante la pasarela externa Stripe, redirigiendo al usuario a dicha plataforma para completar la transacción de forma segura.

Downgrade (Plan Premium a Básico)
El usuario puede solicitar la transición desde el Plan Premium al Plan Básico en cualquier momento desde su panel.

Al solicitar el downgrade, el plan Premium permanecerá activo hasta finalizar el periodo actual ya abonado. La transición al plan Básico se hará efectiva una vez finalizado el ciclo vigente, cancelándose en ese momento la suscripción Premium.

Para completar el downgrade, se generará una nueva sesión de checkout en Stripe para asegurar la transición efectiva. El usuario deberá completar dicha transacción antes de la finalización del ciclo actual.

Si el usuario no completa correctamente la transacción de downgrade (por ejemplo, no realiza el pago), su plan actual (Premium) seguirá vigente y activo, procediéndose a cobrar los siguientes ciclos normalmente hasta que realice un cambio efectivo.

Condiciones de Reembolso
La Empresa ofrece reembolsos bajo circunstancias específicas y excepcionales, siempre que se cumplan estrictamente estas condiciones:

Existirá la posibilidad de reembolso únicamente cuando haya una pérdida de datos demostrable o una interrupción prolongada del servicio que sea directamente atribuible a errores técnicos o negligencia de La Empresa.

El reembolso máximo corresponderá exclusivamente al importe del último pago abonado por el usuario en relación al servicio contratado.

El usuario deberá presentar la solicitud de reembolso vía email soporte.symcrox@gmail.com dentro de un plazo máximo de 14 días naturales desde la incidencia. La Empresa analizará y decidirá la procedencia del reembolso según la situación específica presentada.

El reembolso se realizará, en caso de aprobarse, mediante el mismo método de pago utilizado en la contratación inicial (Stripe), en un plazo no superior a 15 días naturales desde la aprobación de la solicitud.

Limitación de Responsabilidad
La responsabilidad de La Empresa se limita exclusivamente a las situaciones descritas en esta Política. Quedan excluidas expresamente otras responsabilidades por incidencias tales como:

Problemas de conectividad o interrupciones temporales del servicio causadas por proveedores externos de infraestructura tecnológica o por circunstancias ajenas a nuestra voluntad.

Uso indebido o negligente por parte del usuario.

Pérdidas económicas indirectas, lucro cesante, pérdida de ingresos o cualquier daño emergente o consecuencial no previsto expresamente en esta política.

Aceptación de esta Política
Al utilizar los servicios ofrecidos por La Empresa, el usuario acepta expresamente las condiciones descritas en esta Política de Cancelación y Reembolso.

Para resolver dudas sobre esta política o realizar solicitudes, por favor contacta con nosotros en:

Correo electrónico: soporte.symcrox@gmail.com

Modificación
La Empresa se reserva el derecho a modificar esta Política en cualquier momento, notificando previamente a los usuarios mediante comunicación en la página web o vía correo electrónico. Es responsabilidad del usuario consultar periódicamente esta política para informarse sobre posibles cambios.

Fecha de la última actualización:
`;

export default function CancelacionReembolsoPage() {
  return (
    <main
      style={{
        fontFamily: "Times New Roman, serif",
        backgroundColor: "#f8f8f8",
        color: "#222",
        padding: "3rem",
        lineHeight: 2.5
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>
        Política de Cancelación y Reembolso
      </h1>
      <div style={{ whiteSpace: "pre-wrap" }}>
        {cancelacionReembolsoTexto}
      </div>
    </main>
  );
}
