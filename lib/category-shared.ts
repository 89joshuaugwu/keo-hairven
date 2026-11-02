export type CategoryGroup = "products" | "gallery";
export type CategoryEntry = {
    id: string;
    label: string;
};
export type CategoryRegistry = {
    group: CategoryGroup;
    revision: number;
    entries: CategoryEntry[];
};
export const defaultCategories: Record<CategoryGroup, CategoryEntry[]> = {
    products: [{ id: "bone-straight", label: "Bone Straight" }, { id: "braided-wigs", label: "Braided Wigs" }, { id: "hair-extensions", label: "Hair Extensions" }, { id: "bundles", label: "Hair Bundles" }],
    gallery: [{ id: "braids", label: "Braids" }, { id: "wigs", label: "Wigs & Hair" }],
};
export type CategoryOperation = {
    type: "create";
    id: string;
    label: string;
} | {
    type: "rename";
    id: string;
    label: string;
} | {
    type: "reorder";
    ids: string[];
} | {
    type: "delete";
    id: string;
};
export function changeCategories(entries: CategoryEntry[], op: CategoryOperation): CategoryEntry[] {
    if (op.type === "reorder") {
        if (op.ids.length !== entries.length || new Set(op.ids).size !== entries.length || op.ids.some(id => !entries.some(e => e.id === id)))
            throw Error("Invalid category order.");
        return op.ids.map(id => entries.find(e => e.id === id)!);
    }
    if (op.type !== "create" && !entries.some(e => e.id === op.id))
        throw Error("Category not found.");
    if (op.type === "delete")
        return entries.filter(e => e.id !== op.id);
    const label = op.label.trim();
    if (!label || label.length > 80)
        throw Error("Use a category name between 1 and 80 characters.");
    if (entries.some(e => e.id !== op.id && e.label.toLocaleLowerCase() === label.toLocaleLowerCase()))
        throw Error("A category with this name already exists.");
    if (op.type === "create") {
        if (!/^[a-z0-9-]{1,80}$/.test(op.id) || entries.some(e => e.id === op.id))
            throw Error("Invalid category ID.");
        return [...entries, { id: op.id, label }];
    }
    return entries.map(e => e.id === op.id ? { ...e, label } : e);
}
