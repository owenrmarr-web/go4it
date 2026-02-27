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
  isGoSuite: boolean;
  createdAt: string;
  version: string | null;
  creatorUsername: string | null;
  screenshot: string | null;
  heartCount: number;
  previewUrl: string | null;
}

export type InteractionType = "HEART" | "STAR";
