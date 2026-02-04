export interface App {
  id: string;
  title: string;
  description: string;
  longDescription: string | null;
  category: string;
  icon: string;
  author: string;
  tags: string;
  isPublic: boolean;
  createdAt: string;
}

export type InteractionType = "HEART" | "STAR";
