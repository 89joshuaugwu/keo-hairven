"use client";
import { createContext, useContext } from "react";
import { defaultCategories, type CategoryGroup, type CategoryEntry } from "@/lib/category-shared";
const Context = createContext<Record<CategoryGroup, CategoryEntry[]>>(defaultCategories);
export function CategoryProvider({ entries, children }: {
    entries: Record<CategoryGroup, CategoryEntry[]>;
    children: React.ReactNode;
}) { return <Context.Provider value={entries}>{children}</Context.Provider>; }
export function useCategoryOptions(group: CategoryGroup, firstLabel?: string, firstValue = "") { const entries = useContext(Context)[group]; return [...(firstLabel ? [{ value: firstValue, label: firstLabel }] : []), ...entries.map(e => ({ value: e.id, label: e.label }))]; }
export function useCategoryLabel(group: CategoryGroup) { const entries = useContext(Context)[group]; return (id: string) => entries.find(e => e.id === id)?.label || id; }
