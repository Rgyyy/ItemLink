'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { checkPasswordStrength } from '@/utils/passwordValidator';

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile, changePassword, logout, isAuthenticated, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    phone: '',
    avatarUrl: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.id) {
      fetchMyItems();
    }
  }, [user?.id]);

  const fetchMyItems = async () => {
    if (!user) return;

    setMyItemsLoading(true);
    try {
      const response: any = await api.getTrades({ limit: 100 });
      // Filter trades where I'm the seller
      const trades = response.data?.trades || [];
      const mySellingTrades = trades.filter((trade: any) => trade.seller?.id === user.id);
      // Trade 데이터를 Item 형식으로 변환
      const formattedItems = mySellingTrades.map((trade: any) => ({
        id: trade.id,
        title: trade.title,
        status: trade.status,
        game: {
          name: trade.gameCategory || '던전앤파이터'
        },
        seller: trade.seller
      }));
      setMyItems(formattedItems);
    } catch (error) {
      console.error('Failed to fetch my items:', error);
    } finally {
      setMyItemsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateProfile(formData);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    const strength = checkPasswordStrength(passwordData.newPassword);
    if (strength.score < 4) {
      setPasswordError('비밀번호는 최소 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      setPasswordError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    if (!deleteConfirmed) {
      setDeleteError('탈퇴에 동의해주세요.');
      return;
    }

    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요.');
      return;
    }

    setDeleteLoading(true);

    try {
      await api.deleteAccount(deletePassword);
      // 로그아웃 처리 (AuthContext의 logout 함수 사용)
      logout();
      // 로그인 페이지로 리다이렉트
      router.push('/login?message=account-deleted');
    } catch (err: any) {
      setDeleteError(err.message || '회원 탈퇴에 실패했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">내 프로필</h1>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  수정
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <p className="text-gray-900 bg-gray-50 px-4 py-2 rounded border border-gray-200">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  이메일은 변경할 수 없습니다.
                </p>
              </div>

              <Input
                label="사용자명"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="사용자명을 입력하세요"
                disabled={!isEditing}
                required
              />

              <Input
                label="이름"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="이름을 입력하세요"
                disabled={!isEditing}
              />

              <Input
                label="전화번호"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="전화번호를 입력하세요"
                disabled={!isEditing}
              />

              <Input
                label="프로필 이미지 URL"
                type="url"
                name="avatarUrl"
                value={formData.avatarUrl}
                onChange={handleChange}
                placeholder="프로필 이미지 URL을 입력하세요"
                disabled={!isEditing}
              />

              {isEditing && (
                <div className="flex space-x-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    취소
                  </Button>
                </div>
              )}
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold mb-2">계정 정보</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">가입일:</span>{' '}
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '정보 없음'}
                </p>
                <p>
                  <span className="font-medium">역할:</span>{' '}
                  {user.role === 'admin' ? '관리자' : '사용자'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-2xl font-bold">비밀번호 변경</h2>
          </CardHeader>
          <CardBody>
            {passwordError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="현재 비밀번호"
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="현재 비밀번호를 입력하세요"
                required
              />

              <div>
                <Input
                  label="새 비밀번호"
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="최소 8자 이상, 영문, 숫자, 특수문자 포함"
                  required
                />
                <PasswordStrength password={passwordData.newPassword} />
              </div>

              <Input
                label="새 비밀번호 확인"
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="새 비밀번호를 다시 입력하세요"
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={passwordLoading}
              >
                {passwordLoading ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="mt-8 border-red-200">
          <CardHeader>
            <h2 className="text-2xl font-bold text-red-600">회원 탈퇴</h2>
          </CardHeader>
          <CardBody>
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p className="font-semibold mb-2">⚠️ 주의사항</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>회원 탈퇴 시 계정 정보가 영구적으로 삭제됩니다.</li>
                <li>등록한 거래글은 유지되며 사용자명 뒤에 &quot;(탈퇴한 사용자)&quot;로 표시됩니다.</li>
                <li>탈퇴 후에는 동일한 이메일로 재가입할 수 없습니다.</li>
                <li>이 작업은 취소할 수 없습니다.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <Input
                label="비밀번호 확인"
                type="password"
                name="deletePassword"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="계정 삭제를 위해 비밀번호를 입력하세요"
                required
              />

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="deleteConfirm"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="deleteConfirm" className="ml-2 text-sm text-gray-700">
                  위 내용을 확인했으며, 회원 탈퇴에 동의합니다.
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-500"
                disabled={deleteLoading || !deleteConfirmed}
              >
                {deleteLoading ? '처리 중...' : '회원 탈퇴'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">내가 작성한 글</h2>
              <Link href="/trades/new">
                <Button variant="outline" size="sm">
                  + 물품 등록
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {myItemsLoading ? (
              <p className="text-center py-8 text-gray-500">로딩 중...</p>
            ) : myItems.length > 0 ? (
              <div className="space-y-6">
                {myItems.map((item) => (
                  <Link key={item.id} href={`/trades/${item.id}`}>
                    <div className="flex items-center justify-between p-5 border rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{item.game?.name}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          item.status === 'AVAILABLE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'AVAILABLE' ? '판매중' : '판매완료'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">
                등록한 물품이 없습니다.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
