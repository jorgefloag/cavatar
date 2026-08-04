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
}

export function getClerkErrorMessage(
  error: unknown,
  fallback: string,
): { message: string; expected: boolean } {
  if (isClerkAPIResponseError(error)) {
    const code = error.errors[0]?.code
    const mapped = code ? CLERK_ERROR_MESSAGES[code] : undefined
    if (mapped) return { message: mapped, expected: true }
  }
  return { message: fallback, expected: false }
}
