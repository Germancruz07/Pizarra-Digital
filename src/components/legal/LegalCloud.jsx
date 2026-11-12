import { CLOUD_REGION, EMAIL_SENDER, SITE_OWNER, SITE_URL } from '../../legal/config';
import { Mail, Updated } from './legalParts';

const region = CLOUD_REGION ? `en la región «${CLOUD_REGION}»` : 'en la región elegida al crear el proyecto';

/** Política de privacidad cuando la app usa cuentas en la nube (Supabase). */
export function PrivacyCloud() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <Updated />

      <h2>Resumen</h2>
      <ul>
        <li>Tus pizarras se guardan en tu cuenta en la nube para que puedas verlas desde cualquier dispositivo.</li>
        <li>Solo tú puedes acceder a ellas: cada fila de la base de datos y cada imagen están protegidas por tu sesión.</li>
        <li>No vendemos ni compartimos tus datos, y no usamos analítica, publicidad ni rastreadores.</li>
        <li>Solo enviamos correos de servicio (confirmar la cuenta y cambiar la contraseña), nunca publicidad.</li>
        <li>Puedes descargar o borrar todos tus datos en cualquier momento desde tu perfil.</li>
      </ul>

      <h2>Responsable</h2>
      <p>
        El responsable de este sitio ({SITE_URL}) es {SITE_OWNER}. Contacto: <Mail />.
      </p>

      <h2>Qué datos tratamos y para qué</h2>
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
            <td>Correo electrónico</td>
            <td>Sí</td>
            <td>Iniciar sesión, confirmar que la cuenta es tuya y permitirte recuperar o cambiar la contraseña.</td>
          </tr>
          <tr>
            <td>Contraseña</td>
            <td>Sí</td>
            <td>Proteger tu cuenta. La guarda Supabase cifrada con un hash (bcrypt); nadie puede leerla, tampoco nosotros.</td>
          </tr>
          <tr>
            <td>Nombre visible y avatar (emoji, iniciales o foto)</td>
            <td>No</td>
            <td>Personalizar cómo se muestra tu perfil.</td>
          </tr>
          <tr>
            <td>Pizarras, textos e imágenes que subes</td>
            <td>No</td>
            <td>Guardar tu trabajo y sincronizarlo entre tus dispositivos.</td>
          </tr>
          <tr>
            <td>Registro de aceptación de términos (versión, fecha y hora)</td>
            <td>Sí</td>
            <td>Dejar constancia de qué versión de los Términos y de esta Política aceptaste y cuándo.</td>
          </tr>
          <tr>
            <td>Datos técnicos de la sesión (dirección IP, navegador, fecha de acceso)</td>
            <td>Sí</td>
            <td>Los registra automáticamente el proveedor de autenticación por seguridad y para prevenir abusos.</td>
          </tr>
        </tbody>
      </table>
      <p>
        No pedimos teléfono, fecha de nacimiento, ubicación ni ningún otro dato. La base para tratar estos datos es
        prestarte el servicio que solicitas al crear la cuenta y, para las preferencias opcionales, tu consentimiento.
      </p>

      <h2>Proveedores que tratan datos</h2>
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
            <td>Supabase, Inc.</td>
            <td>Base de datos, almacenamiento de imágenes e inicio de sesión. Los datos se alojan {region}.</td>
            <td>
              Correo, contraseña cifrada, perfil, pizarras, imágenes, registro de aceptación y datos técnicos de la
              sesión. Actúa como encargado del tratamiento conforme a su{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                política de privacidad
              </a>
              .
            </td>
          </tr>
          <tr>
            <td>{EMAIL_SENDER}</td>
            <td>Enviar los correos de confirmación de cuenta y de cambio de contraseña.</td>
            <td>Tu correo electrónico y el contenido de esos mensajes.</td>
          </tr>
          <tr>
            <td>GitHub, Inc. (GitHub Pages), Estados Unidos</td>
            <td>Alojar y entregar los archivos del sitio web.</td>
            <td>
              Tu dirección IP y datos técnicos de la visita. Se rige por la{' '}
              <a href="https://docs.github.com/es/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">
                Declaración de privacidad de GitHub
              </a>
              . GitHub no recibe tus pizarras ni tus datos de cuenta.
            </td>
          </tr>
          <tr>
            <td>Gmail (Google)</td>
            <td>Solo si nos escribes un correo.</td>
            <td>Tu dirección de correo y el contenido del mensaje que decidas enviarnos.</td>
          </tr>
        </tbody>
      </table>
      <p>
        Estos proveedores pueden tratar datos fuera de tu país (por ejemplo, en Estados Unidos) con las garantías que
        describen sus políticas. No hay ningún otro tercero: la app no carga analítica, publicidad ni scripts externos,
        y una política de seguridad de contenido (CSP) solo permite conectar con el propio sitio y con Supabase.
      </p>

      <h2>Cuánto tiempo conservamos los datos</h2>
      <ul>
        <li>
          <strong>Cuenta, perfil, pizarras e imágenes:</strong> mientras tu cuenta exista. Al eliminarla se borran de
          inmediato de la base de datos y del almacenamiento. Si el proveedor conserva copias de seguridad
          automáticas, se sobrescriben según su propio ciclo.
        </li>
        <li>
          <strong>Cuentas sin confirmar:</strong> si nunca confirmas tu correo, puedes pedirnos que borremos la cuenta
          escribiendo a <Mail />.
        </li>
        <li>
          <strong>Registro de aceptación de términos:</strong> mientras exista tu cuenta; se elimina junto con ella.
        </li>
        <li>
          <strong>Registros técnicos de Supabase y GitHub:</strong> según los plazos que fija cada proveedor.
        </li>
        <li>
          <strong>Correos que nos envíes:</strong> hasta 12 meses después de resolver tu consulta. Las reclamaciones de
          derechos de autor se conservan hasta 3 años como constancia de su gestión.
        </li>
      </ul>

      <h2>Correos electrónicos</h2>
      <p>
        Solo enviamos correos de servicio imprescindibles para tu cuenta: confirmar tu dirección al registrarte y el
        código o enlace para cambiar la contraseña cuando tú lo pides. No enviamos boletines ni publicidad. Si en el
        futuro se enviaran comunicaciones que no fueran imprescindibles, solo se harían con tu consentimiento y cada
        mensaje incluiría un enlace para darte de baja con un clic.
      </p>

      <h2>Tus derechos</h2>
      <ul>
        <li>
          <strong>Acceso y portabilidad:</strong> en tu perfil, «Descargar» genera un archivo JSON con tu perfil, tu
          registro de aceptación, tus pizarras y tus imágenes.
        </li>
        <li>
          <strong>Rectificación:</strong> puedes cambiar tu nombre visible, tu avatar y tu contraseña desde tu perfil.
        </li>
        <li>
          <strong>Supresión:</strong> «Eliminar cuenta» borra al instante tu cuenta, pizarras e imágenes.
        </li>
        <li>
          <strong>Retirar el consentimiento:</strong> en «Configurar cookies», en el pie de página, cuando quieras.
        </li>
      </ul>
      <p>
        Para cualquier otra petición (por ejemplo, cambiar el correo de tu cuenta) escríbenos a <Mail />. También puedes
        presentar una reclamación ante la autoridad de protección de datos de tu país.
      </p>

      <h2>Seguridad</h2>
      <p>
        La conexión va cifrada (HTTPS), las contraseñas se guardan con hash y la base de datos aplica reglas de
        seguridad a nivel de fila: cada consulta solo puede leer o modificar los datos de la persona que ha iniciado
        sesión. Si olvidas tu contraseña puedes recuperarla por correo. Cierra sesión en equipos compartidos.
      </p>
      <p>
        Este sitio no cuenta con certificaciones de seguridad propias como SOC 2 o ISO 27001, y no afirmamos tenerlas.
        Las certificaciones que tenga Supabase como proveedor son suyas, no de este sitio.
      </p>

      <h2>Menores de edad</h2>
      <p>
        La app está pensada para docentes y sus clases. Si eres menor de edad, úsala con permiso y supervisión de tu
        madre, padre o tutor.
      </p>

      <h2>Inteligencia artificial</h2>
      <p>
        Este sitio se desarrolló con ayuda de inteligencia artificial (Claude, de Anthropic), y el contenido de ejemplo
        de la pizarra de bienvenida fue generado con IA. La app no envía tus datos ni tus pizarras a ningún servicio de
        IA.
      </p>

      <h2>Cambios en esta política</h2>
      <p>
        Si la cambiamos de forma relevante, actualizaremos la fecha de arriba y te pediremos que la aceptes de nuevo la
        próxima vez que entres.
      </p>
    </>
  );
}

