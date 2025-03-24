import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso Legal | Symcrox",
  description: "Aviso legal de Symcrox."
};

export default function AvisoLegalPage() {
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
      <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Aviso Legal</h1>

      {/* INFORMACIÓN GENERAL */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Información General
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de
          Servicios de la Sociedad de la Información y Comercio Electrónico
          (LSSICE), se exponen a continuación los datos identificativos del
          titular:
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Denominación Social: Alejandro Freire Arias y Daniel Caruncho Mourente
        </p>
        <p style={{ marginBottom: "1.5rem" }}>Nombre Comercial: Symcrox</p>
        <p style={{ marginBottom: "1.5rem" }}>
          NIF/CIF: 32698202E y 32708724X
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Domicilio Social: Calle camino grande Nº12. Cp.15327, Mugardos (A
          Coruña)
        </p>
        <p style={{ marginBottom: "1.5rem" }}>Teléfono: 608 604 527</p>
        <p style={{ marginBottom: "1.5rem" }}>
          Email: A completar por el usuario
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Dominio Web: A completar por el usuario
        </p>
      </section>

      {/* CONDICIONES DE USO */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Condiciones de uso
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          El acceso y/o uso de este sitio web otorga la condición de USUARIO,
          aceptando desde dicho acceso las Condiciones Generales de Uso aquí
          reflejadas. Dichas condiciones serán aplicables independientemente de
          las Condiciones Generales de Contratación que resulten de obligado
          cumplimiento.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          El titular del sitio web se reserva el derecho de modificar cualquier
          información que pudiera aparecer en el sitio web sin obligación de
          preavisar o informar a los usuarios, considerándose suficiente su
          publicación.
        </p>
      </section>

      {/* PROPIEDAD INTELECTUAL E INDUSTRIAL */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Propiedad Intelectual e Industrial
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          El titular del sitio web, por sí o como cesionario, es propietario de
          todos los derechos de propiedad intelectual e industrial de sus páginas
          web, así como de los elementos contenidos en las mismas (a título
          enunciativo: imágenes, sonidos, audio, vídeo, software o textos; marcas
          o logotipos, combinaciones de colores, estructura y diseño, selección
          de materiales usados, programas de ordenador necesarios para su
          funcionamiento, acceso y uso, etc.).
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Todos los derechos están reservados. Queda expresamente prohibido
          reproducir, distribuir y comunicar públicamente, incluida la modalidad
          de puesta a disposición, de la totalidad o parte de los contenidos de
          esta página web, con fines comerciales, en cualquier soporte y por
          cualquier medio técnico, sin autorización expresa del titular.
        </p>
      </section>

      {/* RESPONSABILIDAD SOBRE LOS CONTENIDOS */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Responsabilidad sobre los contenidos
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          El titular del sitio web no se responsabiliza de la legalidad de otros
          sitios web de terceros desde los que pueda accederse al portal. Tampoco
          responde por la legalidad de otros sitios web de terceros, que pudieran
          estar vinculados o enlazados desde este portal.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          El titular del sitio web se reserva el derecho a realizar cambios en el
          sitio web sin previo aviso, al objeto de mantener actualizada la
          información, añadiendo, modificando, corrigiendo o eliminando los
          contenidos publicados o el diseño del portal.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          El titular del sitio web no será responsable del uso que terceros hagan
          de la información publicada en el portal, ni tampoco de los daños
          sufridos o pérdidas económicas que, de forma directa o indirecta,
          produzcan o puedan producir perjuicios económicos, materiales o sobre
          datos, provocados por el uso de dicha información.
        </p>
      </section>

      {/* USO DE COOKIES */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>Uso de cookies</h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Este sitio web puede utilizar cookies técnicas necesarias para la
          prestación del servicio, así como cookies propias y de terceros para
          finalidades analíticas o estadísticas. Para información más completa
          sobre el uso de cookies, se remite a la Política de Cookies específica
          del sitio web.
        </p>
      </section>

      {/* PROTECCIÓN DE DATOS PERSONALES */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Protección de datos personales
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          El titular del sitio web cumple con la normativa española de protección
          de datos de carácter personal, garantizando el cumplimiento íntegro de
          las obligaciones dispuestas en la legislación vigente en protección de
          datos personales. Para información más completa sobre el tratamiento de
          datos personales, se remite a la Política de Privacidad específica del
          sitio web.
        </p>
      </section>

      {/* LEGISLACIÓN APLICABLE Y JURISDICCIÓN */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          Legislación aplicable y jurisdicción
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Las relaciones entre el titular del sitio web y los usuarios se regirán
          por la normativa española vigente, y cualquier controversia se someterá
          a los Juzgados y Tribunales del domicilio del usuario, si este actúa
          como consumidor final. En caso contrario, las partes acuerdan
          someterse a los Juzgados y Tribunales del domicilio social del titular
          del sitio web.
        </p>
      </section>
    </main>
  );
}
