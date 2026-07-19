export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(
  password: string,
  minLength: number = 8,
  requireSpecial: boolean = false,
): PasswordValidation {
  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters.`);
  }
  if (requireSpecial) {
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter.");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter.");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number.");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character.");
    }
  }

  return { valid: errors.length === 0, errors };
}
