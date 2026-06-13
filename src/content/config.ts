import { defineCollection, z } from 'astro:content';

// A typed content collection is the data layer for a static Astro site:
// markdown/MDX files under `src/content/<collection>/` validated against this
// schema at build time. codeyam's `content-collection` seed adapter writes and
// clears these files per scenario, so the schemas below are also the contract
// the seed data must satisfy. Optional fields exist on purpose — the "missing
// optional frontmatter" scenarios prove an entry without them still renders.

// Blog posts. `coverImage`/`summary` are optional so a minimal post renders.
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    coverImage: z.string().optional(),
  }),
});

// Free-form site pages (About, chapter pages, etc.). `order` sorts them in a
// nav or index; the markdown body is the page content.
const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
  }),
});

// Team / board members. `photo` and `bio` are optional so a name-and-role-only
// entry still renders; `order` controls display order.
const team = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string().optional(),
    bio: z.string().optional(),
    order: z.number().optional(),
  }),
});

// Upcoming / past events. `link` points at an external registration page;
// `location` and `description` are optional for a bare save-the-date.
const events = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    location: z.string().optional(),
    description: z.string().optional(),
    link: z.string().optional(),
  }),
});

export const collections = { blog, pages, team, events };
