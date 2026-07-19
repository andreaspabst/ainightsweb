// Blog-Kategorien: Anzeige-Label + Beschreibung für die Kategorie-Seiten.
export type BlogCategory = 'speaker-announcements' | 'news' | 'ai-news';

export const BLOG_CATEGORIES: Record<BlogCategory, { label: string; description: string }> = {
  'speaker-announcements': {
    label: 'Speaker Announcements',
    description:
      'Alle Speaker-Ankündigungen der AI Nights: Wer bei den nächsten Afterworks in Nürnberg und München auf der Bühne steht — mit Talk-Thema, Bio und Takeaways.',
  },
  news: {
    label: 'News',
    description:
      'Neuigkeiten rund um die AI Nights: neue Städte, Formate, Recaps und alles, was sich in der Community tut.',
  },
  'ai-news': {
    label: 'AI News',
    description:
      'Content rund um Künstliche Intelligenz: Themen aus unseren Sessions, Einordnungen und Praxiswissen aus der AI Nights Community.',
  },
};

export const categoryLabel = (c: BlogCategory) => BLOG_CATEGORIES[c].label;
