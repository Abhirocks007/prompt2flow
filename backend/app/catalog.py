INTEGRATIONS = [
    {
        "slug": "google_gmail",
        "name": "Google Gmail",
        "actions": [
            "gmail_send_email",
            "gmail_list_messages",
            "gmail_get_message",
            "gmail_modify_labels",
        ],
        "trigger": {"id": "gmail.message.received", "name": "New Email Received"},
        "live": True,
    },
    {
        "slug": "microsoft_onedrive",
        "name": "Microsoft OneDrive",
        "actions": [
            "onedrive_create_folder",
            "onedrive_create_file",
            "onedrive_delete",
            "onedrive_download",
            "onedrive_search",
        ],
        "trigger": {"id": "onedrive.file.changed", "name": "File changed"},
        "live": True,
    },
    {"slug": "llm", "name": "Language model", "actions": ["ai_generate"]},
    {"slug": "apollo_io", "name": "Apollo.io", "actions": ["apollo_search_people"]},
    {"slug": "notion", "name": "Notion", "actions": ["notion_create_page", "notion_query_database"]},
    {"slug": "zoom", "name": "Zoom", "actions": ["zoom_create_meeting"]},
    {"slug": "typeform", "name": "Typeform", "actions": ["typeform_list_responses"]},
    {"slug": "box", "name": "Box", "actions": ["box_upload_file"]},
    {"slug": "discord", "name": "Discord", "actions": ["discord_send_message"]},
    {"slug": "webflow", "name": "Webflow", "actions": ["webflow_publish"]},
    {"slug": "sharepoint", "name": "SharePoint", "actions": ["sharepoint_upload"]},
    {"slug": "microsoft_teams", "name": "Teams", "actions": ["teams_send_message"]},
    {"slug": "outlook", "name": "Outlook", "actions": ["outlook_list_messages"]},
    {"slug": "slack", "name": "Slack", "actions": ["slack_post_message", "slack_list_channels"]},
    {"slug": "github", "name": "GitHub", "actions": ["github_list_issues", "github_create_issue"]},
    {"slug": "google_sheets", "name": "Google Sheets", "actions": ["sheets_append_row"]},
    {"slug": "google_drive", "name": "Google Drive", "actions": ["drive_upload"]},
    {"slug": "linear", "name": "Linear", "actions": ["linear_create_issue"]},
    {"slug": "jira", "name": "Jira", "actions": ["jira_create_issue"]},
    {"slug": "airtable", "name": "Airtable", "actions": ["airtable_list_records"]},
    {"slug": "hubspot", "name": "HubSpot", "actions": ["hubspot_create_contact"]},
    {"slug": "salesforce", "name": "Salesforce", "actions": ["salesforce_query"]},
    {"slug": "dropbox", "name": "Dropbox", "actions": ["dropbox_upload"]},
    {"slug": "supabase", "name": "Supabase", "actions": ["supabase_insert"]},
]

LIVE_SLUGS = {"google_gmail", "microsoft_onedrive"}


def integration_by_slug(slug: str) -> dict | None:
    return next((item for item in INTEGRATIONS if item["slug"] == slug), None)


def planner_catalog_text(connected: set[str]) -> str:
    lines = []
    for item in INTEGRATIONS:
        if item["slug"] in connected:
            state = "connected"
        elif item.get("live"):
            state = "available (OAuth)"
        else:
            state = "available (mocked)"
        lines.append(
            f"- {item['slug']} ({item['name']}, {state}): actions {', '.join(item['actions'])}"
        )
    return "\n".join(lines)
