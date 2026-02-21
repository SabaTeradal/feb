import { GroceryItem } from "../types";

export const groceryService = {
  async getItems(): Promise<GroceryItem[]> {
    const response = await fetch("/api/items");
    if (!response.ok) throw new Error("Failed to fetch items");
    return response.json();
  },

  async addItem(item: Partial<GroceryItem>): Promise<GroceryItem> {
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error("Failed to add item");
    return response.json();
  },

  async updateItem(id: number, updates: Partial<GroceryItem>): Promise<GroceryItem> {
    const response = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update item");
    return response.json();
  },

  async deleteItem(id: number): Promise<void> {
    const response = await fetch(`/api/items/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete item");
  },

  async clearCompleted(): Promise<void> {
    const response = await fetch("/api/items/completed", {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to clear completed items");
  },
};
