export type WalletType = "PERSONAL" | "GROUP";
export type CategoryType = "INCOME" | "EXPENSE";
export type TxType = "INCOME" | "EXPENSE" | "SETTLEMENT";

export type Wallet = { id: string; name: string; type: WalletType; currency: string; createdAt?: string; };
export type Category = { id: string; name: string; type: CategoryType; description?: string; isSystem?: boolean };
export type Transaction = {
  id: string; walletId: string; categoryId: string;
  type: TxType; amount: string; date: string; description?: string;
};
