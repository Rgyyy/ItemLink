'use client';

import React from 'react';
import { checkPasswordStrength } from '@/utils/passwordValidator';

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const strength = checkPasswordStrength(password);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(strength.score / 4) * 100}%`,
              backgroundColor: strength.color,
            }}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
      {strength.suggestions.length > 0 && (
        <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
          {strength.suggestions.map((suggestion, index) => (
            <li key={index}>• {suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
