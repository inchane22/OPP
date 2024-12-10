import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import type { Post } from "@/db/schema";

interface EditPostFormProps {
  post: {
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      username: string;
      email: string | null;
      role: string;
      createdAt: string;
    };
    createdAt: string;
  };
  onSubmit: (data: Partial<Post>) => Promise<void>;
  isPending: boolean;
}

export function EditPostForm({ post, onSubmit, isPending }: EditPostFormProps) {
  const form = useForm({
    defaultValues: {
      title: post.title,
      content: post.content,
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input {...field} required />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenido</FormLabel>
              <FormControl>
                <Textarea {...field} required rows={5} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </form>
    </Form>
  );
}
