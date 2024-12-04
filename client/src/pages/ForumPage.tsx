import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../hooks/use-language';
import type { Post } from '@db/schema';

async function fetchPosts(): Promise<Post[]> {
  const response = await fetch('/api/posts');
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
}

export default function ForumPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['posts'] as const,
    queryFn: fetchPosts,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // More frequent updates
    retry: 3,
    gcTime: 0
  });

  if (error instanceof Error) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="text-destructive">{error.message || 'Error loading posts. Please try again later.'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('forum.title')}</h1>
        <Button variant="outline">{t('forum.create_post')}</Button>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          posts?.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>
                  {new Date(post.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{post.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}