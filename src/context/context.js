"use client";
import { createContext, useContext, useState } from "react";
import { db } from "../../utils/dbConfig";
import { Budgets, expenses, Incomes } from "../../utils/schema";
import { useUser } from "@/context/auth-context";
import { useWindowWidth } from "@react-hook/window-size";
import { sql, desc, eq } from "drizzle-orm";

const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const { user } = useUser();
  const [budgetList, setBudgetList] = useState([]);
  const [incomeList, setIncomeList] = useState([]);
  const [expenseList, setExpenseList] = useState([]);

  const [expand, setExpand] = useState(false);
  const screenWidth = useWindowWidth();
  const mobileScreen = screenWidth < 1000;

const getBudgetList = async () => {
    if (!user?.id) return;
    const result = await db
      .select({
        id: Budgets.id,
        Icon: Budgets.Icon,
        name: Budgets.name,
        // Removed createdBy (redundant email)
        totalItem: sql`count(${Budgets.id})`,
        totalSpend: sql`sum(${expenses.amount})`,
        amount: Budgets.amount,
      })
      .from(Budgets)
      .leftJoin(expenses, eq(Budgets.id, expenses.budgetId))
      .where(eq(Budgets.userId, user.id)) // Now filtering by numeric ID
      .groupBy(Budgets.id)
      .orderBy(desc(Budgets.id));
    
    setBudgetList(result.length > 0 ? result : []);
  };

  const getIncomeList = async () => {
    if (!user?.id) return;
    const result = await db
      .select({
        id: Incomes.id,
        amount: Incomes.amount,
        name: Incomes.name,
        Icon: Incomes.Icon,
      })
      .from(Incomes)
      .where(eq(Incomes.userId, user.id)) // Now filtering by numeric ID
      .groupBy(Incomes.id);
    
    setIncomeList(result.length > 0 ? result : []);
  };

  const getAllExpenses = async () => {
    if (!user?.id) return;
    const result = await db
      .select({
        id: expenses.id,
        name: expenses.name,
        expense: expenses.amount,
        budgetId: expenses.budgetId,
        userId: expenses.userId,
        updatedAt: expenses.updatedAt,
        createdAt: expenses.createdAt
      })
      .from(expenses)
      .where(eq(expenses.userId, user.id)) // Now filtering by numeric ID
      .orderBy(desc(expenses.createdAt));
    
    setExpenseList(result);
  };

  return (
    <GlobalContext.Provider
      value={{
        expenseList,
        budgetList,
        incomeList,
        getAllExpenses,
        getBudgetList,
        getIncomeList,
        mobileScreen,
        expand,
        setExpand,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
