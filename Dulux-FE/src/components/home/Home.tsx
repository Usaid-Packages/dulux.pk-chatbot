import type { JSX } from 'react';

import { useHome } from '#/hooks';
import type { Post, UsePostsResult } from '#/types/home/post.types';

// Use this import when you need to apply business logic before rendering
// Use this import when no transformation or filtering is needed — direct data rendering
// import { useGetPosts } from '#/data/home/queries/getPosts';

/**
 * Home component — purely UI-focused.
 *
 * This follows the separation of concerns design:
 * ------------------------------------------------------------------
 * ✅ If business logic is needed (filtering, transforming, validation),
 *    use the `useHome` hook to receive already-processed data.
 *
 * ✅ If no processing is needed (raw data rendering),
 *    directly call the `useGetPosts` hook from the data layer here.
 *
 * 🔁 Only one approach should be used at a time.
 */
const Home = (): JSX.Element => {
  // -----------------------------
  // ✅ Option A — Use with logic
  const { posts, isLoading, handleCreatePost, isPosting }: UsePostsResult = useHome();

  // -----------------------------
  // ✅ Option B — Use raw data directly from query (no business logic)
  // const { data: post, isLoading } = useGetPosts();

  return (
    <div className='p-6 max-w-3xl mx-auto'>
      <h1 className='text-2xl font-bold mb-4 text-center text-blue-600'>Cogent Labs</h1>

      {/* 
        👉 Only show this button when using  hooks/useHome for mutations.
      */}

      <div className='mb-4 text-center'>
        <button
          className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition'
          onClick={handleCreatePost}
          disabled={isPosting}
        >
          {isPosting ? 'Creating...' : 'Create Dummy Post'}
        </button>
      </div>

      <h2 className='text-xl font-semibold mb-2'>Posts List</h2>
      {isLoading ? (
        <p>Loading Posts...</p>
      ) : (
        <ul className='list-disc list-inside space-y-2'>
          {posts &&
            posts.map((post: Post) => (
              <li key={post.id} className='p-4 border rounded shadow-sm list-none'>
                <h2 className='text-lg font-semibold'>{post.title}</h2>
                <p>User Id: {post.userId}</p>
                <p>Body: {post.body}</p>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default Home;
