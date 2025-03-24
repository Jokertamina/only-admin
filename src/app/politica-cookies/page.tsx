import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies | Symcrox",
  description: "Consulta nuestra política de cookies y gestiona tus preferencias en Symcrox."
};

export default function PoliticaCookiesPage() {
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
        Política de Cookies
      </h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          INFORMACIÓN SOBRE COOKIES
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Conforme con la Ley 34/2002, de 11 de julio, de servicios de la sociedad
          de la información y comercio electrónico (LSSI), el Reglamento (UE)
          2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016
          (GDPR), y la Ley Orgánica 3/2018, de 5 de diciembre (LOPDGDD), es
          obligatorio obtener el consentimiento del usuario en todas las páginas
          web que utilicen cookies prescindibles antes de que este navegue por
          ellas.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          ¿QUÉ SON LAS COOKIES?
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Las cookies y otras tecnologías similares tales como local shared
          objects, flash cookies o píxeles son herramientas utilizadas por los
          servidores web para almacenar y recuperar información sobre sus
          visitantes, así como para ofrecer un correcto funcionamiento del sitio.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Estas tecnologías permiten recordar algunos datos sobre el usuario,
          como sus preferencias para visualizar las páginas del sitio web, datos
          de acceso, nombre de usuario, preferencias de navegación, etc.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          COOKIES AFECTADAS POR LA NORMATIVA Y COOKIES EXCEPTUADAS
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Las cookies que requieren el consentimiento informado por parte del
          usuario son las cookies analíticas, publicitarias y de afiliación.
          Quedan exceptuadas las cookies técnicas y aquellas necesarias para el
          funcionamiento del sitio web o la prestación de servicios
          expresamente solicitados por el usuario.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>TIPOS DE COOKIES</h2>
        <h3 style={{ fontSize: "1.2rem", margin: "1rem 0" }}>SEGÚN LA FINALIDAD</h3>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies técnicas y funcionales: son aquellas que permiten al usuario la
          navegación a través de una página web, plataforma o aplicación y la
          utilización de las diferentes opciones o servicios que en ella existan.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies analíticas: son aquellas que permiten al responsable de las
          mismas el seguimiento y análisis del comportamiento de los usuarios de
          los sitios web a los que están vinculadas. La información recogida
          mediante este tipo de cookies se utiliza en la medición de la actividad
          de los sitios web, aplicación o plataforma y para la elaboración de
          perfiles de navegación de los usuarios de dichos sitios, aplicaciones y
          plataformas, con el fin de introducir mejoras en función del análisis
          de los datos de uso que hacen los usuarios del servicio.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies publicitarias: son aquellas que permiten la gestión, de la
          forma más eficaz posible, de los espacios publicitarios que, en su
          caso, el editor haya incluido en una página web, aplicación o
          plataforma desde la que presta el servicio solicitado en base a
          criterios como el contenido editado o la frecuencia en la que se
          muestran los anuncios.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies de publicidad comportamental: recogen información sobre las
          preferencias y elecciones personales del usuario (retargeting) para
          permitir la gestión, de la forma más eficaz posible, de los espacios
          publicitarios que, en su caso, el editor haya incluido en una página
          web, aplicación o plataforma desde la que presta el servicio
          solicitado.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies sociales: son establecidas por las plataformas de redes
          sociales en los servicios para permitirle compartir contenido con sus
          amigos y redes. Las plataformas de medios sociales tienen la capacidad
          de rastrear su actividad en línea fuera de los Servicios. Esto puede
          afectar al contenido y los mensajes que ve en otros servicios que
          visita.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies de afiliados: permiten hacer un seguimiento de las visitas
          procedentes de otras webs, con las que el sitio web establece un
          contrato de afiliación (empresas de afiliación).
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies de seguridad: almacenan información cifrada para evitar que los
          datos guardados en ellas sean vulnerables a ataques maliciosos de
          terceros.
        </p>

        <h3 style={{ fontSize: "1.2rem", margin: "1rem 0" }}>SEGÚN LA PROPIEDAD</h3>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies propias: son aquellas que se envían al equipo terminal del
          usuario desde un equipo o dominio gestionado por el propio editor y
          desde el que se presta el servicio solicitado por el usuario.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies de terceros: son aquellas que se envían al equipo terminal del
          usuario desde un equipo o dominio que no es gestionado por el editor,
          sino por otra entidad que trata los datos obtenidos través de las
          cookies.
        </p>

        <h3 style={{ fontSize: "1.2rem", margin: "1rem 0" }}>
          SEGÚN EL PLAZO DE CONSERVACIÓN
        </h3>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies de sesión: son un tipo de cookies diseñadas para recabar y
          almacenar datos mientras el usuario accede a una página web.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Cookies persistentes: son un tipo de cookies en el que los datos siguen
          almacenados en el terminal y pueden ser accedidos y tratados durante un
          período definido por el responsable de la cookie, y que puede ir de
          unos minutos a varios años.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>
          TRATAMIENTO DE DATOS PERSONALES
        </h2>
        <p style={{ marginBottom: "1.5rem" }}>
          Alejandro Freire Arias es el Responsable del tratamiento de los datos
          personales del Interesado y le informa de que estos datos serán
          tratados de conformidad con lo dispuesto en el Reglamento (UE)
          2016/679, de 27 de abril de 2016 (GDPR), por lo que se le facilita la
          siguiente información del tratamiento:
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Fines del tratamiento: según se especifica en el apartado de cookies
          que se utilizan en este sitio web.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Legitimación del tratamiento: salvo en los casos en los que resulte
          necesario para la navegación por la web, por consentimiento del
          interesado (art. 6.1 GDPR).
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Criterios de conservación de los datos: según se especifica en el
          apartado de cookies utilizadas en la web.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Comunicación de los datos: no se comunicarán los datos a terceros,
          excepto en cookies propiedad de terceros o por obligación legal.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Derechos del usuario:
        </p>
        <ul style={{ marginLeft: "1.5rem", marginBottom: "1.5rem" }}>
          <li style={{ marginBottom: "0.5rem" }}>
            Derecho a retirar el consentimiento en cualquier momento.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            Derecho de acceso, rectificación, portabilidad, supresión y
            limitación u oposición al tratamiento de sus datos.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            Derecho a presentar una reclamación ante la autoridad de control (
            <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
              www.aepd.es
            </a>
            ) si considera que el tratamiento no se ajusta a la normativa
            vigente.
          </li>
        </ul>
        <p style={{ marginBottom: "1.5rem" }}>
          Datos de contacto para ejercer sus derechos: Alejandro Freire Arias y
          Daniel Caruncho Mourente. Calle camino grande Nº12. Cp.15327, Mugardos
          (A Coruña). E-mail: comermenudeldia@gmail.com
        </p>
      </section>
    </main>
  );
}
