import { useEffect, useState } from 'react';
import { REPO_URL, SITE_OWNER, SITE_URL } from '../../legal/config';
import { useConsent } from '../../context/ConsentContext';
import { isCloud } from '../../services/supabase/client';
import { PrivacyCloud, TermsCloud } from './LegalCloud';
import { Mail, Updated } from './legalParts';

/** Los textos describen exactamente el modo publicado: local (navegador) o nube (Supabase). */
export function Privacy() {
  return isCloud ? <PrivacyCloud /> : <PrivacyLocal />;
}

export function Terms() {
  return isCloud ? <TermsCloud /> : <TermsLocal />;
}

/* ------------------------------------------------------------------ */

function PrivacyLocal() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <Updated />

      <h2>Resumen</h2>
      <ul>
        <li>Pizarra Digital funciona sin servidor propio: tus datos se guardan <strong>solo en tu navegador</strong>.</li>
        <li>No recibimos, vendemos ni compartimos tus pizarras ni tus datos de cuenta.</li>
        <li>No usamos analítica, publicidad, rastreadores ni servicios de terceros dentro de la app.</li>
        <li>Puedes descargar o borrar todos tus datos en cualquier momento desde tu perfil.</li>
      </ul>

      <h2>Responsable</h2>
      <p>
        El responsable de este sitio ({SITE_URL}) es {SITE_OWNER}. Contacto: <Mail />.
      </p>

      <h2>Qué datos se guardan y para qué</h2>
      <table>
        <thead>
          <tr>
            <th>Dato</th>
            <th>¿Obligatorio?</th>
            <th>Finalidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nombre de usuario</td>
            <td>Sí</td>
            <td>Identificar tu cuenta para iniciar sesión.</td>
          </tr>
          <tr>
            <td>Contraseña</td>
            <td>Sí</td>
            <td>Proteger tu cuenta. Se guarda cifrada con hash SHA-256 y sal; nunca en texto legible.</td>
          </tr>
          <tr>
            <td>Nombre visible y avatar (emoji, iniciales o foto)</td>
            <td>No</td>
            <td>Personalizar cómo se muestra tu perfil.</td>
          </tr>
          <tr>
            <td>Pizarras, textos e imágenes que subes</td>
            <td>No</td>
            <td>Guardar tu trabajo para que lo encuentres al volver.</td>
          </tr>
          <tr>
            <td>Registro de aceptación de términos (versión, fecha y hora)</td>
            <td>Sí</td>
            <td>Dejar constancia de qué versión de los Términos y de esta Política aceptaste y cuándo.</td>
          </tr>
          <tr>
            <td>Tu decisión sobre cookies y, si lo aceptas, tu tema claro/oscuro</td>
            <td>No</td>
            <td>Recordar tus preferencias en este dispositivo.</td>
          </tr>
        </tbody>
      </table>
      <p>
        No pedimos correo electrónico, teléfono, fecha de nacimiento, ubicación ni ningún otro dato. La base para
        tratar estos datos es prestarte el servicio que solicitas al crear una cuenta y, para las preferencias
        opcionales, tu consentimiento.
      </p>

      <h2>Dónde se guardan</h2>
      <p>
        Todo se guarda en el almacenamiento de tu propio navegador (localStorage e IndexedDB) en el dispositivo que
        usas. Por eso tus pizarras no aparecen en otro dispositivo o navegador, y nosotros no podemos verlas,
        recuperarlas ni restablecer tu contraseña si la olvidas.
      </p>

      <h2>Proveedores que recogen datos</h2>
      <table>
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Para qué</th>
            <th>Qué datos recibe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GitHub, Inc. (GitHub Pages), Estados Unidos</td>
            <td>Alojar y entregar los archivos del sitio web.</td>
            <td>
              Como cualquier servidor web, recibe tu dirección IP y datos técnicos de la visita (navegador, fecha y
              hora) para servir la página y por seguridad. Se rige por la{' '}
              <a href="https://docs.github.com/es/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">
                Declaración de privacidad de GitHub
              </a>
              . GitHub no recibe tus pizarras ni tus datos de cuenta.
            </td>
          </tr>
          <tr>
            <td>Tu proveedor de correo y el nuestro (Gmail, de Google)</td>
            <td>Solo si nos escribes un correo (consultas, opiniones o reclamaciones).</td>
            <td>Tu dirección de correo y el contenido del mensaje que decidas enviarnos.</td>
          </tr>
        </tbody>
      </table>
      <p>
        No hay ningún otro proveedor: la app no carga fuentes, scripts, mapas, vídeos ni herramientas de analítica de
        terceros. La fuente tipográfica se sirve desde el propio sitio, y una política de seguridad de contenido
        (CSP) bloquea técnicamente cualquier script o conexión externa.
      </p>

      <h2>Cuánto tiempo conservamos los datos</h2>
      <ul>
        <li>
          <strong>Datos de tu cuenta y pizarras:</strong> permanecen en tu navegador hasta que borras una pizarra,
          eliminas tu cuenta o borras los datos del sitio en tu navegador. El navegador también puede borrarlos si se
          queda sin espacio, y en modo incógnito se borran al cerrar la ventana.
        </li>
        <li>
          <strong>Registro de aceptación de términos:</strong> mientras exista tu cuenta. Se elimina junto con ella.
        </li>
        <li>
          <strong>Decisión sobre cookies y tema:</strong> hasta que la cambies o borres los datos del sitio. Si esta
          política cambia, te la volveremos a pedir.
        </li>
        <li>
          <strong>Correos que nos envíes:</strong> hasta 12 meses después de resolver tu consulta. Las reclamaciones
          de derechos de autor se conservan hasta 3 años como constancia de su gestión.
        </li>
        <li>
          <strong>Registros técnicos de GitHub:</strong> según los plazos que fija GitHub en su declaración de
          privacidad.
        </li>
      </ul>

      <h2>Correos electrónicos</h2>
      <p>
        No enviamos correos, boletines ni notificaciones, y no pedimos tu dirección de correo. Si en el futuro se
        enviaran comunicaciones que no fueran imprescindibles, solo se harían con tu consentimiento y cada mensaje
        incluiría un enlace para darte de baja con un clic.
      </p>

      <h2>Tus derechos</h2>
      <ul>
        <li>
          <strong>Acceso y portabilidad:</strong> en tu perfil, «Descargar mis datos» genera un archivo JSON con tu
          perfil, tu registro de aceptación, tus pizarras y tus imágenes.
        </li>
        <li>
          <strong>Rectificación:</strong> puedes cambiar tu nombre visible y tu avatar en «Editar perfil».
        </li>
        <li>
          <strong>Supresión:</strong> «Eliminar mi cuenta» borra al instante tu cuenta, pizarras e imágenes de este
          navegador.
        </li>
        <li>
          <strong>Retirar el consentimiento:</strong> en «Configurar cookies», en el pie de página, cuando quieras.
        </li>
      </ul>
      <p>
        Para cualquier otra petición escríbenos a <Mail />. También puedes presentar una reclamación ante la
        autoridad de protección de datos de tu país.
      </p>

      <h2>Seguridad</h2>
      <p>
        Las contraseñas se guardan cifradas con hash y sal. Aun así, cualquier persona con acceso a tu dispositivo y
        a tu navegador podría acceder a los datos guardados en él, así que usa la app en dispositivos de confianza y
        cierra sesión en equipos compartidos. Como no hay servidor ni correo asociado, no es posible recuperar una
        contraseña olvidada. Te recomendamos descargar tus datos de vez en cuando como copia de seguridad.
      </p>
      <p>
        Este sitio no cuenta con certificaciones de seguridad como SOC 2 o ISO 27001, y no afirmamos tenerlas.
      </p>

      <h2>Menores de edad</h2>
      <p>
        La app está pensada para docentes y sus clases. Si eres menor de edad, úsala con permiso y supervisión de tu
        madre, padre o tutor.
      </p>

      <h2>Inteligencia artificial</h2>
      <p>
        Este sitio se desarrolló con ayuda de inteligencia artificial (Claude, de Anthropic), y el contenido de
        ejemplo de la pizarra de bienvenida fue generado con IA. La app no envía tus datos ni tus pizarras a ningún
        servicio de IA.
      </p>

      <h2>Cambios en esta política</h2>
      <p>
        Si la cambiamos de forma relevante, actualizaremos la fecha de arriba y te pediremos que la aceptes de nuevo
        la próxima vez que entres.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function TermsLocal() {
  return (
    <>
      <h1>Términos y condiciones</h1>
      <Updated />

      <h2>1. El servicio</h2>
      <p>
        Pizarra Digital ({SITE_URL}) es una pizarra digital para uso personal y docente, ofrecida por {SITE_OWNER}.
        Al crear una cuenta aceptas estos términos y la <a href="#/legal/privacidad">Política de privacidad</a>.
        Registramos en tu navegador qué versión aceptaste y cuándo.
      </p>

      <h2>2. Precio y reembolsos</h2>
      <p>
        El servicio es <strong>gratuito</strong>: no hay planes de pago, suscripciones ni compras dentro de la app, y
        por tanto no hay nada que reembolsar. Si algún día se ofreciera algo de pago, antes de cobrar nada se
        publicarán el precio y una política de reembolsos.
      </p>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>La cuenta existe solo en el navegador donde la creaste.</li>
        <li>Eres responsable de guardar tu contraseña: no podemos recuperarla ni restablecerla.</li>
        <li>
          Puedes eliminar tu cuenta cuando quieras desde «Perfil → Eliminar mi cuenta», sin pasos adicionales ni
          necesidad de contactarnos.
        </li>
      </ul>

      <h2>4. Tu contenido</h2>
      <p>
        Lo que creas en tus pizarras es tuyo. No lo vemos ni lo usamos, porque nunca sale de tu navegador. Eres
        responsable de tener los derechos necesarios sobre las imágenes y textos que añadas, especialmente si los
        compartes después, por ejemplo exportándolos como imagen.
      </p>

      <h2>5. Uso aceptable</h2>
      <p>No uses la app para crear o difundir contenido ilegal, que infrinja derechos de terceros, o que acose o ponga en riesgo a otras personas, en especial a menores.</p>

      <h2>6. Disponibilidad y copias de seguridad</h2>
      <p>
        La app se ofrece «tal cual», sin garantía de disponibilidad continua. Como los datos dependen de tu navegador,
        pueden perderse si borras sus datos o cambias de dispositivo. Usa «Descargar mis datos» para hacer copias de
        seguridad.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        En la medida en que lo permita la ley aplicable, no somos responsables de la pérdida de datos guardados en tu
        navegador ni de daños indirectos derivados del uso de la app. Nada de estos términos limita los derechos que
        te reconozca la ley de tu país como persona consumidora.
      </p>

      <h2>8. Propiedad intelectual y licencias</h2>
      <p>
        El código propio del sitio pertenece a su titular. Los componentes de terceros (React, Framer Motion, iconos
        Lucide, la fuente Inter y otros) se usan conforme a sus licencias de código abierto, que puedes consultar en{' '}
        <a href="#/legal/licencias">Licencias</a>. No usamos logotipos ni marcas de terceros. La ilustración de la
        pizarra de bienvenida es original de este proyecto.
      </p>

      <h2>9. Contenido generado con IA</h2>
      <p>
        El sitio se desarrolló con ayuda de IA (Claude, de Anthropic), y la pizarra de bienvenida contiene ejemplos
        generados con IA, que aparecen etiquetados como tales dentro de la propia pizarra.
      </p>

      <h2>10. Derechos de autor</h2>
      <p>
        Si crees que algún contenido de este sitio infringe tus derechos, sigue el procedimiento de{' '}
        <a href="#/legal/contacto">Contacto y derechos de autor</a>.
      </p>

      <h2>11. Cambios</h2>
      <p>
        Si modificamos estos términos de forma relevante, actualizaremos la fecha y te pediremos que los aceptes de
        nuevo antes de seguir usando tu cuenta. Si no los aceptas, puedes descargar tus datos y eliminar tu cuenta.
      </p>

      <h2>12. Contacto</h2>
      <p>
        <Mail />
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

const STORAGE_ROWS = isCloud
  ? [
      ['pd:supabase-auth', 'localStorage', 'Esencial', 'Mantener tu sesión iniciada en tu cuenta en la nube.', 'Hasta que cierres sesión (la sesión se renueva automáticamente mientras la usas).'],
      ['pd:pendingAvatar', 'localStorage', 'Esencial', 'Guardar la foto de avatar elegida al registrarte hasta que confirmes tu correo.', 'Se borra al iniciar sesión por primera vez.'],
      ['pd:consent', 'localStorage', 'Esencial', 'Recordar tu decisión sobre este aviso.', 'Hasta que la cambies o cambie esta política.'],
      ['pd:theme', 'localStorage', 'Preferencias (opcional)', 'Recordar tu tema claro, oscuro o del sistema.', 'Hasta que retires el consentimiento.'],
    ]
  : [
      ['pd:session', 'localStorage', 'Esencial', 'Mantener tu sesión iniciada.', 'Hasta que cierres sesión o elimines la cuenta.'],
      ['pd:users', 'localStorage', 'Esencial', 'Cuentas creadas en este navegador (usuario, contraseña cifrada, perfil y registro de aceptación de términos).', 'Hasta que elimines la cuenta.'],
      ['pizarra-digital (boards, images)', 'IndexedDB', 'Esencial', 'Tus pizarras e imágenes.', 'Hasta que las borres o elimines la cuenta.'],
      ['pd:consent', 'localStorage', 'Esencial', 'Recordar tu decisión sobre este aviso.', 'Hasta que la cambies o cambie esta política.'],
      ['pd:theme', 'localStorage', 'Preferencias (opcional)', 'Recordar tu tema claro, oscuro o del sistema.', 'Hasta que retires el consentimiento.'],
    ];

export function Cookies() {
  const { openSettings, consent } = useConsent();
  return (
    <>
      <h1>Política de cookies</h1>
      <Updated />
      <p>
        Este sitio <strong>no crea cookies HTTP</strong> ni usa cookies o tecnologías de analítica, publicidad o
        rastreo. Para funcionar usa el almacenamiento local de tu navegador, que la normativa trata igual que las
        cookies. Esto es lo que se guarda:
      </p>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Categoría</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_ROWS.map(([name, type, cat, purpose, duration]) => (
            <tr key={name}>
              <td>
                <code>{name}</code>
              </td>
              <td>{type}</td>
              <td>{cat}</td>
              <td>{purpose}</td>
              <td>{duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        El almacenamiento esencial no requiere consentimiento porque sin él la app no puede funcionar. El de
        preferencias solo se activa si lo aceptas, y está desactivado por defecto.{' '}
        {isCloud
          ? 'El token de sesión se envía únicamente a nuestro proveedor de base de datos (Supabase) para identificarte; el resto no sale de tu navegador.'
          : 'Ningún dato de esta tabla sale de tu navegador.'}
      </p>
      <p>
        Estado actual en este dispositivo:{' '}
        <strong>{consent ? (consent.preferences ? 'preferencias aceptadas' : 'solo esenciales') : 'sin decidir'}</strong>.
      </p>
      <button type="button" className="btn-primary" onClick={openSettings}>
        Cambiar mi elección
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function Licenses() {
  const [packages, setPackages] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('./third-party-licenses.json')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPackages)
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <h1>Licencias y créditos</h1>
      <Updated />
      <p>
        Pizarra Digital está construida con software de código abierto. Cumplimos sus licencias incluyendo los avisos
        de copyright y el texto completo de cada licencia.
      </p>
      <p>
        <a href="./third-party-licenses.txt" target="_blank" rel="noopener">
          Ver el texto completo de todas las licencias de terceros
        </a>
      </p>

      <h2>Componentes incluidos en el sitio</h2>
      {error && <p>No se pudo cargar la lista. Consulta el archivo de texto completo del enlace anterior.</p>}
      {!packages && !error && <p>Cargando…</p>}
      {packages && (
        <table>
          <thead>
            <tr>
              <th>Paquete</th>
              <th>Versión</th>
              <th>Licencia</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={`${p.name}@${p.version}`}>
                <td>{p.name}</td>
                <td>{p.version}</td>
                <td>{p.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Fuentes, iconos e imágenes</h2>
      <ul>
        <li>
          <strong>Fuente Inter</strong> (Rasmus Andersson), SIL Open Font License 1.1, servida desde este mismo sitio
          a través del paquete @fontsource-variable/inter.
        </li>
        <li>
          <strong>Iconos Lucide</strong>, licencia ISC (incluye partes de Feather, licencia MIT).
        </li>
        <li>
          <strong>Ilustraciones e imagen de ejemplo:</strong> creadas para este proyecto con ayuda de IA. No usamos
          fotos de bancos de imágenes ni logotipos de terceros.
        </li>
        <li>
          <strong>Herramientas de desarrollo</strong> (no se incluyen en el sitio publicado): Vite, Tailwind CSS y
          @vitejs/plugin-react, con licencia MIT.
        </li>
      </ul>

      <h2>Código fuente</h2>
      <p>
        El código fuente está en{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {REPO_URL}
        </a>
        .
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function Contact() {
  return (
    <>
      <h1>Contacto y derechos de autor</h1>
      <Updated />

      <h2>Contacto</h2>
      <p>
        Para dudas, opiniones, peticiones sobre tus datos o cualquier reclamación, escribe a <Mail />. También puedes
        usar «Dejar una opinión» en el pie de página.
      </p>

      <h2>Reclamaciones de derechos de autor</h2>
      <p>
        Si crees que algún contenido publicado en este sitio o en su{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          repositorio
        </a>{' '}
        infringe tus derechos de autor, envía un correo a <Mail /> con el asunto «Reclamación de derechos de autor» e
        incluye:
      </p>
      <ol>
        <li>Tu nombre y un medio de contacto.</li>
        <li>La obra protegida que consideras infringida.</li>
        <li>La dirección (URL) exacta del contenido que la infringe.</li>
        <li>Una declaración de que crees de buena fe que ese uso no está autorizado por ti, tu representante o la ley.</li>
        <li>Una declaración de que la información es exacta y de que eres titular de los derechos o actúas en su nombre.</li>
        <li>Tu firma, que puede ser tu nombre completo escrito.</li>
      </ol>
      <p>
        Revisaremos cada reclamación y, si procede, retiraremos el contenido. Ten en cuenta que las pizarras de los
        usuarios se guardan solo en sus navegadores: no están publicadas en este sitio y no podemos acceder a ellas.
        Para contenido alojado en GitHub también puedes usar el{' '}
        <a href="https://docs.github.com/es/site-policy/content-removal-policies/dmca-takedown-policy" target="_blank" rel="noopener noreferrer">
          procedimiento de retirada de GitHub
        </a>
        .
      </p>
    </>
  );
}
