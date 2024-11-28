import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "../hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { insertPostSchema, type InsertPost, type Post, type Comment } from "@db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { MessageCircle, Loader2 } from "lucide-react";

function CommentSection({ postId }: { postId: number }) {
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const { user } = useUser();
  const { toast } = useToast();

  const queryClient = useQueryClient();
  
  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", postId],
    queryFn: () => fetch(`/api/posts/${postId}/comments`).then(res => res.json())
  });

  const createComment = useMutation({
    mutationFn: () =>
      fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment, authorName })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast({ title: "Comment added successfully" });
      setComment("");
      setAuthorName("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to add comment"
      });
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-4">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <div className="font-medium">
              {comment.authorName}
            </div>
            <p>{comment.content}</p>
          </div>
        ))}
      </div>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        createComment.mutate();
      }} className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button type="submit" disabled={!comment || createComment.isPending}>
          {createComment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Comment
        </Button>
      </form>
    </div>
  );
}

export default function ForumPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts").then(res => res.json())
  });

  const form = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      title: "",
      content: "",
      authorId: user?.id
    }
  });

  const createPost = useMutation({
    mutationFn: (data: InsertPost) =>
      fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(res => res.json()),
    onSuccess: () => {
      toast({ title: "Post created successfully" });
      form.reset();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to create post"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Forum</h1>
        
        {user ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button>New Post</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(data => createPost.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={5} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createPost.isPending}>
                    {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Post
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        ) : (
          <Link href="/login">
            <Button>Login to Post</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6">
        {posts.map(post => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>{post.title}</CardTitle>
              <div className="flex items-center text-sm text-muted-foreground">
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>Posted on {format(new Date(post.createdAt), "PPP")}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{post.content}</p>
              <div className="mt-4 pt-4 border-t">
                <CommentSection postId={post.id} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
