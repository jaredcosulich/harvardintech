// Site-wide data loaded from editable JSON singletons under `src/data/`.
//
// `settings.json` and `nav.json` are content, not code: the CMS edits them as
// Sveltia "file" collections, and every layout reads them through this module.
// Changing the contact email, a social link, or a menu item is therefore a
// data edit (a commit the CMS makes), never a source change. codeyam's
// `content-collection` seed adapter rewrites these same files per scenario, so
// a scenario can render "site with 3 socials and a chapters dropdown" vs a
// minimal nav without touching markup.
import settingsData from '../data/settings.json';
import navData from '../data/nav.json';

export interface SocialLink {
  label: string;
  url: string;
  icon?: string;
}

export interface SiteSettings {
  siteTitle: string;
  description: string;
  contactEmail: string;
  footerText: string;
  socials: SocialLink[];
}

export interface NavItem {
  label: string;
  url?: string;
  children?: NavItem[];
}

export interface SiteNav {
  items: NavItem[];
}

export const settings = settingsData as SiteSettings;
export const nav = navData as SiteNav;
