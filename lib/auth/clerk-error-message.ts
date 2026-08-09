import { isClerkAPIResponseError } from "@clerk/nextjs/errors"

const CLERK_ERROR_MESSAGES: Record<string, string> = {
  // Login (signIn.create) — mensaje combinado a propósito: distinguir
  // "correo no encontrado" de "contraseña incorrecta" permite enumerar
  // qué correos están registrados.
  form_password_incorrect: "Correo o contraseña incorrectos.",
  form_identifier_not_found: "Correo o contraseña incorrectos.",
  too_many_requests: "Demasiados intentos. Espera un momento y vuelve a intentar.",

  // Registro (signUp.create)
  form_identifier_exists: "Ya existe una cuenta con este correo. Intenta iniciar sesión.",
  form_password_pwned: "Esta contraseña fue expuesta en filtraciones de datos conocidas. Elige otra.",
  form_password_not_strong_enough: "La contraseña no es lo suficientemente segura. Prueba con una más larga o menos común.",
  form_password_length_too_short: "La contraseña es demasiado corta.",
  form_param_format_invalid: "El formato del correo no es válido.",

  // Verificación de código (signUp.attemptEmailAddressVerification)
  form_code_incorrect: "Código incorrecto. Intenta de nuevo.",
  verification_expired: "El código expiró. Vuelve a intentar el registro para recibir uno nuevo.",

  // Ya hay una sesión activa (p. ej. sesión abierta en otro dispositivo)
  session_exists: "Ya tienes una sesión activa. Cierra sesión antes de continuar.",
}

// La API de Signals ya no lanza excepciones para errores esperados: los
// métodos devuelven { error }, donde error es un ClerkError con `code` como
// propiedad directa (no error.errors[0].code como en la API legacy). No hay
// un tipo público importable para ClerkError, así que se valida en runtime.
// isClerkAPIResponseError se conserva como respaldo por si algo inesperado
// (p. ej. un fallo de red) sigue llegando como excepción capturada.
function extractErrorCode(error: unknown): string | undefined {
  if (isClerkAPIResponseError(error)) {
    return error.errors[0]?.code
  }
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code
  }
  return undefined
}

export function getClerkErrorMessage(
  error: unknown,
  fallback: string,
): { message: string; expected: boolean } {
  const code = extractErrorCode(error)
  const mapped = code ? CLERK_ERROR_MESSAGES[code] : undefined
  if (mapped) return { message: mapped, expected: true }
  return { message: fallback, expected: false }
}
