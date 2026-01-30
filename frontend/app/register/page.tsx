'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import PasswordStrength from '@/components/auth/PasswordStrength';
import EmailVerification from '@/components/auth/EmailVerification';
import { api } from '@/lib/api';
import { checkPasswordStrength } from '@/utils/passwordValidator';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.username) {
      newErrors.username = '사용자명을 입력해주세요.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else {
      const strength = checkPasswordStrength(formData.password);
      if (strength.score < 4) {
        newErrors.password = '비밀번호는 최소 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.';
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (!formData.fullName) {
      newErrors.fullName = '이름을 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Step 1 완료 -> Step 2로 이동 (이메일 인증)
    setStep('verify');
  };

  const handleSendCode = async (email: string) => {
    try {
      await api.sendVerificationCode(email);
    } catch (err: any) {
      throw new Error(err.message || '인증번호 발송에 실패했습니다.');
    }
  };

  const handleVerifyCode = async (email: string, code: string) => {
    try {
      const result: any = await api.verifyEmailCode(email, code);
      return result.success;
    } catch (err: any) {
      throw new Error(err.message || '인증에 실패했습니다.');
    }
  };

  const handleEmailVerified = async () => {
    setEmailVerified(true);

    // 이메일 인증 완료 시 자동으로 회원가입 진행
    setLoading(true);

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone || undefined,
      });
      router.push('/');
    } catch (err: any) {
      setErrors({
        submit: err.message || '회원가입에 실패했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">회원가입</h1>
            <p className="text-sm text-gray-600 text-center mt-2">
              {step === 'form' ? 'Step 1: 정보 입력' : 'Step 2: 이메일 인증'}
            </p>
          </CardHeader>
          <CardBody>
            {step === 'form' ? (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errors.submit}
                  </div>
                )}

                <Input
                  label="이메일"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  error={errors.email}
                  required
                />

                <Input
                  label="사용자명"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="사용자명을 입력하세요"
                  error={errors.username}
                  required
                />

                <Input
                  label="이름"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="홍길동"
                  error={errors.fullName}
                  required
                />

                <Input
                  label="전화번호 (선택)"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="010-0000-0000"
                />

                <div>
                  <Input
                    label="비밀번호"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="최소 8자 이상, 영문, 숫자, 특수문자 포함"
                    error={errors.password}
                    required
                  />
                  <PasswordStrength password={formData.password} />
                </div>

                <Input
                  label="비밀번호 확인"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="비밀번호를 다시 입력하세요"
                  error={errors.confirmPassword}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                >
                  다음 (이메일 인증)
                </Button>

                <div className="text-center text-sm text-gray-600">
                  이미 계정이 있으신가요?{' '}
                  <Link href="/login" className="text-blue-600 hover:underline">
                    로그인
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {errors.submit}
                  </div>
                )}

                <EmailVerification
                  email={formData.email}
                  onVerified={handleEmailVerified}
                  onSendCode={handleSendCode}
                  onVerifyCode={handleVerifyCode}
                />

                {loading && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                      <span>회원가입을 진행 중입니다...</span>
                    </div>
                  </div>
                )}

                {!loading && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('form')}
                      className="flex-1"
                      disabled={loading}
                    >
                      이전
                    </Button>
                  </div>
                )}

                <div className="text-center text-sm text-gray-600">
                  이미 계정이 있으신가요?{' '}
                  <Link href="/login" className="text-blue-600 hover:underline">
                    로그인
                  </Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
