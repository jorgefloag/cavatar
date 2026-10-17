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

// ClerkAPIResponseError's OWN `.code` is always the constant
// "api_response_error" (set unconditionally in its constructor) — the
// real, field-specific code (e.g. "form_identifier_not_found") only lives
// on `.errors[0].code`. A bare `error.code === "form_identifier_not_found"`
// check (as opposed to this) can never match, confirmed directly against
// @clerk/shared's installed source, not assumed from the "code is now a
// direct property" comment above, which only holds for the string-coded
// ClerkError methods like signIn.password() — not for this validation
// error shape.
export function isIdentifierNotFoundError(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.errors[0]?.code === "form_identifier_not_found"
}

// Found live in Clerk Production (2026-10-17): with "Sign-up with password"
// still on there, `password` stayed in Clerk's own requiredFields even
// though our sign-up screens never collect one — the email code verified
// fine, but signUp.status came back "missing_requirements" instead of
// "complete", and every call site's generic `else` branch blamed the code
// itself ("Código inválido"), which was never the actual problem. Fixed
// by turning off that toggle in Production (see CLAUDE.md), but this stays
// as defense-in-depth for exactly the same shape of failure if anyone
// flips it back, or if Clerk ever requires some other field we don't ask
// for. Takes a plain {status, missingFields} shape — not the real SignUp
// resource — specifically so it's testable with a plain object, no live
// Clerk session needed. Returns null for "complete": that's not an error
// at all, and no call site should reach this function for that status in
// the first place (it's handled by its own branch beforehand) — null here
// is a defensive, testable contract, not something meant to be shown.
export function getSignUpIncompleteMessage(signUp: {
  status: string
  missingFields?: readonly string[]
}): string | null {
  if (signUp.status === "complete") return null

  if (signUp.status === "missing_requirements") {
    if (signUp.missingFields?.includes("password")) {
      return "Tu registro quedó pendiente de un paso que esta pantalla no pide. Escribinos a hola@cavatarcr.com para que lo resolvamos."
    }
    return "El código es correcto, pero no pudimos completar tu registro. Escribinos a hola@cavatarcr.com."
  }

  if (signUp.status === "abandoned") {
    return "Tu intento de registro venció. Volvé a intentarlo desde el principio."
  }

  return "No pudimos completar tu registro. Escribinos a hola@cavatarcr.com."
}
