"""Module 1 範例:物件導向(銀行帳戶)"""

from dataclasses import dataclass


class BankAccount:
    """簡易銀行帳戶類別"""

    def __init__(self, owner: str, balance: float = 0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount: float):
        if amount <= 0:
            raise ValueError("存款金額必須大於 0")
        self.balance += amount

    def withdraw(self, amount: float):
        if amount > self.balance:
            raise ValueError("餘額不足")
        self.balance -= amount

    def __str__(self):
        return f"{self.owner} 的帳戶餘額:{self.balance}"


class SavingsAccount(BankAccount):
    """繼承 BankAccount,加上利息功能"""

    def __init__(self, owner: str, balance: float = 0, interest_rate: float = 0.01):
        super().__init__(owner, balance)
        self.interest_rate = interest_rate

    def apply_interest(self):
        self.balance += self.balance * self.interest_rate


@dataclass
class Point:
    x: float
    y: float


if __name__ == "__main__":
    account = SavingsAccount("Ada", 1000, interest_rate=0.02)
    account.deposit(500)
    account.apply_interest()
    print(account)

    try:
        account.withdraw(999999)
    except ValueError as e:
        print("捕捉到錯誤:", e)

    p1 = Point(3, 4)
    print(p1)
