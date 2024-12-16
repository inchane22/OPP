import React, { useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "../hooks/use-language";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

interface User {
  id: number;
  username: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  authorId?: number;
  createdAt: string;
  author?: User | null;
  comments?: Comment[];
}

interface Comment {
  id: number;
  content: string;
  authorId?: number;
  postId: number;
  createdAt: string;
  authorName?: string;
}

async function fetchPosts(): Promise<Post[]> {
  const response = await fetch('/api/posts?include=comments,author');
  if (!response.ok) throw new Error('Failed to fetch posts');
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export default function ForumPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  const { data: posts = [], isLoading, isFetching, error } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 3,
    select: (data) => {
      if (!Array.isArray(data)) {
        console.warn('Posts data is not an array:', data);
        return [];
      }
      return data.filter(post => post && typeof post === 'object');
    }
  });

  if (error instanceof Error) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="text-destructive">{error.message || 'Error loading posts. Please try again later.'}</p>
      </div>
    );
  }

  const handleCreatePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const newPost = {
      title: formData.get('title'),
      content: formData.get('content'),
    };

    startTransition(() => {
      (async () => {
        try {
          const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPost),
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to create post');
          }

          await queryClient.invalidateQueries({ queryKey: ['posts'] });
          toast({
            title: "Post created successfully",
            variant: "default"
          });
          (e.target as HTMLFormElement).reset();
        } catch (error) {
          console.error('Error creating post:', error);
          toast({
            title: "Error creating post",
            description: "Could not create the post. Please try again.",
            variant: "destructive"
          });
        }
      })();
    });
  };

  const handleCreateComment = (e: React.FormEvent<HTMLFormElement>, postId: number) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const content = formData.get('content') as string;
    
    startTransition(() => {
      (async () => {
        try {
          const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
              authorName: user ? undefined : 'Anonymous'
            }),
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error('Failed to create comment');
          }

          const newComment = await response.json();
          
          queryClient.setQueryData(['posts'], (oldData: Post[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(p => {
              if (p.id === postId) {
                return {
                  ...p,
                  comments: [...(p.comments || []), newComment]
                };
              }
              return p;
            });
          });
          
          toast({
            title: "Comment added successfully",
            variant: "default"
          });
          (e.target as HTMLFormElement).reset();
        } catch (error) {
          console.error('Error creating comment:', error);
          toast({
            title: "Error adding comment",
            description: "Could not add the comment. Please try again.",
            variant: "destructive"
          });
        }
      })();
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          No posts yet. Be the first to create one!
        </div>
      );
    }

    // Ensure posts is an array and each post has required properties
    const safePosts = posts.filter(post => 
      post && 
      typeof post === 'object' && 
      'id' in post &&
      'title' in post
    );

    return safePosts.map((post) => (
      <Card key={post.id} className="mb-6">
        <CardHeader>
          <CardTitle>{post.title || 'Untitled Post'}</CardTitle>
          <div className="text-sm text-muted-foreground">
            Posted by {post.author?.username || 'Anonymous'} • {
              post.createdAt 
                ? new Date(post.createdAt).toLocaleDateString() 
                : 'Unknown date'
            }
          </div>
        </CardHeader>
        <CardContent>
          <p>{post.content || ''}</p>
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Comments</h4>
            <div className="space-y-2">
              {Array.isArray(post.comments) && post.comments.length > 0 ? (
                post.comments
                  .filter(comment => comment && typeof comment === 'object' && 'id' in comment)
                  .map((comment) => (
                    <div key={comment.id} className="bg-muted p-2 rounded-md">
                      <p className="text-sm">{comment.content || 'No content'}</p>
                      <p className="text-xs text-muted-foreground">
                        {comment.authorName || 'Anonymous'} • {
                          comment.createdAt 
                            ? new Date(comment.createdAt).toLocaleDateString() 
                            : 'Unknown date'
                        }
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              )}
            </div>
            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => handleCreateComment(e, post.id)}
            >
              <Textarea
                name="content"
                placeholder="Add a comment..."
                required
                rows={2}
                disabled={isPending}
              />
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Comment'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('forum.title')}</h1>
        {user ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">{t('forum.create_post')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('forum.create_post')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      id="title"
                      name="title"
                      required
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      id="content"
                      name="content"
                      required
                      rows={5}
                      disabled={isPending}
                    />
                  </FormControl>
                </FormItem>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Post'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/login">{t('forum.login_to_post')}</Link>
          </Button>
        )}
      </div>

      <ErrorBoundary>
        <div className={`grid gap-6 ${(isPending || isFetching) ? 'opacity-50 pointer-events-none' : ''}`}>
          {renderContent()}
        </div>
      </ErrorBoundary>
    </div>
  );
}
