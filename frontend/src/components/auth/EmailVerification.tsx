'use client';

import React, { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onSendCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, code: string) => Promise<boolean>;
}

export default function EmailVerification({
  email,
  onVerified,
  onSendCode,
  onVerifyCode,
}: EmailVerificationProps) {
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // 쿨다운 타이머
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
      await onSendCode(email);
      setCodeSent(true);
      setCooldown(60); // 60초 쿨다운
    } catch (err: any) {
      setError(err.message || '인증번호 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await onVerifyCode(email, code);
      if (success) {
        onVerified();
      } else {
        setError('인증번호가 올바르지 않습니다.');
      }
    } catch (err: any) {
      setError(err.message || '인증에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!codeSent ? (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            이메일 인증이 필요합니다. 인증번호를 받으시려면 아래 버튼을 클릭하세요.
          </p>
          <Button
            type="button"
            onClick={handleSendCode}
            disabled={loading || cooldown > 0}
            className="w-full"
          >
            {cooldown > 0
              ? `재전송 (${cooldown}초)`
              : loading
              ? '발송 중...'
              : '인증번호 받기'}
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {email}로 인증번호를 발송했습니다. (유효시간: 5분)
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="인증번호 6자리"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <Button type="button" onClick={handleVerifyCode} disabled={loading}>
              {loading ? '확인 중...' : '확인'}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendCode}
            disabled={loading || cooldown > 0}
            className="w-full mt-2"
          >
            {cooldown > 0 ? `재전송 (${cooldown}초)` : '인증번호 재전송'}
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
