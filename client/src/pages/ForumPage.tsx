import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../hooks/use-language';
import { useUser } from '../hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { useState, useTransition } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Post, Comment } from '@db/schema';

interface User {
  id: number;
  username: string;
}

interface PostWithAuthor extends Post {
  author?: User | null;
  comments?: Comment[];
}

async function fetchPosts(): Promise<PostWithAuthor[]> {
  const response = await fetch('/api/posts?include=comments,author');
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
}

export default function ForumPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  const { data: posts = [], isLoading, isFetching, error } = useQuery({
    queryKey: ['posts'] as const,
    queryFn: fetchPosts,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 3
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
    const formData = new FormData(e.currentTarget);
    const newPost = {
      title: formData.get('title'),
      content: formData.get('content'),
    };
    
    const createPost = async () => {
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

        startTransition(() => {
          queryClient.invalidateQueries({ queryKey: ['posts'] });
          toast({
            title: "Post created successfully",
            variant: "default"
          });
          (e.target as HTMLFormElement).reset();
        });
      } catch (error) {
        console.error('Error creating post:', error);
        toast({
          title: "Error creating post",
          description: "Could not create the post. Please try again.",
          variant: "destructive"
        });
      }
    };

    createPost();
  };

  const handleCreateComment = (e: React.FormEvent<HTMLFormElement>, postId: number) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get('content') as string;
    
    const createComment = async () => {
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
        
        startTransition(() => {
          // Update the cache with the new comment
          queryClient.setQueryData(['posts'], (oldData: PostWithAuthor[] | undefined) => {
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
        });
      } catch (error) {
        console.error('Error creating comment:', error);
        toast({
          title: "Error adding comment",
          description: "Could not add the comment. Please try again.",
          variant: "destructive"
        });
      }
    };

    createComment();
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
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" name="content" required rows={5} />
                </div>
                <DialogFooter>
                  <Button type="submit">Create Post</Button>
                </DialogFooter>
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
        <div className={`grid gap-6 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No posts yet. Be the first to create one!
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription>
                    Posted by {post.author ? post.author.username : 'Anonymous'} • {new Date(post.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{post.content}</p>
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Comments</h4>
                    <div className="space-y-2">
                      {post.comments?.map((comment) => (
                        <div key={comment.id} className="bg-muted p-2 rounded-md">
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {comment.authorName || 'Anonymous'} • {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
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
                      />
                      <Button type="submit" size="sm">
                        Post Comment
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
