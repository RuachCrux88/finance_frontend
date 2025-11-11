export type WalletType = "PERSONAL" | "GROUP";
export type CategoryType = "INCOME" | "EXPENSE";
export type TxType = "INCOME" | "EXPENSE" | "SETTLEMENT";

export type User = { id: string; name?: string; email: string; createdAt?: string; };
export type WalletMember = { 
  id: string; 
  userId: string; 
  role: "OWNER" | "MEMBER"; 
  joinedAt?: string;
  user: User; 
};
export type Wallet = { 
  id: string; 
  name: string; 
  type: WalletType; 
  currency: string; 
  inviteCode?: string;
  isDefault?: boolean;
  createdAt?: string;
  createdBy?: User;
  members?: WalletMember[];
};
export type Category = { id: string; name: string; type: CategoryType; description?: string; isSystem?: boolean };
export type Transaction = {
  id: string; walletId: string; categoryId: string;
  type: TxType; amount: string; date: string; description?: string;
  category?: Category;
  paidBy?: { id: string; name?: string; email: string };
  createdBy?: { id: string; name?: string; email: string };
  wallet?: { id: string; name: string; type?: WalletType };
  splits?: TransactionSplit[];
};

export type TransactionSplit = {
  id: string;
  transactionId: string;
  owedByUserId: string;
  amount: string;
  settled: boolean;
  owedBy?: { id: string; name?: string; email: string };
};

export type DailyExpense = {
  date: string;
  total: number;
};

export type ChartDataPoint = {
  date: string;
  expenses: number;
  income: number;
  details: Array<{
    type: string;
    amount: number;
    category: string;
    wallet: string;
    description?: string;
  }>;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline?: string;
  status: "ACTIVE" | "PAUSED" | "ACHIEVED" | "CANCELLED";
  walletId?: string;
  scope?: string;
  createdBy?: User;
  createdAt?: string;
};

export type GoalProgress = {
  id: string;
  amount: string;
  note?: string;
  date: string;
  createdBy?: User;
};

export type Settlement = {
  id: string;
  walletId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  date: string;
  fromUser?: User;
  toUser?: User;
  createdBy?: User;
};
