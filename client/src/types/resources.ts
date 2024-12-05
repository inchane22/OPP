export interface Resource {
  id: number;
  title: string;
  description: string;
  url: string;
  type: "article" | "video" | "book" | "tool";
  approved: boolean;
  authorId: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateResourceInput {
  title: string;
  description: string;
  url: string;
  type: "article" | "video" | "book" | "tool";
  authorId?: number;
  approved?: boolean;
}
