import axios from "axios";
import * as FormData from "form-data";

interface BankdaConfig {
  accountNumber: string;
  accessToken: string;
  isTest: boolean;
}

interface BankdaTransaction {
  date: string;
  time: string;
  dateTime: Date;
  amount: number;
  balance: number;
  depositorName: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  description: string;
}


export class BankdaService {
  private config: BankdaConfig;
  private baseUrl: string = "https://a.bankda.com/dtsvc/bank_tr.php";

  constructor(config: BankdaConfig) {
    this.config = config;
  }

  async getTransactionHistory(
    dateFrom: Date,
    dateTo: Date
  ): Promise<BankdaTransaction[]> {
    try {
      const formData = new FormData();
      formData.append("accountnum", this.config.accountNumber);
      formData.append("datatype", "json");
      formData.append("charset", "utf8");
      formData.append("datefrom", this.formatDate(dateFrom));
      formData.append("dateto", this.formatDate(dateTo));
      if (this.config.isTest) {
        formData.append("istest", "y");
      }

      const response = await axios.post(
        this.baseUrl,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            ...formData.getHeaders()
          },
          timeout: 30000,
        }
      );

      if (!response.data || !response.data.response || !response.data.response.bank) {
        return [];
      }

      return this.parseTransactions(response.data.response.bank);
    } catch (error) {
      console.error("Bankda transaction history error:", error);
      throw new Error(
        `Failed to fetch transaction history: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }


  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  private parseTransactions(bankRecords: any[]): BankdaTransaction[] {
    if (!Array.isArray(bankRecords)) {
      return [];
    }

    return bankRecords.map((item) => {
      const dateTime = this.parseBankdaDateTime(item.bkdate || "", item.bktime || "");
      return {
        date: item.bkdate || "",
        time: item.bktime || "",
        dateTime,
        amount: parseFloat(item.bkinput || item.bkoutput || "0") || 0,
        balance: parseFloat(item.bkjango || "0") || 0,
        depositorName: item.bkjukyo || "",
        type: (item.bkinput && parseFloat(item.bkinput) > 0) ? "DEPOSIT" : "WITHDRAWAL",
        description: item.bkcontent || "",
      };
    });
  }

  private parseBankdaDateTime(bkdate: string, bktime: string): Date {
    if (!bkdate || bkdate.length !== 8) {
      return new Date();
    }

    const year = parseInt(bkdate.substring(0, 4));
    const month = parseInt(bkdate.substring(4, 6)) - 1;
    const day = parseInt(bkdate.substring(6, 8));

    let hour = 0, minute = 0, second = 0;
    if (bktime && bktime.length === 6) {
      hour = parseInt(bktime.substring(0, 2));
      minute = parseInt(bktime.substring(2, 4));
      second = parseInt(bktime.substring(4, 6));
    }

    return new Date(year, month, day, hour, minute, second);
  }
}

export function createBankdaService(): BankdaService {
  const config: BankdaConfig = {
    accountNumber: process.env.BANKDA_ACCOUNT_NUMBER || "",
    accessToken: process.env.BANKDA_ACCESS_TOKEN || "",
    isTest: process.env.BANKDA_TEST_MODE === "true",
  };

  if (!config.accountNumber || !config.accessToken) {
    throw new Error(
      "Bankda configuration is missing. Check environment variables (BANKDA_ACCOUNT_NUMBER, BANKDA_ACCESS_TOKEN)."
    );
  }

  return new BankdaService(config);
}
