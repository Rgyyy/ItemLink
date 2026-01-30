import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ItemLink</h3>
            <p className="text-gray-400">
              안전하고 편리한 게임 아이템 거래 플랫폼
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">바로가기</h4>
            <ul className="space-y-2">
              <li>
                <a href="/items" className="text-gray-400 hover:text-white">
                  아이템 목록
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-400 hover:text-white">
                  서비스 소개
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-400 hover:text-white">
                  이용약관
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">고객센터</h4>
            <ul className="space-y-2 text-gray-400">
              <li>이메일: support@itemlink.com</li>
              <li>운영시간: 평일 09:00 - 18:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; 2024 ItemLink. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
