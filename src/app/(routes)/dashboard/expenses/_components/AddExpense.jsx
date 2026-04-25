"use client";
import LoaderButton from "@/app/_components/LoaderButton";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalContext } from "@/context/context";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { db } from "../../../../../../utils/dbConfig";
import { expenses } from "../../../../../../utils/schema";
import { useClerk } from "@/context/auth-context";
import { eq } from "drizzle-orm";

const AddExpense = ({ data, onUpdated }) => {
  const { user } = useClerk();
  const { budgetList, getAllExpenses } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#000000");
  const [loadingTags, setLoadingTags] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      ...data,
      amount: data?.expense && parseFloat(data.expense),
      budgetId: data?.budgetId && data.budgetId.toString(),
    },
  });

  const initialTagIds = useMemo(
    () => (Array.isArray(data?.tags) ? data.tags.map((tag) => tag.id) : []),
    [data?.tags]
  );
  const tagsDirty =
    JSON.stringify([...selectedTagIds].sort((a, b) => a - b)) !==
    JSON.stringify([...initialTagIds].sort((a, b) => a - b));

  const getAvailableTags = async () => {
    setLoadingTags(true);
    try {
      const response = await fetch("/api/tags", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setAvailableTags(Array.isArray(payload?.tags) ? payload.tags : []);
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setLoadingTags(false);
    }
  };

  const getExpenseTags = async () => {
    if (!data?.id) return;
    try {
      const response = await fetch(`/api/expenses/${data.id}/tags`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      const ids = (payload?.tags || []).map((tag) => tag.id);
      setSelectedTagIds(ids);
    } catch (error) {
      console.error("Failed to fetch expense tags:", error);
    }
  };

  useEffect(() => {
    getAvailableTags();
  }, []);

  useEffect(() => {
    if (!data?.id) {
      setSelectedTagIds([]);
      return;
    }

    if (Array.isArray(data?.tags)) {
      setSelectedTagIds(data.tags.map((tag) => tag.id));
    }
    getExpenseTags();
  }, [data?.id]);

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name) {
      toast.error("Please enter a tag name.");
      return;
    }

    setCreatingTag(true);
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color: newTagColor || "#000000",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload?.error || "Failed to create tag.");
        return;
      }

      const createdTag = payload?.tag;
      if (createdTag?.id) {
        setAvailableTags((prev) => [...prev, createdTag]);
        setSelectedTagIds((prev) =>
          prev.includes(createdTag.id) ? prev : [...prev, createdTag.id]
        );
        setNewTagName("");
        toast.success("Tag created.");
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast.error("Failed to create tag.");
    } finally {
      setCreatingTag(false);
    }
  };

  const syncExpenseTags = async (expenseId) => {
    const response = await fetch(`/api/expenses/${expenseId}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: selectedTagIds }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || "Failed to save expense tags.");
    }
  };

  const onSubmit = async (body) => {
    // 1. Safety check for the numeric ID
    if (!user?.id) return;

    setLoading(true);
    try {
      let expenseId = data?.id;

      if (data) {
        await db
            .update(expenses)
            .set({
              name: body.name,
              amount: parseFloat(body.amount),
              budgetId: parseFloat(body.budgetId),
              userId: user.id, // 2. Use userId instead of createdBy
              updatedAt: new Date(),
            })
            .where(eq(expenses.id, data.id));
      } else {
        const inserted = await db
          .insert(expenses)
          .values({
            name: body.name,
            amount: parseFloat(body.amount),
            budgetId: parseFloat(body.budgetId),
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({
            id: expenses.id,
          });

        expenseId = inserted?.[0]?.id;
      }

      if (expenseId) {
        await syncExpenseTags(expenseId);
      }

      await getAllExpenses();
      if (typeof onUpdated === "function") {
        await onUpdated();
      }
      toast.success(data ? "Expense Updated!" : "Expense Added!");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
    } finally {
      setLoading(false);
      reset();
    }
  };
  
  return (
    <DialogHeader>
      <DialogTitle>{data ? "Edit Expense" : "Add Expense"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-5">
          <div className="mt-2">
            <h2 className="text-black font-medium my-1">Expense Name</h2>
            <Input {...register("name")} placeholder="e.g., Home Decor" />
          </div>
          <div className="mt-2">
            <h2 className="text-black font-medium my-1">Amount</h2>
            <Input
              type="number"
              {...register("amount", { required: "Amount is required" })}
              placeholder="e.g., 5000"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm">{errors.amount.message}</p>
            )}
          </div>
          <div className="mt-3">
            <h2 className="text-black font-medium my-1">Tags (Optional)</h2>
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="Create new tag"
              />
              <Input
                type="color"
                value={newTagColor}
                onChange={(event) => setNewTagColor(event.target.value)}
                className="w-12 p-1 cursor-pointer"
                aria-label="Tag color"
              />
              <Button
                type="button"
                variant="outline"
                onClick={createTag}
                disabled={creatingTag}
              >
                {creatingTag ? "Creating..." : "Create"}
              </Button>
            </div>
            <div className="mt-2 border rounded-md p-2 min-h-12">
              {loadingTags ? (
                <p className="text-sm text-gray-500">Loading tags...</p>
              ) : availableTags.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tags yet. Create one above.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2 py-1 text-xs rounded-full border transition ${
                          active ? "bg-slate-100" : "bg-white"
                        }`}
                        style={{
                          borderColor: tag.color || "#000000",
                          color: tag.color || "#000000",
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="mt-2">
            <h2 className="text-black font-medium my-1">Spent on</h2>
            <Controller
              name="budgetId"
              control={control}
              rules={{ required: "Please select a budget" }}
              render={({ field, fieldState }) => (
                <div className="space-y-2">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a Budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {budgetList.map((item) => (
                          <SelectItem
                            key={item.id}
                            value={item.id.toString()}
                            className="flex items-center my-1 data-[state=checked]:bg-[#4845d2]/20 hover:bg-[#d9d9d9] justify-between"
                          >
                            {item.Icon}{" "}
                            <span className="ml-2">{item.name}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-red-500 text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />
          </div>
        </div>
        <div className="w-full flex justify-end mt-4">
          <LoaderButton
            loading={loading}
            buttonText={data ? "Edit Expense" : "Add Expense"}
            type="submit"
            disabled={!isDirty && !tagsDirty}
          />
        </div>
      </form>
    </DialogHeader>
  );
};

export default AddExpense;
