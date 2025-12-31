export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  // 최소 8자
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }

  // 영문 포함
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('비밀번호는 영문을 포함해야 합니다.');
  }

  // 숫자 포함
  if (!/[0-9]/.test(password)) {
    errors.push('비밀번호는 숫자를 포함해야 합니다.');
  }

  // 특수문자 포함
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('비밀번호는 특수문자를 포함해야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
