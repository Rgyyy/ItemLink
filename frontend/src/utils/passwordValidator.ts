export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const suggestions: string[] = [];

  // 길이 체크
  if (password.length >= 8) {
    score++;
  } else {
    suggestions.push('최소 8자 이상 입력하세요');
  }

  // 영문 체크
  if (/[a-zA-Z]/.test(password)) {
    score++;
  } else {
    suggestions.push('영문을 포함하세요');
  }

  // 숫자 체크
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    suggestions.push('숫자를 포함하세요');
  }

  // 특수문자 체크
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  } else {
    suggestions.push('특수문자를 포함하세요');
  }

  const labels = ['매우 약함', '약함', '보통', '강함', '매우 강함'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  return {
    score,
    label: labels[score] || '매우 약함',
    color: colors[score] || '#ef4444',
    suggestions,
  };
};
