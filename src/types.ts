export interface GroceryItem {
  id: number;
  name: string;
  category: string;
  quantity: string;
  priority: 'High' | 'Medium' | 'Low';
  location?: string;
  completed: number;
  created_at: string;
}

export type Category = 
  | 'Produce' 
  | 'Dairy' 
  | 'Meat' 
  | 'Pantry' 
  | 'Frozen' 
  | 'Bakery' 
  | 'Beverages' 
  | 'Household' 
  | 'Other';

export type Priority = 'High' | 'Medium' | 'Low';

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

export const CATEGORIES: Category[] = [
  'Produce',
  'Dairy',
  'Meat',
  'Pantry',
  'Frozen',
  'Bakery',
  'Beverages',
  'Household',
  'Other'
];
