import { z } from 'zod';

// Mirrors src/data/*.ts interfaces — kept in sync by hand since the two serve
// different purposes (static fallback data vs. runtime validation).

export const leaderSchema = z.object({
  name: z.string(),
  role: z.string(),
  email: z.string().optional(),
  raj: z.string().optional(),
  isStaff: z.boolean().optional(),
  photo: z.string().optional(),
});
export const leadersSchema = z.array(leaderSchema);

export const campSchema = z.object({
  year: z.number(),
  location: z.string(),
  commander: z.string(),
  theme: z.string(),
  participants: z.number().optional(),
  notes: z.string().optional(),
});
export const campsSchema = z.array(campSchema);

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  dateDisplay: z.string(),
  description: z.string(),
  category: z.enum(['mise', 'portya', 'verseny', 'tábor', 'egyéb']),
});
export const eventsSchema = z.array(eventSchema);

export const rajSchema = z.object({
  name: z.string(),
  ageGroup: z.string(),
});
export const rajokSchema = z.array(rajSchema);

export const settingsSchema = z.object({
  siteName: z.string(),
  tagline: z.string(),
  address: z.string(),
  emailMain: z.string(),
  emailCommander: z.string(),
  facebook: z.string(),
  instagram: z.string(),
  activeMemberCount: z.number(),
  activeOrsCount: z.number(),
  rajCount: z.number(),
  foundedYear: z.number(),
});

// Includes the pipeline-written fields (activity/bucket/reason) alongside the
// app-facing GalleryItem shape (src/pages/Gallery.tsx) — see audit finding C10.
export const galleryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.string(),
  event: z.string().optional(),
  activity: z.string().optional(),
  bucket: z.string().optional(),
  score: z.number().optional(),
  phash: z.string().optional(),
  reason: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  approved: z.boolean().optional(),
  primary: z.boolean().optional(),
  cap: z.number().optional(),
});
export const gallerySchema = z.array(galleryItemSchema);

// Written by scripts/sync-instagram-feed.mjs to public/content/instagram.json.
// See src/types/gallery.ts InstagramFeedItem — kept in sync by hand.
export const instagramItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  caption: z.string().optional(),
  permalink: z.string(),
  mediaType: z.enum(['image', 'video']),
  postedAt: z.string(),
  eventSlug: z.string().nullable().optional(),
  eventTitle: z.string().nullable().optional(),
  year: z.number().optional(),
});
export const instagramSchema = z.array(instagramItemSchema);
