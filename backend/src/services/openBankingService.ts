import axios, { AxiosInstance, AxiosError } from 'axios';

interface OpenBankingConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  callbackUrl: string;
}

interface BankAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

interface TransferRequest {
  fromAccountNumber: string;
  toAccountNumber: string;
  toBankCode: string;
  amount: number;
  description?: string;
}

interface TransferResponse {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED';
  message?: string;
}

interface BalanceResponse {
  balance: number;
  accountNumber: string;
}

class OpenBankingError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OpenBankingError';
  }
}

class OpenBankingService {
  private client: AxiosInstance;
  private config: OpenBankingConfig;

  constructor() {
    this.validateEnvironmentVariables();

    this.config = {
      clientId: process.env.OPENBANKING_CLIENT_ID!,
      clientSecret: process.env.OPENBANKING_CLIENT_SECRET!,
      baseUrl: process.env.OPENBANKING_BASE_URL || 'https://testapi.openbanking.or.kr',
      callbackUrl: process.env.OPENBANKING_CALLBACK_URL || 'http://localhost:3000/callback/openbanking'
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private validateEnvironmentVariables(): void {
    const requiredVars = ['OPENBANKING_CLIENT_ID', 'OPENBANKING_CLIENT_SECRET'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(
        `Warning: Missing OpenBanking environment variables: ${missingVars.join(', ')}. ` +
        'The service will use mock mode.'
      );
    }
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          const responseData = axiosError.response?.data;

          throw new OpenBankingError(
            responseData?.rsp_message || error.message,
            responseData?.rsp_code,
            error
          );
        }
        throw error;
      }
    );
  }

  private isMockMode(): boolean {
    return !process.env.OPENBANKING_CLIENT_ID || !process.env.OPENBANKING_CLIENT_SECRET;
  }

  async getAuthorizationUrl(userId: string): Promise<string> {
    if (!userId) {
      throw new OpenBankingError('User ID is required');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: 'login inquiry transfer',
      state: userId,
      auth_type: '0',
    });

    return `${this.config.baseUrl}/oauth/2.0/authorize?${params.toString()}`;
  }

  async getAccessToken(code: string): Promise<{ accessToken: string; refreshToken: string; userSeqNo: string }> {
    if (!code) {
      throw new OpenBankingError('Authorization code is required');
    }

    try {
      const response = await this.client.post('/oauth/2.0/token', {
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.callbackUrl,
        grant_type: 'authorization_code',
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        userSeqNo: response.data.user_seq_no,
      };
    } catch (error) {
      if (error instanceof OpenBankingError) {
        throw error;
      }
      throw new OpenBankingError('Failed to get access token', undefined, error);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    if (!refreshToken) {
      throw new OpenBankingError('Refresh token is required');
    }

    try {
      const response = await this.client.post('/oauth/2.0/token', {
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
      });

      return response.data.access_token;
    } catch (error) {
      if (error instanceof OpenBankingError) {
        throw error;
      }
      throw new OpenBankingError('Failed to refresh access token', undefined, error);
    }
  }

  async getAccountList(accessToken: string, userSeqNo: string): Promise<BankAccount[]> {
    if (!accessToken || !userSeqNo) {
      throw new OpenBankingError('Access token and user sequence number are required');
    }

    try {
      const response = await this.client.get('/v2.0/account/list', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          user_seq_no: userSeqNo,
          include_cancel_yn: 'N',
          sort_order: 'D',
        },
      });

      if (!response.data.res_list || !Array.isArray(response.data.res_list)) {
        return [];
      }

      return response.data.res_list.map((account: any) => ({
        bankCode: account.bank_code_std,
        bankName: account.bank_name,
        accountNumber: account.account_num_masked,
        accountHolderName: account.account_holder_name,
      }));
    } catch (error) {
      if (error instanceof OpenBankingError) {
        throw error;
      }
      throw new OpenBankingError('Failed to get account list', undefined, error);
    }
  }

  async getBalance(accessToken: string, bankCode: string, accountNumber: string): Promise<BalanceResponse> {
    if (!accessToken || !bankCode || !accountNumber) {
      throw new OpenBankingError('Access token, bank code, and account number are required');
    }

    try {
      const response = await this.client.get('/v2.0/account/balance/fin_num', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          bank_tran_id: this.generateBankTranId(),
          fintech_use_num: accountNumber,
          tran_dtime: this.getCurrentDateTime(),
        },
      });

      return {
        balance: parseFloat(response.data.balance_amt) || 0,
        accountNumber: response.data.account_num_masked,
      };
    } catch (error) {
      if (error instanceof OpenBankingError) {
        throw error;
      }
      throw new OpenBankingError('Failed to get balance', undefined, error);
    }
  }

  async transfer(accessToken: string, request: TransferRequest): Promise<TransferResponse> {
    if (!accessToken) {
      throw new OpenBankingError('Access token is required');
    }

    if (!request.fromAccountNumber || !request.toAccountNumber || !request.toBankCode) {
      throw new OpenBankingError('Account information is incomplete');
    }

    if (!request.amount || request.amount <= 0) {
      throw new OpenBankingError('Invalid transfer amount');
    }

    try {
      const response = await this.client.post(
        '/v2.0/transfer/withdraw/fin_num',
        {
          bank_tran_id: this.generateBankTranId(),
          cntr_account_type: 'N',
          cntr_account_num: this.config.clientId.padEnd(10, '0').substring(0, 10),
          dps_print_content: this.truncateString(request.description || 'Mileage Transfer', 16),
          fintech_use_num: request.fromAccountNumber,
          wd_print_content: this.truncateString(request.description || 'Mileage Deposit', 16),
          tran_amt: Math.floor(request.amount).toString(),
          tran_dtime: this.getCurrentDateTime(),
          req_client_name: 'ItemLink',
          req_client_fintech_use_num: request.toAccountNumber,
          req_client_num: request.toAccountNumber,
          transfer_purpose: 'TR',
          recv_client_name: 'User',
          recv_client_bank_code: request.toBankCode,
          recv_client_account_num: request.toAccountNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.rsp_code === 'A0000') {
        return {
          transactionId: response.data.api_tran_id,
          status: 'SUCCESS',
        };
      } else {
        return {
          transactionId: '',
          status: 'FAILED',
          message: response.data.rsp_message,
        };
      }
    } catch (error) {
      if (error instanceof OpenBankingError) {
        throw error;
      }
      throw new OpenBankingError('Failed to process transfer', undefined, error);
    }
  }

  async depositToUser(amount: number, description: string = 'Mileage Deposit'): Promise<TransferResponse> {
    if (this.isMockMode()) {
      console.log(`[MOCK] Deposit: ${amount} - ${description}`);

      return {
        transactionId: `MOCK_DEPOSIT_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'SUCCESS',
      };
    }

    // 실제 오픈뱅킹 API 구현 필요
    throw new OpenBankingError('Real deposit implementation not available');
  }

  async withdrawFromUser(amount: number, description: string = 'Mileage Withdrawal'): Promise<TransferResponse> {
    if (this.isMockMode()) {
      console.log(`[MOCK] Withdrawal: ${amount} - ${description}`);

      return {
        transactionId: `MOCK_WITHDRAW_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'SUCCESS',
      };
    }

    // 실제 오픈뱅킹 API 구현 필요
    throw new OpenBankingError('Real withdrawal implementation not available');
  }

  private generateBankTranId(): string {
    const clientId = this.config.clientId.padEnd(9, '0').substring(0, 9);
    const timestamp = Date.now().toString().slice(-9);
    return `${clientId}U${timestamp}`;
  }

  private getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength);
  }

  isConfigured(): boolean {
    return !this.isMockMode();
  }
}

export default new OpenBankingService();
export { OpenBankingService, OpenBankingError };