/** Términos cuando la app usa cuentas en la nube (Supabase). */
export function TermsCloud() {
  return (
    <>
      <h1>Términos y condiciones</h1>
      <Updated />

      <h2>1. El servicio</h2>
      <p>
        Pizarra Digital ({SITE_URL}) es una pizarra digital para uso personal y docente, ofrecida por {SITE_OWNER}. Al
        crear una cuenta aceptas estos términos y la <a href="#/legal/privacidad">Política de privacidad</a>. Guardamos
        en tu perfil qué versión aceptaste y cuándo.
      </p>

      <h2>2. Precio y reembolsos</h2>
      <p>
        El servicio es <strong>gratuito</strong>: no hay planes de pago, suscripciones ni compras dentro de la app, y
        por tanto no hay nada que reembolsar. Si algún día se ofreciera algo de pago, antes de cobrar nada se publicarán
        el precio y una política de reembolsos.
      </p>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>Necesitas un correo electrónico válido y una contraseña. Usa un correo al que tengas acceso.</li>
        <li>Eres responsable de mantener tu contraseña en secreto. Si la olvidas, puedes cambiarla por correo.</li>
        <li>
          Puedes eliminar tu cuenta cuando quieras desde «Perfil → Eliminar cuenta», sin pasos adicionales ni
          necesidad de contactarnos.
        </li>
      </ul>

      <h2>4. Tu contenido</h2>
      <p>
        Lo que creas en tus pizarras es tuyo. Lo guardamos únicamente para mostrártelo en tus dispositivos; no lo
        usamos para nada más ni lo compartimos. Eres responsable de tener los derechos necesarios sobre las imágenes y
        textos que subas.
      </p>

      <h2>5. Uso aceptable</h2>
      <p>
        No uses la app para crear, guardar o difundir contenido ilegal, que infrinja derechos de terceros, o que acose o
        ponga en riesgo a otras personas, en especial a menores. Podemos suspender cuentas que incumplan estas normas.
      </p>

      <h2>6. Disponibilidad y límites</h2>
      <p>
        La app se ofrece «tal cual», sin garantía de disponibilidad continua. Funciona con el plan gratuito de un
        proveedor externo, que tiene límites de espacio y de envío de correos, y puede pausar el servicio temporalmente
        si pasa un tiempo sin uso. Usa «Descargar» en tu perfil para hacer copias de seguridad.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        En la medida en que lo permita la ley aplicable, no somos responsables de pérdidas de datos ni de daños
        indirectos derivados del uso de la app. Nada de estos términos limita los derechos que te reconozca la ley de
        tu país como persona consumidora.
      </p>

      <h2>8. Propiedad intelectual y licencias</h2>
      <p>
        El código propio del sitio pertenece a su titular. Los componentes de terceros (React, Framer Motion, Supabase
        JS, iconos Lucide, la fuente Inter y otros) se usan conforme a sus licencias de código abierto, que puedes
        consultar en <a href="#/legal/licencias">Licencias</a>. No usamos logotipos ni marcas de terceros.
      </p>

      <h2>9. Contenido generado con IA</h2>
      <p>
        El sitio se desarrolló con ayuda de IA (Claude, de Anthropic), y la pizarra de bienvenida contiene ejemplos
        generados con IA, etiquetados como tales dentro de la propia pizarra.
      </p>

      <h2>10. Derechos de autor</h2>
      <p>
        Si crees que algún contenido infringe tus derechos, sigue el procedimiento de{' '}
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
