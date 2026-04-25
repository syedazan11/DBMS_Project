"use client";

import { useGlobalContext } from "@/context/context";
import { useEffect, useState } from "react";
import { DataTable } from "./_components/data-table";
import { columns } from "./tableConfig";
import { Button } from "@/components/ui/button";
import AddExpense from "./_components/AddExpense";
import { Pen, Trash } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import LoaderButton from "@/app/_components/LoaderButton";
import { db } from "../../../../../utils/dbConfig";
import { expenseTags, expenses } from "../../../../../utils/schema";
import { eq } from "drizzle-orm";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";

function ExpensesScreen() {
  const { getAllExpenses, expenseList, budgetList, getBudgetList } =
    useGlobalContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expenseTagsMap, setExpenseTagsMap] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState("all");

  const getExpenseTags = async () => {
    try {
      const response = await fetch("/api/expenses/with-tags", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      const byExpenseId = (payload?.expenses || []).reduce((acc, item) => {
        acc[item.id] = Array.isArray(item.tags) ? item.tags : [];
        return acc;
      }, {});
      setExpenseTagsMap(byExpenseId);
    } catch (error) {
      console.error("Failed to fetch expense tags:", error);
    }
  };

  const getAvailableTags = async () => {
    try {
      const response = await fetch("/api/tags", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setAvailableTags(Array.isArray(payload?.tags) ? payload.tags : []);
    } catch (error) {
      console.error("Failed to fetch all tags:", error);
    }
  };

  const onDelete = async (id) => {
    setLoading(true);
    try {
      await db.delete(expenseTags).where(eq(expenseTags.expenseId, id));
      await db.delete(expenses).where(eq(expenses.id, id));
      toast.success("Expense Deleted!");
      await getAllExpenses();
      await getExpenseTags();
    } catch (error) {
      toast.error("Error Deleting Expense!");
    } finally {
      setLoading(false);
    }
  };

  const updatedColumns = [
    ...columns,
    {
      id: "edit",
      header: "",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Pen className="w-5 h-5 text-primary" />
          </DialogTrigger>
          <DialogContent>
            <AddExpense data={row.original} onUpdated={() => {
              getExpenseTags();
              getAvailableTags();
            }} />
          </DialogContent>
        </Dialog>
      ),
    },
    {
      id: "delete",
      header: "",
      cell: ({ row }) => (
        <Dialog>
          <DialogTrigger asChild>
            <Trash className="w-5 h-5 text-destructive cursor-pointer" />
          </DialogTrigger>
          <DialogContent>
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Confirm Deletion</h3>
              <p className="">
                Are you sure you want to delete this item? This action cannot be
                undone.
              </p>
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <LoaderButton
                    loading={loading}
                    className="bg-destructive hover:bg-destructive/90"
                    buttonText={"Delete"}
                    onClick={() => onDelete(row.original.id)}
                  />
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  const updateData = () => {
    if (expenseList && budgetList) {
      let filteredExpenses = expenseList
        .filter((expense) =>
          budgetList.some((budget) => budget.id === expense.budgetId)
        )
        .map((expense) => {
          const matchingBudget = budgetList.find(
            (budget) => budget.id === expense.budgetId
          );
          return {
            ...expense,
            Icon: matchingBudget?.Icon || null,
            budgetName: matchingBudget?.name || null,
            tags: expenseTagsMap[expense.id] || [],
          };
        });

      // Apply tag filter
      if (selectedTagId !== "all") {
        filteredExpenses = filteredExpenses.filter((expense) =>
          expense.tags.some((tag) => tag.id.toString() === selectedTagId)
        );
      }

      setData(filteredExpenses);
    }
  };

  useEffect(() => {
    getAllExpenses();
    getBudgetList();
    getExpenseTags();
    getAvailableTags();
  }, []);

  useEffect(() => {
    updateData();
  }, [expenseList, budgetList, expenseTagsMap, selectedTagId]);

  return (
    <div className="p-4 md:p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="font-bold text-3xl">My Expenses</h2>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select
              value={selectedTagId}
              onValueChange={(value) => setSelectedTagId(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              {Array.isArray(budgetList) && <Button>Add Expense</Button>}
            </DialogTrigger>
            <DialogContent>
              <AddExpense onUpdated={() => {
                getExpenseTags();
                getAvailableTags();
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {!Array.isArray(budgetList) && <h1 className="pt-2 blink">Add Budgets in order to add expenses.</h1>}
      <DataTable columns={updatedColumns} data={data} />
    </div>
  );
}

export default ExpensesScreen;
