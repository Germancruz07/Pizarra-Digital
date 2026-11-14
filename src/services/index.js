/**
 * Capa de servicios desacoplada.
 *
 * La UI solo habla con `authService`, `boardService` y `assetService`. Hoy se
 * implementan con adaptadores locales (localStorage + IndexedDB). Para migrar a
 * Firebase o Supabase basta con crear adaptadores que cumplan la misma interfaz
 * (todos los métodos devuelven Promesas) y reasignarlos aquí:
 *
 *   AuthService
 *     register({ username|email, displayName?, password, avatar?, acceptance }) -> { user } | { needsConfirmation }
 *     login({ username|email, password })         -> User
 *     logout()                                    -> void
 *     getCurrentUser()                            -> User | null
 *     updateProfile(userId, { name?, avatar? })   -> User
 *     acceptTerms(userId, acceptance)             -> User   (registra versión y fecha)
 *     exportProfile(userId)                       -> User   (para "Descargar mis datos")
 *     deleteAccount(userId)                       -> void
 *
 *   BoardService (todas las operaciones van aisladas por ownerId)
 *     listBoards(ownerId)                         -> BoardSummary[]
 *     getBoard(ownerId, id)                       -> Board | null
 *     createBoard(ownerId, { name, background, elements?, viewport? }) -> BoardSummary
 *     saveBoard(ownerId, id, patch)               -> BoardSummary
 *     renameBoard(ownerId, id, name)              -> BoardSummary
 *     duplicateBoard(ownerId, id)                 -> BoardSummary
 *     deleteBoard(ownerId, id)                    -> void
 *     seedWelcomeBoard(ownerId)                   -> BoardSummary
 *     exportBoards(ownerId)                       -> Board[]
 *     deleteAllForOwner(ownerId)                  -> void   (pizarras + imágenes)
 *
 *   AssetService (binarios pesados: imágenes)
 *     saveImage(ownerId, blob, meta, id?)         -> imageId
 *     getImageBlob(imageId)                       -> Blob | null
 *     listImages(ownerId)                         -> ImageRecord[]
 *     deleteAllForOwner(ownerId)                  -> void
 *     cleanupUnreferenced(ownerId, Set<imageId>)  -> number
 */
import { localAuthAdapter } from './local/authLocal';
import { localBoardAdapter } from './local/boardLocal';
import { localAssetAdapter } from './local/assetLocal';
import { isCloud } from './supabase/client';
import { supabaseAuthAdapter } from './supabase/authSupabase';
import { supabaseBoardAdapter } from './supabase/boardSupabase';
import { supabaseAssetAdapter } from './supabase/assetSupabase';
import { supabaseCollabAdapter } from './supabase/collabSupabase';
import { localHistoryAdapter } from './local/historyLocal';
import { supabaseHistoryAdapter } from './supabase/historySupabase';

/**
 * Modo nube (Supabase) si existen VITE_SUPABASE_URL y la clave publicable; si no, modo local.
 * En modo nube, además de lo anterior, AuthService ofrece:
 *     onAuthChange(cb), loadUser(authUser), claimWelcomeSeed(userId) -> boolean,
 *     requestPasswordReset(email), verifyRecoveryCode(email, code), updatePassword(password)
 * y register() devuelve { user } o { needsConfirmation, email } si hay que confirmar el correo.
 */
export { isCloud };
export const authService = isCloud ? supabaseAuthAdapter : localAuthAdapter;
export const boardService = isCloud ? supabaseBoardAdapter : localBoardAdapter;
export const assetService = isCloud ? supabaseAssetAdapter : localAssetAdapter;

/**
 * CollabService (solo modo nube; en modo local es null y la UI no muestra nada):
 * código de acceso, solicitudes, permisos por estudiante y sesión en tiempo real.
 * Ver src/services/supabase/collabSupabase.js y supabase/collab.sql.
 */
export const collabService = isCloud ? supabaseCollabAdapter : null;

/**
 * HistoryService ("Clases pasadas"): pizarras que el usuario creó o a las que se unió.
 *     touch(user, { boardId, boardName?, teacherName?, role?, createdAt? }) -> void  (alta o último acceso)
 *     list(userId)                                -> HistoryEntry[]
 *     remove(userId, boardId)                     -> void
 *     clear(userId)                               -> void   (al eliminar la cuenta)
 * En modo nube requiere supabase/history.sql; si falta, la UI muestra solo las pizarras propias.
 */
export const historyService = isCloud ? supabaseHistoryAdapter : localHistoryAdapter;
