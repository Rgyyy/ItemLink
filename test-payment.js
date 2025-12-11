const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// 색상 출력 헬퍼
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function testPaymentSystem() {
  let token = '';

  try {
    log('blue', '\n========================================');
    log('blue', '   마일리지 시스템 테스트');
    log('blue', '========================================\n');

    // 1. 로그인
    log('yellow', '1️⃣  사용자 로그인 테스트...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user1@example.com',
      password: 'password123'
    });

    if (loginResponse.data.success) {
      token = loginResponse.data.data.token;
      log('green', '✅ 로그인 성공!');
      log('blue', `   사용자: ${loginResponse.data.data.user.username}`);
      log('blue', `   이메일: ${loginResponse.data.data.user.email}`);
    } else {
      throw new Error('로그인 실패');
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 2. 초기 잔액 조회
    log('yellow', '\n2️⃣  초기 마일리지 잔액 조회...');
    const balanceResponse1 = await axios.get(`${BASE_URL}/payments/balance`, { headers });

    if (balanceResponse1.data.success) {
      log('green', '✅ 잔액 조회 성공!');
      log('blue', `   현재 잔액: ${Number(balanceResponse1.data.data.balance).toLocaleString()}원`);
    }

    const initialBalance = Number(balanceResponse1.data.data.balance);

    // 3. 마일리지 충전 (10,000원)
    log('yellow', '\n3️⃣  마일리지 충전 테스트 (10,000원)...');
    const depositResponse = await axios.post(`${BASE_URL}/payments/deposit`, {
      amount: 10000,
      paymentMethod: 'OPEN_BANKING'
    }, { headers });

    if (depositResponse.data.success) {
      log('green', '✅ 충전 성공!');
      log('blue', `   충전 금액: 10,000원`);
      log('blue', `   새 잔액: ${Number(depositResponse.data.data.newBalance).toLocaleString()}원`);
      log('blue', `   거래 ID: ${depositResponse.data.data.transaction.id}`);
      log('blue', `   거래 상태: ${depositResponse.data.data.transaction.status}`);
    } else {
      log('red', '❌ 충전 실패:', depositResponse.data.message);
    }

    // 4. 잔액 재조회
    log('yellow', '\n4️⃣  충전 후 잔액 재조회...');
    const balanceResponse2 = await axios.get(`${BASE_URL}/payments/balance`, { headers });

    if (balanceResponse2.data.success) {
      const newBalance = Number(balanceResponse2.data.data.balance);
      log('green', '✅ 잔액 조회 성공!');
      log('blue', `   이전 잔액: ${initialBalance.toLocaleString()}원`);
      log('blue', `   현재 잔액: ${newBalance.toLocaleString()}원`);
      log('blue', `   증가액: ${(newBalance - initialBalance).toLocaleString()}원`);
    }

    // 5. 작은 금액 충전 (5,000원)
    log('yellow', '\n5️⃣  추가 충전 테스트 (5,000원)...');
    const depositResponse2 = await axios.post(`${BASE_URL}/payments/deposit`, {
      amount: 5000,
      paymentMethod: 'OPEN_BANKING'
    }, { headers });

    if (depositResponse2.data.success) {
      log('green', '✅ 추가 충전 성공!');
      log('blue', `   충전 금액: 5,000원`);
      log('blue', `   새 잔액: ${Number(depositResponse2.data.data.newBalance).toLocaleString()}원`);
    }

    // 6. 거래 내역 조회
    log('yellow', '\n6️⃣  거래 내역 조회...');
    const transactionsResponse = await axios.get(`${BASE_URL}/payments/transactions?type=DEPOSIT&limit=5`, { headers });

    if (transactionsResponse.data.success) {
      log('green', '✅ 거래 내역 조회 성공!');
      const transactions = transactionsResponse.data.data.transactions;
      log('blue', `   총 거래 수: ${transactionsResponse.data.data.pagination.total}개\n`);

      transactions.forEach((tx, index) => {
        log('blue', `   [${index + 1}] ${tx.type} - ${Number(tx.amount).toLocaleString()}원`);
        log('blue', `       상태: ${tx.status}`);
        log('blue', `       일시: ${new Date(tx.createdAt).toLocaleString('ko-KR')}`);
        if (tx.bankTransactionId) {
          log('blue', `       거래ID: ${tx.bankTransactionId}`);
        }
      });
    }

    // 7. 에러 케이스 테스트 - 최소 금액 미만
    log('yellow', '\n7️⃣  에러 케이스 테스트 (최소 금액 미만)...');
    try {
      await axios.post(`${BASE_URL}/payments/deposit`, {
        amount: 500,  // 최소 1,000원
        paymentMethod: 'OPEN_BANKING'
      }, { headers });
      log('red', '❌ 에러가 발생하지 않았습니다 (문제!)');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log('green', '✅ 올바른 에러 처리!');
        log('blue', `   에러 메시지: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // 8. 에러 케이스 테스트 - 최대 금액 초과
    log('yellow', '\n8️⃣  에러 케이스 테스트 (최대 금액 초과)...');
    try {
      await axios.post(`${BASE_URL}/payments/deposit`, {
        amount: 20000000,  // 최대 10,000,000원
        paymentMethod: 'OPEN_BANKING'
      }, { headers });
      log('red', '❌ 에러가 발생하지 않았습니다 (문제!)');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log('green', '✅ 올바른 에러 처리!');
        log('blue', `   에러 메시지: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // 9. 에러 케이스 테스트 - 소수점
    log('yellow', '\n9️⃣  에러 케이스 테스트 (소수점 금액)...');
    try {
      await axios.post(`${BASE_URL}/payments/deposit`, {
        amount: 1000.50,
        paymentMethod: 'OPEN_BANKING'
      }, { headers });
      log('red', '❌ 에러가 발생하지 않았습니다 (문제!)');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        log('green', '✅ 올바른 에러 처리!');
        log('blue', `   에러 메시지: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // 10. 최종 잔액 확인
    log('yellow', '\n🔟  최종 잔액 확인...');
    const finalBalanceResponse = await axios.get(`${BASE_URL}/payments/balance`, { headers });

    if (finalBalanceResponse.data.success) {
      log('green', '✅ 최종 잔액 조회 성공!');
      log('blue', `   최종 잔액: ${Number(finalBalanceResponse.data.data.balance).toLocaleString()}원`);
    }

    log('green', '\n========================================');
    log('green', '   ✅ 모든 테스트 통과!');
    log('green', '========================================\n');

  } catch (error) {
    log('red', '\n❌ 테스트 실패!');
    if (error.response) {
      log('red', `   상태 코드: ${error.response.status}`);
      log('red', `   에러 메시지: ${error.response.data.message || error.message}`);
      console.error(error.response.data);
    } else {
      log('red', `   에러: ${error.message}`);
      console.error(error);
    }
    process.exit(1);
  }
}

// 실행
testPaymentSystem().catch(console.error);
