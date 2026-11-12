/**
 * Capa de servicios desacoplada.
 *
 * La UI solo habla con `authService`, `boardService` y `assetService`. Hoy se
 * implementan con adaptadores locales (localStorage + IndexedDB). Para migrar a
 * Firebase o Supabase basta con crear adaptadores que cumplan la misma interfaz
 * (todos los métodos devuelven Promesas) y reasignarlos aquí:
 *
 *   AuthService
 *     register({ name, email, password, avatar }) -> User
 *     login({ email, password })                  -> User
 *     logout()                                    -> void
 *     getCurrentUser()                            -> User | null
 *     updateProfile(userId, { name?, avatar? })   -> User
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
 *
 *   AssetService (binarios pesados: imágenes)
 *     saveImage(ownerId, blob, meta)              -> imageId
 *     getImageBlob(imageId)                       -> Blob | null
 *     cleanupUnreferenced(ownerId, Set<imageId>)  -> number
 */
import { localAuthAdapter } from './local/authLocal';
import { localBoardAdapter } from './local/boardLocal';
import { localAssetAdapter } from './local/assetLocal';

export const authService = localAuthAdapter;
export const boardService = localBoardAdapter;
export const assetService = localAssetAdapter;
