import re
import json
from typing import Optional


# Wiki-link pattern: [[link]], [[link|alias]], [[link#heading]]
# Extract the link part before | or #
WIKI_LINK_PATTERN = re.compile(r'\[\[([^\]|#]+)[^\]]*\]\]')

# Frontmatter pattern: ---\n...\n---
FRONTMATTER_PATTERN = re.compile(r'^---\n(.*?)\n---', re.MULTILINE | re.DOTALL)

# YAML tags pattern (simple parsing)
TAGS_PATTERN = re.compile(r'tags:\s*\[(.*?)\]', re.IGNORECASE)


def extract_links(content: str) -> list[str]:
    """
    Extract wiki-link references from markdown content.

    Matches: [[link]], [[link|alias]], [[link#heading]]
    Returns canonical link name (before | or #)
    Deduplicates while preserving order.
    """
    matches = WIKI_LINK_PATTERN.findall(content)
    # Deduplicate while preserving order
    seen = set()
    result = []
    for link in matches:
        if link not in seen:
            seen.add(link)
            result.append(link)
    return result


def extract_tags(content: str) -> list[str]:
    """
    Extract tags from YAML frontmatter or markdown.

    Looks for:
    ---
    tags: [tag1, tag2, tag3]
    ---

    or inline markdown tags: #tag1 #tag2
    """
    tags = []

    # Try YAML frontmatter first
    frontmatter_match = FRONTMATTER_PATTERN.search(content)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        tags_match = TAGS_PATTERN.search(frontmatter)
        if tags_match:
            tags_str = tags_match.group(1)
            # Parse: "tag1, tag2, tag3" or "'tag1', 'tag2'"
            tags = [t.strip().strip("'\"") for t in tags_str.split(',')]
            return tags

    # Fallback: look for #hashtags in content
    hashtag_pattern = re.compile(r'#(\w+)')
    tags = hashtag_pattern.findall(content)
    # Deduplicate
    return list(dict.fromkeys(tags))


def compute_content_hash(content: str) -> str:
    """Compute SHA256 hash of content for conflict detection."""
    import hashlib
    return hashlib.sha256(content.encode()).hexdigest()


def serialize_json_field(data: list) -> str:
    """Serialize a list to JSON string for storage."""
    return json.dumps(data)


def deserialize_json_field(json_str: str) -> list:
    """Deserialize JSON string back to list."""
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return []
