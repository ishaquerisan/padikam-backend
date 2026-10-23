export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const ALLOWED_DAILY_TARGETS = [5, 10, 20, 30] as const;
export const MAX_DAILY_NEW_SENTENCES = 30;

export const INITIAL_CATEGORIES = [
  { name: 'Friendly Conversations', slug: 'friendly-conversations', icon: 'MessagesSquare', description: 'Everyday chit-chat, greetings, and casual dialogues.' },
  { name: 'Family', slug: 'family', icon: 'Users', description: 'Conversations with parents, siblings, children, and relatives.' },
  { name: 'Friends', slug: 'friends', icon: 'Smile', description: 'Fun hangouts, jokes, making plans, and friendly banter.' },
  { name: 'Office', slug: 'office', icon: 'Briefcase', description: 'Workplace interactions, emails, meetings, and project discussions.' },
  { name: 'Business', slug: 'business', icon: 'TrendingUp', description: 'Negotiations, clients, contracts, and commercial deals.' },
  { name: 'Shopping', slug: 'shopping', icon: 'ShoppingBag', description: 'Buying groceries, clothes, bargaining, and bill payments.' },
  { name: 'Travel and Transportation', slug: 'travel-and-transportation', icon: 'Navigation', description: 'Airports, trains, buses, booking taxis, and asking directions.' },
  { name: 'College and Education', slug: 'college-and-education', icon: 'GraduationCap', description: 'Classrooms, exams, assignments, professors, and campus life.' },
  { name: 'Home and Daily Life', slug: 'home-and-daily-life', icon: 'Home', description: 'Morning routines, chores, kitchen, maintenance, and relaxation.' },
  { name: 'Food and Restaurants', slug: 'food-and-restaurants', icon: 'Utensils', description: 'Ordering food, dining out, recipes, and taste preferences.' },
  { name: 'Phone Conversations', slug: 'phone-conversations', icon: 'PhoneCall', description: 'Calling, answering, taking messages, and phone etiquette.' },
  { name: 'Feelings and Emotions', slug: 'feelings-and-emotions', icon: 'Heart', description: 'Expressing happiness, sadness, worry, gratitude, and empathy.' },
  { name: 'Health and Appointments', slug: 'health-and-appointments', icon: 'Activity', description: 'Doctor visits, symptoms, pharmacies, and healthy habits.' },
  { name: 'Social Situations', slug: 'social-situations', icon: 'Sparkles', description: 'Parties, weddings, celebrations, and cultural gatherings.' },
];
