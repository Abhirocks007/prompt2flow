export const SERVICE_META: Record<string, { label: string; bg: string; glyph: string }> = {
  google_gmail: { label: "Gmail", bg: "#ea4335", glyph: "M" },
  microsoft_onedrive: { label: "OneDrive", bg: "#0078d4", glyph: "☁" },
  llm: { label: "LLM", bg: "#22c55e", glyph: "✦" },
  notion: { label: "Notion", bg: "#ffffff", glyph: "N" },
  slack: { label: "Slack", bg: "#611f69", glyph: "#" },
  github: { label: "GitHub", bg: "#24292f", glyph: "G" },
  discord: { label: "Discord", bg: "#5865f2", glyph: "D" },
  linear: { label: "Linear", bg: "#5e6ad2", glyph: "L" },
  jira: { label: "Jira", bg: "#2684ff", glyph: "J" },
  zoom: { label: "Zoom", bg: "#0b5cff", glyph: "Z" },
  apollo_io: { label: "Apollo", bg: "#facc15", glyph: "*" },
  typeform: { label: "Typeform", bg: "#3b3b3b", glyph: "T" },
  box: { label: "Box", bg: "#0061d5", glyph: "B" },
  outlook: { label: "Outlook", bg: "#0078d4", glyph: "O" },
  google_sheets: { label: "Sheets", bg: "#0f9d58", glyph: "S" },
  google_drive: { label: "Drive", bg: "#1a73e8", glyph: "D" },
  airtable: { label: "Airtable", bg: "#fcb400", glyph: "A" },
  hubspot: { label: "HubSpot", bg: "#ff7a59", glyph: "H" },
  dropbox: { label: "Dropbox", bg: "#0061ff", glyph: "d" },
  supabase: { label: "Supabase", bg: "#3ecf8e", glyph: "S" },
};

export function serviceMeta(slug: string) {
  return SERVICE_META[slug] ?? { label: slug, bg: "#6d28d9", glyph: slug.slice(0, 1).toUpperCase() };
}
