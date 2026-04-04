export type PitchStatus = 'not_pitched' | 'contacted' | 'replied' | 'closed';
export type OutreachStatus = 'new' | 'contacted_x' | 'contacted_instagram' | 'contacted_skool' | 'contacted_email' | 'follow_up_sent' | 'replied' | 'deal' | 'pass';

export interface QualifiedChannel {
  channel_id: string;
  channel_name: string;
  channel_handle: string;
  channel_url: string;
  channel_thumbnail_url: string;
  channel_subscribers: number;
  channel_country: string;
  contact_email: string;
  twitter_url: string;
  instagram_url: string;
  outreach_status: OutreachStatus;
  notes: string;
  qualified_at: string;
  contacted_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  published_at: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  description: string;
  channel_id: string;
  channel_name: string;
  channel_handle: string;
  channel_url: string;
  channel_thumbnail_url: string;
  channel_subscribers: number;
  channel_country: string;
  contact_email: string;
  twitter_url: string;
  instagram_url: string;
  pitch_status: PitchStatus;
  notes: string;
  found_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  text: string;
  created_at: string;
}

export type ProductionStage = 'cutting' | 'editing' | 'intro_editing' | 'sfx' | 'final_checking' | 'completed';

export interface Client {
  id: string;
  name: string;
  email: string;
  token: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ClientProject {
  id: string;
  client_id: string;
  title: string;
  thumbnail_url: string;
  stage: ProductionStage;
  delivery_date: string;
  notes: string;
  sort_order: number;
  token: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResponse {
  videos: Video[];
  count: number;
}

export interface LeadsResponse {
  videos: Video[];
  total: number;
}
