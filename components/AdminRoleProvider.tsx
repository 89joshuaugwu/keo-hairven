"use client";
import { createContext, useContext } from "react";
const Context = createContext("editor");
export function AdminRoleProvider({ role, children }: {
    role: string;
    children: React.ReactNode;
}) { return <Context.Provider value={role}>{children}</Context.Provider>; }
export function useAdminRole() { return useContext(Context); }
