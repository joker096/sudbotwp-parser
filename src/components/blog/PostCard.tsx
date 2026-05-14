import React from 'react';

export interface PostData {
    id?: number;
    title: string;
    excerpt?: string | null;
    date: string;
    category: string;
    img?: string;
    image_url?: string;
    views?: number;
    likes?: number;
}

export interface PostCardProps {
    post: any; 
    onClick?: () => void;
}

const PostCard = ({post}:PostCardProps) => (
  <div className="contents">
      <a href={`/blog/${post.slug || 'p' + post.id}`}>{post.title}</a>
      {post.image_url && (<img src={post.image_url}/>) }{""} 
    </div>);

export default PostCard;