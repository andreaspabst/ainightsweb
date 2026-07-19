import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Gemeinsame SEO-Felder aus WordPress/Yoast, alle optional. */
const seo = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .optional();

const image = z
  .object({
    src: z.string().optional(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .optional();

const socials = z
  .object({
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    x: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
    youtube: z.string().optional(),
  })
  .partial()
  .optional();

const speaker = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/speaker' }),
  schema: z.object({
    id: z.number().optional(),
    title: z.string(),
    slug: z.string(),
    jobTitle: z.string().optional(),
    company: z.string().optional(),
    excerpt: z.string().optional(),
    bioHtml: z.string().optional(),
    image,
    socials,
    // Aus der Airtable-Speaker-Tabelle übernommene Felder
    topics: z.array(z.string()).optional(),
    keyTakeaways: z.array(z.string()).optional(),
    links: z.array(z.object({ label: z.string(), url: z.string() })).optional(),
    homeFeatured: z.boolean().optional(),
    sortNumber: z.number().optional(),
    cities: z.array(z.string()).optional(),
    seo,
    date: z.string().optional(),
    modified: z.string().optional(),
  }),
});

const sessions = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/sessions' }),
  schema: z.object({
    id: z.number().optional(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    contentHtml: z.string().optional(),
    image,
    time: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    speakerSlugs: z.array(z.string()).optional(),
    speakerIds: z.array(z.number()).optional(),
    eventSlug: z.string().optional(),
    city: z.string().optional(),
    type: z.string().optional(),
    duration: z.union([z.number(), z.string()]).optional(),
    level: z.string().optional(),
    room: z.string().optional(),
    seo,
    date: z.string().optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/events' }),
  schema: z.object({
    id: z.number().optional(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    contentHtml: z.string().optional(),
    image,
    eventDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    city: z.string().optional(),
    ticketUrl: z.string().optional(),
    status: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    // Beziehungen (aus ACF *_slots), als Post-IDs
    speakerIds: z.array(z.number()).optional(),
    sessionIds: z.array(z.number()).optional(),
    sponsorIds: z.array(z.number()).optional(),
    moderatorIds: z.array(z.number()).optional(),
    seo,
    date: z.string().optional(),
  }),
});

const sponsor = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/sponsor' }),
  schema: z.object({
    id: z.number().optional(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    contentHtml: z.string().optional(),
    logo: image,
    image,
    website: z.string().optional(),
    tier: z.string().optional(),
    seo,
    date: z.string().optional(),
  }),
});

const stadt = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/stadt' }),
  schema: z.object({
    id: z.number().optional(),
    title: z.string(),
    slug: z.string(),
    excerpt: z.string().optional(),
    contentHtml: z.string().optional(),
    image,
    seo,
    date: z.string().optional(),
  }),
});

// Blog: Markdown-Dateien unter src/content/blog/, Slug = Dateiname
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('AI Nights Team'),
    image: image,
    category: z.enum(['speaker-announcements', 'news', 'ai-news']).default('news'),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { speaker, sessions, events, sponsor, stadt, blog };
